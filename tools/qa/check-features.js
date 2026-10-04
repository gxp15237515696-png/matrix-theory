#!/usr/bin/env node
/* 阶段 6 功能自检：主题切换 / 学习进度 / 打印按钮（DOM 级断言） */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 9520, PROFILE = path.join(os.tmpdir(), 'qafeat-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});
const url = rel => 'file:///' + path.join(ROOT, rel).split(path.sep).join('/');

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; } catch (e) {}
  }
  if (!tg) { console.error('无法连接 Edge'); process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pd = {};
  const send = (m, p) => new Promise(r => { const i = ++id; pd[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  const nav = async (rel) => {
    await send('Page.navigate', { url: url(rel) });
    for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState' }); if (r.result && r.result.value === 'complete') break; await sleep(250); }
    await sleep(900);
  };

  let pass = 0, fail = 0;
  const chk = (name, ok, extra) => { if (ok) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } };

  // ① 课时页注入
  await nav('chapters/ch6/6.2-penrose-existence.html');
  chk('主题切换按钮已注入', await ev("!!document.getElementById('theme-toggle')"));
  chk('「标记完成」按钮已注入', await ev("!!document.querySelector('.done-btn')"));
  chk('「打印本节」按钮已注入', await ev("!!document.querySelector('.print-line button')"));
  const dots = await ev("document.querySelectorAll('.progress-dot').length");
  chk('侧栏学习状态点已注入（>20 个）', dots > 20, '实际 ' + dots);

  // ② 主题切换生效
  const before = await ev("JSON.stringify({t:document.documentElement.getAttribute('data-theme'),bg:getComputedStyle(document.body).backgroundColor})");
  const b0 = JSON.parse(before);
  await ev("document.getElementById('theme-toggle').click()");
  await sleep(300);
  const after = await ev("JSON.stringify({t:document.documentElement.getAttribute('data-theme'),bg:getComputedStyle(document.body).backgroundColor,c:getComputedStyle(document.body).color})");
  const o = JSON.parse(after);
  chk('点击后主题属性翻转（' + b0.t + ' → ' + o.t + '）', o.t !== b0.t);
  // 底色必须真的换了（与切换前不同）且非透明；原写法 `bg !== 'rgba(0,0,0,0)'` 是恒真断言
  chk('深色底色/墨色确实切换', o.bg !== b0.bg && o.bg !== 'rgba(0, 0, 0, 0)', o.bg + '（切换前 ' + b0.bg + '）/ ' + o.c);

  // ③ 进度写入 localStorage
  await ev("document.querySelector('.done-btn').click()");
  await sleep(300);
  const store = await ev("localStorage.getItem('matrix-course/progress')");
  chk('完成标记已写入 localStorage', !!store && store.includes('6.2'), store);

  // ④ 首页进度条
  await nav('index.html');
  const hp = await ev("(function(){var h=document.getElementById('home-progress');return h? h.innerText.replace(/\\s+/g,' ') : 'MISSING';})()");
  chk('首页进度条已渲染且含完成计数', /学习进度/.test(hp) && /1 \/ 31/.test(hp), hp);
  chk('首页主题按钮存在', await ev("!!document.getElementById('theme-toggle')"));

  console.log('\n功能自检: ' + pass + ' 通过 / ' + fail + ' 失败');
  ws.close();
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(400);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
