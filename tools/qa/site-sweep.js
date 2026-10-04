#!/usr/bin/env node
/* ============================================================
   site-sweep.js —— 全站浏览器扫描（Edge headless CDP）
   用法: node tools/qa/site-sweep.js [输出目录]
   功能: 逐页打开全站 HTML（含 _template），收集
         ① 控制台错误 / 未捕获异常  ② 资源加载失败（404 等）
         并逐页截图到输出目录（默认 <tmp>/sweep，即任务 tmp\sweep\）。
   退出码: 0 = 无问题；1 = 发现问题。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2])
  : path.resolve(ROOT, '..', 'tmp', 'sweep');
const PORT = 9620, PROFILE = path.join(os.tmpdir(), 'sweep-profile-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});
const url = rel => 'file:///' + path.join(ROOT, rel).split(path.sep).join('/');

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
  .filter(f => !f.startsWith('_'))        // _template.html 是母版（复制到 chapters/chN/ 后引用才成立），不属真实页面
  .sort();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1440,1200', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; } catch (e) {}
  }
  if (!tg) { console.error('无法启动 Edge'); process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pd = {};
  const problems = [];
  let cur = '';
  const send = (m, p) => new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { if (pd[i]) { delete pd[i]; rej(new Error('CDP 超时: ' + m)); } }, 30000);
    pd[i] = v => { clearTimeout(timer); res(v); };
    ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
  });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      problems.push(cur + ' 未捕获异常: ' + (d.exception && d.exception.description || d.text).split('\n')[0]);
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      problems.push(cur + ' 控制台错误: ' + String(m.params.entry.text).slice(0, 160));
    } else if (m.method === 'Network.loadingFailed') {
      problems.push(cur + ' 资源加载失败: ' + (m.params.errorText || '') + ' ' + (m.params.type || ''));
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');

  for (const f of files) {
    cur = f;
    await send('Page.navigate', { url: url(f) });
    await sleep(1400);                       // 等 KaTeX 渲染与交互组件初始化
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const name = f.replace(/[\\/]/g, '_').replace(/\.html$/, '') + '.png';
    fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
    process.stdout.write('.');
  }
  console.log('\n扫描 ' + files.length + ' 页，截图输出: ' + OUT);
  if (problems.length) {
    console.log('\n发现 ' + problems.length + ' 个问题:');
    problems.forEach(p => console.log('  ' + p));
    process.exitCode = 1;
  } else console.log('无控制台错误 / 未捕获异常 / 资源加载失败。');
  try { ws.close(); } catch (e) {}
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(600);   // 等 Edge 真正退出再删 profile，否则文件仍被占用会残留目录
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(process.exitCode || 0);
})();
