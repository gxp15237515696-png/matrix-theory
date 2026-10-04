/* ============================================================
   矩阵论课程网页 · 公共脚本 common.js
   - COURSE_TOC：全课程章节目录（唯一数据源，侧栏与主页共用）
   - KaTeX 自动渲染（离线本地 vendor/katex）
   - 侧栏课程树注入 / 右栏本页目录 / scrollspy / 进度条
   - 移动抽屉 / 回顶部 / 习题折叠控制 / 打印自动展开
   纯原生 JS，不用 ES module / fetch，file:// 下可用
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 全课程目录（新增课时在此登记一行即可） ---------- */
  var COURSE_TOC = [
    {
      chapter: '第 1 章 线性空间与线性变换',
      lessons: [
        { id: '1.1', file: '1.1-linear-spaces.html', title: '线性空间', ready: true },
        { id: '1.2', file: '1.2-linear-transformations.html', title: '线性变换及其矩阵', ready: true },
        { id: '1.3', file: '1.3-special-spaces.html', title: '两个特殊的线性空间', ready: true }
      ]
    },
    {
      chapter: '第 2 章 范数理论及其应用',
      lessons: [
        { id: '2.1', file: '2.1-vector-norms.html', title: '向量范数及其性质', ready: true },
        { id: '2.2', file: '2.2-matrix-norms.html', title: '矩阵的范数', ready: true },
        { id: '2.3', file: '2.3-norm-applications.html', title: '范数的一些应用', ready: true }
      ]
    },
    {
      chapter: '第 3 章 矩阵分析及其应用',
      lessons: [
        { id: '3.1', file: '3.1-matrix-sequences.html', title: '矩阵序列', ready: true },
        { id: '3.2', file: '3.2-matrix-series.html', title: '矩阵级数', ready: true },
        { id: '3.3', file: '3.3-matrix-functions.html', title: '矩阵函数', ready: true },
        { id: '3.4', file: '3.4-differentiation-integration.html', title: '矩阵的微分和积分', ready: true },
        { id: '3.5', file: '3.5-matrix-function-applications.html', title: '矩阵函数的一些应用', ready: true }
      ]
    },
    {
      chapter: '第 4 章 矩阵分解',
      lessons: [
        { id: '4.1', file: '4.1-lu-decomposition.html', title: 'Gauss 消去法与矩阵的三角分解', ready: true },
        { id: '4.2', file: '4.2-qr-decomposition.html', title: '矩阵的 QR 分解', ready: true },
        { id: '4.3', file: '4.3-full-rank-decomposition.html', title: '矩阵的满秩分解', ready: true },
        { id: '4.4', file: '4.4-svd.html', title: '矩阵的奇异值分解', ready: true }
      ]
    },
    {
      chapter: '第 5 章 特征值的估计及对称矩阵的极性',
      lessons: [
        { id: '5.1', file: '5.1-eigenvalue-estimation.html', title: '特征值的估计', ready: true },
        { id: '5.2', file: '5.2-generalized-eigenproblem.html', title: '广义特征值问题', ready: true },
        { id: '5.3', file: '5.3-rayleigh-extremum.html', title: '对称矩阵特征值的极性', ready: true },
        { id: '5.4', file: '5.4-kronecker-product.html', title: '矩阵的直积及其应用（选学）', ready: true }
      ]
    },
    {
      chapter: '第 6 章 广义逆矩阵',
      lessons: [
        { id: '6.1', file: '6.1-projection-matrices.html', title: '投影矩阵', ready: true },
        { id: '6.2', file: '6.2-penrose-existence.html', title: '广义逆矩阵的存在、性质及构造方法', ready: true },
        { id: '6.3', file: '6.3-generalized-inverse-computation.html', title: '广义逆矩阵的计算方法', ready: true },
        { id: '6.4', file: '6.4-linear-systems.html', title: '广义逆矩阵与线性方程组求解', ready: true },
        { id: '6.5', file: '6.5-constrained-weighted-inverse.html', title: '约束广义逆和加权广义逆（选学）', ready: true },
        { id: '6.6', file: '6.6-drazin-inverse.html', title: 'Drazin 广义逆（选学）', ready: true }
      ]
    },
    {
      chapter: '第 7 章 若干特殊矩阵类介绍（选学）',
      lessons: [
        { id: '7.1', file: '7.1-positive-definite-stable.html', title: '正定矩阵与正稳定矩阵（选学）', ready: true },
        { id: '7.2', file: '7.2-diagonally-dominant.html', title: '对角占优矩阵（选学）', ready: true },
        { id: '7.3', file: '7.3-nonnegative-matrices.html', title: '非负矩阵（选学）', ready: true },
        { id: '7.4', file: '7.4-m-matrices.html', title: 'M 矩阵与广义 M 矩阵（选学）', ready: true },
        { id: '7.5', file: '7.5-toeplitz.html', title: 'Toeplitz 矩阵及其有关矩阵（选学）', ready: true },
        { id: '7.6', file: '7.6-other-special-matrices.html', title: '其他特殊矩阵（选学）', ready: true }
      ]
    }
  ];

  /* 由 <script src> 推断站点根目录前缀（chapters/chX/ 下为 "../../"，根目录为 ""） */
  function siteRoot() {
    var s = document.currentScript && document.currentScript.getAttribute('src') || '';
    var marker = 'assets/js/common.js';
    var i = s.indexOf(marker);
    return i >= 0 ? s.slice(0, i) : '';
  }
  var ROOT = siteRoot();

  function lessonHref(ls) {
    var ch = ls.id.split('.')[0];
    return ROOT + 'chapters/ch' + ch + '/' + ls.file;
  }

  /* ---------- 侧栏课程树 ---------- */
  function renderSidebar() {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    var active = aside.getAttribute('data-active') || '';
    var h = [];
    h.push('<a class="sidebar-brand" href="' + ROOT + 'index.html">');
    h.push('<span class="seal">矩</span>');
    h.push('<span class="bk">矩阵论精讲<small>程云鹏《矩阵论》第3版</small></span></a>');
    h.push('<ul class="toc-tree">');
    COURSE_TOC.forEach(function (ch) {
      h.push('<li class="toc-chapter"><span class="ch-title">' + ch.chapter + '</span><ul style="list-style:none;margin:0;padding:0">');
      ch.lessons.forEach(function (ls) {
        var cls = 'toc-lesson' + (ls.ready ? '' : ' locked') + (ls.id === active ? ' active' : '');
        /* 2.4.8：当前页不只用背景色 + 字重表示，补 aria-current="page" */
        var cur = (ls.ready && ls.id === active) ? ' aria-current="page"' : '';
        if (ls.ready) {
          h.push('<li><a class="' + cls + '"' + cur + ' href="' + lessonHref(ls) + '"><span class="ls-id">§' + ls.id + '</span>' + ls.title + '</a></li>');
        } else {
          h.push('<li><span class="' + cls + '"><span class="ls-id">§' + ls.id + '</span>' + ls.title +
                 '<span class="lock-dot" title="尚未更新">待更新</span></span></li>');
        }
      });
      h.push('</ul></li>');
    });
    h.push('</ul>');
    aside.innerHTML = h.join('');
  }

  /* ---------- 右栏：本页目录 ---------- */
  function renderPageToc() {
    var nav = document.getElementById('toc-this-page');
    var article = document.getElementById('lesson-article');
    if (!nav || !article) return;
    /* 1.3.1 / 2.4.6：每页 3 个 navigation 地标必须各有名字，否则读屏「按地标导航」无法区分。
       HTML 里已写死 aria-label，这里再兜一次底（本 nav 的内容由 JS 生成，属性不能丢）。 */
    if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', '本页目录');
    var heads = article.querySelectorAll('h2[id], h3[id]');
    if (!heads.length) { nav.style.display = 'none'; return; }
    var h = ['<div class="pt-title">本页目录</div>', '<ul>'];
    Array.prototype.forEach.call(heads, function (hd) {
      var lv = hd.tagName.toLowerCase() === 'h3' ? 'pt-3' : '';
      h.push('<li><a class="' + lv + '" href="#' + hd.id + '">' + hd.textContent.replace(/^[一二三四五六七八九十]、/, '') + '</a></li>');
    });
    h.push('</ul>');
    nav.innerHTML = h.join('');
  }

  /* ---------- scrollspy ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('#toc-this-page a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var visible = new Set();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });
      links.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
      if (visible.size) {
        var first = Array.prototype.filter.call(
          document.querySelectorAll('#lesson-article h2[id], #lesson-article h3[id]'),
          function (x) { return visible.has(x.id); }
        )[0];
        if (first && map[first.id]) {
          map[first.id].classList.add('active');
          map[first.id].setAttribute('aria-current', 'true');
        }
      }
    }, { rootMargin: '-12% 0px -78% 0px', threshold: 0 });
    Array.prototype.forEach.call(document.querySelectorAll('#lesson-article h2[id], #lesson-article h3[id]'),
      function (hd) { obs.observe(hd); });
  }

  /* ---------- 阅读进度条 ---------- */
  function initProgressBar() {
    var bar = document.getElementById('progress-bar');
    if (!bar) return;
    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 移动端抽屉（WCAG 4.1.2 披露式控件 / 2.1.1 Esc 可关 / 2.4.7 焦点可见） ---------- */
  function initMobileNav() {
    var btn = document.getElementById('nav-toggle');
    var sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;
    var LBL_OPEN = '打开目录', LBL_CLOSE = '关闭目录';

    /* 抽屉打开时把遮罩之下的内容对辅助技术隐藏。选 inert 而不是 aria-hidden：
       aria-hidden 落在仍可聚焦的元素上会同时违反 4.1.2 与 1.3.1。
       顶栏（含 #nav-toggle）不隐藏，键盘仍能 Tab 回开关按钮，不构成键盘陷阱。 */
    function background() {
      return Array.prototype.slice.call(
        document.querySelectorAll('.layout > .content, #to-top, #theme-toggle')
      );
    }
    function setBackgroundInert(on) {
      background().forEach(function (el) {
        if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
      });
    }
    function isOpen() { return document.body.classList.contains('nav-open'); }

    function open() {
      document.body.classList.add('nav-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', LBL_CLOSE);
      setBackgroundInert(true);
      /* 焦点移入抽屉：优先抽屉内首个可聚焦元素，否则聚焦抽屉容器本身
         （HTML 已给它 tabindex="-1" 与地标名 "课程目录"，读屏会连地标一起播报） */
      var first = sidebar.querySelector('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (first || sidebar).focus();
    }
    function close(refocus) {
      if (!isOpen()) return;
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', LBL_OPEN);
      setBackgroundInert(false);
      if (refocus !== false) btn.focus();      /* 焦点归还开关按钮 */
    }

    /* 与 HTML 里写死的 aria-expanded="false" / aria-label 对齐 */
    btn.setAttribute('aria-expanded', isOpen() ? 'true' : 'false');
    btn.setAttribute('aria-label', isOpen() ? LBL_CLOSE : LBL_OPEN);
    if (!isOpen()) setBackgroundInert(false);

    btn.addEventListener('click', function () { isOpen() ? close() : open(); });
    var scrim = document.querySelector('.scrim');
    if (scrim) scrim.addEventListener('click', function () { close(); });
    sidebar.addEventListener('click', function (e) {
      /* 点侧栏里的课时链接会立刻跳页，不必把焦点抢回按钮 */
      if (e.target.closest && e.target.closest('a')) close(false);
    });
    /* 2.1.1：Esc 关闭抽屉 */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) close();
    });
    /* 视口放大过桌面断点时抽屉不再是模态层，解除 inert，避免正文被永久冻结 */
    var mq = window.matchMedia('(max-width: 960px)');
    var onMq = function () { if (!mq.matches) close(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- 回顶部 ---------- */
  function initToTop() {
    var b = document.getElementById('to-top');
    if (!b) return;
    window.addEventListener('scroll', function () {
      b.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- 习题 / 折叠区 全部展开、收起 ---------- */
  function initExpandTools() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fold-tools]'), function (bar) {
      var scopeSel = bar.getAttribute('data-fold-tools') || 'details';
      var container = bar.closest('[data-fold-scope]') || document;
      bar.querySelector('[data-fold="open"]').addEventListener('click', function () {
        Array.prototype.forEach.call(container.querySelectorAll(scopeSel), function (d) { d.open = true; });
      });
      bar.querySelector('[data-fold="close"]').addEventListener('click', function () {
        Array.prototype.forEach.call(container.querySelectorAll(scopeSel), function (d) { d.open = false; });
      });
    });
  }

  /* ============================================================
     学习功能增强（注入式，不改动课时页）：
     ① 主题切换（跟随系统 / 浅色 / 深色，localStorage 持久化）
     ② 学习进度（页面看过节记状态；侧栏状态点 + 首页进度 + 小结「标记完成」）
     ③ 打印本节按钮
     ============================================================ */
  function storage() {
    try { window.localStorage.setItem('__mt_test__', '1'); window.localStorage.removeItem('__mt_test__'); return window.localStorage; }
    catch (e) { return null; }   /* 隐私模式/禁用时静默降级 */
  }
  var STORE = storage();
  var LS_THEME = 'matrix-course/theme';
  var LS_PROGRESS = 'matrix-course/progress';

  /* ---------- ① 主题切换 ---------- */
  function themePref() {
    var t = STORE ? STORE.getItem(LS_THEME) : null;
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return dark;
  }
  function initThemeToggle() {
    themePref();
    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换深色/浅色模式');
    btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (STORE) STORE.setItem(LS_THEME, next);
      themePref();
      btn.textContent = next === 'dark' ? '☀' : '☾';
    });
    document.body.appendChild(btn);
    var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
    var onDark = function () { if (!STORE || !STORE.getItem(LS_THEME)) themePref(); };
    if (mqDark.addEventListener) mqDark.addEventListener('change', onDark);
    else if (mqDark.addListener) mqDark.addListener(onDark);   /* 老 Safari 降级，避免 TypeError 中断后续初始化 */
  }

  /* ---------- ② 学习进度 ---------- */
  function lessonId() {
    var aside = document.getElementById('sidebar');
    return aside ? aside.getAttribute('data-active') : null;
  }
  function readProgress() {
    if (!STORE) return {};
    try { return JSON.parse(STORE.getItem(LS_PROGRESS) || '{}') || {}; }
    catch (e) { return {}; }
  }
  /* 侧栏状态点（每课一点：未开始 / 在学习 / 已完成；随进度刷新重绘）
     1.4.1：状态不能只靠 9px 圆点的颜色表达。点本身用 role="img" + aria-label 命名
     （title 不进无障碍树，不能替代），颜色之外再由 base.css 用「空心 / 半实心 / 实心」
     的形状区分；链接的可访问名会一并带上状态文字。 */
  var DOT_TEXT = { done: '已完成', started: '在学习', '': '未开始' };
  function renderSidebarDots(prog) {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    Array.prototype.forEach.call(aside.querySelectorAll('.progress-dot'), function (d) {
      if (d.parentNode) d.parentNode.removeChild(d);
    });
    Array.prototype.forEach.call(aside.querySelectorAll('.toc-lesson'), function (el) {
      var m = (el.getAttribute('href') || '').match(/([0-9]\.[0-9])-[a-z0-9-]+\.html$/);
      if (!m) return;
      var p = prog[m[1]];
      var st = p ? (p.done ? 'done' : 'started') : '';
      var label = DOT_TEXT[st];
      var dot = document.createElement('span');
      dot.className = 'progress-dot ' + st;
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', label);
      dot.setAttribute('title', label);
      el.appendChild(dot);
    });
  }
  function initProgressMarks() {
    var id = lessonId();
    if (!id) return;                                   /* 首页不记进度 */
    var prog = readProgress();
    if (!prog[id]) prog[id] = { started: true, done: false };
    else prog[id].started = true;
    if (STORE) STORE.setItem(LS_PROGRESS, JSON.stringify(prog));

    renderSidebarDots(prog);

    /* 小结区「标记本节完成」 */
    var summary = document.getElementById('sec-summary');
    if (summary) {
      var bar = document.createElement('div');
      bar.className = 'done-line no-print';
      var chk = document.createElement('button');
      chk.type = 'button';
      chk.className = 'done-btn' + (prog[id].done ? ' done' : '');
      chk.textContent = prog[id].done ? '✓ 本节已完成（点击取消）' : '标记本节为已完成';
      chk.addEventListener('click', function () {
        var p2 = readProgress();
        p2[id] = p2[id] || { started: true, done: false };
        p2[id].done = !p2[id].done;
        if (STORE) STORE.setItem(LS_PROGRESS, JSON.stringify(p2));
        chk.textContent = p2[id].done ? '✓ 本节已完成（点击取消）' : '标记本节为已完成';
        chk.classList.toggle('done', p2[id].done);
        /* 刷新侧栏状态点 */
        renderSidebarDots(p2);
      });
      bar.appendChild(chk);
      summary.appendChild(bar);
    }
  }
  function renderHomeProgress() {
    var box = document.getElementById('home-progress');
    if (!box) return;
    var prog = readProgress();
    var total = 0, done = 0;
    COURSE_TOC.forEach(function (ch) { ch.lessons.forEach(function (l) { total++; if (prog[l.id] && prog[l.id].done) done++; }); });
    var pct = total ? Math.round(done / total * 100) : 0;
    var h = [];
    h.push('<div class="hp-bar"><div class="hp-fill" style="width:' + pct + '%"></div></div>');
    h.push('<span class="hp-text">学习进度：' + done + ' / ' + total + ' 节（' + pct + '%）</span>');
    box.innerHTML = h.join('');
  }

  /* ---------- ③ 打印本节 ---------- */
  function initPrintBtn() {
    var bar = document.createElement('div');
    bar.className = 'print-line no-print';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = '🖨 打印本节';
    b.addEventListener('click', function () { window.print(); });
    bar.appendChild(b);
    var nav = document.querySelector('.lesson-nav');
    if (nav) nav.parentNode.insertBefore(bar, nav);
    else document.body.appendChild(bar);
  }

  /* ---------- 打印前展开所有折叠，打印后还原 ---------- */
  function initPrintEnhance() {
    var wasOpen = [];
    window.addEventListener('beforeprint', function () {
      wasOpen = [];
      Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) {
        wasOpen.push({ d: d, open: d.open });
        d.open = true;
      });
    });
    window.addEventListener('afterprint', function () {
      wasOpen.forEach(function (x) { x.d.open = x.open; });
    });
  }

  /* ---------- 主页：章节卡片 ---------- */
  function renderHome() {
    var box = document.getElementById('home-chapters');
    if (!box) return;
    var h = [];
    COURSE_TOC.forEach(function (ch) {
      h.push('<section class="chapter-block"><div class="cb-head"><h2>' + ch.chapter + '</h2>');
      var ready = ch.lessons.filter(function (l) { return l.ready; }).length;
      h.push('<span class="cb-range">' + ch.lessons.length + ' 小节 · 已上线 ' + ready + '</span></div><div class="lesson-grid">');
      ch.lessons.forEach(function (ls) {
        if (ls.ready) {
          h.push('<a class="lesson-card" href="' + lessonHref(ls) + '">' +
            '<div class="lc-id">§' + ls.id + '</div><div class="lc-title">' + ls.title + '</div>' +
            '<div class="lc-meta">点击进入学习</div></a>');
        } else {
          h.push('<span class="lesson-card locked"><div class="lc-id">§' + ls.id + '</div>' +
            '<div class="lc-title">' + ls.title + '<span class="badge-soon">待更新</span></div>' +
            '<div class="lc-meta">按教学进度陆续上线</div></span>');
        }
      });
      h.push('</div></section>');
    });
    box.innerHTML = h.join('');
  }

  /* ---------- KaTeX ---------- */
  function renderMath() {
    if (typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      strict: 'ignore',
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      macros: {
        '\\R': '\\mathbb{R}',
        '\\C': '\\mathbb{C}',
        '\\Q': '\\mathbb{Q}',
        '\\N': '\\mathbb{N}',
        '\\rank': '\\operatorname{rank}',
        '\\tr': '\\operatorname{tr}',
        '\\n': '\\operatorname{n}',
        '\\diag': '\\operatorname{diag}',
        '\\adj': '\\operatorname{adj}'
      }
    });
  }

  document.documentElement.classList.add('js');
  document.addEventListener('DOMContentLoaded', function () {
    renderSidebar();
    renderHome();
    renderPageToc();
    renderMath();
    initScrollSpy();
    initProgressBar();
    initMobileNav();
    initToTop();
    initExpandTools();
    initPrintEnhance();
    /* 阶段 6 学习功能增强（注入式） */
    initThemeToggle();
    initProgressMarks();
    renderHomeProgress();
    initPrintBtn();
  });
})();
