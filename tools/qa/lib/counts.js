/* ============================================================
   tools/qa/lib/counts.js —— 课时页「条目清单」统计（chip 口径的唯一真相源）
   口径：某类条目数 = 该页以编号形式陈述的该类条目数（去重）
         ∪ 以无编号卡片形式出现的该类条目数
     统计来源：card-label（卡片标签）、表格内 <strong>定理 X.Y</strong> 声明、
               编号区间（如「定理 6.36–6.38」展开为 3 条）
     明确排除：正文中的括注式交叉引用（如「由定理 1.12 可知」），它们不是本页的陈述。
   习题数 = class="card task" 的卡片数。
   check-site.js 与维护脚本 fix-chips 均调用本模块，避免两处口径漂移。
   ============================================================ */
'use strict';
const KIND = '(定理|定义|引理|推论|例题|例)';
const KINDS = ['定义', '定理', '引理', '推论', '例'];

function expandRanges(text, add) {
  // 「定理 6.36–6.38」「定义 3.4-3.6」→ 展开区间内全部编号
  for (const m of text.matchAll(new RegExp('(' + KIND + ')[ ]*([0-9]+)\\.([0-9]+)[ ]*[–—~-][ ]*(?:([0-9]+)\\.)?([0-9]+)', 'g'))) {
    const kind = m[1] === '例题' ? '例' : m[1], lo = +m[3], hi = +m[5];
    if (hi > lo && hi - lo <= 20) for (let n = lo + 1; n <= hi; n++) add(kind, m[2] + '.' + n);
  }
}
function addNumbers(text, add) {
  for (const x of text.matchAll(new RegExp(KIND + '[ ]*([0-9]+(?:\\.[0-9]+)*)', 'g')))
    add(x[1] === '例题' ? '例' : x[1], x[2]);
  expandRanges(text, add);
}

function countKinds(raw) {
  const nums = {}, unnumbered = {};
  const add = (kind, num) => { (nums[kind] = nums[kind] || new Set()).add(num); };
  // ① 卡片标签：有编号 → 计入编号集合；无编号 → 按「未编号卡片」计数
  for (const m of raw.matchAll(/class="card-label"[^>]*>([^<]*)/g)) {
    const L = m[1].trim();
    const kind = KINDS.find(k => L.startsWith(k));
    if (!kind) continue;
    const before = (nums[kind] ? nums[kind].size : 0);
    addNumbers(L, add);
    if ((nums[kind] ? nums[kind].size : 0) === before) unnumbered[kind] = (unnumbered[kind] || 0) + 1;
  }
  // ② 表格/正文中的加粗声明（ch1 早期页把定理列在 <table class="book"> 里）
  for (const m of raw.matchAll(/<strong>\s*((?:定理|定义|引理|推论|例)[\s\S]{0,24}?)<\/strong>/g))
    addNumbers(m[1], add);
  // ③ 「定义 4.3」「定理 5.1」出现在 <td> 首格的声明
  for (const m of raw.matchAll(/<td[^>]*>\s*((?:定理|定义|引理|推论|例)\s*[0-9][0-9.]*)/g))
    addNumbers(m[1], add);

  const out = {};
  for (const k of KINDS) out[k] = (nums[k] ? nums[k].size : 0) + (unnumbered[k] || 0);
  out['习题'] = (raw.match(/class="card task"/g) || []).length;
  return out;
}

module.exports = { countKinds, KINDS, KIND };
