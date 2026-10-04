#!/usr/bin/env node
/* ============================================================
   mutation-check.js —— 变异测试：验证各检查器在「代码被破坏」时是否真会失败
   用法: node tools/qa/mutation-check.js
   原理: 把项目整体复制到 <task>/tmp/mutation/work，逐个注入故意错误，
        运行对应检查器，记录「是否被抓到」，随后还原该文件。
        绝不修改正式项目文件。
   退出码: 0 = 全部变异均被检出；1 = 存在漏检（测试预言机薄弱）。
   ============================================================ */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '..', '..');
const TASK = path.resolve(SRC, '..');
const WORK = path.join(TASK, 'tmp', 'mutation', 'work');

// ---------- 变异定义（apply 返回 null 表示前置条件不满足，跳过） ----------
const MUT = [
  { id: 'M1 链接断裂', file: 'chapters/ch1/1.1-linear-spaces.html', checker: 'check-site.js',
    apply: s => s.replace(/(href="[^"]*?)1\.2-linear-transformations\.html/, '$1MISSING-1.2.html') === s
      ? null : s.replace(/(href="[^"]*?)1\.2-linear-transformations\.html/, '$1MISSING-1.2.html') },
  { id: 'M2 重复 id', file: 'chapters/ch1/1.1-linear-spaces.html', checker: 'check-site.js',
    apply: s => s.includes('id="toc-this-page"></div>') ? null
      : s.replace('</body>', '<div id="toc-this-page"></div>\n</body>') },
  { id: 'M3 hero 芯片计数错', file: 'chapters/ch1/1.1-linear-spaces.html', checker: 'check-site.js',
    apply: s => { const m = s.match(/(<span class="chip">定义 <strong>)(\d+)( 个<\/strong>)/);
      return m ? s.replace(m[0], m[1] + (parseInt(m[2], 10) + 1) + m[3]) : null; } },
  { id: 'M4 公式非法（\\sqrt→\\sqrtzz）', file: 'chapters/ch4/4.2-qr-decomposition.html', checker: 'check-katex.js',
    apply: s => /\\sqrt(?=[0-9])/.test(s) ? s.replace(/\\sqrt(?=[0-9])/g, '\\sqrtzz') : null },
  { id: 'M5 组件算法破坏（LU 二阶行列式 det2 符号）', file: 'assets/js/interactives.js', checker: 'check-math.js',
    apply: s => { const anchor = 'function det2(B) { return B[0][0]*B[1][1]-B[0][1]*B[1][0]; }';
      return s.includes(anchor) ? s.replace(anchor, 'function det2(B) { return B[0][0]*B[1][1]+B[0][1]*B[1][0]; }') : null; } },
  { id: 'M6 资源 404（common.js 改名）', file: 'index.html', checker: 'tools/qa/site-sweep.js',
    apply: s => s.includes('assets/js/common.js') ? s.replace('assets/js/common.js', 'assets/js/commonX.js') : null },
  { id: 'M7 移动端溢出（注入 900px 宽块）', file: 'chapters/ch4/4.1-lu-decomposition.html', checker: 'tools/qa/mobile-sweep.js',
    apply: s => s.replace('</body>', '<div style="width:900px;height:10px"></div>\n</body>') },
  { id: 'M8 打印溢出（注入 900px 宽块）', file: 'chapters/ch4/4.1-lu-decomposition.html', checker: 'tools/qa/print-check.js',
    apply: s => s.replace('</body>', '<div style="width:900px;height:10px"></div>\n</body>') },
  { id: 'M9 首页进度条缺失（id 改名）', file: 'index.html', checker: 'tools/qa/check-features.js',
    apply: s => s.includes('id="home-progress"') ? s.replace('id="home-progress"', 'id="home-progress-X"') : null },
  { id: 'M10 习题引用失效（引用不存在的习题小节）', file: 'chapters/ch6/6.4-linear-systems.html', checker: 'check-site.js',
    apply: s => s.replace('data-active="6.4"', 'data-active="6.4"><p>参见习题 9.9 第 1 题</p>') === s
      ? null : s.replace('data-active="6.4"', 'data-active="6.4"><p>参见习题 9.9 第 1 题</p>') },
  { id: 'M11 特征值判别式退回绝对阈值', file: 'assets/js/interactives.js', checker: 'check-math.js',
    apply: s => !s.includes('disc > dtol') ? null
      : s.replace(/disc > dtol/g, 'disc > 1e-12') },
  { id: 'M12 QR 验证行改回硬编码', file: 'assets/js/interactives.js', checker: 'check-math.js',
    apply: s => { const m = s.match(/'[^']*与 A 一致[^']*'/); return m ? s.replace(m[0], "'✓ 与 A 一致'") : null; } },
  /* M13~M18：本轮新增的「导航/标题一致性」与「进度挂钩」检查项自身的有效性验证 */
  { id: 'M13 面包屑末段丢节号', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'check-site.js',
    apply: s => s.includes('<span>§2.2 矩阵的范数</span>') ? s.replace('<span>§2.2 矩阵的范数</span>', '<span>矩阵的范数</span>') : null },
  { id: 'M14 翻页标题与目标不符', file: 'chapters/ch4/4.2-qr-decomposition.html', checker: 'check-site.js',
    apply: s => s.replace(/ln-ttl">§4\.3 [^<]*</, 'ln-ttl">§4.3 被改坏的标题<') === s ? null
      : s.replace(/ln-ttl">§4\.3 [^<]*</, 'ln-ttl">§4.3 被改坏的标题<') },
  { id: 'M15 进度挂钩 id 缺失', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'check-site.js',
    apply: s => s.includes('id="sec-summary"') ? s.replace('id="sec-summary"', 'id="sec-summaryX"') : null },
  { id: 'M16 TOC 标题与页内 h1 不一致', file: 'assets/js/common.js', checker: 'check-site.js',
    apply: s => s.includes("title: '矩阵的范数'") ? s.replace("title: '矩阵的范数'", "title: '矩阵的范数（被改坏）'") : null },
  { id: 'M17 母版 chips 学时口径漂移', file: '_template.html', checker: 'check-site.js',
    apply: s => s.includes('<span class="chip">建议 <strong>') ? s.replace('<span class="chip">建议 <strong>', '<span class="chip">建议学时 <strong>') : null },
  { id: 'M18 资源 src 改名（404）', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'check-site.js',
    apply: s => s.includes('assets/css/base.css') ? s.replace('assets/css/base.css', 'assets/css/baseX.css') : null },
  /* M19~M23：结构门禁 template-drift.js 与 KaTeX 宏单一来源自身的有效性验证 */
  { id: 'M19 母版 h1 与课时页重复', file: '_template.html', checker: 'tools/qa/template-drift.js',
    apply: s => s.includes('<h1>§N.M 节标题</h1>') ? s.replace('<h1>§N.M 节标题</h1>', '<h1>§2.2 矩阵的范数</h1>') : null },
  { id: 'M20 课时页丢一个样式表', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'tools/qa/template-drift.js',
    apply: s => s.includes('assets/css/components.css') ? s.replace(/<link rel="stylesheet" href="[^"]*components\.css">\n?/, '') : null },
  { id: 'M21 注入可执行内联脚本', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'tools/qa/template-drift.js',
    apply: s => s.replace('</body>', '<script>var x=1;</script>\n</body>') === s ? null : s.replace('</body>', '<script>var x=1;</script>\n</body>') },
  { id: 'M22 nav 去掉 aria-label', file: 'chapters/ch2/2.2-matrix-norms.html', checker: 'tools/qa/template-drift.js',
    apply: s => s.includes('<nav class="breadcrumb" aria-label="面包屑">') ? s.replace('<nav class="breadcrumb" aria-label="面包屑">', '<nav class="breadcrumb">') : null },
  { id: 'M23 KaTeX 宏表从 common.js 消失', file: 'assets/js/common.js', checker: 'check-katex.js',
    apply: s => s.includes('macros: {') ? s.replace('macros: {', 'macrosGone: {') : null },
  { id: 'M24 数值解析退化为恒 NaN', file: 'assets/js/interactives.js', checker: 'tools/qa/lab-robustness.js',
    apply: s => s.includes('function num(s) { var v = parseFloat(s); return isNaN(v) ? 0 : v; }')
      ? s.replace('function num(s) { var v = parseFloat(s); return isNaN(v) ? 0 : v; }', 'function num(s) { return NaN; }') : null },
  { id: 'M25 范数计算悄悄返回 NaN（不抛异常）', file: 'assets/js/interactives.js', checker: 'tools/qa/lab-robustness.js',
    apply: s => s.includes('function norm(a) { return Math.sqrt(dot(a, a)); }')
      ? s.replace('function norm(a) { return Math.sqrt(dot(a, a)); }', 'function norm(a) { return NaN; }') : null },
  { id: 'M26 TOC 章名格式漂移', file: 'assets/js/common.js', checker: 'check-site.js',
    apply: s => s.includes("chapter: '第 1 章 ") ? s.replace("chapter: '第 1 章 ", "chapter: '第1章 ") : null },
];

// ---------- 复制项目到 work（每次重做，避免复制作过期导致"测的是旧检查器"） ----------
// textbook/ 是受版权保护的教材原件，任何检查器都不读它，排除后复制更快且不把教材扩散到临时目录。
const EXCLUDE = new RegExp(String.raw`[\\/](tmp|textbook)([\\/]|$)`);
if (fs.existsSync(WORK)) fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.cpSync(SRC, WORK, { recursive: true, filter: p => !EXCLUDE.test(p) });
console.log('已复制项目到 ' + WORK);

function run(cmd, args) {
  const r = spawnSync(process.execPath, [cmd, ...args], { cwd: WORK, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  // 崩溃特征：未捕获异常栈（Error: ... / at ... / Node.js v...），而不是检查器自己打印的问题清单
  const crashed = r.signal != null || /^Error: |^Node\.js v|^\s+at .+:\d+:\d+\)?$/m.test((r.stderr || ''));
  return { code: r.status, out, crashed };
}

console.log('\n变异测试：逐个注入错误，检验检查器是否报错\n');
const only = process.argv[2] || '';
const list = only ? MUT.filter(m => m.id.includes(only)) : MUT;
if (!list.length) { console.error('无匹配变异: ' + only); process.exit(2); }
const rows = [];
for (const m of list) {
  const src = fs.readFileSync(path.join(SRC, m.file), 'utf8');
  const mutated = m.apply(src);
  if (mutated === null || mutated === src) {
    rows.push({ id: m.id, checker: m.checker, status: 'SKIP', note: '前置条件不满足（锚点未找到/已存在）' });
    console.log('SKIP  ' + m.id);
    continue;
  }
  fs.writeFileSync(path.join(WORK, m.file), mutated, 'utf8');
  const { code, out, crashed } = run(m.checker, []);
  fs.writeFileSync(path.join(WORK, m.file), src, 'utf8');   // 还原
  fs.mkdirSync(path.join(TASK, 'tmp', 'mutation'), { recursive: true });
  fs.writeFileSync(path.join(TASK, 'tmp', 'mutation', m.id.split(' ')[0] + '.log'), out.join('\n'), 'utf8');
  /* 判定：检查器自身崩溃 ≠ 抓到缺陷。只有「非零退出 + 且不是崩溃」才算检出，
     否则一个因路径/环境问题崩掉的检查器会被误当成"有效"。 */
  const detected = code !== 0 && !crashed;
  const evidence = (out.find(l => /^\s*\[/.test(l)) ||
    out.find(l => /FAIL|失败|错误|溢出|缺|未闭合|重复|不符|问题|✗|≠|NaN|Infinity|漂移|不可信/i.test(l) && !/无 |没有|全部/.test(l)) ||
    out[out.length - 1] || '').trim();
  rows.push({ id: m.id, checker: m.checker, status: crashed ? 'TOOL_ERROR' : detected ? 'DETECTED' : 'MISSED', note: evidence.slice(0, 120) });
  console.log((crashed ? 'ERR   ' : detected ? 'PASS  ' : 'MISS  ') + m.id + '  [' + m.checker + ']  ' + evidence.slice(0, 90));
  if (crashed) console.log('      ↳ 检查器崩溃，判定不可信：' + (out.find(l => /^\s*at |^Error:/.test(l)) || '').trim().slice(0, 100));
}
const missed = rows.filter(r => r.status === 'MISSED').length;
const skipped = rows.filter(r => r.status === 'SKIP').length;
const toolErr = rows.filter(r => r.status === 'TOOL_ERROR').length;
console.log('\n合计：检出 ' + rows.filter(r => r.status === 'DETECTED').length + ' / 漏检 ' + missed + ' / 检查器崩溃 ' + toolErr + ' / 跳过 ' + skipped);
if (toolErr) console.log('注意：检查器崩溃的变异不算检出（详见 tmp\\mutation\\M*.log）');
console.log((missed || toolErr) ? '结论：存在漏检或检查器不可信（详见 tmp\mutation\ 结果）' : '结论：全部变异均被检出');
fs.writeFileSync(path.join(TASK, 'tmp', 'mutation', 'last-run.json'),
  JSON.stringify(rows, null, 2), 'utf8');
process.exit((missed || toolErr) ? 1 : 0);
