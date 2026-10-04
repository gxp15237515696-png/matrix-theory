#!/usr/bin/env node
/* 一次性统计：31 份逐节审查报告的问题行数（区分「问题清单表」与「疑似/备案」节）
   报告目录：默认 <任务>/tmp/review，可用第一个参数覆盖。
   该目录属临时区（可随时清空），历史报告已被清理；此时打印说明并正常退出，不抛栈。 */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', '..', '..', 'tmp', 'review');
if (!fs.existsSync(DIR)) {
  console.log('count-findings: 报告目录不存在: ' + DIR);
  console.log('（这些逐节审查报告存放在任务临时区，属可清理内容；需要统计时请把报告放回该目录或用参数指定。）');
  process.exit(0);
}
const files = fs.readdirSync(DIR).filter(f => /^\d-\d/.test(f) && f.endsWith('.md')).sort();
if (!files.length) {
  console.log('count-findings: ' + DIR + ' 下没有匹配 \\d-\\d*.md 的报告文件。');
  process.exit(0);
}
let tot = { P0: 0, P1: 0, P2: 0 }, totAll = { P0: 0, P1: 0, P2: 0 };
const detail = [];
for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split(/\r?\n/);
  let inSuspect = false, c = { P0: 0, P1: 0, P2: 0 }, cs = { P0: 0, P1: 0, P2: 0 };
  for (const l of lines) {
    if (/^#{1,4}\s/.test(l)) inSuspect = /疑似|备案|存疑|拿不准/.test(l);
    const m = l.match(/^\|\s*(P[012])\s*\|/);
    if (m) { totAll[m[1]]++; if (inSuspect) cs[m[1]]++; else c[m[1]]++; }
  }
  tot.P0 += c.P0; tot.P1 += c.P1; tot.P2 += c.P2;
  detail.push(f.padEnd(46) + ' 表内 P0/P1/P2 = ' + c.P0 + '/' + c.P1 + '/' + c.P2 +
    (cs.P0 + cs.P1 + cs.P2 ? '   疑似节另计 ' + cs.P0 + '/' + cs.P1 + '/' + cs.P2 : ''));
}
console.log(detail.join('\n'));
console.log('\n报告数: ' + files.length);
console.log('问题清单表内合计（权威口径）: P0 ' + tot.P0 + ' / P1 ' + tot.P1 + ' / P2 ' + tot.P2);
console.log('含疑似节全部行:            P0 ' + totAll.P0 + ' / P1 ' + totAll.P1 + ' / P2 ' + totAll.P2);
