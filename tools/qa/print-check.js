#!/usr/bin/env node
/* ============================================================
   print-check.js —— 打印模式抽查（Edge headless CDP printToPDF）
   用法: node tools/qa/print-check.js [页面相对路径 ...]
   产出: 每页 PDF 到 <tmp>/print/，并在模拟纸张宽度下检测
         是否存在元素横向超出（打印时 overflow:visible 内容被裁）。
   退出码: 0 = 通过；1 = 有问题。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUTDIR = path.resolve(ROOT, '..', 'tmp', 'print');
const PORT = 9622, PROFILE = path.join(os.tmpdir(), 'sweep-profile-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});
const fileUrl = rel => 'file:///' + path.join(ROOT, rel).split(path.sep).join('/');

const targets = process.argv.slice(2).length ? process.argv.slice(2) : [
  'index.html',
  'chapters/ch4/4.1-lu-decomposition.html',
  'chapters/ch4/4.2-qr-decomposition.html',
  'chapters/ch6/6.3-generalized-inverse-computation.html',
];
// 目标页必须真实存在，否则会「检查一个不存在的页面」并静默通过
const absent = targets.filter(t => !fs.existsSync(path.join(ROOT, t)));
if (absent.length) { console.error('目标页不存在: ' + absent.join(', ')); process.exit(2); }

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1200,1000', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'seed'); if (!p) { const q = t.find(x => x.type === 'page'); if (q && q.webSocketDebuggerUrl) tg = q; } } catch (e) {}
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
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  // 全程模拟打印媒体，使 @media print 规则（隐藏侧栏、layout 块化）生效
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  // 同时把视口压到 A4 宽度（8.27in × 96dpi ≈ 794px）：只切媒体而不改视口，
  // 等于仍按 1200px 窗口测，会系统性漏检打印态横向溢出
  await send('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });

  let fail = 0;
  for (const rel of targets) {
    await send('Page.navigate', { url: fileUrl(rel) });
    await sleep(900);
    // 打印媒体下：展开全部折叠块后，页面不应有横向滚动（A4 内容宽 ≈ 688px @96dpi）
    const probe = await send('Runtime.evaluate', {
      expression: `(function(){
        document.querySelectorAll('details').forEach(function(d){ d.open = true; });
        var de = document.documentElement;
        return JSON.stringify({sw: de.scrollWidth, cw: de.clientWidth,
          over: de.scrollWidth - de.clientWidth});
      })()`,
      returnByValue: true
    }).then(r => JSON.parse(r.result.value));
    const pdf = await send('Page.printToPDF', {
      printBackground: false,
      paperWidth: 8.27, paperHeight: 11.69,
      marginTop: 0.5, marginBottom: 0.5, marginLeft: 0.55, marginRight: 0.55,
    });
    const buf = Buffer.from(pdf.data, 'base64');
    const name = rel.replace(/[\\/]/g, '_').replace(/\.html$/, '') + '.pdf';
    fs.writeFileSync(path.join(OUTDIR, name), buf);
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const ok = probe.over <= 1 && pages >= 1;
    console.log((ok ? 'PASS ' : 'FAIL ') + rel + '  PDF ' + pages + ' 页, ' + (buf.length / 1024).toFixed(0) + ' KB' + (ok ? '' : '，打印态横向溢出 ' + probe.over + 'px (sw=' + probe.sw + ')'));
    if (!ok) fail++;
  }
  console.log();
  console.log('打印 PDF 输出: ' + OUTDIR);
  // 收尾：断开 CDP、结束 headless Edge、删除临时 profile（否则会残留进程与目录）
  try { ws.close(); } catch (e) {}
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
