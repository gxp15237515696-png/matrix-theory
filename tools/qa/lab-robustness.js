#!/usr/bin/env node
/* ============================================================
   lab-robustness.js —— 实验台输入鲁棒性探测
   用法: node tools/qa/lab-robustness.js
   做法: 逐页打开 → 对页内所有输入依次灌入恶劣值（空串 / 字母 / 0 / 1e308 / -1），
         每次派发 input+change 事件；再点击各实验台的预设按钮；
         全程收集未捕获异常与 console error，并扫实验台输出里的 NaN / Infinity / undefined。
   目的: 36 个实验台均无 try/catch（见 audit\ledger.md 2026-09-28），任一处抛错会让整页演示台失效，
         本脚本把这类「输入即崩」问题变成可回归的门禁；同时把「不崩但显示 NaN」的一并拦住
        （JS 除零/开方取负不抛异常，只查异常会漏掉这一整类）。
   门禁口径（分三态，故意不一概而论）：
         默认态 / 预设态（教材例题取值）出现 NaN·Infinity·undefined → 失败；
         极端输入态（1e308、120 位数字等）出现浮点溢出 → 只记录不判失败。
         理由：1e308×1e308 溢出为 Infinity 是 IEEE 754 的诚实结果，把教学页的数学逻辑
         为「吸收极端输入」而重写风险远大于收益；而默认/预设态是学习者真正会看到的画面。
   退出码: 0 = 无异常且默认/预设态输出干净；1 = 有任一类问题。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 9662, PROFILE = path.join(os.tmpdir(), 'labrobust-profile-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
  req.on('error', rej);
});
function walk(d, out) {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'vendor', 'textbook', 'tools', 'audit', 'tmp'].includes(e.name)) walk(p, out); }
    else if (e.name.endsWith('.html') && !e.name.startsWith('_')) out.push(p);
  }
  return out;
}
const files = walk(path.join(ROOT, 'chapters'), []).map(f => path.relative(ROOT, f).split(path.sep).join('/')).sort();

// 恶劣输入：空串、非数字、0、极大数、负数、超长串
const NASTY = ['', 'abc', '0', '1e308', '-1', '9'.repeat(120)];
const INJECT = `(function(v){
  var ins = Array.prototype.slice.call(document.querySelectorAll('.lab-body input[type=text], .cl-grid input[type=text], .cl-matrix input[type=text]'));
  ins.forEach(function(el){ el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); });
  return ins.length;
})`;
/* 「输出即错」探针：抓取每个实验台容器的可见文本，查 NaN / Infinity / undefined。
   这些值在教学输出里几乎总是错的（除零、sqrt 取负、不可逆矩阵……），但 JS 不会抛异常，
   只查异常会漏掉"不崩但显示 NaN"的一整类缺陷。
   返回 JSON {n: 扫描到的实验台容器数, hits: [...]}；探针自身出错时由调用方判为门禁失败，
   绝不静默吞掉——否则又会变成"恒真检查器"。 */
const PROBE = `(function(){
  var out = [], n = 0;
  var els = Array.prototype.slice.call(document.querySelectorAll('*'));
  els.forEach(function(el){
    var hit = null;
    var attrs = el.attributes;
    for (var i = 0; i < (attrs ? attrs.length : 0); i++) {
      var nm = attrs[i].name;
      if (nm.indexOf('data-') === 0 && /-(lab|ball|stepper|fig)$/.test(nm)) hit = nm;
    }
    if (!hit) return;
    n++;
    var t = String(el.innerText || el.textContent || '');
    var m = t.match(/.{0,28}(NaN|Infinity|undefined).{0,28}/g);
    if (m) out.push(hit + ' :: ' + m.slice(0, 3).join(' || ').slice(0, 220));
  });
  return JSON.stringify({ n: n, hits: out });
})`;

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
  const send = (m, p) => new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => { if (pd[i]) { delete pd[i]; rej(new Error('CDP 超时: ' + m)); } }, 30000);
    pd[i] = v => { clearTimeout(t); res(v); };
    ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
  });
  let bucket = [];              // 当前页收集到的异常
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pd[m.id]) { pd[m.id](m.result); delete pd[m.id]; return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      bucket.push('未捕获异常: ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      bucket.push('console.error: ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable'); await send('Runtime.enable');

  const ev = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true })
    .then(r => (r.exceptionDetails ? 'EXC' : String(r.result.value)));

  let totalBad = 0, totalInputs = 0;
  const rows = [];
  for (const rel of files) {
    bucket = [];
    await send('Page.navigate', { url: 'file:///' + path.join(ROOT, rel).split(path.sep).join('/') });
    await sleep(1000);
    const probeBad = async () => {
      // 注意：PROBE 是函数表达式，必须写成 '(' + PROBE + ')()' 才会执行；
      // 早先直接 ev(PROBE) 传进去的是「函数对象」本身，返回 [object Object]，
      // 被 JSON.parse 静默吞成 []，于是"探针永远查不到 NaN"（假绿）。这里显式调用并把失败暴露出来。
      const raw = await ev('(' + PROBE + ')()');
      if (raw === 'EXC' || raw == null) { bucket.push('NaN 探针自身抛异常（门禁不可信）'); return []; }
      try {
        const o = JSON.parse(raw);
        if (!o || typeof o.n !== 'number') throw new Error('返回结构异常');
        if (o.n === 0) bucket.push('NaN 探针扫描到 0 个实验台容器（选择器失效，门禁不可信）');
        return o.hits || [];
      } catch (e) {
        bucket.push('NaN 探针返回不可解析: ' + String(raw).slice(0, 120) + '（门禁不可信）');
        return [];
      }
    };
    // ① 默认态：页面刚打开、尚未被任何输入污染（必须干净，出现 NaN/Infinity/undefined 即失败）
    const badDefault = await probeBad();
    const n = +(await ev(`document.querySelectorAll('.lab-body input[type=text], .cl-grid input[type=text], .cl-matrix input[type=text]').length`)) || 0;
    totalInputs += n;
    // ② 恶劣输入态
    for (const v of NASTY) { await ev('(' + INJECT + ')(' + JSON.stringify(v) + ')'); await sleep(90); }
    const badNasty = await probeBad();
    // ③ 预设按钮态：必须先重载页面清掉恶劣输入——不少 .sf-btn 是「模式切换」而非「复位」，
    //    直接接着点按钮会把 1e308 之类的值留在输入框里，测到的根本不是预设态（上一轮踩过这个坑）。
    await send('Page.navigate', { url: 'file:///' + path.join(ROOT, rel).split(path.sep).join('/') });
    await sleep(900);
    const btns = +(await ev(`document.querySelectorAll('.sf-btn').length`)) || 0;
    for (let i = 0; i < Math.min(btns, 12); i++) { await ev(`document.querySelectorAll('.sf-btn')[' + i + '].click()`); await sleep(120); }
    await sleep(150);
    const badPreset = await probeBad();
    const uniq = [...new Set(bucket)];
    // 门禁口径：默认态与预设态必须零 NaN/Infinity/undefined；
    // 极端输入（1e308 / 120 位数字）导致的浮点溢出单独记录，不计失败——见工具头部说明。
    const fatal = badDefault.concat(badPreset);
    if (uniq.length || fatal.length) totalBad++;
    rows.push({ page: rel, inputs: n, buttons: Math.min(btns, 12), errors: uniq, badValues: badNasty, badDefault: badDefault, badPreset: badPreset });
    process.stdout.write((uniq.length || fatal.length) ? 'F' : '.');
  }
  console.log('\n\n探测 ' + rows.length + ' 页 / ' + totalInputs + ' 个输入 × ' + NASTY.length + ' 种恶劣值 / ' + rows.reduce((a, r) => a + r.buttons, 0) + ' 次预设点击');
  if (totalBad) {
    for (const r of rows.filter(x => x.errors.length)) {
      console.log('\n异常: ' + r.page + '（输入 ' + r.inputs + '，按钮 ' + r.buttons + '）');
      for (const e of r.errors.slice(0, 4)) console.log('      ' + e.slice(0, 160));
    }
    for (const r of rows.filter(x => (x.badDefault || []).length)) {
      console.log('\n[失败] 默认态输出含 NaN/Infinity/undefined: ' + r.page);
      for (const e of r.badDefault.slice(0, 4)) console.log('      ' + e.slice(0, 200));
    }
    for (const r of rows.filter(x => (x.badPreset || []).length)) {
      console.log('\n[失败] 预设态输出含 NaN/Infinity/undefined: ' + r.page);
      for (const e of r.badPreset.slice(0, 4)) console.log('      ' + e.slice(0, 200));
    }
    console.log('');
    console.log('失败页面 ' + totalBad + ' / ' + rows.length);
  } else console.log('默认态与预设态输出无 NaN / Infinity / undefined；无未捕获异常 / console.error。');
  const warnPages = rows.filter(x => (x.badValues || []).length);
  if (warnPages.length) {
    console.log('\n（不计失败）极端输入下的浮点溢出 ' + warnPages.length + ' 页：');
    for (const r of warnPages) console.log('  ' + r.page + ' → ' + (r.badValues[0] || '').slice(0, 110));
  }
  const outJson = path.join(ROOT, '..', 'tmp', 'lab-robustness.json');
  try { fs.mkdirSync(path.dirname(outJson), { recursive: true }); } catch (e) {}
  try { fs.writeFileSync(outJson, JSON.stringify(rows, null, 2), 'utf8'); } catch (e) { console.log('（结果 JSON 写入失败，不影响判定: ' + e.message + '）'); }
  try { ws.close(); } catch (e) {}
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(totalBad ? 1 : 0);
})();
