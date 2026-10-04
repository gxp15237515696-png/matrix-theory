#!/usr/bin/env node
/* ============================================================
   stack-trace.js —— 标签栈诊断工具（配合 check-site.js 定位结构缺陷）
   用法: node tools/qa/stack-trace.js <html文件> [起始行] [结束行]
   输出: 指定行区间内的入栈/出栈事件、深度变化与不匹配细节
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path');
const file = process.argv[2];
if (!file) { console.error('用法: node tools/qa/stack-trace.js <html文件> [起始行] [结束行]'); process.exit(1); }
const LO = parseInt(process.argv[3] || '1', 10);
const HI = parseInt(process.argv[4] || '1000000', 10);

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base', 'col',
  'embed', 'param', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'use', 'stop', 'marker', 'text', 'tspan', 'ellipse']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);

const s = fs.readFileSync(path.resolve(file), 'utf8');
const lower = s.toLowerCase();
const lineAt = o => s.slice(0, o).split('\n').length;
const stack = [];
let i = 0, phantomP = 0, tolerated = 0;

while (true) {
  const a = s.indexOf('<', i);
  if (a < 0) break;
  const b = s.indexOf('>', a);
  if (b < 0) break;
  let tok = s.slice(a + 1, b);
  const L = lineAt(a);
  const show = L >= LO && L <= HI;
  if (tok.startsWith('!--')) { const e = s.indexOf('-->', a + 2); i = e < 0 ? b + 1 : e + 3; continue; }
  if (tok.startsWith('!')) { i = b + 1; continue; }
  const skip = tok.match(/^(script|style)\b/i);
  if (skip) { const tag = skip[1].toLowerCase(); const e = lower.indexOf('</' + tag, b); i = e < 0 ? b + 1 : e + tag.length + 3; continue; }
  const tm = tok.match(/^(\/?)([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tm) { i = a + 1; continue; }
  const closing = tm[1] === '/', name = tm[2].toLowerCase();
  const self = tok.endsWith('/');
  i = b + 1;
  if (VOID.has(name) || self) { if (show && !VOID.has(name)) console.log('L' + L + ' 自闭合 <' + name + '/>'); continue; }
  if (!closing) {
    let popped = 0;
    if (BLOCK.has(name)) while (stack.length && stack[stack.length - 1].name === 'p') { stack.pop(); phantomP++; popped++; tolerated++; }
    stack.push({ name, at: a });
    if (show) console.log('L' + L + ' +<' + name + '>' + (popped ? ' （隐式闭 p×' + popped + '）' : '') + '  深度=' + stack.length);
  } else {
    while (stack.length && stack[stack.length - 1].name === 'p' && name !== 'p') { stack.pop(); phantomP++; tolerated++; }
    const top = stack[stack.length - 1];
    if (top && top.name === name) { stack.pop(); if (show) console.log('L' + L + ' -</' + name + '>  深度=' + stack.length); }
    else if (name === 'p' && phantomP > 0) { phantomP--; if (show) console.log('L' + L + ' -</p> （消耗隐式段落）'); }
    else {
      const idx = stack.map(x => x.name).lastIndexOf(name);
      console.log('★ L' + L + ' -</' + name + '> 不匹配：栈顶=' + (top ? top.name + '@L' + lineAt(top.at) : '(空)') +
        ' 同名下标=' + idx + (idx >= 0 ? ' 栈内自该处起: ' + stack.slice(idx).map(x => '<' + x.name + '>@L' + lineAt(x.at)).join(' ') : ''));
      if (idx >= 0) stack.length = idx;
    }
  }
}
console.log('—— 结束：栈深 ' + stack.length + '，隐式段落消耗 ' + tolerated + ' 处');
if (stack.length) console.log('   未闭合: ' + stack.map(x => '<' + x.name + '>@L' + lineAt(x.at)).join(' '));
