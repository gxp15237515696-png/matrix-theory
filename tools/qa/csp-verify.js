#!/usr/bin/env node
/* ============================================================
   csp-verify.js —— 验证页面 CSP 是否真正阻断外发连接、且不误伤本地资源
   用法: node tools/qa/csp-verify.js
   检查: ① fetch('https://example.com') 被浏览器拒绝（connect-src 'none' 生效）
        ② 本地 JS 仍执行（common.js 注入的主题按钮存在）
        ③ 本地 CSS 仍生效（body 背景色取自 base.css 变量）
        ④ 本地字体/公式仍渲染（.katex 元素存在）
   退出码: 0 = 全部符合预期；1 = 不符合。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 9623, PROFILE = path.join(os.tmpdir(), 'csp-verify-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE = 'chapters/ch4/4.2-qr-decomposition.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});

(async () => {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; } catch (e) {}
  }
  if (!tg) { console.error('无法启动 Edge'); process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pd = {};
  const send = (m, p) => new Promise(r => { const i = ++id; pd[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Page.navigate', { url: 'file:///' + path.join(ROOT, PAGE).split(path.sep).join('/') });
  await sleep(1200);
  const ev = expr => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    .then(r => (r.exceptionDetails ? 'EXC:' + (r.exceptionDetails.text || '') : String(r.result.value)));

  const res = [];
  const fetchTry = await ev(`fetch('https://example.com').then(()=> 'ALLOWED').catch(e => 'BLOCKED: ' + e.message)`);
  res.push(['外发 fetch 被拒绝', /^BLOCKED/.test(fetchTry), fetchTry.slice(0, 90)]);
  const xhrTry = await ev(`new Promise(function(res){ try { var x = new XMLHttpRequest(); x.open('GET','https://example.com'); x.onload = function(){ res('ALLOWED'); }; x.onerror = function(){ res('BLOCKED'); }; x.send(); } catch (e) { res('BLOCKED: ' + e.message); } })`);
  res.push(['XHR 外发被拒绝', /^BLOCKED/.test(xhrTry), String(xhrTry).slice(0, 90)]);
  res.push(['本地 JS 生效（主题按钮已注入）', (await ev(`!!document.getElementById('theme-toggle')`)) === 'true', '']);
  res.push(['本地 CSS 生效（body 背景非透明）', (await ev(`getComputedStyle(document.body).backgroundColor`)) !== 'rgba(0, 0, 0, 0)', await ev(`getComputedStyle(document.body).backgroundColor`)]);
  res.push(['本地公式已渲染（.katex 存在）', (await ev(`document.querySelectorAll('.katex').length > 100`)) === 'true', 'katex 节点 ' + await ev(`document.querySelectorAll('.katex').length`)]);
  res.push(['实验台已挂载（组件容器存在）', (await ev(`!!document.querySelector('[data-qr-lab]')`)) === 'true', '']);

  let fail = 0;
  for (const [name, ok, note] of res) { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (note ? '  → ' + note : '')); if (!ok) fail++; }
  console.log('\nCSP 验证: ' + (res.length - fail) + ' 通过 / ' + fail + ' 失败');
  ws.close(); await sleep(200);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
