#!/usr/bin/env node
/* ============================================================
   check-site.js —— 矩阵论课程网站「结构一致性」离线校验
   用法:  node check-site.js            （安静模式：只报问题）
          node check-site.js --verbose  （附统计明细）
   退出码: 0 = 全部通过；1 = 发现问题

   检查项：
     1. 标签配对（栈扫描；HTML 规范允许的 <p> 隐式闭合单独归类为"容错"）
     2. 站内链接 / 页内锚点 / 重复 id / 必备元素（含 src 与 href 的资源存在性）
     3. COURSE_TOC（common.js 中的章节数组）↔ 磁盘文件
     4. 每页 chips 自述计数 ↔ 实际卡片数（按卡片标签逐类统计）
     5. 页面自述数字（N 章 M 节、N 个交互组件）↔ 真值
     6. 交叉引用可解析（定理/定义/引理/推论/例 → 卡片标签集合；
        式 X.Y.Z → \tag{} 集合；习题 X.Y → 页面标题）
     7. 交互组件注册表 ↔ 页面嵌入表
     8. 导航与标题一致性：<title>/h1/顶栏 .tt/面包屑/TOC 标题/翻页文字 六处同源，
        「（选学）」标注与「上一节|上一章」语义一致，翻页链接指向真实相邻课时
     9. 每课时进度挂钩 id="sec-summary"（缺失则「标记本节为已完成」按钮不出现）
    10. 母版 _template.html：标签配对 + 资源可达 + 无障碍约定（模板不参与计数类检查）
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = __dirname;
const VERBOSE = process.argv.includes('--verbose');
const BS = String.fromCharCode(92);              // 反斜杠（避免正则转义陷阱）
const problems = [];
const stats = {};
const add = (cat, msg) => problems.push('[' + cat + '] ' + msg);

/* ---------- 收集页面 ---------- */
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base',
  'col', 'embed', 'param', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline',
  'polygon', 'use', 'stop', 'marker', 'text', 'tspan', 'ellipse']);
// 会隐式关闭 <p> 的块级元素（HTML 规范行为，视为可容忍）
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || ['node_modules', 'vendor', 'textbook'].includes(e.name)) continue;
      walk(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = walk(ROOT, []).filter(f => !path.relative(ROOT, f).startsWith('_'));
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const isLesson = f => /^chapters[\\/]ch\d+[\\/]/.test(path.relative(ROOT, f));

/* ---------- 1. 标签配对 ---------- */
function checkTags(file, raw) {
  const s = raw;                              // 直接在原文上扫描，保证行号准确
  const lineAt = off => raw.slice(0, off).split('\n').length;
  const lower = s.toLowerCase();
  const stack = [];
  let i = 0, tolerated = 0, phantomP = 0;   // phantomP: 因块级元素隐式关闭 <p> 后遗留的"空段落"
  while (true) {
    const a = s.indexOf('<', i);
    if (a < 0) break;
    const b = s.indexOf('>', a);
    if (b < 0) break;
    let tok = s.slice(a + 1, b);
    if (tok.startsWith('!--')) {                          // 注释：整段跳过（必须从注释起点找 -->）
      const e = s.indexOf('-->', a + 2);
      i = e < 0 ? b + 1 : e + 3;
      continue;
    }
    if (tok.startsWith('!')) { i = b + 1; continue; }     // DOCTYPE 等声明：只跳过本标签
    const skipM = tok.match(/^(script|style)\b/i);         // 脚本/样式：整段跳过
    if (skipM) {
      const tag = skipM[1].toLowerCase();
      const e = lower.indexOf('</' + tag, b);
      i = e < 0 ? b + 1 : e + tag.length + 3;              // +3 = "</>" 的收尾长度
      continue;
    }
    // 只接受形如 <tag / </tag / <tag/> 的真标签；公式里的「<」（如 \lambda_i<0）按普通文本处理，
    // 且只前进一个字符，避免吞掉其后的真标签
    const tm = tok.match(/^(\/?)([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!tm) { i = a + 1; continue; }
    const closing = tm[1] === '/';
    const name = tm[2].toLowerCase();
    const selfClosed = tok.endsWith('/');
    i = b + 1;
    if (VOID.has(name) || selfClosed) continue;

    if (!closing) {
      // HTML 规范：块级开始标签会隐式结束仍打开的 <p>
      if (BLOCK.has(name)) while (stack.length && stack[stack.length - 1].name === 'p') { stack.pop(); tolerated++; phantomP++; }
      stack.push({ name, at: a });
    } else {
      while (stack.length && stack[stack.length - 1].name === 'p' && name !== 'p') { stack.pop(); tolerated++; phantomP++; }
      const top = stack[stack.length - 1];
      if (top && top.name === name) stack.pop();
      else if (name === 'p' && phantomP > 0) { phantomP--; tolerated++; }  // 消耗隐式空段落的闭合
      else {
        const idx = stack.map(x => x.name).lastIndexOf(name);
        if (idx >= 0) {
          add('标签配对', rel(file) + ':' + lineAt(a) + ' 遇 </' + name + '> 时未闭合 ' +
            stack.slice(idx).map(x => '<' + x.name + '>@' + lineAt(x.at)).join(' '));
          stack.length = idx;
        } else add('标签配对', rel(file) + ':' + lineAt(a) + ' 孤立闭合 </' + name + '>');
      }
    }
  }
  if (stack.length) add('标签配对', rel(file) + ' 文件末尾未闭合 ' +
    stack.map(x => '<' + x.name + '>@' + lineAt(x.at)).join(' '));
  return tolerated;
}

/* ---------- 2~7. 逐页扫描 ---------- */
const allLabels = [];            // 全站卡片标签文本
const declared = new Set();      // 全站「声明过」的条目：kind + 编号（定理 1.12 / 例 6.13 …）
const tagsByPage = {};           // 每页 \tag{} 编号
const refsByPage = {};           // 每页交叉引用
const pageText = {};             // 原文（供"习题 X.Y"等存在性判据）
let toleratedTotal = 0;

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const r = rel(f);
  pageText[r] = raw;
  toleratedTotal += checkTags(f, raw);

  // id 唯一性
  const ids = new Set();
  for (const m of raw.matchAll(/id="([^"]+)"/g)) {
    if (ids.has(m[1])) add('重复id', r + ' 重复 id="' + m[1] + '"');
    ids.add(m[1]);
  }
  // 站内链接（html）与资源引用（src / css / js / 字体等）
  for (const m of raw.matchAll(/href="([^"]+\.html)(#[^"]*)?"/g)) {
    const p = path.normalize(path.join(path.dirname(f), m[1]));
    if (!fs.existsSync(p)) add('断链', r + ' -> ' + m[1]);
  }
  for (const m of raw.matchAll(/(?:src|href)="([^"]+?\.(?:js|css|woff2?|png|jpe?g|svg|ico|map))(?:#[^"]*)?"/gi)) {
    const u = m[1];
    if (/^(https?:|data:|\/\/)/i.test(u)) { add('外链资源', r + ' -> ' + u); continue; }
    const p = path.normalize(path.join(path.dirname(f), u));
    if (!fs.existsSync(p)) add('资源缺失', r + ' -> ' + u);
  }
  // 页内锚点
  for (const m of raw.matchAll(/href="#([^"]+)"/g))
    if (!ids.has(m[1])) add('悬空锚点', r + ' #' + m[1]);
  // 必备元素
  const need = [['katex.min.css', /vendor\/katex\/katex\.min\.css/], ['katex.min.js', /vendor\/katex\/katex\.min\.js/],
    ['auto-render', /vendor\/katex\/contrib\/auto-render\.min\.js/], ['common.js', /assets\/js\/common\.js/],
    ['h1', /<h1[ >]/], ['lang=zh-CN', /<html lang="zh-CN">/]];
  if (isLesson(f)) {
    need.push(['interactives.js', /assets\/js\/interactives\.js/], ['data-active', /data-active=/]);
    // 仅当本页确有习题卡时才要求折叠工具的作用域标记（§3.2/§7.5/§7.6 等无习题页不要求）
    if (/class="card task"/.test(raw)) need.push(['data-fold-scope', /data-fold-scope/]);
  }
  for (const [n, re] of need) if (!re.test(raw)) add('缺元素', r + ' 缺少 ' + n);

  // 卡片标签 & 计数（口径统一由 tools/qa/lib/counts.js 提供）
  const kinds = require('./tools/qa/lib/counts.js').countKinds(raw);
  for (const m of raw.matchAll(/class="card-label"[^>]*>([^<]*)/g)) allLabels.push(m[1].trim());

  // 「声明」来源（用于交叉引用解析）：卡片标签 + 内容简短的粗体 + 标题
  // ch1 等早期页用 <td><strong>定理 1.12</strong></td> 的表格样式声明，必须一并采集
  const declTexts = [];
  for (const m of raw.matchAll(/class="card-label"[^>]*>([^<]*)/g)) declTexts.push(m[1]);
  for (const m of raw.matchAll(/class="mc-title"[^>]*>([^<]*)/g)) declTexts.push(m[1]);   // 小卡片标题也是声明
  for (const m of raw.matchAll(/class="tag"[^>]*>([^<]*)/g)) declTexts.push(m[1]);        // 卡片头角标（如「定理 6.36–6.38」）
  for (const m of raw.matchAll(/<strong>\s*((?:定理|定义|引理|推论|例)\s*[0-9][0-9.]*[^<]{0,24})<\/strong>/g)) declTexts.push(m[1]);
  for (const m of raw.matchAll(/<h[1-4][^>]*>([\s\S]{0,80}?)<\/h[1-4]>/g)) declTexts.push(m[1].replace(/<[^>]*>/g, ''));
  for (const m of raw.matchAll(/<th>([^<]{0,40})<\/th>/g)) declTexts.push(m[1]);
  // 括注式声明：「勾股弦定理（定理 1.31）」「Householder 反射（定理 4.10）」
  for (const m of raw.matchAll(/（(定理|定义|引理|推论|例)\s*([0-9]+(?:\.[0-9]+)*)）/g)) declTexts.push(m[1] + ' ' + m[2]);
  const KIND = '(定理|定义|引理|推论|例)';
  for (const txt of declTexts) {
    const head = txt.trim();
    // 声明文本中可能含多个编号（如「广义定义与例 3.8、3.9」「Hessian 矩阵（例 3.13）」）
    const all = [...head.matchAll(new RegExp(KIND + '[ ]*([0-9]+(?:\\.[0-9]+)*)', 'g'))];
    for (const m of all) declared.add(m[1] + ' ' + m[2]);
    // 顿号/逗号/斜杠连写的编号：「例 3.8、3.9」→ 补 例 3.9
    const multi = head.match(new RegExp(KIND + '[ ]*([0-9]+)\\.([0-9]+)[^0-9]{0,4}([0-9]+)(?:[^0-9]{0,4}([0-9]+))?'));
    if (multi) {
      const pfx = multi[1] + ' ' + multi[2] + '.';
      for (const tail of [multi[3], multi[4]]) if (tail) declared.add(pfx + tail);
    }
    // 编号区间展开：兼容「定理 6.19–6.23」与「定义 3.4–3.6」两种写法
    const rm = head.match(new RegExp(KIND + '[ ]*([0-9]+)\\.([0-9]+)[ ]*[–—~-][ ]*(?:([0-9]+)\\.)?([0-9]+)'));
    if (rm) {
      const chap = rm[2], lo = +rm[3], hi = +rm[5];
      if (hi > lo && hi - lo <= 20) for (let n = lo + 1; n <= hi; n++) declared.add(rm[1] + ' ' + chap + '.' + n);
    }
  }

  // chips 自述 ↔ 实际（口径见 tools/qa/lib/counts.js：本页陈述条目数，含表格内声明，排除括注引用）
  const cb = raw.match(/<div class="chips">([\s\S]*?)<\/div>/);
  if (cb) {
    for (const m of cb[1].matchAll(/class="chip"[^>]*>([\s\S]*?)<\/span>/g)) {
      const txt = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const km = txt.match(/^(定义|定理|引理|推论|例题|例|习题)\s*([0-9]+)/);
      if (!km) continue;
      const label = km[1] === '例题' ? '例' : km[1], stated = +km[2], actual = kinds[label];
      if (actual !== undefined && actual !== stated)
        add('计数不符', r + ' chips「' + km[1] + ' ' + stated + '」本页实际陈述 ' + actual);
    }
  }

  // \tag{} 编号
  const tags = [];
  let k = 0;
  while ((k = raw.indexOf(BS + 'tag{', k)) >= 0) {
    const end = raw.indexOf('}', k);
    if (end > 0) tags.push(raw.slice(k + 5, end).trim());
    k = end > 0 ? end : k + 5;
  }
  tagsByPage[r] = tags;

  // 交叉引用
  refsByPage[r] = [...raw.matchAll(/(定理|定义|引理|推论|例|式|习题)\s*([0-9]+(?:\.[0-9]+)+)/g)]
    .map(m => ({ kind: m[1], num: m[2], line: raw.slice(0, m.index).split('\n').length }));
}

/* ---------- 3. TOC ↔ 磁盘 ----------
   用 Node vm 沙箱解析 common.js 里的 COURSE_TOC 字面量（不用 eval：
   沙箱内无 require/process/fs 等内建，取不到宿主能力；解析失败给明确诊断而非 TypeError）。 */
const cs = fs.readFileSync(path.join(ROOT, 'assets/js/common.js'), 'utf8');
const tocSrc = (cs.match(/var COURSE_TOC = (\[[\s\S]*?\n  \]);/) || [])[1];
if (!tocSrc) { console.error('check-site: 无法从 assets/js/common.js 提取 COURSE_TOC（正则未命中，检查字面量格式是否被改动）'); process.exit(2); }
let toc;
try {
  toc = vm.runInNewContext('(' + tocSrc + ')', Object.create(null), { timeout: 2000 });
} catch (e) {
  console.error('check-site: COURSE_TOC 解析失败 —— ' + e.message); process.exit(2);
}
if (!Array.isArray(toc) || !toc.every(c => c && typeof c.chapter === 'string' && Array.isArray(c.lessons))) {
  console.error('check-site: COURSE_TOC 结构异常（应为 [{chapter, lessons[]}]）'); process.exit(2);
}
const lessons = toc.flatMap(c => c.lessons);          // 注意：COURSE_TOC 是「章节数组」
stats.lessons = lessons.length;
stats.ready = lessons.filter(l => l.ready).length;
const tocFiles = new Set(lessons.map(l => l.file));
for (const l of lessons) {
  const f = path.join(ROOT, 'chapters/ch' + l.id.split('.')[0], l.file);
  if (!fs.existsSync(f)) add('目录', 'TOC 登记的 §' + l.id + ' 文件不存在: ' + l.file);
}
for (const f of files.filter(isLesson)) {
  const base = f.split(path.sep).pop();
  if (!tocFiles.has(base)) add('目录', '磁盘存在但 TOC 未登记: ' + rel(f));
}

/* ---------- 5. 自述数字 ↔ 真值 ---------- */
const ij = fs.readFileSync(path.join(ROOT, 'assets/js/interactives.js'), 'utf8');
const registry = [...new Set([...ij.matchAll(/querySelectorAll\('\[data-([a-z0-9-]+)\]'\)/g)].map(m => m[1]))];
stats.widgets = registry.length;
const usedAttrs = new Set();
for (const r in pageText) for (const m of pageText[r].matchAll(/data-([a-z0-9-]+)(?=[\s>"'])/g)) usedAttrs.add(m[1]);

for (const r in pageText) {
  let m = pageText[r].match(/([0-9]+)\s*个交互(?:实验|组件)/);
  if (m && +m[1] !== registry.length)
    add('自述数字', r + ' 称「' + m[1] + ' 个交互组件」，实际注册 ' + registry.length + ' 个');
  m = pageText[r].match(/([0-9]+)\s*章\s*([0-9]+)\s*节/);
  if (m && (+m[2] !== stats.lessons || +m[1] !== toc.length))
    add('自述数字', r + ' 称「' + m[1] + ' 章 ' + m[2] + ' 节」，实际 ' + toc.length + ' 章 ' + stats.lessons + ' 节');
}

/* ---------- 7. 组件注册 ↔ 嵌入 ---------- */
for (const name of registry) if (!usedAttrs.has(name)) add('组件', '注册但页面未嵌入: data-' + name);
for (const a of usedAttrs) if (/-lab$|-ball$|-stepper$|-fig$/.test(a) && !registry.includes(a))
  add('组件', '页面使用但未注册: data-' + a);

/* ---------- 6. 交叉引用可解析 ---------- */
const tagSet = new Set(Object.values(tagsByPage).flat());
// 「习题 X.Y」的可解析集合：只认真正的习题小节标题（<h2 class="sec-title">…习题 6.2…），
// 不能用「全站文本包含 '习题 6.2'」来判断——引用语句自身就含该子串，会自证恒真。
const exSecs = new Set();
for (const r in pageText)
  for (const m of pageText[r].matchAll(/<h2[^>]*class="sec-title"[^>]*>[\s\S]{0,120}?习题\s*([0-9]+\.[0-9]+)/g))
    exSecs.add(m[1]);
function resolvable(kind, num) {
  if (kind === '式') return tagSet.has(num);
  if (kind === '习题') return exSecs.has(num);
  return declared.has(kind + ' ' + num);
}
let refChecked = 0;
for (const r in refsByPage) {
  const seen = new Set();
  for (const ref of refsByPage[r]) {
    refChecked++;
    const key = ref.kind + ref.num;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!resolvable(ref.kind, ref.num))
      add('悬空引用', r + ':' + ref.line + ' ' + ref.kind + ' ' + ref.num);
  }
}
stats.refs = refChecked;
stats.tags = tagSet.size;

/* ---------- 8~9. 导航与标题一致性 / 进度挂钩 ----------
   规范（唯一，六处同源）：
     h1        = 「§N.M 节名」
     <title>   = 「§N.M 节名（可选（选学）） · 矩阵论」
     顶栏 .tt  = 「§N.M 节名（可选（选学））」
     面包屑     = 课程主页 / 第 N 章 章名 / 「§N.M 节名（可选（选学））」
     TOC title = 「节名（可选（选学））」（（选学）口径与 <title> 一致）
     翻页       = 同章「上一节|下一节」+「§N.M …」；跨章「上一章|下一章」+「第 N 章 §N.M …」
   任何一处改动都会被本节抓住，避免再次出现"六处各写各的"。 */
{
  const lessonOf = {};
  toc.forEach((c, ci) => c.lessons.forEach((l, li) => {
    lessonOf[l.id] = { l, chap: c, chapIdx: ci, idx: Object.keys(lessonOf).length, chapName: c.chapter.replace(/^第\s*\d+\s*章\s*/, '').replace(/（选学）$/, '') };
  }));
  const order = Object.keys(lessonOf);
  for (const id of order) {
    const { l, chapIdx, idx, chapName } = lessonOf[id];
    const f = path.join(ROOT, 'chapters/ch' + id.split('.')[0], l.file);
    if (!fs.existsSync(f)) continue;
    const raw = fs.readFileSync(f, 'utf8');
    const r = rel(f);
    const txt = (re) => { const m = raw.match(re); return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : ''; };
    const name = l.title.replace(/（选学）$/, '');
    const want = '§' + id + ' ' + l.title;

    if (path.basename(f, '.html').split('-')[0] !== id)
      add('导航一致', r + ' 文件名节号 ≠ TOC §' + id);
    const title = txt(/<title>([\s\S]*?)<\/title>/);
    if (title !== want + ' · 矩阵论') add('导航一致', r + ' <title>「' + title + '」≠「' + want + ' · 矩阵论」');
    const h1 = txt(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    if (h1 !== '§' + id + ' ' + name) add('导航一致', r + ' <h1>「' + h1 + '」≠「§' + id + ' ' + name + '」');
    const tt = txt(/<span class="tt">([\s\S]*?)<\/span>/);
    if (tt !== want) add('导航一致', r + ' 顶栏 .tt「' + tt + '」≠「' + want + '」');

    const bc = (raw.match(/<nav class="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
    const segs = [...bc.matchAll(/<(a|span)\b(?![^>]*class="sep")[^>]*>([\s\S]*?)<\/\1>/g)].map(x => x[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    if (segs.length !== 3) add('导航一致', r + ' 面包屑段数 ' + segs.length + '（应 3）');
    else {
      if (segs[0] !== '课程主页') add('导航一致', r + ' 面包屑首段「' + segs[0] + '」');
      if (segs[1] !== '第 ' + id.split('.')[0] + ' 章 ' + chapName) add('导航一致', r + ' 面包屑章段「' + segs[1] + '」≠「第 ' + id.split('.')[0] + ' 章 ' + chapName + '」');
      if (segs[2] !== want) add('导航一致', r + ' 面包屑末段「' + segs[2] + '」≠「' + want + '」');
    }

    const nav = (raw.match(/<nav class="lesson-nav"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
    const prevId = order[idx - 1], nextId = order[idx + 1];
    const get = (cls) => {
      const m = nav.match(new RegExp('<a class="' + cls + '" href="([^"]+)"><span class="ln-dir">([^<]*)</span><span class="ln-ttl">([^<]*)</span>'));
      return m ? { href: m[1], dir: m[2], ttl: m[3] } : null;
    };
    const chkNav = (cls, way, targetId) => {
      const cur = get(cls);
      if (!targetId) {
        if (cur && !(way === 'next' && /完结|主页/.test(cur.dir))) add('导航一致', r + ' ' + cls + ' 不应存在（' + (cur ? cur.dir + '|' + cur.ttl : '') + '）');
        return;
      }
      const t = lessonOf[targetId];
      if (!cur) { add('导航一致', r + ' ' + cls + ' 缺失（应指向 §' + targetId + '）'); return; }
      const cross = targetId.split('.')[0] !== id.split('.')[0];
      const wantDir = cross ? (way === 'prev' ? '上一章' : '下一章') : (way === 'prev' ? '上一节' : '下一节');
      const wantTtl = (cross ? '第 ' + targetId.split('.')[0] + ' 章 ' : '') + '§' + targetId + ' ' + t.l.title;
      if (cur.dir !== wantDir) add('导航一致', r + ' ' + cls + ' 文案「' + cur.dir + '」≠「' + wantDir + '」');
      if (cur.ttl !== wantTtl) add('导航一致', r + ' ' + cls + ' 标题「' + cur.ttl + '」≠「' + wantTtl + '」');
      const wantFile = path.join(ROOT, 'chapters/ch' + targetId.split('.')[0], t.l.file);
      if (path.normalize(path.resolve(path.dirname(f), cur.href)) !== path.normalize(path.resolve(wantFile)))
        add('导航一致', r + ' ' + cls + ' href=' + cur.href + ' ≠ §' + targetId + '（' + t.l.file + '）');
    };
    chkNav('ln-prev', 'prev', prevId);
    chkNav('ln-next', 'next', nextId);

    if (!/id="sec-summary"/.test(raw)) add('进度挂钩', r + ' 缺 id="sec-summary"（「标记本节为已完成」按钮挂钩，缺失则该页无法标记完成）');
  }
  // TOC 章名格式（与面包屑章段同形，避免「第1章」/「第 1 章」两套写法）
  for (const c of toc) if (!/^第\s+\d+\s+章\s/.test(c.chapter))
    add('导航一致', 'common.js TOC 章名「' + c.chapter + '」不符合「第 N 章 章名」格式');
}

/* ---------- 10. 母版 _template.html ---------- */
{
  const tpl = path.join(ROOT, '_template.html');
  const raw = fs.readFileSync(tpl, 'utf8');
  const r = '_template.html';
  toleratedTotal += checkTags(tpl, raw);
  const resolved = raw.split('@@ROOT@@').join('');
  for (const m of resolved.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
    const u = m[1];
    if (/^(https?:|data:|#)/i.test(u)) { if (/^https?:/i.test(u)) add('外链资源', r + ' -> ' + u); continue; }
    if (!/[./]/.test(u)) continue;                     // 模板里的示意性相对链接（如 1.2-xxx.html）不校验
    if (!fs.existsSync(path.join(ROOT, u))) add('资源缺失', r + ' -> @@ROOT@@' + u);
  }
  if (!/<html lang="zh-CN">/.test(raw)) add('缺元素', r + ' 缺 lang=zh-CN');
  if (!/Content-Security-Policy/.test(raw)) add('缺元素', r + ' 缺 CSP');
  for (const m of raw.matchAll(/<svg\b[^>]*>/gi))
    if (!/aria-hidden="true"/.test(m[0]) && !/role="img"/.test(m[0])) add('无障碍', r + ' svg 无 aria-hidden/role=img');
  for (const m of raw.matchAll(/<nav\b[^>]*>/gi))
    if (!/aria-label=/.test(m[0])) add('无障碍', r + ' nav 无可访问名: ' + m[0].slice(0, 60));
  if (!/id="sec-summary"/.test(raw)) add('进度挂钩', r + ' 母版缺 id="sec-summary"');
  if (!/class="chip">建议 <strong>/.test(raw)) add('计数不符', r + ' chips 学时口径应为「建议 <strong>N 学时</strong>」');
}

/* ---------- 输出 ---------- */
if (VERBOSE) {
  console.log('页面数 ' + files.length + ' | 课时 ' + stats.lessons + '（ready ' + stats.ready + '）| 组件 ' + stats.widgets +
    ' | \\tag 编号 ' + stats.tags + ' | 交叉引用实例 ' + stats.refs + ' | <p> 隐式闭合（容错）' + toleratedTotal + ' 处');
  console.log('');
}
if (problems.length) {
  for (const p of problems) console.log(p);
  console.log('');
  console.log('发现 ' + problems.length + ' 个问题。');
  process.exit(1);
} else {
  console.log('check-site: 全部通过（页面 ' + files.length + ' 个，组件 ' + stats.widgets + ' 个，\\tag 编号 ' + stats.tags + ' 个）');
  process.exit(0);
}
