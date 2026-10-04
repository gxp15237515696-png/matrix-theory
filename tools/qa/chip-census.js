#!/usr/bin/env node
/* chip-census.js —— 只读统计：对比每页 chips 自述数 / 卡片数 / 陈述编号数（按类型） */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'vendor', 'textbook', 'tools', 'audit'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const KIND = '(定理|定义|引理|推论|例题|例)';
const rows = [];
for (const f of walk(ROOT, []).sort()) {
  const raw = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  // chips
  const chips = {};
  const cb = raw.match(/<div class="chips">([\s\S]*?)<\/div>/);
  if (cb) for (const m of cb[1].matchAll(/class="chip"[^>]*>([\s\S]*?)<\/span>/g)) {
    const t = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const km = t.match(new RegExp('^' + KIND + '\\s*([0-9]+)'));
    if (km) chips[km[1] === '例题' ? '例' : km[1]] = +km[2];
  }
  // 卡片数
  const cards = {};
  for (const m of raw.matchAll(/class="card-label"[^>]*>([^<]*)/g)) {
    const L = m[1].trim();
    for (const k of ['定义', '定理', '引理', '推论', '例']) if (L.startsWith(k)) { cards[k] = (cards[k] || 0) + 1; break; }
  }
  cards['习题'] = (raw.match(/class="card task"/g) || []).length;
  // 陈述编号（卡片标签 + 表格 <strong> + 括注），按类型去重
  const decl = {}, declNoParen = {};
  const add = (kind, num) => { (decl[kind] = decl[kind] || new Set()).add(num); };
  const addNP = (kind, num) => { (declNoParen[kind] = declNoParen[kind] || new Set()).add(num); };
  for (const m of raw.matchAll(/class="card-label"[^>]*>([^<]*)/g)) {
    const L = m[1];
    for (const x of L.matchAll(new RegExp(KIND + '[ ]*([0-9]+(?:\\.[0-9]+)*)', 'g'))) { add(x[1] === '例题' ? '例' : x[1], x[2]); addNP(x[1] === '例题' ? '例' : x[1], x[2]); }
  }
  for (const m of raw.matchAll(/<strong>\s*((?:定理|定义|引理|推论|例)\s*[0-9][0-9.]*[^<]{0,24})<\/strong>/g)) {
    for (const x of m[1].matchAll(new RegExp(KIND + '[ ]*([0-9]+(?:\\.[0-9]+)*)', 'g'))) { add(x[1] === '例题' ? '例' : x[1], x[2]); addNP(x[1] === '例题' ? '例' : x[1], x[2]); }
  }
  for (const m of raw.matchAll(new RegExp('（(' + KIND + ')\\s*([0-9]+(?:\\.[0-9]+)*)）', 'g'))) add(m[1] === '例题' ? '例' : m[1], m[2]);
  // 区间型声明（如「定理 6.36–6.38」）展开
  for (const m of raw.matchAll(new RegExp('(' + KIND + ')\\s*([0-9]+)\\.([0-9]+)[ ]*[–—~-][ ]*(?:([0-9]+)\\.)?([0-9]+)', 'g'))) {
    const kind = m[1] === '例题' ? '例' : m[1], lo = +m[3], hi = +m[5];
    if (hi > lo && hi - lo <= 20) for (let n = lo + 1; n <= hi; n++) { add(kind, m[2] + '.' + n); addNP(kind, m[2] + '.' + n); }
  }
  const declCount = {}; for (const k in decl) declCount[k] = decl[k].size;
  const npCount = {}; for (const k in declNoParen) npCount[k] = declNoParen[k].size;
  if (!Object.keys(chips).length) continue;
  const kinds = ['定义', '定理', '引理', '推论', '例', '习题'];
  const line = kinds.filter(k => chips[k] !== undefined || cards[k] || npCount[k])
    .map(k => k + ' ' + (chips[k] ?? '-') + '/' + (cards[k] ?? '-') + '/' + (npCount[k] ?? '-')).join('  ');
  rows.push(rel + '\n    chip/卡片/陈述(去括注)  ' + line);
}
console.log(rows.join('\n'));
console.log('\n格式：类型 chip数/卡片数/去重陈述编号数(已排除括注引用与区间展开)');
