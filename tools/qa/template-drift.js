#!/usr/bin/env node
/* ============================================================
   template-drift.js —— 模板/页面结构漂移【门禁】
   用法: node tools/qa/template-drift.js            （只报问题，安静模式）
         node tools/qa/template-drift.js --verbose  （附 33 页各维度变体明细）
   退出码: 0 = 结构不变量全部成立；1 = 发现漂移

   为什么要有这个门禁：本工具此前只「打印变体」、从不判定，等于永远通过（空断言）。
   现在把「模板 + 32 页 + 首页」应保持的结构不变量写成断言，漂移即失败。

   不变量（模板 _template.html / 32 个课时页 / index.html 三类分开看）：
     1. 可执行内联 <script> 数 = 0（脚本一律外链 defer；唯一允许的内联 script 是
        type="application/json" 的 data-widget-config 数据块，不参与执行）
     2. <head> 资源组合：课时页必须完全同形；模板与首页各一种（模板带 @@ROOT@@）
        且课时页组合固定含 katex 两件 + auto-render + base/components 两样式 + common/interactives
     3. meta description：每页都有，形态一致
     4. <title>：每页都有；课时页与模板以「 · 矩阵论」结尾
     5. <h1>：每页恰好 1 个，且全站文本互不重复
     6. <nav>：课时页与模板恰好 3 个（面包屑/翻页/本页目录）且各有 aria-label；首页 0 个
     7. <footer>：仅首页有（课时页用 .src-note 表达来源声明）
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const VERBOSE = process.argv.includes('--verbose');
const problems = [];
const add = (msg) => problems.push(msg);

function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'vendor', 'textbook', 'tools', 'audit'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = walk(ROOT, []).map(f => path.relative(ROOT, f).split(path.sep).join('/')).sort();
const isTpl = f => path.basename(f).startsWith('_');
const isHome = f => f === 'index.html';
const isLesson = f => /^chapters[\\/]ch\d+[\\/]/.test(f);

const headRes = {}, navSet = {}, footSet = {}, metaPat = {}, titlePat = {}, h1Set = {}, scriptTail = {};
const navCount = {}, h1Count = {}, navLabelBad = [], metaMissing = [], titleBad = [], inlineScript = [];

for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const head = (s.match(/<head>([\s\S]*?)<\/head>/i) || ['', ''])[1];
  // 资源集合只统计「外部载入资源」：link + script[src]。脚本按约定放在 </body> 前并 defer。
  // 内联 <script> 允许，但必须是 type="application/json" 的数据块（interactives.js 的 data-widget-config），
  // 绝不允许可执行的内联脚本——这是"零动态执行、可审计"的底线。
  const tags = (s.match(/<(?:link|script)\b[^>]*>/gi) || []).map(t => t.replace(/\s+/g, ' '));
  const res = tags.filter(t => /^<link\b/i.test(t) || /\bsrc=/.test(t)).sort().join('\n');
  (headRes[res] = headRes[res] || []).push(f);
  if (/<script\b/i.test(head)) add('不变量2 ' + f + ' 的 <head> 内含 <script>（脚本应放在 </body> 前并 defer）');
  for (const t of (s.match(/<script\b(?![^>]*\bsrc=)[^>]*>/gi) || []))
    if (!/type="application\/json"/.test(t)) inlineScript.push(f + ' → ' + t);
  const navs = (s.match(/<nav\b[\s\S]*?<\/nav>/gi) || []);
  navCount[f] = navs.length;
  navs.forEach((n) => { if (!/<nav\b[^>]*\baria-label=/.test(n)) navLabelBad.push(f); });
  const nav = navs.map(t => t.replace(/\s+/g, ' ')).join('\n');
  (navSet[nav] = navSet[nav] || []).push(f);
  const foot = (s.match(/<footer\b[\s\S]*?<\/footer>/gi) || []).map(t => t.replace(/\s+/g, ' ')).join('\n');
  (footSet[foot] = footSet[foot] || []).push(f);
  const md = (head.match(/<meta\s+name="description"[^>]*>/i) || [''])[0];
  if (!md) metaMissing.push(f);
  const mdShape = md ? md.replace(/content="[^"]*"/, 'content="…"') : '(缺失)';
  (metaPat[mdShape] = metaPat[mdShape] || []).push(f);
  const ti = (head.match(/<title>([\s\S]*?)<\/title>/i) || ['', ''])[1];
  if (!ti) titleBad.push(f + ' (无 <title>)');
  const tiShape = ti.replace(/§[\d.]+/, '§X').replace(/矩阵论/, '').replace(/\s+/g, ' ').trim();
  (titlePat[tiShape] = titlePat[tiShape] || []).push(f);
  const h1s = (s.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []);
  h1Count[f] = h1s.length;
  const h1 = (h1s[0] || '<h1>(无)</h1>').replace(/\s+/g, ' ').trim();
  (h1Set[h1] = h1Set[h1] || []).push(f);
  const tail = (s.match(/<script>[\s\S]*?<\/script>/gi) || []).map(t => t.replace(/\s+/g, ' ')).join('\n');
  if (tail) inlineScript.push(f);
  (scriptTail[tail] = scriptTail[tail] || []).push(f);
}

/* ---------- 断言 ---------- */
// 1. 零可执行内联脚本（type="application/json" 数据块除外）
if (inlineScript.length) add('不变量1 可执行内联 <script> 应为 0，实际: ' + [...new Set(inlineScript)].join(' ; '));
// 2. head 资源组合
{
  const lessonGroups = {};
  for (const k in headRes) for (const f of headRes[k]) if (isLesson(f)) (lessonGroups[k] = lessonGroups[k] || []).push(f);
  const keys = Object.keys(lessonGroups);
  if (keys.length !== 1) add('不变量2 课时页 <head> 资源组合应唯一，实际 ' + keys.length + ' 种: ' + keys.map(k => lessonGroups[k].join(',')).join(' | '));
  else {
    const must = ['katex.min.css', 'base.css', 'components.css', 'katex.min.js', 'auto-render.min.js', 'common.js', 'interactives.js'];
    const missing = must.filter(m => !keys[0].includes(m));
    if (missing.length) add('不变量2 课时页 <head> 缺资源: ' + missing.join(', '));
  }
  const tplK = Object.keys(headRes).filter(k => headRes[k].some(isTpl));
  const homeK = Object.keys(headRes).filter(k => headRes[k].some(isHome));
  if (tplK.length !== 1 || !tplK[0].includes('@@ROOT@@')) add('不变量2 模板 head 组合应唯一且带 @@ROOT@@ 占位');
  if (homeK.length !== 1 || homeK[0].includes('@@ROOT@@')) add('不变量2 首页 head 组合应唯一且不带占位');
}
// 3. meta description
if (metaMissing.length) add('不变量3 缺 meta description: ' + metaMissing.join(', '));
if (Object.keys(metaPat).length !== 1) add('不变量3 meta description 形态应唯一，实际 ' + Object.keys(metaPat).length + ' 种');
// 4. <title>
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const ti = (s.match(/<title>([\s\S]*?)<\/title>/i) || ['', ''])[1];
  if ((isLesson(f) || isTpl(f)) && !/ · 矩阵论$/.test(ti)) titleBad.push(f + ' → "' + ti + '"（应以「 · 矩阵论」结尾）');
}
if (titleBad.length) add('不变量4 <title> 形态不符: ' + titleBad.join(' ; '));
// 5. <h1>
for (const f in h1Count) if (h1Count[f] !== 1) add('不变量5 ' + f + ' 的 <h1> 数量 = ' + h1Count[f] + '（应为 1）');
for (const k in h1Set) if (h1Set[k].length > 1) add('不变量5 <h1> 文本重复: "' + k + '" × ' + h1Set[k].length + '（' + h1Set[k].join(', ') + '）');
// 6. <nav>
for (const f of files) {
  const want = (isLesson(f) || isTpl(f)) ? 3 : 0;
  if (navCount[f] !== want) add('不变量6 ' + f + ' 的 <nav> 数 = ' + navCount[f] + '（应为 ' + want + '）');
}
if (navLabelBad.length) add('不变量6 <nav> 缺 aria-label: ' + [...new Set(navLabelBad)].join(', '));
// 7. <footer> / .src-note
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const hasFoot = /<footer\b/.test(s);
  if (isHome(f)) { if (!hasFoot) add('不变量7 首页缺 <footer>'); }
  else {
    if (hasFoot) add('不变量7 ' + f + ' 不应有 <footer>（课时页用 .src-note）');
    if (!/class="src-note"/.test(s)) add('不变量7 ' + f + ' 缺 .src-note 来源声明');
  }
}

/* ---------- 输出 ---------- */
if (VERBOSE) {
  const report = (title, obj) => {
    const keys = Object.keys(obj);
    console.log('\n== ' + title + '：' + keys.length + ' 种变体 ==');
    keys.forEach((k, i) => {
      const list = obj[k];
      const short = k.length > 110 ? k.slice(0, 110) + ' …（' + k.length + ' 字符）' : (k || '（空）');
      console.log('  变体 ' + (i + 1) + ' × ' + list.length + ' 页：' + short);
      if (list.length <= 4) console.log('      ' + list.join(', '));
    });
  };
  console.log('页面总数: ' + files.length + '（含母版 _template.html）');
  report('head 中 link/script 组合', headRes);
  report('nav 区块', navSet);
  report('footer 区块', footSet);
  report('meta description 形态', metaPat);
  report('title 形态', titlePat);
  report('h1 文本', h1Set);
  report('内联 script（页面级）', scriptTail);
}
if (problems.length) {
  console.log('');
  for (const p of problems) console.log('[结构漂移] ' + p);
  console.log('');
  console.log('发现 ' + problems.length + ' 处结构漂移。');
  process.exit(1);
}
console.log('template-drift: 结构不变量全部成立（页面 ' + files.length + ' 个，含母版）');
process.exit(0);
