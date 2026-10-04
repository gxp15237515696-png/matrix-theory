#!/usr/bin/env node
/* ============================================================
   shot.js —— 参数化页面截图工具（Edge headless CDP）
   用法: node tools/qa/shot.js <html文件> <输出png> [锚点id] [openAll|""] [窗口高]
   例:   node tools/qa/shot.js chapters/ch4/4.1-lu-decomposition.html out.png sec-exercises openAll
   说明: 结束时自动关闭无头 Edge 并清理临时 profile（历史坑：占用 profile 导致目录删不掉）
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..', '..');

const file = process.argv[2], out = process.argv[3];
const anchor = process.argv[4] || '';
const openAll = process.argv[5] === 'openAll';
const winH = parseInt(process.argv[6] || '1600', 10);
if (!file || !out) { console.error('用法: node tools/qa/shot.js <html文件> <输出png> [锚点id] [openAll] [窗口高]'); process.exit(1); }

const PORT = 9340 + Math.floor(Math.random() * 100);
const PROFILE = path.join(require('os').tmpdir(), 'shot-profile-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => { http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej); });

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1440,' + winH, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; } catch (e) {}
  }
  if (!tg) { console.error('无法连接 Edge'); try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {} process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (m, p) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  const url = 'file:///' + path.resolve(ROOT, file).split(path.sep).join('/');
  await send('Page.navigate', { url });
  for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState' }); if (r.result && r.result.value === 'complete') break; await sleep(250); }
  await sleep(900);
  const js = "(function(){" +
    "var st=document.createElement('style');st.textContent='html{scroll-behavior:auto!important}';document.head.appendChild(st);" +
    (openAll ? "document.querySelectorAll('details').forEach(function(d){d.open=true});" : "") +
    (anchor ? "var el=document.getElementById('" + anchor + "'); if(el) el.scrollIntoView(); window.scrollBy(0,-70);" : "") +
    "var errs=[];window.onerror=function(m){errs.push(String(m))};return document.title;})()";
  const title = await send('Runtime.evaluate', { expression: js });
  await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), Buffer.from(shot.data, 'base64'));
  console.log('已截图 ' + out + '  （' + (title.result && title.result.value) + '）');
  ws.close();
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
