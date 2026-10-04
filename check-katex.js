/* 离线公式校验：提取课时 HTML 中所有 \(…\) 与 \[…\]，用 KaTeX 严格渲染 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const katex = require('katex');

/* KaTeX 宏的唯一来源 = assets/js/common.js 的 renderMath().macros。
   这里不自带副本：两处宏表一旦漂移，就会出现「校验器用 A 宏表通过、浏览器用 B 宏表渲染」的假绿。
   提取失败即退出（退出码 2），不退化成"没有宏也能过"。 */
function loadMacros() {
  const p = path.join(__dirname, 'assets/js/common.js');
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(/macros:\s*(\{[\s\S]*?\n\s*\})/);
  if (!m) {
    console.error('check-katex: 无法从 assets/js/common.js 提取 macros（正则未命中，检查 renderMath 的 macros 字面量格式）');
    process.exit(2);
  }
  try {
    const macros = vm.runInNewContext('(' + m[1] + ')', Object.create(null), { timeout: 1000 });
    if (!macros || typeof macros !== 'object') throw new Error('不是对象字面量');
    return macros;
  } catch (e) {
    console.error('check-katex: macros 解析失败 —— ' + e.message);
    process.exit(2);
  }
}
const macros = loadMacros();

let files = process.argv.slice(2);
if (!files.length) {
  // 无参数时默认检查全部课时页（否则会「检查 0 个公式」静默通过）
  (function walk(d, out) {
    if (!fs.existsSync(d)) return out;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith('.html')) out.push(p);
    }
    return out;
  })(path.join(__dirname, 'chapters'), files);
}
const missing = files.filter(f => !fs.existsSync(f));
if (missing.length) {
  console.error('文件不存在: ' + missing.join(', '));
  process.exit(2);
}
if (!files.length) {
  console.error('未找到任何 HTML 文件，拒绝以「0 个公式」通过');
  process.exit(2);
}
let total = 0, bad = 0, badLt = 0;

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' })[e] || whole;
  });
}

for (const f of files) {
  if (!f.endsWith('.html')) continue;
  const raw = fs.readFileSync(f, 'utf8');
  // 排查数学公式中的裸 "<"（会被 HTML 解析器当成标签，必须写成 &lt;）
  const reLt = /<(?!!|\/|[a-zA-Z][a-zA-Z0-9-]*(?:\s|>|\/))/g;
  let mLt;
  while ((mLt = reLt.exec(raw)) !== null) {
    const line = raw.slice(0, mLt.index).split('\n').length;
    console.log(`[裸<] ${path.basename(f)} 第 ${line} 行: ${raw.slice(mLt.index, mLt.index + 16).replace(/\s+/g, ' ')}`);
    badLt++;
  }
  // 去掉运行时不会被 KaTeX 处理的块（与 common.js renderMath 的 ignoredTags 同口径），避免把代码示例当公式
  const clean = raw.replace(/<(script|noscript|style|textarea|pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const re = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    // auto-render 作用于 DOM 文本，先把 &lt; &amp; 等实体还原成字符
    const tex = decodeEntities(m[1] !== undefined ? m[1] : m[2]).trim();
    if (!tex) continue;
    total++;
    try {
      katex.renderToString(tex, {
        displayMode: m[1] !== undefined, throwOnError: true,
        strict: 'ignore', macros, output: 'html'
      });
    } catch (e) {
      bad++;
      const line = clean.slice(0, m.index).split('\n').length;
      console.log(`\n[错误] ${path.basename(f)} 第 ${line} 行附近`);
      console.log(`  公式: ${tex.slice(0, 110).replace(/\s+/g, ' ')}`);
      console.log(`  ${String(e.message).split('\n')[0]}`);
    }
  }
}
console.log(`\n共检查 ${total} 个公式，公式错误 ${bad} 个，裸“<” ${badLt} 处。`);
process.exit(bad || badLt ? 1 : 0);
