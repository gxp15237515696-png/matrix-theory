#!/usr/bin/env node
/* ============================================================
   mobile-sweep.js —— 375px 移动端横向溢出巡检（Edge headless CDP）
   用法: node tools/qa/mobile-sweep.js [截图目录]
   检查: 每页在 375px 视口下
         ① 折叠态 scrollWidth <= 375（允许 1px 误差）
         ② 展开全部 <details> 后再测一次（宽公式多在折叠证明内）
   退出码: 0 = 无溢出；1 = 发现溢出。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2])
  : path.resolve(ROOT, '..', 'tmp', 'mobile');
const PORT = 9621, PROFILE = path.join(os.tmpdir(), 'sweep-profile-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});
const fileUrl = rel => 'file:///' + path.join(ROOT, rel).split(path.sep).join('/');

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || ['node_modules', 'vendor', 'textbook', 'tools', 'audit'].includes(e.name)) continue;
      walk(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = walk(ROOT, [])
  .map(f => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter(f => !f.startsWith('_'))
  .sort();

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=375,800', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; } catch (e) {}
  }
  if (!tg) { console.error('无法启动 Edge'); process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pd = {};
  const send = (m, p) => new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { if (pd[i]) { delete pd[i]; rej(new Error('CDP 超时: ' + m)); } }, 30000);
    pd[i] = v => { clearTimeout(timer); res(v); };
    ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
  });
  ws.onmessage = async e => {
    const m = JSON.parse(e.data);
    if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 800, deviceScaleFactor: 2, mobile: true });

  const measure = () => send('Runtime.evaluate', {
    expression: 'JSON.stringify({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})',
    returnByValue: true
  }).then(r => JSON.parse(r.result.value));
  const expandAll = () => send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("details").forEach(d => d.open = true); document.querySelectorAll("details").length',
    returnByValue: true
  }).then(r => r.result.value);
  const waitRender = () => sleep(500);

  const bad = [];
  for (const f of files) {
    await send('Page.navigate', { url: fileUrl(f) });
    await sleep(700);
    const m1 = await measure();
    const n = await expandAll();
    await waitRender();
    const m2 = await measure();
    const over1 = m1.sw - m1.cw, over2 = m2.sw - m2.cw;
    const ok = over1 <= 1 && over2 <= 1;
    process.stdout.write(ok ? '.' : (over2 > 1 ? 'F' : 'f'));
    if (!ok) {
      bad.push({ f, collapsed: m1, expanded: m2, details: n });
      fs.mkdirSync(OUT, { recursive: true });          // 惰性建目录：干净通过时不留下空目录
      await send('Page.captureScreenshot', { format: 'png' }).then(r =>
        fs.writeFileSync(path.join(OUT, f.replace(/[\\/]/g, '_') + '.png'),
          Buffer.from(r.data, 'base64')));
    }
  }
  console.log();
  console.log('扫描 ' + files.length + ' 页（375px，折叠态 + 全部 details 展开态）');
  if (bad.length) {
    console.log('横向溢出页面:');
    for (const b of bad) console.log('  ' + b.f + ' 折叠 sw=' + b.collapsed.sw + ' 展开 sw=' + b.expanded.sw + '（details ' + b.details + '）');
    console.log('截图: ' + OUT);
  } else {
    console.log('无横向溢出（无失败截图，故不生成输出目录）');
  }
  // 收尾：断开 CDP、结束 headless Edge、删除临时 profile（否则残留进程与目录）
  try { ws.close(); } catch (e) {}
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(bad.length ? 1 : 0);
})();
