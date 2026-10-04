/* ============================================================
   矩阵论课程网页 · 教学交互 interactives.js
   ① 例 1.5 公理步进器 [data-axiom-stepper]
   ② 基变换坐标实验室 [data-coord-lab]（n 阶通用，本节 n=2）
   ③ R3 交与和 SVG 演示 [data-subspace-fig]
   纯原生 JS，零依赖；含公式的面板全部预写在 HTML 中由 KaTeX
   在加载时渲染，动态部分只更新文本节点。
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     ① 公理步进器
     HTML 侧：[data-axiom-stepper] 内预写 .as-panel[data-step]，
     JS 生成圆点、上一步/下一步与进度文案
     ============================================================ */
  function initAxiomStepper(root) {
    var panels = Array.prototype.slice.call(root.querySelectorAll('.as-panel'));
    if (!panels.length) return;
    var total = panels.length;
    var done = {};
    var cur = 0;

    var dots = document.createElement('div');
    dots.className = 'as-dots';
    [['加法运算的四条性质', 0, 4], ['数乘运算的四条性质', 4, total]].forEach(function (g) {
      var lab = document.createElement('span');
      lab.className = 'as-group-label';
      lab.textContent = g[0];
      dots.appendChild(lab);
      for (var i = g[1]; i < g[2]; i++) dots.appendChild(mkDot(i));
    });
    function mkDot(idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'as-dot';
      b.textContent = String(idx + 1);
      b.setAttribute('aria-label', '第 ' + (idx + 1) + ' 条');
      b.addEventListener('click', function () { show(idx); });
      return b;
    }

    var ctrl = document.createElement('div');
    ctrl.className = 'as-ctrl';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'as-btn'; prev.textContent = '上一步';
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'as-btn'; next.textContent = '下一步';
    var prog = document.createElement('span');
    prog.className = 'as-progress';
    ctrl.appendChild(prev); ctrl.appendChild(next); ctrl.appendChild(prog);

    var banner = document.createElement('div');
    banner.className = 'as-done-banner';
    banner.textContent = '✓ 8 条全部验证通过：正实数集 R⁺ 在 m⊕n = mn、k∘m = mᵏ 下满足定义 1.1 的全部公理，是 R 上的实线性空间。';

    root.insertBefore(banner, panels[0]);
    root.insertBefore(ctrl, panels[0]);
    root.insertBefore(dots, panels[0]);
    var dotBtns = Array.prototype.slice.call(dots.querySelectorAll('.as-dot'));

    function show(idx) {
      cur = Math.max(0, Math.min(total - 1, idx));
      done[cur] = true;
      panels.forEach(function (p, k) { p.classList.toggle('active', k === cur); });
      dotBtns.forEach(function (b, k) {
        b.classList.toggle('current', k === cur);
        b.classList.toggle('done', !!done[k] && k !== cur);
      });
      prev.disabled = cur === 0;
      next.textContent = cur === total - 1 ? '重新看一遍' : '下一步';
      var cnt = Object.keys(done).length;
      prog.textContent = '已验证 ' + cnt + ' / ' + total;
      banner.classList.toggle('show', cnt === total);
    }
    prev.addEventListener('click', function () { show(cur - 1); });
    next.addEventListener('click', function () {
      if (cur === total - 1) {
        done = {};
        dotBtns.forEach(function (b) { b.classList.remove('done'); });
        show(0);
        return;
      }
      show(cur + 1);
    });
    show(0);
  }

  /* ============================================================
     ② 基变换坐标实验室
     配置：容器内 <script type="application/json" data-widget-config>
     ============================================================ */
  function initCoordLab(root) {
    var cfgEl = root.querySelector('[data-widget-config]');
    if (!cfgEl) return;
    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent || '{}'); } catch (e) { return; }
    var n = cfg.n || 2;
    var presets = cfg.presets || [];

    var body = document.createElement('div');
    body.className = 'lab-body';

    var left = document.createElement('div');
    left.className = 'cl-left';
    var cWrap = mkMatrixInputs('过渡矩阵 C（新基向量在旧基下的坐标排成列）', cfg.C || identity(n), false, n);
    var etaWrap = mkMatrixInputs('新基下坐标 η', (cfg.eta || ones(n)).map(function (v) { return [v]; }), true, n);
    left.appendChild(cWrap.wrap);
    left.appendChild(etaWrap.wrap);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var xiRow = mkOutRow('旧基坐标 ξ = Cη =');
    var detRow = mkOutRow('det C =');
    var invRow = mkOutRow('C⁻¹ =');
    var backRow = mkOutRow('反算 C⁻¹ξ =');
    var alert = document.createElement('div');
    alert.className = 'cl-alert';
    alert.textContent = 'det C = 0：C 奇异，不能作为过渡矩阵（过渡矩阵必须可逆）。';
    right.appendChild(xiRow.row); right.appendChild(detRow.row);
    right.appendChild(invRow.row); right.appendChild(backRow.row);
    right.appendChild(alert);

    if (presets.length) {
      var ps = document.createElement('div');
      ps.className = 'cl-presets';
      presets.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cl-preset'; b.textContent = p.name;
        b.addEventListener('click', function () { cWrap.set(p.C); compute(); });
        ps.appendChild(b);
      });
      right.appendChild(ps);
    }

    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function compute() {
      var Cv = cWrap.get();
      var etav = etaWrap.get();
      var d = det(Cv);
      detRow.v.textContent = fmt(d);
      var singular = Math.abs(d) < 1e-10;
      Array.prototype.forEach.call(cWrap.wrap.querySelectorAll('input'),
        function (i) { i.classList.toggle('bad', singular); });
      alert.classList.toggle('show', singular);

      var xi = Cv.map(function (row) {
        return row.reduce(function (s, a, k) { return s + a * etav[k]; }, 0);
      });
      xiRow.v.textContent = '(' + xi.map(fmt).join(', ') + ')ᵀ';

      if (singular) {
        invRow.v.textContent = '不存在（奇异）';
        invRow.v.classList.add('warn');
        backRow.v.textContent = '—';
        return;
      }
      invRow.v.classList.remove('warn');
      var inv = invert(Cv);
      invRow.v.innerHTML = '';
      invRow.v.appendChild(matToText(inv));
      var back = inv.map(function (row) {
        return row.reduce(function (s, a, k) { return s + a * xi[k]; }, 0);
      });
      backRow.v.textContent = '(' + back.map(fmt).join(', ') + ')ᵀ  ← 与输入 η 一致，往返成立';
    }

    cWrap.wrap.addEventListener('input', compute);
    etaWrap.wrap.addEventListener('input', compute);
    compute();
  }

  function mkMatrixInputs(name, data, isVec, n) {
    var wrap = document.createElement('div');
    wrap.className = 'cl-matrix';
    var cols = isVec ? 1 : n;
    var rows = isVec ? n : n;
    var nm = document.createElement('div');
    nm.className = 'cl-name';
    nm.textContent = name;
    var grid = document.createElement('div');
    grid.className = 'cl-grid n' + cols;
    if (isVec) grid.setAttribute('data-vector', '1');
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.value = String(isVec ? data[r][0] : data[r][c]);
        // 可访问性：读屏器可读「A（2×2）第 1 行第 2 列」
        inp.setAttribute('aria-label', name + ' 第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列');
        grid.appendChild(inp);
      }
    }
    wrap.appendChild(nm); wrap.appendChild(grid);
    return {
      wrap: wrap,
      get: function () {
        var ins = grid.querySelectorAll('input');
        if (isVec) return Array.prototype.map.call(ins, function (i) { return num(i.value); });
        var a = [];
        for (var r = 0; r < n; r++) {
          var rv = [];
          for (var c = 0; c < cols; c++) rv.push(num(ins[r * cols + c].value));
          a.push(rv);
        }
        return a;
      },
      set: function (m) {
        var ins = grid.querySelectorAll('input');
        var flat = Array.prototype.concat.apply([], m);
        Array.prototype.forEach.call(ins, function (i, k) { i.value = String(flat[k]); });
      }
    };
  }

  function mkOutRow(k) {
    var row = document.createElement('div'); row.className = 'cl-row';
    var key = document.createElement('span'); key.className = 'cl-k'; key.textContent = k;
    var val = document.createElement('span'); val.className = 'cl-v';
    row.appendChild(key); row.appendChild(val);
    return { row: row, v: val };
  }

  /* ---- 数值小工具 ---- */
  var SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];   // 下标字符，供 aria-label 用
  function num(s) { var v = parseFloat(s); return isNaN(v) ? 0 : v; }
  function fmt(x) {
    if (Math.abs(x) < 1e-10) return '0';
    return String(Math.round(x * 1000) / 1000);
  }
  function ones(n) { var a = []; for (var i = 0; i < n; i++) a.push(1); return a; }
  function identity(n) {
    var a = [];
    for (var i = 0; i < n; i++) { var r = ones(n).map(function () { return 0; }); r[i] = 1; a.push(r); }
    return a;
  }
  function det(m) {
    var n = m.length;
    var a = m.map(function (r) { return r.slice(); });
    var d = 1;
    for (var i = 0; i < n; i++) {
      var p = i;
      for (var k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[p][i])) p = k;
      if (Math.abs(a[p][i]) < 1e-12) return 0;
      if (p !== i) { var t = a[i]; a[i] = a[p]; a[p] = t; d = -d; }
      for (var r2 = i + 1; r2 < n; r2++) {
        var f = a[r2][i] / a[i][i];
        for (var c = i; c < n; c++) a[r2][c] -= f * a[i][c];
      }
      d *= a[i][i];
    }
    return d;
  }
  function invert(m) {
    var n = m.length;
    var a = m.map(function (row, i) { return row.slice().concat(identity(n)[i]); });
    for (var i = 0; i < n; i++) {
      var p = i;
      for (var k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[p][i])) p = k;
      var tmp = a[i]; a[i] = a[p]; a[p] = tmp;
      var piv = a[i][i];
      for (var c = 0; c < 2 * n; c++) a[i][c] /= piv;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === i) continue;
        var f = a[r2][i];
        for (var c2 = 0; c2 < 2 * n; c2++) a[r2][c2] -= f * a[i][c2];
      }
    }
    return a.map(function (row) { return row.slice(n); });
  }
  function matToText(m) {
    var pre = document.createElement('span');
    pre.style.fontFamily = 'Consolas, monospace';
    pre.style.whiteSpace = 'pre';
    pre.textContent = '\n' + m.map(function (row) {
      return '[' + row.map(fmt).join(', ') + ']';
    }).join('\n') + '\n';
    return pre;
  }

  /* ============================================================
     ③ R3 交与和 SVG 演示
     ============================================================ */
  function initSubspaceFig(root) {
    var stage = root.querySelector('.sf-stage');
    var cap = root.querySelector('.sf-caption');
    var btns = Array.prototype.slice.call(root.querySelectorAll('.sf-btn'));
    if (!stage || !btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        stage.className = 'sf-stage f-mode-' + b.getAttribute('data-mode');
        btns.forEach(function (x) { x.classList.toggle('active', x === b); });
        if (cap) cap.textContent = b.getAttribute('data-caption') || '';
      });
    });
    (root.querySelector('.sf-btn[data-mode="sum"]') || btns[0]).click();
  }

  /* ============================================================
     ④ 2×2 特征值实验室 [data-eigen-lab]
     实时：迹、行列式、特征多项式、判别式、特征值与特征向量、
     重根时的几何重数与可否对角化
     ============================================================ */
  function initEigenLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A（修改数字即时计算）', [[2, 1], [1, 2]], false, 2);
    left.appendChild(wrap.wrap);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var rows = {};
    ['trace', 'det', 'poly', 'delta', 'eigs', 'vecs', 'verdict'].forEach(function (k) {
      rows[k] = mkOutRow({ trace: 'tr A =', det: 'det A =', poly: 'φ(λ) =',
        delta: '判别式 Δ =', eigs: '特征值 =', vecs: '特征向量 =', verdict: '结论 =' }[k]);
      right.appendChild(rows[k].row);
    });
    var note = document.createElement('div');
    note.className = 'cl-alert';
    right.appendChild(note);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function eigenVec(A, lam) {
      var p = A[0][0] - lam, q = A[0][1];
      if (Math.abs(p) > 1e-9 || Math.abs(q) > 1e-9) return [-q, p];
      p = A[1][0]; q = A[1][1] - lam;
      if (Math.abs(p) > 1e-9 || Math.abs(q) > 1e-9) return [-q, p];
      return null; // A = λI
    }
    function fmtV(v) {
      return '(' + v.map(fmt).join(', ') + ')ᵀ（可乘任意非零倍数）';
    }
    function compute() {
      var A = wrap.get();
      var tr = A[0][0] + A[1][1];
      var det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      rows.trace.v.textContent = fmt(tr);
      rows.det.v.textContent = fmt(det);
      var c0 = -A[0][0], c1 = -A[1][1];
      rows.poly.v.textContent = 'λ² ' + (tr >= 0 ? '− ' + fmt(Math.abs(tr)) : '+ ' + fmt(-tr)) +
        'λ ' + (det >= 0 ? '+ ' + fmt(det) : '− ' + fmt(Math.abs(det)));
      var disc = tr * tr - 4 * det;
      rows.delta.v.textContent = fmt(disc) + (disc > 1e-9 ? ' > 0' : (disc < -1e-9 ? ' < 0' : ' = 0'));
      if (disc < -1e-9) {
        var re = tr / 2, im = Math.sqrt(-disc) / 2;
        rows.eigs.v.textContent = fmt(re) + ' ± ' + fmt(im) + 'i（共轭复根，在 C 上有两个互异特征值）';
        rows.vecs.v.textContent = '—（复特征向量，略）';
        rows.verdict.v.textContent = '在 C 上可对角化；在 R 上不能对角化';
        rows.verdict.v.classList.remove('warn');
        note.classList.remove('show');
        return;
      }
      if (disc > 1e-9) {
        var s = Math.sqrt(disc);
        var l1 = (tr + s) / 2, l2 = (tr - s) / 2;
        rows.eigs.v.textContent = 'λ₁ = ' + fmt(l1) + '，λ₂ = ' + fmt(l2) + '（互异）';
        var v1 = eigenVec(A, l1), v2 = eigenVec(A, l2);
        rows.vecs.v.textContent = 'v₁: ' + fmtV(v1) + '；v₂: ' + fmtV(v2);
        rows.verdict.v.textContent = '互异特征值 ⇒ 两特征向量无关 ⇒ A 可对角化（定理1.26）';
        rows.verdict.v.classList.remove('warn');
        note.classList.remove('show');
        return;
      }
      var lam = tr / 2;
      rows.eigs.v.textContent = 'λ₁ = λ₂ = ' + fmt(lam) + '（二重根）';
      var isScalar = Math.abs(A[0][1]) < 1e-9 && Math.abs(A[1][0]) < 1e-9 &&
                     Math.abs(A[0][0] - A[1][1]) < 1e-9;
      if (isScalar) {
        rows.vecs.v.textContent = '任意两个无关向量均可，如 e₁, e₂';
        rows.verdict.v.textContent = 'A = λI，几何重数 = 2 = 代数重数，可对角化（本身即对角阵）';
        rows.verdict.v.classList.remove('warn');
        note.classList.remove('show');
      } else {
        var v = eigenVec(A, lam);
        rows.vecs.v.textContent = '只有一个无关方向：' + fmtV(v);
        rows.verdict.v.textContent = '几何重数 = 1 < 代数重数 2，不能对角化，相似于一个 2 阶 Jordan 块';
        rows.verdict.v.classList.add('warn');
        note.textContent = '重根时不能只数根数：还要数 (λI−A)x=0 有几个无关解（几何重数）。';
        note.classList.add('show');
      }
    }
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑤ Jordan 块拼装器 [data-jordan-lab]
     选代数重数 m 与分拆方案（块大小），显示 J、几何重数、最小多项式
     ============================================================ */
  function initJordanLab(root) {
    var bar = document.createElement('div');
    bar.className = 'sf-buttons';
    var mBar = document.createElement('div');
    mBar.style.cssText = 'display:flex;gap:8px;align-items:center;font-family:var(--font-sans);font-size:.85rem;margin-bottom:8px;flex-wrap:wrap';
    var mLab = document.createElement('span');
    mLab.textContent = '代数重数 m =';
    mBar.appendChild(mLab);
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    pBar.style.marginTop = '4px';
    var out = document.createElement('div');
    out.style.cssText = 'margin-top:14px;display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start';
    var matrixBox = document.createElement('div');
    var infoBox = document.createElement('div');
    infoBox.className = 'cl-out';
    out.appendChild(matrixBox); out.appendChild(infoBox);
    bar.appendChild(mBar); bar.appendChild(pBar);
    root.appendChild(bar); root.appendChild(out);

    var m = 3, parts = [], lamText = '2';
    function partitions(n, max) {
      if (n === 0) return [[]];
      var res = [];
      for (var k = Math.min(n, max); k >= 1; k--) {
        partitions(n - k, k).forEach(function (rest) { res.push([k].concat(rest)); });
      }
      return res;
    }
    function renderInfo() {
      var maxBlk = Math.max.apply(null, current);
      infoBox.innerHTML = '';
      var d = {};
      d.blocks = mkOutRow('Jordan 块数 =');
      d.blocks.v.textContent = current.length + '（= 几何重数，即特征子空间维数）';
      d.sizes = mkOutRow('各块阶数 =');
      d.sizes.v.textContent = current.join('，');
      d.min = mkOutRow('最小多项式 =');
      d.min.v.innerHTML = '';
      var span = document.createElement('span');
      span.textContent = 'm(λ) = (λ − ' + lamText + ')^' + maxBlk + '（指数取最大块阶数）';
      d.min.v.appendChild(span);
      d.char = mkOutRow('特征多项式 =');
      d.char.v.textContent = 'φ(λ) = (λ − ' + lamText + ')^' + m + '（代数重数恒为 ' + m + '）';
      ['blocks', 'sizes', 'min', 'char'].forEach(function (k) { infoBox.appendChild(d[k].row); });
      if (current.length === 1) {
        var warn = document.createElement('div');
        warn.className = 'cl-alert show';
        warn.textContent = m > 1 ? '只有 1 个块：几何重数 1，亏损矩阵，不能对角化。' : '';
        if (m > 1) infoBox.appendChild(warn);
      }
      if (current.length === m) {
        var ok = document.createElement('div');
        ok.className = 'cl-alert show';
        ok.style.background = 'var(--c-ex-bg)'; ok.style.borderColor = 'var(--c-ex-line)'; ok.style.color = 'var(--c-ex)';
        ok.textContent = 'm 个 1 阶块：J 就是 λI，可对角化。';
        infoBox.appendChild(ok);
      }
    }
    function renderParts() {
      pBar.innerHTML = '';
      parts = partitions(m, m);
      parts.forEach(function (p, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'sf-btn';
        b.textContent = p.join('+');
        b.title = '块阶数 ' + p.join(', ');
        if (i === 0) b.classList.add('active');
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(pBar.children, function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          current = p;
          renderMatrix(); renderInfo();
        });
        pBar.appendChild(b);
      });
      current = parts[0];
    }
    var current;
    [2, 3, 4].forEach(function (mm) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn' + (mm === m ? ' active' : '');
      b.textContent = String(mm);
      b.addEventListener('click', function () {
        m = mm;
        Array.prototype.forEach.call(mBar.querySelectorAll('button'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderParts(); renderMatrix(); renderInfo();
      });
      mBar.appendChild(b);
    });
    // λ 取值输入
    var inp = document.createElement('input');
    inp.type = 'text'; inp.value = '2';
    inp.setAttribute('aria-label', 'λ（Jordan 块的特征值）');
    inp.style.cssText = 'width:48px;padding:4px;text-align:center;border:1px solid var(--rule-strong);border-radius:5px;font-family:Consolas,monospace';
    inp.addEventListener('input', function () { lamText = inp.value || 'λ'; renderMatrix(); renderInfo(); });
    var lamLab = document.createElement('span');
    lamLab.textContent = '特征值 λ =';
    lamLab.style.marginLeft = '10px';
    mBar.appendChild(lamLab); mBar.appendChild(inp);

    // 重写 renderMatrix 使用 current（函数声明，严格模式下合法且会提升）
    function renderMatrix() {
      matrixBox.innerHTML = '';
      var ps = current;
      var total = ps.reduce(function (s, v) { return s + v; }, 0);
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(' + total + ',44px);gap:2px';
      var blockColor = ['#2b5f8b', '#2f7d5b', '#6b4e9e', '#9e3b46'];
      var idx = 0;
      ps.forEach(function (size, bi) {
        for (var i = 0; i < size; i++) {
          for (var j = 0; j < size; j++) {
            var cell = document.createElement('div');
            cell.style.cssText = 'height:40px;display:grid;place-items:center;font-family:Consolas,monospace;font-size:.92rem;border-radius:3px';
            if (i === j) {
              cell.textContent = lamText;
              cell.style.cssText += 'color:' + blockColor[bi % blockColor.length] + ';font-weight:700;background:' + blockColor[bi % blockColor.length] + '14';
            } else if (j === i + 1) {
              cell.textContent = '1';
            } else {
              cell.textContent = '0';
              cell.style.cssText += 'color:var(--ink-faint)';
            }
            grid.appendChild(cell);
          }
        }
        idx += size;
      });
      var wrap2 = document.createElement('div');
      wrap2.style.cssText = 'position:relative;display:inline-block;padding:8px 13px';
      var b1 = document.createElement('div');
      b1.style.cssText = 'position:absolute;top:2px;bottom:2px;left:0;width:7px;border:1.5px solid var(--ink);border-right:0;border-radius:4px';
      var b2 = document.createElement('div');
      b2.style.cssText = 'position:absolute;top:2px;bottom:2px;right:0;width:7px;border:1.5px solid var(--ink);border-left:0;border-radius:4px';
      wrap2.appendChild(b1); wrap2.appendChild(b2); wrap2.appendChild(grid);
      matrixBox.appendChild(wrap2);
    }
    renderParts(); renderMatrix(); renderInfo();
  }

  /* ============================================================
     ⑥ 内积 / 夹角实验室 [data-angle-lab]（R³ 内积）
     实时：内积、长度、夹角、正交/平行判定、一个向量在另一个上的投影
     ============================================================ */
  function initAngleLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    function vecBox(name, init) {
      var wrap = mkMatrixInputs(name, init, true, 3);
      return wrap;
    }
    var wx = vecBox('向量 x', [[1], [2], [2]]);
    var wy = vecBox('向量 y', [[-2], [1], [0]]);
    left.appendChild(wx.wrap); left.appendChild(wy.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rows = {};
    ['dot', 'nx', 'ny', 'cos', 'angle', 'proj', 'state'].forEach(function (k) {
      rows[k] = mkOutRow({ dot: '内积 (x, y) =', nx: '|x| =', ny: '|y| =',
        cos: 'cos⟨x,y⟩ =', angle: '夹角 =', proj: 'x 在 y 上的投影 =',
        state: '关系 =' }[k]);
      right.appendChild(rows[k].row);
    });
    var alert = document.createElement('div');
    alert.className = 'cl-alert';
    right.appendChild(alert);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function read(w) { return w.get(); }  // 向量输入框 get() 已返回一维数组
    function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
    function norm(a) { return Math.sqrt(dot(a, a)); }
    function compute() {
      var x = read(wx), y = read(wy);
      var d = dot(x, y), nx = norm(x), ny = norm(y);
      rows.dot.v.textContent = fmt(d);
      rows.nx.v.textContent = fmt(nx);
      rows.ny.v.textContent = fmt(ny);
      if (nx < 1e-9 || ny < 1e-9) {
        rows.cos.v.textContent = '—（含零向量）';
        rows.angle.v.textContent = '—';
        rows.proj.v.textContent = '—';
        rows.state.v.textContent = '请输入非零向量';
        rows.state.v.classList.remove('warn');
        alert.classList.remove('show');
        return;
      }
      var c = d / (nx * ny);
      c = Math.max(-1, Math.min(1, c));
      rows.cos.v.textContent = fmt(c);
      var deg = Math.acos(c) * 180 / Math.PI;
      rows.angle.v.textContent = deg.toFixed(1) + '°（' + (deg * Math.PI / 180).toFixed(3) + ' 弧度）';
      var t = d / dot(y, y);
      var p = y.map(function (v) { return v * t; });
      rows.proj.v.textContent = '(' + p.map(fmt).join(', ') + ')ᵀ';
      rows.state.v.classList.remove('warn');
      alert.classList.remove('show');
      if (Math.abs(d) < 1e-8) {
        rows.state.v.textContent = '正交：(x, y) = 0，即 x ⟂ y';
        alert.textContent = '正交是内积空间中最重要的关系：勾股定理 |x+y|²=|x|²+|y|² 成立。';
        alert.classList.add('show');
      } else if (Math.abs(Math.abs(c) - 1) < 1e-8) {
        rows.state.v.textContent = '平行（线性相关），Cauchy 不等式取等号';
      } else {
        rows.state.v.textContent = '夹角为锐角' + (d > 0 ? '' : '（钝角，内积为负）') + '，两向量无关';
      }
    }
    wx.wrap.addEventListener('input', compute);
    wy.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑦ Gram–Schmidt 正交化步骤演示 [data-gs-lab]（R³ 三个向量）
     ============================================================ */
  function initGsLab(root) {
    var wrap = document.createElement('div');
    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'as-btn'; prev.textContent = '上一步';
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'as-btn'; next.textContent = '下一步';
    var prog = document.createElement('span');
    prog.className = 'as-progress';
    ctrl.appendChild(prev); ctrl.appendChild(next); ctrl.appendChild(prog);

    var panels = document.createElement('div');
    function panel(inner) {
      var d = document.createElement('div');
      d.className = 'as-panel'; d.style.cssText = 'display:none;padding:4px 2px';
      d.innerHTML = inner;
      return d;
    }
    var p0 = panel('<p style="margin:0">取三个线性无关向量（可改默认值）：<br><b>x₁=(1,1,0)，x₂=(0,1,1)，x₃=(1,0,1)</b>。目标：用 Schmidt 公式构造一组标准正交基。</p>');
    var p1 = panel('<p style="margin:0"><b>第 1 步（正交化）</b>：令 <b>y₁′ = x₁ = (1,1,0)</b>。</p>');
    var p2 = panel('<p style="margin:0"><b>第 2 步</b>：减去 x₂ 在 y₁′ 上的投影：<br>' +
      'y₂′ = x₂ − ((x₂,y₁′)/(y₁′,y₁′)) y₁′ = (0,1,1) − 1/2·(1,1,0) = <b>(−1/2, 1/2, 1)</b>，验算 (y₂′,y₁′)=0。</p>');
    var p3 = panel('<p style="margin:0"><b>第 3 步</b>：再减去 x₃ 在 y₁′、y₂′ 上的投影：<br>' +
      'y₃′ = x₃ − ((x₃,y₂′)/(y₂′,y₂′))y₂′ − ((x₃,y₁′)/(y₁′,y₁′))y₁′<br>' +
      '= (1,0,1) − (1/3)(−1/2,1/2,1) − (1/2)(1,1,0) = <b>(2/3, −2/3, 2/3)</b>。</p>');
    var p4 = panel('<p style="margin:0"><b>第 4 步（单位化）</b>：|y₁′|=√2，|y₂′|=√(3/2)，|y₃′|=2/√3，故<br>' +
      '<b>e₁=(1/√2,1/√2,0)</b>，<b>e₂=(−1/√6,1/√6,2/√6)</b>，<b>e₃=(1/√3,−1/√3,1/√3)</b>。<br>' +
      '三者两两正交且长度为 1，构成标准正交基。</p>');
    var p5 = panel('<p style="margin:0"><b>完成</b>：任一非零欧氏空间都有正交基与标准正交基（定理 1.33）。记忆公式：每来一个新向量，就<b>减掉它在已有正交向量上的全部投影</b>，再整体除以长度。</p>');
    [p0,p1,p2,p3,p4,p5].forEach(function (p) { panels.appendChild(p); });
    wrap.appendChild(ctrl); wrap.appendChild(panels);
    root.appendChild(wrap);

    var ps = panels.querySelectorAll('.as-panel'), cur = 0;
    function show(i) {
      ps.forEach(function (p, k) { p.style.display = (k === i ? 'block' : 'none'); });
      prog.textContent = '步骤 ' + i + ' / ' + (ps.length - 1);
    }
    prev.addEventListener('click', function () { if (cur > 0) { cur--; show(cur); } });
    next.addEventListener('click', function () { if (cur < ps.length - 1) { cur++; show(cur); } });
    show(0);
  }

  /* ============================================================
     ⑧ ℓp 单位球可视化 [data-lp-ball]（R²）
     ============================================================ */
  function initLpBall(root) {
    var ps = [
      { v: 1, label: 'p = 1' }, { v: 1.5, label: 'p = 1.5' },
      { v: 2, label: 'p = 2' }, { v: 3, label: 'p = 3' },
      { v: '∞', label: 'p = ∞' }
    ];
    var bar = document.createElement('div');
    bar.className = 'sf-buttons';
    var stage = document.createElement('div');
    stage.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-top:12px';
    var svgBox = document.createElement('div');
    var info = document.createElement('div');
    info.className = 'cl-out';
    var rowShape = mkOutRow('单位球形状 =');
    var rowEx = mkOutRow('例：(3,4) 的范数 =');
    info.appendChild(rowShape.row); info.appendChild(rowEx.row);
    stage.appendChild(svgBox); stage.appendChild(info);
    root.appendChild(bar); root.appendChild(stage);

    var C = 110, N = 300;
    function pathFor(p) {
      var d = '';
      for (var i = 0; i <= 120; i++) {
        var t = (i / 120) * Math.PI * 2;
        var c = Math.cos(t), s = Math.sin(t);
        var r;
        if (p === '∞') r = 1 / Math.max(Math.abs(c), Math.abs(s));
        else r = 1 / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
        var x = N / 2 + C * r * c, y = N / 2 - C * r * s;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d + 'Z';
    }
    function render(p) {
      var name, example;
      if (p === 1) { name = '菱形（四条边 |x|+|y|=1），l1 单位球'; example = '||(3,4)||₁ = 3+4 = 7'; }
      else if (p === '∞') { name = '正方形（max|xᵢ|=1），l∞ 单位球'; example = '||(3,4)||∞ = max(3,4) = 4'; }
      else if (p === 2) { name = '单位圆盘（x²+y²=1），欧氏长度'; example = '||(3,4)||₂ = √(9+16) = 5'; }
      else { name = '介于圆与方之间的“超球”（p=' + p + '）'; example = '||(3,4)||_' + p + ' = (3^' + p + '+4^' + p + ')^{1/' + p + '}'; }
      rowShape.v.textContent = name;
      rowEx.v.textContent = example;
      svgBox.innerHTML =
        '<svg viewBox="0 0 ' + N + ' ' + N + '" style="width:300px;height:300px;max-width:100%">' +
        '<rect x="0" y="0" width="' + N + '" height="' + N + '" fill="#faf7f0" rx="8"/>' +
        '<line x1="10" y1="' + N / 2 + '" x2="' + (N - 10) + '" y2="' + N / 2 + '" stroke="#c2c9d2" stroke-width="1"/>' +
        '<line x1="' + N / 2 + '" y1="10" x2="' + N / 2 + '" y2="' + (N - 10) + '" stroke="#c2c9d2" stroke-width="1"/>' +
        '<circle cx="' + N / 2 + '" cy="' + N / 2 + '" r="' + C + '" fill="none" stroke="#b9d0e4" stroke-width="1.4" stroke-dasharray="4 4"/>' +
        '<path d="' + pathFor(p) + '" fill="rgba(43,95,139,0.16)" stroke="#2b5f8b" stroke-width="2.2"/>' +
        '<text x="' + (N - 16) + '" y="' + (N / 2 - 6) + '" font-size="13" fill="#8a8377">ξ₁</text>' +
        '<text x="' + (N / 2 + 7) + '" y="20" font-size="13" fill="#8a8377">ξ₂</text>' +
        '<text x="' + (N / 2 + 7) + '" y="' + (N / 2 - 6) + '" font-size="11" fill="#aaa">O</text>' +
        '</svg>';
    }
    ps.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = o.label;
      if (o.v === 2) b.classList.add('active');
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(bar.children, function (x) { x.classList.remove('active'); });
        b.classList.add('active'); render(o.v);
      });
      bar.appendChild(b);
    });
    render(2);
  }

  /* ============================================================
     ⑨ 向量范数计算器 [data-norm-lab]（R³）
     ============================================================ */
  function initNormLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('向量 x（R³）', [[3], [-4], [0]], true, 3);
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    pBar.style.marginTop = '10px';
    var pLab = document.createElement('span');
    pLab.textContent = 'p =';
    pLab.style.cssText = 'font-family:var(--font-sans);font-size:.85rem;align-self:center';
    pBar.appendChild(pLab);
    left.appendChild(wrap.wrap); left.appendChild(pBar);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rows = {};
    ['n1', 'n2', 'ninf', 'np', 'equiv'].forEach(function (k) {
      rows[k] = mkOutRow({ n1: '‖x‖₁ =', n2: '‖x‖₂ =', ninf: '‖x‖∞ =',
        np: '‖x‖_p =', equiv: '等价性验证 =' }[k]);
      right.appendChild(rows[k].row);
    });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    var p = 2;
    [1, 2, 3, '∞'].forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn' + (v === 2 ? ' active' : '');
      b.textContent = String(v);
      b.addEventListener('click', function () {
        p = v;
        Array.prototype.forEach.call(pBar.querySelectorAll('button'), function (x) { x.classList.remove('active'); });
        b.classList.add('active'); compute();
      });
      pBar.appendChild(b);
    });
    function lp(v) {
      if (v === '∞') return Math.max.apply(null, v0);
      var s = 0; v0.forEach(function (t) { s += Math.pow(Math.abs(t), v); });
      return Math.pow(s, 1 / v);
    }
    var v0 = [];
    function compute() {
      v0 = wrap.get();
      var n1 = v0.reduce(function (s, t) { return s + Math.abs(t); }, 0);
      var n2 = Math.sqrt(v0.reduce(function (s, t) { return s + t * t; }, 0));
      var ninf = Math.max.apply(null, v0.map(Math.abs));
      var np = lp(p);
      rows.n1.v.textContent = fmt(n1);
      rows.n2.v.textContent = fmt(n2);
      rows.ninf.v.textContent = fmt(ninf);
      rows.np.v.textContent = (p === '∞' ? '（即 ‖x‖∞）' : 'p = ' + p + ' 时为 ') + fmt(np);
      var n = v0.length, c = p === '∞' ? 1 : Math.pow(n, 1 / p);
      var ok = ninf - 1e-9 <= np + 1e-9 && np <= c * ninf + 1e-9;
      rows.equiv.v.textContent = '‖x‖∞ ≤ ‖x‖_p ≤ n^{1/p}‖x‖∞：' +
        fmt(ninf) + ' ≤ ' + fmt(np) + ' ≤ ' + fmt(c * ninf) + (ok ? '  ✓' : '  ✗');
    }
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑩ 矩阵范数计算器 [data-matrix-norm-lab]（3×3 实矩阵）
     ============================================================ */
  function initMatrixNormLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A（3×3，可改）',
      [[1, -2, 3], [0, 2, 1], [-1, 1, -1]], false, 3);
    left.appendChild(wrap.wrap);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var rows = {};
    [['m1', '‖A‖ₘ₁（所有元素绝对值和）'],
     ['minf', '‖A‖ₘ∞ = n·max|aᵢⱼ|'],
     ['f', 'Frobenius ‖A‖_F'],
     ['one', '列和范数 ‖A‖₁（最大列和）'],
     ['inf', '行和范数 ‖A‖∞（最大行和）'],
     ['spec', '谱范数 ‖A‖₂ = √λₘₐₓ(AᵀA)'],
     ['rho', '谱半径 ρ(A)（参考）']].forEach(function (kv) {
      rows[kv[0]] = mkOutRow(kv[1]);
      right.appendChild(rows[kv[0]].row);
    });
    var note = document.createElement('div');
    note.className = 'cl-alert';
    note.textContent = '提示：诱导范数都满足 ‖Ax‖≤‖A‖‖x‖；m₁、m∞ 是广义矩阵范数但不直接与向量范数相容。';
    right.appendChild(note);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function symEigen3(M) {
      // Jacobi 迭代求实对称 3x3 矩阵特征值
      var a = M.map(function (r) { return r.slice(); });
      for (var iter = 0; iter < 60; iter++) {
        var p = 0, q = 1, mx = 0;
        for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) {
          if (Math.abs(a[i][j]) > mx) { mx = Math.abs(a[i][j]); p = i; q = j; }
        }
        if (mx < 1e-12) break;
        var tau = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        var c = 1 / Math.sqrt(1 + t * t), s = t * c;
        for (var k = 0; k < 3; k++) {
          var ap = c * a[p][k] - s * a[q][k], aq = s * a[p][k] + c * a[q][k];
          a[p][k] = ap; a[q][k] = aq;
        }
        for (var k2 = 0; k2 < 3; k2++) {
          var ap2 = c * a[k2][p] - s * a[k2][q], aq2 = s * a[k2][p] + c * a[k2][q];
          a[k2][p] = ap2; a[k2][q] = aq2;
        }
      }
      return [a[0][0], a[1][1], a[2][2]];
    }
    function eig3General(M) {
      // 一般 3x3 实矩阵：由特征三次方程 det(λI−A)=λ³+c2λ²+c1λ+c0 求实根/共轭复根的最大模（谱半径）
      var a = M;
      var tr = a[0][0] + a[1][1] + a[2][2];
      var c2 = -tr;
      var c1 = (a[0][0]*a[1][1] - a[0][1]*a[1][0]) +
               (a[0][0]*a[2][2] - a[0][2]*a[2][0]) +
               (a[1][1]*a[2][2] - a[1][2]*a[2][1]);
      var det = a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1]) -
                a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0]) +
                a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
      var c0 = -det;
      // 化为 depressed cubic：t = λ + c2/3，t³ + p t + q = 0
      var shift = c2 / 3;
      var p = c1 - c2*c2/3;
      var q = c0 - c1*c2/3 + 2*c2*c2*c2/27;
      var qh2 = q/2, ph2 = p/3;
      var disc = qh2*qh2 + ph2*ph2*ph2;
      var dtol = 1e-12 * Math.max(Math.abs(ph2*ph2*ph2), Math.abs(qh2*qh2));   // 相对判据，见 eig3 处注释
      var mod = [];
      if (disc > dtol) {
        // 一个实根 + 一对共轭复根
        var sq = Math.sqrt(disc);
        var u = Math.cbrt(-q/2 + sq), v = Math.cbrt(-q/2 - sq);
        var t1 = u + v;
        var lam1 = t1 - shift;
        var alpha = -shift - t1/2;          // 复根实部（由 λ1+2α=tr 关系）
        var mod2 = lam1 !== 0 ? -c0/lam1 : alpha*alpha; // 复根模平方 λ1(α²+β²) = -c0
        mod.push(Math.abs(lam1));
        if (mod2 > 0) mod.push(Math.sqrt(mod2));
      } else {
        // 三个实根（三角解法）
        var r = Math.sqrt(Math.max(0, -(p/3)*(p/3)*(p/3)));
        var phi = Math.acos(Math.max(-1, Math.min(1, -q/2/(r || 1e-14))));
        var t = [2*Math.cbrt(r)*Math.cos(phi/3),
                 2*Math.cbrt(r)*Math.cos((phi+2*Math.PI)/3),
                 2*Math.cbrt(r)*Math.cos((phi+4*Math.PI)/3)];
        t.forEach(function (tt) { mod.push(Math.abs(tt - shift)); });
      }
      return Math.max.apply(null, mod);
    }
    function compute() {
      var A = wrap.get();
      var n = 3;
      var m1 = 0, mx = 0, ff = 0;
      var col = [0,0,0], row = [0,0,0];
      for (var i=0;i<n;i++) for (var j=0;j<n;j++) {
        var v = Math.abs(A[i][j]);
        m1 += v; mx = Math.max(mx, v); ff += A[i][j]*A[i][j];
        col[j] += v; row[i] += v;
      }
      rows.m1.v.textContent = fmt(m1);
      rows.minf.v.textContent = fmt(n * mx);
      rows.f.v.textContent = fmt(Math.sqrt(ff));
      rows.one.v.textContent = fmt(Math.max.apply(null, col));
      rows.inf.v.textContent = fmt(Math.max.apply(null, row));
      var At = [[0,0,0],[0,0,0],[0,0,0]];
      for (var r=0;r<n;r++) for (var c=0;c<n;c++) At[c][r]=A[r][c];
      var AtA = [[0,0,0],[0,0,0],[0,0,0]];
      for (var i2=0;i2<n;i2++) for (var j2=0;j2<n;j2++) { var s=0; for (var k=0;k<n;k++) s+=At[i2][k]*A[k][j2]; AtA[i2][j2]=s; }
      var ev = symEigen3(AtA);
      var lam = Math.max.apply(null, ev);
      rows.spec.v.textContent = fmt(Math.sqrt(Math.max(lam, 0))) + '　（AᵀA 特征值：' + ev.map(function (x) { return fmt(x); }).join(', ') + '）';
      rows.rho.v.textContent = fmt(eig3General(A));
    }
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑪ 幂收敛 / 谱半径实验 [data-power-lab]（2×2）
     ============================================================ */
  function initPowerLab(root) {
    var presets = [
      { name: '收敛 ρ<1（如 0.5I+0.2N）', A: [[0.5, 0.2], [0, 0.5]] },
      { name: '临界 ρ=1（特征值含 1）', A: [[1, 0.3], [0, 1]] },
      { name: '发散 ρ>1', A: [[1.1, 0], [0, 0.8]] },
      { name: '振荡（负特征值）', A: [[0, 0.9], [-0.9, 0]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A', presets[0].A, false, 2);
    left.appendChild(pBar); left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rows = {};
    ['rho', 'norms', 'powers', 'verdict'].forEach(function (k) {
      rows[k] = mkOutRow({ rho: '谱半径 ρ(A) =', norms: '三种诱导范数 =',
        powers: '‖Aᵏ‖₂（k=2,5,10,30）=', verdict: 'Aᵏ 的趋势 =' }[k]);
      right.appendChild(rows[k].row);
    });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      return [[X[0][0]*Y[0][0]+X[0][1]*Y[1][0], X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],
              [X[1][0]*Y[0][0]+X[1][1]*Y[1][0], X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]];
    }
    function specN2(A) {
      // ||A||2 = sqrt(max eig AᵀA)，2x2 解析解
      var a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
      var M = [[a*a+c*c, a*b+c*d], [a*b+c*d, b*b+d*d]];
      var t = M[0][0]+M[1][1], dt = M[0][0]*M[1][1]-M[0][1]*M[1][0];
      var disc = Math.max(0, t*t-4*dt);
      return Math.sqrt((t+Math.sqrt(disc))/2);
    }
    function compute() {
      var A = wrap.get();
      var tr = A[0][0]+A[1][1], det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
      var disc = tr*tr-4*det;
      var eigs;
      if (disc >= 0) {
        eigs = [(tr+Math.sqrt(disc))/2, (tr-Math.sqrt(disc))/2];
      } else {
        var mod = Math.sqrt(det);
        eigs = [mod, mod]; // 共轭复根模相同
      }
      var rho = Math.max.apply(null, eigs.map(Math.abs));
      rows.rho.v.textContent = fmt(rho) + (disc < 0 ? '（共轭复根 ' + (tr/2).toFixed(2) + '±' + (Math.sqrt(-disc)/2).toFixed(2) + 'i，模相同）' : '（特征值 ' + eigs.map(fmt).join(', ') + '）');
      var n1 = Math.max(Math.abs(A[0][0])+Math.abs(A[1][0]), Math.abs(A[0][1])+Math.abs(A[1][1]));
      var ninf = Math.max(Math.abs(A[0][0])+Math.abs(A[0][1]), Math.abs(A[1][0])+Math.abs(A[1][1]));
      var n2 = specN2(A);
      rows.norms.v.textContent = '‖A‖₁=' + fmt(n1) + '，‖A‖₂=' + fmt(n2) + '，‖A‖∞=' + fmt(ninf);
      var ks = [2, 5, 10, 30];
      rows.powers.v.textContent = ks.map(function (k) { return 'k=' + k + ': ' + fmt(Math.pow(rho, k)); }).join('；') +
        '（ρᵏ 是 ‖Aᵏ‖₂ 的主阶下界，实际 ‖Aᵏ‖₂ 还含多项式因子）';
      rows.verdict.v.classList.remove('warn');
      if (rho < 1 - 1e-9) rows.verdict.v.textContent = 'ρ(A) < 1 ⇒ Aᵏ → O（收敛矩阵，迭代法收敛）';
      else if (rho > 1 + 1e-9) rows.verdict.v.textContent = 'ρ(A) > 1 ⇒ Aᵏ 发散';
      else { rows.verdict.v.textContent = 'ρ(A) = 1：Aᵏ 不趋于 O（临界；非亏损时幂有界，亏损时随多项式增长）'; rows.verdict.v.classList.add('warn'); }
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = p.name;
      b.addEventListener('click', function () { wrap.set(p.A); compute(); });
      pBar.appendChild(b);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑫ 矩阵幂序列查看器 [data-sequence-lab]（2×2）
     ============================================================ */
  function initSequenceLab(root) {
    var presets = [
      { name: '例 3.1 的矩阵', A: [[0.5, 1/3], [0.25, 0.2]] },
      { name: '收敛（次对角）', A: [[0.6, 0.5], [0, 0.4]] },
      { name: '临界（特征值 1）', A: [[1, 0.4], [0, 1]] },
      { name: '发散', A: [[1.2, 0], [0, 0.7]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A', presets[0].A, false, 2);
    var info = document.createElement('div');
    info.className = 'cl-out';
    info.style.marginTop = '10px';
    left.appendChild(pBar); left.appendChild(wrap.wrap); left.appendChild(info);
    var right = document.createElement('div');
    right.style.cssText = 'flex:1;min-width:300px';
    var title = document.createElement('div');
    title.className = 'cl-k';
    title.textContent = '幂序列 Aᵏ 的元素：';
    title.style.marginBottom = '8px';
    var seqBox = document.createElement('div');
    seqBox.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px';
    right.appendChild(title); right.appendChild(seqBox);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      return [[X[0][0]*Y[0][0]+X[0][1]*Y[1][0], X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],
              [X[1][0]*Y[0][0]+X[1][1]*Y[1][0], X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]];
    }
    function fmt2(x) {
      var a = Math.abs(x) < 1e-4 ? 0 : x;
      return (Math.round(a * 1000) / 1000).toString();
    }
    function matrixCard(k, M, dim) {
      var d = document.createElement('div');
      d.style.cssText = 'background:var(--surface-alt);border:1px solid var(--rule);border-radius:8px;padding:8px 10px;text-align:center';
      d.innerHTML = '<div style="font-family:var(--font-sans);font-size:.82rem;color:var(--ink-soft);margin-bottom:4px">' +
        (k === 0 ? 'I（k=0）' : 'k=' + k) + '</div>' +
        '<div style="font-family:Consolas,monospace;font-size:.85rem;line-height:1.5">' +
        fmt2(M[0][0]) + '　' + fmt2(M[0][1]) + '<br>' + fmt2(M[1][0]) + '　' + fmt2(M[1][1]) + '</div>';
      return d;
    }
    function compute() {
      var A = wrap.get();
      var tr = A[0][0]+A[1][1], det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
      var disc = tr*tr-4*det;
      var eigs, rho;
      if (disc >= 0) { eigs = [(tr+Math.sqrt(disc))/2,(tr-Math.sqrt(disc))/2]; rho = Math.max.apply(null, eigs.map(Math.abs)); }
      else { rho = Math.sqrt(det); eigs = [tr/2, tr/2]; }
      info.innerHTML = '';
      var rr = mkOutRow(disc >= 0 ? '特征值 =' : '共轭复根，模 =');
      rr.v.textContent = disc >= 0 ? eigs.map(fmt).join(', ') : fmt(rho) + '（实部 ' + fmt(eigs[0]) + '）';
      var rr2 = mkOutRow('谱半径 ρ(A) =');
      rr2.v.textContent = fmt(rho);
      var rr3 = mkOutRow('序列趋势 =');
      rr3.v.textContent = rho < 1-1e-9 ? 'Aᵏ → O（收敛矩阵）' : (rho > 1+1e-9 ? 'Aᵏ 发散' : 'ρ=1：Aᵏ 不趋于 O');
      if (Math.abs(rho-1) <= 1e-9) rr3.v.classList.add('warn');
      info.appendChild(rr.row); info.appendChild(rr2.row); info.appendChild(rr3.row);

      seqBox.innerHTML = '';
      var R = [[1,0],[0,1]];
      [0,1,2,3,5,10,20].forEach(function (k) {
        if (k === 0) { seqBox.appendChild(matrixCard(0, R)); return; }
        // 递推到 k
        var cur = [[1,0],[0,1]];
        for (var i = 0; i < k; i++) cur = mm(cur, A);
        var card = matrixCard(k, cur);
        if (rho < 1-1e-9 && k >= 10) card.style.background = 'rgba(47,125,83,0.08)';
        if (rho > 1+1e-9 && k >= 10) card.style.background = 'rgba(158,59,70,0.08)';
        seqBox.appendChild(card);
      });
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = p.name;
      b.addEventListener('click', function () { wrap.set(p.A); compute(); });
      pBar.appendChild(b);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑬ Neumann 级数部分和查看器 [data-neumann-lab]（2×2）
     ============================================================ */
  function initNeumannLab(root) {
    var presets = [
      { name: '默认（快速收敛）', A: [[0.2, 0.3], [0, 0.1]] },
      { name: '接近临界 ‖A‖≈0.9', A: [[0.5, 0.4], [0.3, 0.2]] },
      { name: 'ρ<1 但 ‖A‖₁>1', A: [[0, 2], [0, 0]] },
      { name: '发散（ρ>1）', A: [[1.1, 0], [0, 0.5]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A', presets[0].A, false, 2);
    var info = document.createElement('div');
    info.className = 'cl-out';
    info.style.marginTop = '10px';
    left.appendChild(pBar); left.appendChild(wrap.wrap); left.appendChild(info);
    var right = document.createElement('div');
    right.style.cssText = 'flex:1;min-width:320px';
    var title = document.createElement('div');
    title.className = 'cl-k';
    title.innerHTML = '部分和 S<sub>N</sub> = I + A + … + A<sup>N</sup>：';
    title.style.marginBottom = '8px';
    var box = document.createElement('div');
    box.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px';
    var tail = document.createElement('div');
    tail.style.cssText = 'margin-top:10px;font-family:var(--font-sans);font-size:.85rem;color:var(--ink-soft)';
    right.appendChild(title); right.appendChild(box); right.appendChild(tail);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      return [[X[0][0]*Y[0][0]+X[0][1]*Y[1][0], X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],
              [X[1][0]*Y[0][0]+X[1][1]*Y[1][0], X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]];
    }
    function madd(X, Y) { return [[X[0][0]+Y[0][0], X[0][1]+Y[0][1]], [X[1][0]+Y[1][0], X[1][1]+Y[1][1]]]; }
    function minv2(M) {
      var d = M[0][0]*M[1][1]-M[0][1]*M[1][0];
      return [[M[1][1]/d, -M[0][1]/d], [-M[1][0]/d, M[0][0]/d]];
    }
    function f2(x) { var a = Math.abs(x) < 5e-4 ? 0 : x; return (Math.round(a*1000)/1000).toString(); }
    function card(N, M) {
      var d = document.createElement('div');
      d.style.cssText = 'background:var(--surface-alt);border:1px solid var(--rule);border-radius:8px;padding:8px 10px;text-align:center';
      d.innerHTML = '<div style="font-family:var(--font-sans);font-size:.8rem;color:var(--ink-soft);margin-bottom:4px">N=' + N + '</div>' +
        '<div style="font-family:Consolas,monospace;font-size:.83rem;line-height:1.55">' +
        f2(M[0][0]) + '　' + f2(M[0][1]) + '<br>' + f2(M[1][0]) + '　' + f2(M[1][1]) + '</div>';
      return d;
    }
    function compute() {
      var A = wrap.get();
      var tr = A[0][0]+A[1][1], det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
      var disc = tr*tr-4*det;
      var eigs, rho;
      if (disc >= 0) { eigs=[(tr+Math.sqrt(disc))/2,(tr-Math.sqrt(disc))/2]; rho=Math.max.apply(null,eigs.map(Math.abs)); }
      else { rho=Math.sqrt(Math.max(0,det)); eigs=[tr/2,tr/2]; }
      info.innerHTML = '';
      var rr = mkOutRow(disc>=0?'特征值 =':'共轭复根，模 =');
      rr.v.textContent = disc>=0 ? eigs.map(fmt).join(', ') : fmt(rho);
      var rr2 = mkOutRow('谱半径 ρ(A) ='); rr2.v.textContent = fmt(rho);
      var rr3 = mkOutRow('Neumann 级数 =');
      var converged = rho < 1-1e-9;
      rr3.v.textContent = converged ? '收敛于 (I−A)⁻¹' : (rho>1+1e-9?'发散（ρ>1）':'临界 ρ=1，不收敛');
      if (Math.abs(rho-1) <= 1e-9) rr3.v.classList.add('warn');
      info.appendChild(rr.row); info.appendChild(rr2.row); info.appendChild(rr3.row);

      box.innerHTML = ''; tail.innerHTML = '';
      var S = [[1,0],[0,1]], Ak = [[1,0],[0,1]];
      var Ns = [0,1,2,3,5,10,20];
      Ns.forEach(function (N) {
        while (true) {
          var cur = (function(){ var p=[[1,0],[0,1]]; for(var i=0;i<N;i++) p=mm(p,A); return p; })();
          var sN=[[0,0],[0,0]], pw=[[1,0],[0,1]];
          for (var k=0;k<=N;k++){ sN=madd(sN,pw); pw=mm(pw,A); }
          box.appendChild(card(N, sN));
          if (converged) {
            var inv = minv2([[1-A[0][0],-A[0][1]],[-A[1][0],1-A[1][1]]]);
            var err = Math.max(Math.abs(sN[0][0]-inv[0][0]),Math.abs(sN[0][1]-inv[0][1]),
                               Math.abs(sN[1][0]-inv[1][0]),Math.abs(sN[1][1]-inv[1][1]));
            if (N===20) tail.textContent = 'N=20 时与精确值 (I−A)⁻¹ 的最大元素误差 ≈ ' + fmt(err) +
              '；截断误差界 ‖A‖₂^{N+1}/(1−‖A‖₂) 随 N 增大趋于 0（定理 3.5）。';
          } else if (rho>1+1e-9 && N>=10) {
            tail.textContent = 'ρ(A)>1：部分和元素不断增大，级数发散（A 不是收敛矩阵）。';
          } else {
            tail.textContent = 'ρ=1 时部分和不趋于有限矩阵。';
          }
          break;
        }
      });
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type='button'; b.className='sf-btn'; b.textContent=p.name;
      b.addEventListener('click', function(){ wrap.set(p.A); compute(); });
      pBar.appendChild(b);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑭ Jordan 块矩阵函数计算器 [data-mfunc-lab]（2×2 上三角）
         [λ  n]
         [0  λ]  时 f(A)=[f(λ)  n f′(λ)]
         [0  f(λ)]
     ============================================================ */
  function initMfuncLab(root) {
    var presets = [
      { name: '例：λ=2, n=1', lam: 2, n: 1 },
      { name: 'λ=0, n=1（幂零）', lam: 0, n: 1 },
      { name: 'λ=1, n=1', lam: 1, n: 1 },
      { name: '纯量矩阵 n=0', lam: 2, n: 0 }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wLam = document.createElement('div');
    wLam.className = 'cl-matrix';
    var lamName = document.createElement('div');
    lamName.className = 'cl-name'; lamName.textContent = '特征值 λ';
    var inLam = document.createElement('input');
    inLam.type = 'text'; inLam.value = '2';
    inLam.setAttribute('aria-label', '特征值 λ（矩阵函数的 Jordan 特征值）');
    inLam.style.cssText = 'width:74px';
    var wN = document.createElement('div');
    wN.className = 'cl-matrix';
    wN.style.marginTop = '8px';
    var nName = document.createElement('div');
    nName.className = 'cl-name'; nName.textContent = '超对角 n';
    var inN = document.createElement('input');
    inN.type = 'text'; inN.value = '1';
    inN.setAttribute('aria-label', '超对角 n（Jordan 块的大小）');
    inN.style.cssText = 'width:74px';
    var tWrap = document.createElement('div');
    tWrap.style.marginTop = '8px';
    var tName = document.createElement('div');
    tName.className = 'cl-name'; tName.textContent = '参数 t（用于 e^{tA}）';
    var inT = document.createElement('input');
    inT.type = 'text'; inT.value = '1';
    inT.setAttribute('aria-label', 't（函数自变量，用于 e^{tA}）');
    inT.style.cssText = 'width:74px';
    wLam.appendChild(lamName); wLam.appendChild(inLam);
    wN.appendChild(nName); wN.appendChild(inN);
    tWrap.appendChild(tName); tWrap.appendChild(inT);
    left.appendChild(pBar); left.appendChild(wLam); left.appendChild(wN); left.appendChild(tWrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var Ashow = mkOutRow('A =');
    var re = mkOutRow('eᴬ =');
    var rt = mkOutRow('eᵗᴬ =');
    var rs = mkOutRow('sin A =');
    var rc = mkOutRow('cos A =');
    [Ashow, re, rt, rs, rc].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function num(s) { var v = parseFloat(s); return isNaN(v) ? 0 : v; }
    function f3(x) {
      if (Math.abs(x) < 5e-4) return '0';
      var r = Math.round(x * 1000) / 1000;
      return r.toString();
    }
    function mat2(a, b, c, d) {
      return '[ ' + f3(a) + '　' + f3(b) + ' ; ' + f3(c) + '　' + f3(d) + ' ]';
    }
    function compute() {
      var lam = num(inLam.value), n = num(inN.value), t = num(inT.value);
      Ashow.v.textContent = mat2(lam, n, 0, lam);
      // f(A) = f(λ)I + n f′(λ) N（N=[[0,1],[0,0]]，N²=0）
      var e = Math.exp(lam);
      re.v.textContent = mat2(e, n * e, 0, e);
      var et = Math.exp(t * lam);
      rt.v.textContent = mat2(et, n * t * et, 0, et);
      var s = Math.sin(lam), c = Math.cos(lam);
      rs.v.textContent = mat2(s, n * c, 0, s);
      rc.v.textContent = mat2(c, -n * s, 0, c);
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = p.name;
      b.addEventListener('click', function () { inLam.value = p.lam; inN.value = p.n; compute(); });
      pBar.appendChild(b);
    });
    [inLam, inN, inT].forEach(function (i) { i.addEventListener('input', compute); });
    compute();
  }

  /* ============================================================
     ⑮ 二次型梯度计算器 [data-gradient-lab]（f=xᵀAx−bᵀx，A 2×2）
     ============================================================ */
  function initGradientLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wA = mkMatrixInputs('对称矩阵 A（只取对称部分）', [[2, 1], [1, 3]], false, 2);
    var wb = mkMatrixInputs('线性项 b', [[1], [-2]], true, 2);
    left.appendChild(wA.wrap); left.appendChild(wb.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var r1 = mkOutRow('f(x) =');
    var r2 = mkOutRow('∂f/∂x₁ =');
    var r3 = mkOutRow('∂f/∂x₂ =');
    var r4 = mkOutRow('df/dx =');
    var r5 = mkOutRow('对称时（A=Aᵀ）=');
    [r1, r2, r3, r4, r5].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function compute() {
      var A = wA.get(), b = wb.get();
      // 对称化：二次型只依赖 (A+Aᵀ)/2
      var s = [[(A[0][0]+A[0][0])/2, (A[0][1]+A[1][0])/2], [(A[1][0]+A[0][1])/2, (A[1][1]+A[1][1])/2]];
      r1.v.innerHTML = 'xᵀAx − bᵀx，对称化后 A*=[' + s[0].map(fmt).join(', ') + ' ; ' + s[1].map(fmt).join(', ') + ']';
      r2.v.textContent = '2(' + fmt(s[0][0]) + ' x₁ + ' + fmt(s[0][1]) + ' x₂) − (' + fmt(b[0]) + ')';
      r3.v.textContent = '2(' + fmt(s[1][0]) + ' x₁ + ' + fmt(s[1][1]) + ' x₂) − (' + fmt(b[1]) + ')';
      r4.v.textContent = '(A + Aᵀ)x − b（一般公式）';
      var isSym = Math.abs(A[0][1]-A[1][0]) < 1e-9;
      r5.v.textContent = isSym
        ? '2Ax − b（本题 A 对称）= [' + fmt(2*s[0][0]) + ' x₁+' + fmt(2*s[0][1]) + 'x₂−' + fmt(b[0]) + ' ; ' + fmt(2*s[1][0]) + 'x₁+' + fmt(2*s[1][1]) + 'x₂−' + fmt(b[1]) + ']'
        : 'A 不对称，梯度是 (A+Aᵀ)x − b，不能写成 2Ax − b';
      r5.v.classList.toggle('warn', !isSym);
    }
    wA.wrap.addEventListener('input', compute);
    wb.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑯ 线性 ODE 求解器 [data-ode-lab]（2×2，幂级数数值算 e^{tA}）
     ============================================================ */
  function initOdeLab(root) {
    var presets = [
      { name: 'Jordan 块（有解析解）', A: [[2, 1], [0, 2]], c: [1, 0], t: 0.5 },
      { name: '对角矩阵', A: [[1, 0], [0, -1]], c: [1, 1], t: 1 },
      { name: '旋转/振荡', A: [[0, 1], [-1, 0]], c: [1, 0], t: 1.5708 },
      { name: '不稳定（正特征值）', A: [[1, 1], [0, 0.5]], c: [1, 1], t: 1 }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wA = mkMatrixInputs('系数矩阵 A', presets[0].A, false, 2);
    var wC = mkMatrixInputs('初值 x(0)=c', presets[0].c.map(function (v) { return [v]; }), true, 2);
    var tWrap = document.createElement('div');
    tWrap.className = 'cl-matrix';
    tWrap.style.marginTop = '8px';
    var tName = document.createElement('div');
    tName.className = 'cl-name'; tName.textContent = '时刻 t';
    var inT = document.createElement('input');
    inT.type = 'text'; inT.value = '0.5'; inT.style.cssText = 'width:74px';
    inT.setAttribute('aria-label', 't₀（初值时刻，线性 ODE 求解）');
    tWrap.appendChild(tName); tWrap.appendChild(inT);
    left.appendChild(pBar); left.appendChild(wA.wrap); left.appendChild(wC.wrap); left.appendChild(tWrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var r0 = mkOutRow('e^{tA} =');
    var r1 = mkOutRow('x(t)=e^{tA}c =');
    var r2 = mkOutRow('检验 x′=Ax =');
    var r3 = mkOutRow('说明 =');
    [r0, r1, r2, r3].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      return [[X[0][0]*Y[0][0]+X[0][1]*Y[1][0], X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],
              [X[1][0]*Y[0][0]+X[1][1]*Y[1][0], X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]];
    }
    function madd(X, Y) { return [[X[0][0]+Y[0][0], X[0][1]+Y[0][1]], [X[1][0]+Y[1][0], X[1][1]+Y[1][1]]]; }
    function mscale(X, s) { return [[s*X[0][0], s*X[0][1]], [s*X[1][0], s*X[1][1]]]; }
    function matText(M) { return '[ ' + fmt(M[0][0]) + '　' + fmt(M[0][1]) + ' ; ' + fmt(M[1][0]) + '　' + fmt(M[1][1]) + ' ]'; }
    function vecText(v) { return '(' + v.map(fmt).join(', ') + ')ᵀ'; }
    // 幂级数 e^M = Σ M^k/k!
    function expm(M) {
      var S = [[1,0],[0,1]], term = [[1,0],[0,1]];
      for (var k = 1; k < 80; k++) {
        term = mscale(mm(term, M), 1 / k);
        S = madd(S, term);
        var mx = Math.max(Math.abs(term[0][0]), Math.abs(term[0][1]), Math.abs(term[1][0]), Math.abs(term[1][1]));
        if (mx < 1e-12) break;
      }
      return S;
    }
    function compute() {
      var A = wA.get(), c = wC.get(), t = num(inT.value);
      var tA = mscale(A, t);
      var E = expm(tA);
      r0.v.textContent = matText(E);
      var x = [E[0][0]*c[0]+E[0][1]*c[1], E[1][0]*c[0]+E[1][1]*c[1]];
      r1.v.textContent = vecText(x);
      var Ax = [A[0][0]*x[0]+A[0][1]*x[1], A[1][0]*x[0]+A[1][1]*x[1]];
      r2.v.textContent = vecText(Ax) + '（x′ 与 Ax 一致即满足方程）';
      var tr = A[0][0]+A[1][1], det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
      var disc = tr*tr-4*det, eig;
      if (disc >= 0) eig = [(tr+Math.sqrt(disc))/2, (tr-Math.sqrt(disc))/2];
      else eig = [tr/2, tr/2];
      var grow = disc >= 0 ? Math.max.apply(null, eig.map(Math.abs)) : Math.sqrt(Math.max(0, det));
      r3.v.textContent = (disc >= 0 ? '特征值 ' + eig.map(fmt).join(', ') : '共轭复根（实部 ' + fmt(tr/2) + '），振荡') +
        (grow > 1 ? '；长期发散' : '；长期有界/衰减');
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = p.name;
      b.addEventListener('click', function () { wA.set(p.A); wC.set(p.c.map(function (v) { return [v]; })); inT.value = p.t; compute(); });
      pBar.appendChild(b);
    });
    wA.wrap.addEventListener('input', compute);
    wC.wrap.addEventListener('input', compute);
    inT.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑰ LU / LDU / Cholesky 分解演示器 [data-lu-lab]（3×3）
     ============================================================ */
  function initLuLab(root) {
    var presets = [
      { name: '例 4.1', A: [[2,-1,3],[1,2,1],[2,4,2]] },
      { name: '对称正定（Cholesky）', A: [[5,-2,0],[-2,3,-1],[0,-1,1]] },
      { name: '简单矩阵', A: [[1,2,3],[2,5,2],[3,1,5]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A（3×3）', presets[0].A, false, 3);
    left.appendChild(pBar); left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rD = mkOutRow('顺序主子式 =');
    var rL = mkOutRow('L（单位下三角）=');
    var rU = mkOutRow('U（上三角）=');
    var rLDU = mkOutRow('LDU 分解 =');
    var rC = mkOutRow('Cholesky G =');
    var rV = mkOutRow('验证 LU =');
    [rD, rL, rU, rLDU, rC, rV].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function m3(M) {
      return M.map(function (row) { return '[ ' + row.map(fmt).join('　') + ' ]'; }).join('  ');
    }
    function compute() {
      var A = wrap.get();
      // 顺序主子式
      function det2(B) { return B[0][0]*B[1][1]-B[0][1]*B[1][0]; }
      var d1 = A[0][0];
      var d2 = det2([[A[0][0],A[0][1]],[A[1][0],A[1][1]]]);
      var d3 = A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])
             - A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])
             + A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
      rD.v.textContent = 'Δ₁=' + fmt(d1) + '，Δ₂=' + fmt(d2) + '，Δ₃=det A=' + fmt(d3);
      if (Math.abs(d1) < 1e-10 || Math.abs(d2) < 1e-10) {
        rL.v.textContent = '前 n−1 阶顺序主子式有零，顺序 Gauss 消元无法进行（需选主元/行交换，定理 4.2）';
        rU.v.textContent = '—'; rLDU.v.textContent = '—'; rC.v.textContent = '—'; rV.v.textContent = '—';
        rL.v.classList.add('warn'); return;
      }
      rL.v.classList.remove('warn');
      // Doolittle 消元（记录乘数）
      var M = A.map(function (r) { return r.slice(); });
      var L = [[1,0,0],[0,1,0],[0,0,1]];
      for (var k = 0; k < 2; k++) {
        for (var i = k+1; i < 3; i++) {
          var c = M[i][k] / M[k][k];
          L[i][k] = c;
          for (var j = k; j < 3; j++) M[i][j] -= c * M[k][j];
        }
      }
      var U = M;
      var piv = [U[0][0], U[1][1], U[2][2]];
      rL.v.textContent = m3(L);
      rU.v.textContent = m3(U);
      var Dm = [[piv[0],0,0],[0,piv[1],0],[0,0,piv[2]]];
      var U0 = [[1, U[0][1]/piv[0], U[0][2]/piv[0]],
                [0,1,U[1][2]/piv[1]],[0,0,1]];
      rLDU.v.textContent = 'D=diag(' + piv.map(fmt).join(', ') + ')，单位上三角 U₀=' + m3(U0);
      // Cholesky（仅对称正定时）
      var sym = Math.abs(A[0][1]-A[1][0])<1e-9 && Math.abs(A[0][2]-A[2][0])<1e-9 && Math.abs(A[1][2]-A[2][1])<1e-9;
      var pd = d1 > 1e-9 && d2 > 1e-9 && d3 > 1e-9;
      if (sym && pd) {
        var G = [[0,0,0],[0,0,0],[0,0,0]];
        for (var ii = 0; ii < 3; ii++) {
          for (var jj = 0; jj <= ii; jj++) {
            var s = 0;
            for (var t = 0; t < jj; t++) s += G[ii][t]*G[jj][t];
            G[ii][jj] = ii === jj ? Math.sqrt(A[ii][ii]-s) : (A[ii][jj]-s)/G[jj][jj];
          }
        }
        rC.v.textContent = m3(G) + '（满足 A=GGᵀ）';
      } else {
        rC.v.textContent = sym ? '对称但非正定，无实 Cholesky 分解' : '不对称，不适用 Cholesky';
      }
      // 验证
      var P = [[0,0,0],[0,0,0],[0,0,0]];
      for (var r2 = 0; r2 < 3; r2++) for (var c2 = 0; c2 < 3; c2++) {
        var v = 0; for (var q = 0; q < 3; q++) v += L[r2][q]*U[q][c2]; P[r2][c2] = v;
      }
      var ok = [0,1,2].every(function (a) { return [0,1,2].every(function (b) { return Math.abs(P[a][b]-A[a][b]) < 1e-7; }); });
      rV.v.textContent = m3(P) + (ok ? '　✓ 与 A 一致' : '　误差');
    }
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sf-btn'; b.textContent = p.name;
      b.addEventListener('click', function () { wrap.set(p.A); compute(); });
      pBar.appendChild(b);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑱ QR 分解（Gram-Schmidt）演示器 [data-qr-lab]（3×3）
     ============================================================ */
  function initQrLab(root) {
    var presets = [
      { name: '例 4.6', A: [[1,2,2],[2,1,2],[1,2,1]] },
      { name: '简单非对称', A: [[1,1,0],[0,1,1],[1,0,1]] },
      { name: '对角占优', A: [[3,1,0],[1,3,1],[0,1,3]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var wrap = mkMatrixInputs('矩阵 A（3×3，列线性无关）', presets[0].A, false, 3);
    left.appendChild(pBar); left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rQ = mkOutRow('Q（正交列）=');
    var rR = mkOutRow('R（上三角）=');
    var rV = mkOutRow('验证 QR =');
    var rO = mkOutRow('QᵀQ =');
    [rQ, rR, rV, rO].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
    function scale(a, s) { return [s*a[0], s*a[1], s*a[2]]; }
    function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
    function norm(a) { return Math.sqrt(dot(a, a)); }
    function f3(x) { var a=Math.abs(x)<5e-4?0:x; return (Math.round(a*1000)/1000).toString(); }
    function mat3(M) {
      return M.map(function (row) { return '[ ' + row.map(f3).join('　') + ' ]'; }).join('  ');
    }
    function compute() {
      var A = wrap.get();
      // 取列
      var cols = [];
      for (var j = 0; j < 3; j++) cols.push([A[0][j], A[1][j], A[2][j]]);
      // Schmidt 正交化
      var b = [], q = [], R = [[0,0,0],[0,0,0],[0,0,0]];
      for (var k = 0; k < 3; k++) {
        var v = cols[k].slice();
        for (var i = 0; i < k; i++) {
          // Schmidt 系数 c = (a_k, b_i)/(b_i, b_i)；R 的元素须存投影长度 c·‖b_i‖ = a_k·q_i，
          // 否则 Q·R ≠ A（曾误存 c，使每个 R[i][j](i<j) 少一个因子 ‖b_i‖）
          var c = dot(cols[k], b[i]) / dot(b[i], b[i]);
          R[i][k] = c * norm(b[i]);
          v = sub(v, scale(b[i], c));
        }
        b.push(v);
        var nb = norm(v);
        R[k][k] = nb;
        if (nb < 1e-10) {
          rQ.v.textContent = '列线性相关（第 ' + (k+1) + ' 列正交化后为 0），无 QR 分解';
          rQ.v.classList.add('warn');
          rR.v.textContent = '—'; rV.v.textContent = '—'; rO.v.textContent = '—';
          return;
        }
        rQ.v.classList.remove('warn');
        q.push(scale(v, 1/nb));
      }
      var Q = [[q[0][0],q[1][0],q[2][0]],[q[0][1],q[1][1],q[2][1]],[q[0][2],q[1][2],q[2][2]]];
      rQ.v.textContent = mat3(Q);
      rR.v.textContent = mat3(R);
      var P = [[0,0,0],[0,0,0],[0,0,0]], QTQ = [[0,0,0],[0,0,0],[0,0,0]];
      for (var r2 = 0; r2 < 3; r2++) for (var c2 = 0; c2 < 3; c2++) {
        var s1 = 0, s2 = 0;
        for (var t = 0; t < 3; t++) { s1 += Q[r2][t]*R[t][c2]; s2 += Q[t][r2]*Q[t][c2]; }
        P[r2][c2] = s1; QTQ[r2][c2] = s2;
      }
      var okQR = [0,1,2].every(function (a) { return [0,1,2].every(function (b) {
        return Math.abs(P[a][b] - A[a][b]) < 1e-7; }); });
      rV.v.textContent = mat3(P) + (okQR ? '　✓ 与 A 一致' : '　✗ 与 A 不一致（误差）');
      rO.v.textContent = mat3(QTQ) + '　（应≈ I，验证 Q 正交）';
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wrap.set(p.A); compute(); });
      pBar.appendChild(b2);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ⑲ 满秩分解演示器 [data-fullrank-lab]（3×4，Gauss-Jordan）
     ============================================================ */
  function initFullrankLab(root) {
    var presets = [
      { name: '习题4.3-1(1)', A: [[1,2,3,0],[0,2,1,-1],[1,0,2,1]] },
      { name: '秩 2（行相关）', A: [[1,-1,1,1],[-1,1,-1,-1],[1,-1,1,-1]] },
      { name: '满秩 3×4', A: [[1,0,1,0],[0,1,0,1],[1,1,0,1]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);

    // 自建 3×4 输入网格
    var m = 3, n = 4, A0 = presets[0].A;
    var gridWrap = document.createElement('div');
    gridWrap.className = 'cl-matrix';
    var gname = document.createElement('div');
    gname.className = 'cl-name'; gname.textContent = '矩阵 A（3×4）';
    var grid = document.createElement('div');
    grid.className = 'cl-grid n4';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,auto);gap:6px';
    var inputs = [];
    for (var i = 0; i < m; i++) {
      inputs.push([]);
      for (var j = 0; j < n; j++) {
        var inp = document.createElement('input');
        inp.type = 'text'; inp.value = String(A0[i][j]);
        // 可访问性：自建网格也必须有可访问名（WCAG 4.1.2）
        inp.setAttribute('aria-label', '矩阵 A 第 ' + (i + 1) + ' 行第 ' + (j + 1) + ' 列');
        grid.appendChild(inp);
        inputs[i].push(inp);
      }
    }
    gridWrap.appendChild(gname); gridWrap.appendChild(grid);
    left.appendChild(gridWrap);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var rR = mkOutRow('秩 rank A =');
    var rH = mkOutRow('Hermite 标准形 B =');
    var rF = mkOutRow('F（A 的主元列）=');
    var rG = mkOutRow('G（B 的非零行）=');
    var rV = mkOutRow('验证 FG =');
    [rR, rH, rF, rG, rV].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function f3(x) { var a=Math.abs(x)<5e-4?0:x; return (Math.round(a*1000)/1000).toString(); }
    function matText(M, cols) {
      return M.map(function (row) { return '[ ' + row.map(f3).join('　') + ' ]'; }).join('  ');
    }
    function compute() {
      // 读入
      var M = [];
      for (var i = 0; i < m; i++) { M.push([]); for (var j = 0; j < n; j++) M[i].push(num(inputs[i][j].value)); }
      // Gauss-Jordan 全消元（只做行变换，记录主元列）
      var pivotCols = [];
      var row = 0;
      for (var col = 0; col < n && row < m; col++) {
        var piv = -1;
        for (var i2 = row; i2 < m; i2++) if (Math.abs(M[i2][col]) > 1e-10) { piv = i2; break; }
        if (piv === -1) continue;
        var tmp = M[row]; M[row] = M[piv]; M[piv] = tmp;
        var pv = M[row][col];
        for (var j2 = 0; j2 < n; j2++) M[row][j2] /= pv;
        for (var i3 = 0; i3 < m; i3++) if (i3 !== row) {
          var f = M[i3][col];
          for (var j3 = 0; j3 < n; j3++) M[i3][j3] -= f * M[row][j3];
        }
        pivotCols.push(col);
        row++;
      }
      var r = pivotCols.length;
      rR.v.textContent = r;
      rH.v.textContent = matText(M);
      // G = B 的前 r 行
      var G = M.slice(0, r);
      rG.v.textContent = matText(G);
      // F = A 的主元列
      var orig = [];
      for (var a = 0; a < m; a++) { orig.push([]); for (var b = 0; b < n; b++) orig[a].push(num(inputs[a][b].value)); }
      var F = orig.map(function (rowV) { return pivotCols.map(function (pc) { return rowV[pc]; }); });
      rF.v.textContent = matText(F, r);
      // 验证 FG
      var P = [];
      for (var aa = 0; aa < m; aa++) {
        P.push([]);
        for (var bb = 0; bb < n; bb++) {
          var s = 0; for (var cc = 0; cc < r; cc++) s += F[aa][cc] * G[cc][bb];
          P[aa].push(s);
        }
      }
      var ok = true;
      for (var a2 = 0; a2 < m; a2++) for (var b2 = 0; b2 < n; b2++)
        if (Math.abs(P[a2][b2] - orig[a2][b2]) > 1e-6) ok = false;
      rV.v.textContent = matText(P) + (ok ? '　✓ 与 A 一致' : '　误差');
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () {
        for (var i = 0; i < m; i++) for (var j = 0; j < n; j++) inputs[i][j].value = p.A[i][j];
        compute();
      });
      pBar.appendChild(b2);
    });
    inputs.forEach(function (rowV) { rowV.forEach(function (inp) { inp.addEventListener('input', compute); }); });
    compute();
  }

  /* ============================================================
     ⑳ SVD 计算器 [data-svd-lab]（2×2 实矩阵）
        A=UΣVᵀ；由 AᵀA 求 V 与 σ，U=AVΣ⁻¹
     ============================================================ */
  function initSvdLab(root) {
    var presets = [
      { name: '教材注意中 A', A: [[-1,0],[0,1],[2,0]] },
      { name: '对角矩阵', A: [[3,0],[0,-2]] },
      { name: '非对称', A: [[1,2],[2,1]] },
      { name: '奇异（秩1）', A: [[1,2],[2,4]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    // 维度切换说明：仅支持 2×2
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wrap = mkMatrixInputs('矩阵 A（2×2）', [[1,1],[0,1]], false, 2);
    left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rATA = mkOutRow('AᵀA 的特征值 =');
    var rSig = mkOutRow('奇异值 σ =');
    var rV = mkOutRow('V =');
    var rU = mkOutRow('U =');
    var rVfy = mkOutRow('验证 UΣVᵀ =');
    var rNorm = mkOutRow('范数 ‖A‖₂ =');
    [rATA, rSig, rV, rU, rVfy, rNorm].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    // 2×2 对称矩阵 Jacobi 特征分解（返回 {lam:[l1,l2],Q:[[...]]}，Q 列特征向量）
    function symEig2(M) {
      var a = M[0][0], b = M[0][1], d = M[1][1];
      var tr = a + d, disc = Math.sqrt((a - d) * (a - d) + 4 * b * b);
      var l1 = (tr + disc) / 2, l2 = (tr - disc) / 2;
      var Q, v1;
      if (Math.abs(b) > 1e-12) {
        v1 = [b, l1 - a];
      } else if (a >= d) {
        v1 = [1, 0];
      } else {
        v1 = [0, 1];
      }
      var n1 = Math.hypot(v1[0], v1[1]) || 1;
      v1 = [v1[0] / n1, v1[1] / n1];
      var v2 = [-v1[1], v1[0]]; // 90° 旋转即第二特征向量
      Q = [[v1[0], v2[0]], [v1[1], v2[1]]];
      return { lam: [l1, l2], Q: Q };
    }
    function f3(x) { var a=Math.abs(x)<5e-4?0:x; return (Math.round(a*1000)/1000).toString(); }
    function m2(M) {
      return M.map(function (row) { return '[ ' + row.map(f3).join('　') + ' ]'; }).join('  ');
    }
    function compute() {
      var A = wrap.get();
      var AT = [[A[0][0],A[1][0]],[A[0][1],A[1][1]]];
      var ATA = [[0,0],[0,0]];
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        var s = 0; for (var k = 0; k < 2; k++) s += AT[i][k] * A[k][j]; ATA[i][j] = s;
      }
      var e = symEig2(ATA);
      rATA.v.textContent = f3(e.lam[0]) + '，' + f3(e.lam[1]);
      var s1 = Math.sqrt(Math.max(0, e.lam[0])), s2 = Math.sqrt(Math.max(0, e.lam[1]));
      rSig.v.textContent = 'σ₁=' + f3(s1) + '，σ₂=' + f3(s2);
      var V = e.Q;
      rV.v.textContent = m2(V) + '（AᵀA 的单位特征向量）';
      // U = A V Σ⁻¹；两列都非零时由各自的 Av_i/σ_i 计算
      // σ₂≈0（秩1）时第一列照算，第二列取与 u1 正交的单位向量并定符号
      var u1 = [0,0], u2;
      var Av1 = [A[0][0]*V[0][0]+A[0][1]*V[1][0], A[1][0]*V[0][0]+A[1][1]*V[1][0]];
      if (s1 > 1e-10) u1 = [Av1[0]/s1, Av1[1]/s1];
      else u1 = [1,0];
      if (s2 > 1e-10) {
        var Av2 = [A[0][0]*V[0][1]+A[0][1]*V[1][1], A[1][0]*V[0][1]+A[1][1]*V[1][1]];
        u2 = [Av2[0]/s2, Av2[1]/s2];
      } else {
        // 秩 1：补一个与 u1 正交的向量，使 det U=+1
        u2 = [-u1[1], u1[0]];
        var detU = u1[0]*u2[1]-u1[1]*u2[0];
        if (detU < 0) u2 = [u1[1], -u1[0]];
      }
      var U = [[u1[0],u2[0]],[u1[1],u2[1]]];
      rU.v.textContent = m2(U);
      // 验证 UΣVᵀ
      var P = [[0,0],[0,0]];
      var sig = [s1, s2];
      for (var r2 = 0; r2 < 2; r2++) for (var c2 = 0; c2 < 2; c2++) {
        var sm = 0;
        for (var t2 = 0; t2 < 2; t2++) sm += U[r2][t2] * sig[t2] * V[c2][t2]; // Vᵀ
        P[r2][c2] = sm;
      }
      var ok = [0,1].every(function (a) { return [0,1].every(function (b) { return Math.abs(P[a][b]-A[a][b])<1e-6; }); });
      rVfy.v.textContent = m2(P) + (ok ? '　✓ 与 A 一致' : '　误差');
      rNorm.v.textContent = 'σ₁ = ' + f3(s1) + '；' + (s2 > 1e-10 ? '非奇异时 ‖A⁻¹‖₂ = 1/σ₂ = ' + f3(1/s2) : 'A 奇异（σ₂=0）');
    }
    // 2x2 预设之外的 3x2 教材例子用文字提示（第一个按钮直接展示 AᵀA 手算）
    presets.forEach(function (p, idx) {
      var b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      if (idx === 0) {
        b2.addEventListener('click', function () {
          rATA.v.textContent = '该例为 3×2：AᵀA=diag(5,1)，σ=(√5,1)，U 由 U₁=AV₁Σ⁻¹ 再补一列（见教材 p.230）';
          rSig.v.textContent = 'σ₁=√5≈2.236，σ₂=1';
          rV.v.textContent = 'V=I（AᵀA 已对角）';
          rU.v.textContent = 'U=（1/√5）[[−1,0,2],[0,√5,0],[2,0,1]]（见教材）';
          rVfy.v.textContent = '3×2 矩阵请用教材手算对照';
          rNorm.v.textContent = '‖A‖₂=√5';
        });
        pBar.appendChild(b2);
        return;
      }
      b2.addEventListener('click', function () { wrap.set(p.A); compute(); });
      pBar.appendChild(b2);
    });
    wrap.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ㉑ Gerschgorin 圆盘演示器 [data-gershgorin-lab]（3×3）
        画 n 个盖尔圆（复平面 SVG），并标出真实特征值
     ============================================================ */
  function initGershgorinLab(root) {
    var presets = [
      { name: '教材例5.5（4×3 思想）', A: [[1,0.1,0.2],[0.5,3,0.1],[1,0.3,-1]] },
      { name: '教材例5.6', A: [[1,-0.8],[0.5,1]] },
      { name: '严格对角占优', A: [[4,1,0],[0.5,3,1],[1,0,2]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wrap = mkMatrixInputs('矩阵 A（最多 3×3）', presets[0].A, false, 3);
    left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rInfo = mkOutRow('盖尔圆 =');
    var rEig = mkOutRow('真实特征值 =');
    var rConcl = mkOutRow('结论 =');
    [rInfo, rEig, rConcl].forEach(function (r) { right.appendChild(r.row); });
    var svgBox = document.createElement('div');
    svgBox.style.cssText = 'margin-top:10px;background:#faf7f0;border:1px solid var(--rule);border-radius:8px;padding:8px';
    right.appendChild(svgBox);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function eig3General(A) {
      // 3×3 用三次方程求根（含复根）；2×3/3×2 不支持，仅 3×3/2×2
      // 对 2×2
      function eig2(B) {
        var tr = B[0][0]+B[1][1], det = B[0][0]*B[1][1]-B[0][1]*B[1][0];
        var d = tr*tr-4*det;
        if (d >= 0) { var s=Math.sqrt(d); return [[(tr+s)/2,0],[(tr-s)/2,0]]; }
        var s=Math.sqrt(-d); return [[tr/2,s/2],[tr/2,-s/2]];
      }
      if (A.length === 2) return eig2(A);
      // 3×3：用特征多项式（假定本节例子为实矩阵）
      var a11=A[0][0],a12=A[0][1],a13=A[0][2],
          a21=A[1][0],a22=A[1][1],a23=A[1][2],
          a31=A[2][0],a32=A[2][1],a33=A[2][2];
      var c1 = -(a11+a22+a33);
      var c2 = a11*a22+a11*a33+a22*a33-a12*a21-a13*a31-a23*a32;
      var c3 = -(a11*a22*a33+a12*a23*a31+a13*a21*a32-a13*a22*a31-a12*a21*a33-a11*a23*a32);
      // 解 λ³+c1λ²+c2λ+c3=0，先找实根（本节矩阵特征值都可数值找到）
      var poly = function(x){return x*x*x+c1*x*x+c2*x+c3;};
      var roots = [], intervals = [];
      // 粗扫找符号变化
      var span = 0;
      for (var i=0;i<3;i++) for (var j=0;j<3;j++) span += Math.abs(A[i][j]);
      span = Math.max(span, 2);
      var step = span/400, prev = -span, pv = poly(prev);
      for (var x=-span+step; x<=span; x+=step) {
        var v=poly(x);
        if (pv===0){roots.push(prev);}
        else if (pv*v<0){ intervals.push([prev,x]); }
        prev=x; pv=v;
      }
      intervals.forEach(function(it){
        var lo=it[0],hi=it[1];
        for (var k=0;k<60;k++){var mid=(lo+hi)/2; if(poly(mid)*poly(lo)<=0)hi=mid; else lo=mid;}
        roots.push((lo+hi)/2);
      });
      // 若只找到 1 个实根，二次因子求共轭复根
      if (roots.length===1) {
        var r=roots[0];
        // 综合除法：λ³+c1λ²+c2λ+c3 = (λ-r)(λ²+bλ+c)
        var b = c1+r, c = c2+r*b; // 余项 c3+r*c≈0
        var dd=b*b-4*c;
        if (dd>=0){roots.push((-b+Math.sqrt(dd))/2,(-b-Math.sqrt(dd))/2);}
        else {roots.push([-b/2,Math.sqrt(-dd)/2],[-b/2,-Math.sqrt(-dd)/2]);}
      }
      return roots.map(function(t){return typeof t==='number'?[t,0]:t;});
    }

    function draw() {
      var A = wrap.get();
      var n = A.length;
      // 圆
      var disks = [];
      for (var i=0;i<n;i++) {
        var c = A[i][i], R=0;
        for (var j=0;j<n;j++) if (j!==i) R += Math.abs(A[i][j]);
        disks.push({c:[typeof c==='number'?c:0,0], R:R});
      }
      rInfo.v.innerHTML = disks.map(function(d,i){return 'G'+(i+1)+'：|z−('+fmt(d.c[0])+')| ≤ '+fmt(d.R);}).join('；');
      var eigs = eig3General(A);
      rEig.v.innerHTML = eigs.map(function(e,i){
        return 'λ'+(i+1)+'='+(Math.abs(e[1])<1e-8?fmt(e[0]):fmt(e[0])+(e[1]>=0?'+':'−')+'j'+fmt(Math.abs(e[1])));
      }).join('，');
      // 检查每个特征值属于哪个圆（并集）
      var inside = eigs.filter(function(e){
        return disks.some(function(d){var dx=e[0]-d.c[0],dy=e[1]-d.c[1];return Math.sqrt(dx*dx+dy*dy)<=d.R+1e-9;});
      }).length;
      var strict = disks.filter(function(d){return Math.abs(d.c[0])>d.R;}).length === n;
      rConcl.v.innerHTML = inside===eigs.length ? '全部 '+eigs.length+' 个特征值均在盖尔圆并集内 ✓' : '有特征值越界！';
      rConcl.v.innerHTML += strict ? '；圆盘互不包住原点且严格对角占优 ⇒ det A≠0' : '';
      // 画 SVG
      var W=460,H=300,pad=30;
      var maxX = Math.max.apply(null, disks.map(function(d){return Math.abs(d.c[0])+d.R;}).concat([2]));
      var maxY = Math.max.apply(null, disks.map(function(d){return d.R;}).concat([1.5]));
      var sx=(W-2*pad)/(2*maxX), sy=(H-2*pad)/(2*maxY);
      var X=function(x){return pad+(x/maxX)*(W/2-pad);};
      var Y=function(y){return H/2-(y/maxY)*(H/2-pad);};
      var svg = '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;display:block">';
      // 坐标轴
      svg += '<line x1="0" y1="'+Y(0)+'" x2="'+W+'" y2="'+Y(0)+'" stroke="#aaa"/>';
      svg += '<line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+H+'" stroke="#aaa"/>';
      var cols=['rgba(43,95,139,.18)','rgba(158,59,70,.15)','rgba(107,78,238,.15)'];
      var edges=['#2b5f8b','#9e3b46','#6b4eee'];
      disks.forEach(function(d,i){
        svg += '<circle cx="'+X(d.c[0])+'" cy="'+Y(0)+'" r="'+(d.R*sx)+'" fill="'+cols[i%3]+'" stroke="'+edges[i%3]+'" stroke-width="1.5"/>';
        svg += '<circle cx="'+X(d.c[0])+'" cy="'+Y(0)+'" r="2.5" fill="'+edges[i%3]+'"/>';
        svg += '<text x="'+(X(d.c[0])+5)+'" y="'+(Y(0)-d.R*sx-4)+'" font-size="11" fill="'+edges[i%3]+'">G'+(i+1)+'</text>';
      });
      eigs.forEach(function(e){
        svg += '<circle cx="'+X(e[0])+'" cy="'+Y(e[1])+'" r="4" fill="#c0392b"/>';
      });
      svg += '</svg>';
      svgBox.innerHTML = svg + '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">彩圈=盖尔圆（圆心 aᵢᵢ、半径 Rᵢ），红点=真实特征值</div>';
    }
    presets.forEach(function(p){
      var b2=document.createElement('button'); b2.type='button'; b2.className='sf-btn'; b2.textContent=p.name;
      b2.addEventListener('click',function(){ if(p.A.length===2){wrap.set([[p.A[0][0],p.A[0][1],0],[p.A[1][0],p.A[1][1],0],[0,0,0]]);} else wrap.set(p.A); draw(); });
      pBar.appendChild(b2);
    });
    wrap.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉒ 广义特征值转换器 [data-geig-lab]（2×2：A 对称，B 对称正定）
        两种等价形式：B⁻¹A（非对称） vs Cholesky S=G⁻¹A(G⁻¹)ᵀ（对称）
     ============================================================ */
  function initGeigLab(root) {
    var presets = [
      { name: '习题5.2-2 思想', A: [[1,-1],[-1,2]], B: [[5,2],[2,1]] },
      { name: '简单正定', A: [[2,1],[1,2]], B: [[2,0],[0,1]] },
      { name: '振动型', A: [[4,-1],[-1,4]], B: [[2,1],[1,2]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('对称矩阵 A', presets[0].A, false, 2);
    var wB = mkMatrixInputs('对称正定 B', presets[0].B, false, 2);
    left.appendChild(wA.wrap); left.appendChild(wB.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rB = mkOutRow('Cholesky B=GGᵀ，G =');
    var rS = mkOutRow('对称化 S=G⁻¹AG⁻ᵀ =');
    var rLam = mkOutRow('广义特征值 λ =');
    var rX = mkOutRow('B-正交特征向量 xᵢ =');
    var rChk = mkOutRow('验证 xᵀBx =');
    [rB, rS, rLam, rX, rChk].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function m2(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('  '); }
    function inv2(M) { var d = M[0][0]*M[1][1]-M[0][1]*M[1][0]; return [[M[1][1]/d,-M[0][1]/d],[-M[1][0]/d,M[0][0]/d]]; }
    function mm2(X, Y) { return [[X[0][0]*Y[0][0]+X[0][1]*Y[1][0],X[0][0]*Y[0][1]+X[0][1]*Y[1][1]],[X[1][0]*Y[0][0]+X[1][1]*Y[1][0],X[1][0]*Y[0][1]+X[1][1]*Y[1][1]]]; }
    function symEig2(M) {
      var a=M[0][0],b=M[0][1],d=M[1][1];
      var tr=a+d, disc=Math.sqrt(Math.max(0,(a-d)*(a-d)+4*b*b));
      var l1=(tr+disc)/2, l2=(tr-disc)/2;
      function evec(l){ var v=[b,l-a]; if(Math.hypot(v[0],v[1])<1e-10){ v=(a>=d)?[1,0]:[0,1]; } var n=Math.hypot(v[0],v[1]); return [v[0]/n,v[1]/n]; }
      var v1=evec(l1), v2=[-v1[1],v1[0]];
      return {lam:[l1,l2], Y:[v1,v2]};
    }
    function compute() {
      var A=wA.get(), B=wB.get();
      // Cholesky 2×2
      var g11=Math.sqrt(Math.max(1e-12,B[0][0]));
      var g21=B[1][0]/g11;
      var g22sq=B[1][1]-g21*g21;
      if (g22sq<=1e-12){ rB.v.textContent='B 不正定（g22² ≤ 0），请改 B'; rS.v.textContent='—'; rLam.v.textContent='—'; rX.v.textContent='—'; rChk.v.textContent='—'; return; }
      var g22=Math.sqrt(g22sq);
      var G=[[g11,0],[g21,g22]];
      rB.v.textContent = m2(G);
      var Gi=inv2(G), Git=[[Gi[0][0],Gi[1][0]],[Gi[0][1],Gi[1][1]]];
      var S=mm2(mm2(Gi,A),Git);
      rS.v.textContent = m2(S) + '（对称 ✓）';
      var e=symEig2(S);
      rLam.v.textContent = 'λ₁=' + fmt(e.lam[0]) + '，λ₂=' + fmt(e.lam[1]);
      // x = (G⁻¹)ᵀ y = Git y
      var X=[ [Git[0][0]*e.Y[0][0]+Git[0][1]*e.Y[0][1], Git[0][0]*e.Y[1][0]+Git[0][1]*e.Y[1][1]],
              [Git[1][0]*e.Y[0][0]+Git[1][1]*e.Y[0][1], Git[1][0]*e.Y[1][0]+Git[1][1]*e.Y[1][1]] ];
      // X 的列是特征向量
      var x1=[X[0][0],X[1][0]], x2=[X[0][1],X[1][1]];
      rX.v.textContent = 'x₁=(' + x1.map(fmt).join(', ') + ')ᵀ，x₂=(' + x2.map(fmt).join(', ') + ')ᵀ';
      function qB(v){ return v[0]*(B[0][0]*v[0]+B[0][1]*v[1]) + v[1]*(B[1][0]*v[0]+B[1][1]*v[1]); }
      function cB(u,v){ return u[0]*(B[0][0]*v[0]+B[0][1]*v[1]) + u[1]*(B[1][0]*v[0]+B[1][1]*v[1]); }
      rChk.v.textContent = 'x₁ᵀBx₁=' + fmt(qB(x1)) + '，x₂ᵀBx₂=' + fmt(qB(x2)) + '，x₁ᵀBx₂=' + fmt(cB(x1,x2)) + '（应为 1,1,0）';
    }
    presets.forEach(function(p){
      var b2=document.createElement('button'); b2.type='button'; b2.className='sf-btn'; b2.textContent=p.name;
      b2.addEventListener('click',function(){ wA.set(p.A); wB.set(p.B); compute(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', compute);
    wB.wrap.addEventListener('input', compute);
    compute();
  }

  /* ============================================================
     ㉓ Rayleigh 商曲线演示器 [data-rayleigh-lab]（2×2 对称）
        R(θ)=xᵀAx, x=(cosθ,sinθ)；标出 λ₁,λ₂ 与特征方向
     ============================================================ */
  function initRayleighLab(root) {
    var presets = [
      { name: '例：diag(1,3) 扰动', A: [[2,1],[1,2]] },
      { name: '特征值拉开', A: [[5,1],[1,1]] },
      { name: '负特征值', A: [[1,2],[2,-1]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wrap = mkMatrixInputs('对称矩阵 A', presets[0].A, false, 2);
    left.appendChild(wrap.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rLam = mkOutRow('特征值 =');
    var rRange = mkOutRow('R 的值域 =');
    var rDir = mkOutRow('极值方向 θ =');
    [rLam, rRange, rDir].forEach(function (r) { right.appendChild(r.row); });
    var svgBox = document.createElement('div');
    svgBox.style.cssText = 'margin-top:10px;background:#faf7f0;border:1px solid var(--rule);border-radius:8px;padding:8px';
    right.appendChild(svgBox);
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function symEig2(M) {
      var a=M[0][0],b=M[0][1],d=M[1][1];
      var tr=a+d, disc=Math.sqrt(Math.max(0,(a-d)*(a-d)+4*b*b));
      var l1=(tr-disc)/2, l2=(tr+disc)/2; // 升序 λ1≤λ2
      function evec(l){ var v=[b,l-a]; if(Math.hypot(v[0],v[1])<1e-10){ v=(Math.abs(l-a)<=Math.abs(l-d))?[1,0]:[0,1]; } var n=Math.hypot(v[0],v[1]); return [v[0]/n,v[1]/n]; }
      return {lam:[l1,l2], V:[evec(l1),evec(l2)]};
    }
    function draw() {
      var A = wrap.get();
      // 强制对称显示（取 (A+Aᵀ)/2）
      var M = [[A[0][0],(A[0][1]+A[1][0])/2],[(A[0][1]+A[1][0])/2,A[1][1]]];
      var e = symEig2(M);
      var l1=e.lam[0], l2=e.lam[1];
      rLam.v.textContent = 'λ₁=' + fmt(l1) + '，λ₂=' + fmt(l2);
      rRange.v.textContent = '[' + fmt(l1) + ', ' + fmt(l2) + ']（定理 5.16）';
      var th1 = Math.atan2(e.V[0][1], e.V[0][0]) * 180/Math.PI; if (th1<0) th1+=180;
      var th2 = Math.atan2(e.V[1][1], e.V[1][0]) * 180/Math.PI; if (th2<0) th2+=180;
      rDir.v.textContent = 'θ₁=' + fmt(th1%180) + '°（R=λ₁ 最小），θ₂=' + fmt(th2%180) + '°（R=λ₂ 最大）';
      // 画 R(θ)，θ∈[0,180)
      var W=460,H=240,padL=46,padR=14,padT=14,padB=30;
      var n=181, ys=[];
      for (var i=0;i<n;i++){ var t=i*Math.PI/180, c=Math.cos(t), s=Math.sin(t);
        ys.push(M[0][0]*c*c+2*M[0][1]*c*s+M[1][1]*s*s); }
      var lo=Math.min.apply(null,ys), hi=Math.max.apply(null,ys);
      var span=(hi-lo)||1; lo-=span*0.12; hi+=span*0.12;
      var X=function(d){return padL+(d/180)*(W-padL-padR);};
      var Y=function(v){return padT+(1-(v-lo)/(hi-lo))*(H-padT-padB);};
      var svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;display:block">';
      // 网格与轴
      svg+='<line x1="'+padL+'" y1="'+(H-padB)+'" x2="'+(W-padR)+'" y2="'+(H-padB)+'" stroke="#aaa"/>';
      svg+='<line x1="'+padL+'" y1="'+padT+'" x2="'+padL+'" y2="'+(H-padB)+'" stroke="#aaa"/>';
      [0,45,90,135,180].forEach(function(d){ svg+='<text x="'+(X(d)-8)+'" y="'+(H-padB+16)+'" font-size="10" fill="#8a8377">'+d+'°</text>'; });
      svg+='<text x="6" y="'+(Y(l1)+4)+'" font-size="10" fill="#2b5f8b">λ₁</text>';
      svg+='<text x="6" y="'+(Y(l2)+4)+'" font-size="10" fill="#9e3b46">λ₂</text>';
      svg+='<line x1="'+padL+'" y1="'+Y(l1)+'" x2="'+(W-padR)+'" y2="'+Y(l1)+'" stroke="#2b5f8b" stroke-dasharray="4 3"/>';
      svg+='<line x1="'+padL+'" y1="'+Y(l2)+'" x2="'+(W-padR)+'" y2="'+Y(l2)+'" stroke="#9e3b46" stroke-dasharray="4 3"/>';
      var path='';
      for (var k=0;k<n;k++){ path+=(k?'L':'M')+X(k).toFixed(1)+' '+Y(ys[k]).toFixed(1); }
      svg+='<path d="'+path+'" fill="none" stroke="#6b4e9e" stroke-width="2"/>';
      // 极值点
      svg+='<circle cx="'+X(th1%180)+'" cy="'+Y(l1)+'" r="4" fill="#2b5f8b"/>';
      svg+='<circle cx="'+X(th2%180)+'" cy="'+Y(l2)+'" r="4" fill="#9e3b46"/>';
      svg+='<text x="'+(W-150)+'" y="'+(padT+12)+'" font-size="11" fill="#6b4e9e">R(θ)=xᵀAx，x=(cosθ,sinθ)</text>';
      svg+='</svg>';
      svgBox.innerHTML = svg + '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">曲线在单位圆上扫过 Rayleigh 商：最小值 λ₁、最大值 λ₂ 恰在两个特征方向取到（定理 5.16 / 推论 1）</div>';
    }
    presets.forEach(function(p){
      var b2=document.createElement('button'); b2.type='button'; b2.className='sf-btn'; b2.textContent=p.name;
      b2.addEventListener('click',function(){ wrap.set(p.A); draw(); });
      pBar.appendChild(b2);
    });
    wrap.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉔ Kronecker 积演示器 [data-kron-lab]（2×2 ⊗ 2×2 → 4×4）
     ============================================================ */
  function initKronLab(root) {
    var presets = [
      { name: '例5.12 思想', A: [[1,2],[3,4]], B: [[0,1],[1,0]] },
      { name: '对角阵', A: [[2,0],[0,3]], B: [[1,0],[0,-1]] },
      { name: '正交阵', A: [[0,-1],[1,0]], B: [[1,0],[0,1]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('A（2×2）', presets[0].A, false, 2);
    var wB = mkMatrixInputs('B（2×2）', presets[0].B, false, 2);
    left.appendChild(wA.wrap); left.appendChild(wB.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rK = mkOutRow('A⊗B =');
    var rEig = mkOutRow('特征值 =');
    var rD = mkOutRow('det(A⊗B) =');
    var rT = mkOutRow('tr(A⊗B) =');
    var rR = mkOutRow('rank =');
    [rK, rEig, rD, rT, rR].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function m2(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('  '); }
    function m4(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>'); }
    function eig2(M) {
      var a=M[0][0],b=M[0][1],c=M[1][0],d=M[1][1];
      var tr=a+d, disc=(a-d)*(a-d)+4*b*c;
      if (disc>=0){var s=Math.sqrt(disc);return {real:true,l:[(tr-s)/2,(tr+s)/2]};}
      var s=Math.sqrt(-disc);return {real:false,l:[[tr/2,-s/2],[tr/2,s/2]]};
    }
    function det2(M){return M[0][0]*M[1][1]-M[0][1]*M[1][0];}
    function rank4(M){ // 高斯消元求秩
      var A=M.map(function(r){return r.slice();}); var rk=0;
      for(var c=0;c<4&&rk<4;c++){
        var p=-1;for(var i=rk;i<4;i++)if(Math.abs(A[i][c])>1e-9){p=i;break;}
        if(p<0)continue;
        var t=A[rk];A[rk]=A[p];A[p]=t;
        for(var i2=rk+1;i2<4;i2++){var f=A[i2][c]/A[rk][c];for(var j=c;j<4;j++)A[i2][j]-=f*A[rk][j];}
        rk++;
      }
      return rk;
    }
    function draw() {
      var A=wA.get(), B=wB.get();
      // A⊗B 的第 (i,p) 行 = 对每个 j 拼接 a_ij *（B 的第 p 行）
      var K=[];
      for(var i=0;i<2;i++)for(var p=0;p<2;p++){
        var row=[];
        for(var j=0;j<2;j++)for(var q=0;q<2;q++) row.push(A[i][j]*B[p][q]);
        K.push(row);
      }
      rK.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.6">' + m4(K) + '</span>';
      var eA=eig2(A), eB=eig2(B);
      if (eA.real && eB.real) {
        var prods=[];
        eA.l.forEach(function(x){eB.l.forEach(function(y){prods.push(x*y);});});
        rEig.v.textContent = 'A: ' + eA.l.map(fmt).join(', ') + '；B: ' + eB.l.map(fmt).join(', ') + '；A⊗B: ' + prods.map(fmt).sort().join(', ') + '（=λᵢμⱼ，推论1）';
      } else {
        rEig.v.textContent = 'A 或 B 有复特征值：A⊗B 的特征值仍为 λᵢμ（共 4 个，含共轭对）';
      }
      var dA=det2(A), dB=det2(B);
      rD.v.textContent = fmt(dA*dA*dB*dB) + '（=(detA)²(detB)²，推论2）';
      rT.v.textContent = fmt((A[0][0]+A[1][1])*(B[0][0]+B[1][1])) + '（=(trA)(trB)，推论3）';
      rR.v.textContent = rank4(K) + '（=(rankA)(rankB)，性质9）';
    }
    presets.forEach(function(p){
      var b2=document.createElement('button'); b2.type='button'; b2.className='sf-btn'; b2.textContent=p.name;
      b2.addEventListener('click',function(){ wA.set(p.A); wB.set(p.B); draw(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', draw);
    wB.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉕ 投影矩阵工作台 [data-proj-lab]
     模式A：R² 斜投影 P_{L,M}=(X,O)(X,Y)^{-1}（式 6.1.5）+ 画板
     模式B：R³ 正交投影 P_L=X(X^HX)^{-1}X^H（式 6.1.6）
     ============================================================ */
  function initProjLab(root) {
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    var right = document.createElement('div');
    right.className = 'cl-out';

    var tabs = document.createElement('div');
    tabs.className = 'sf-buttons';
    var bA = document.createElement('button');
    bA.type = 'button'; bA.className = 'sf-btn'; bA.textContent = '斜投影 P_{L,M}（R²，式6.1.5）';
    var bB = document.createElement('button');
    bB.type = 'button'; bB.className = 'sf-btn'; bB.textContent = '正交投影 P_L（R³，式6.1.6）';
    tabs.appendChild(bA); tabs.appendChild(bB);
    left.appendChild(tabs);

    /* ---- 模式 A ---- */
    var panA = document.createElement('div');
    var pBarA = document.createElement('div'); pBarA.className = 'sf-buttons';
    panA.appendChild(pBarA);
    var wU = mkMatrixInputs('L 的方向 u（R²）', [[1], [0]], true, 2);
    var wV = mkMatrixInputs('M 的方向 v（R²）', [[1], [-1]], true, 2);
    var wX2 = mkMatrixInputs('向量 x（R²）', [[2], [1]], true, 2);
    panA.appendChild(wU.wrap); panA.appendChild(wV.wrap); panA.appendChild(wX2.wrap);
    var cv = document.createElement('canvas');
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','Rayleigh 商 R(θ) 曲线');
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','斜投影几何示意（L、M 方向线与向量投影）');
    cv.width = 360; cv.height = 360;
    cv.style.width = '100%'; cv.style.maxWidth = '360px'; cv.style.display = 'block';
    cv.style.margin = '10px auto 0';
    panA.appendChild(cv);
    left.appendChild(panA);

    /* ---- 模式 B ---- */
    var panB = document.createElement('div');
    var pBarB = document.createElement('div'); pBarB.className = 'sf-buttons';
    panB.appendChild(pBarB);
    var wA3 = mkMatrixInputs('L 的基 α（R³）', [[1], [2], [0]], true, 3);
    var wB3 = mkMatrixInputs('L 的基 β（R³）', [[0], [1], [1]], true, 3);
    var wX3 = mkMatrixInputs('向量 x（R³）', [[1], [2], [3]], true, 3);
    panB.appendChild(wA3.wrap); panB.appendChild(wB3.wrap); panB.appendChild(wX3.wrap);
    left.appendChild(panB);

    var rPA = mkOutRow('P_{L,M} =');
    var rPxA = mkOutRow('Px 与 x−Px =');
    var rCkA = mkOutRow('幂等/方向校验 =');
    var rPB = mkOutRow('P_L =');
    var rPxB = mkOutRow('Px 与残差 x−Px =');
    var rCkB = mkOutRow('定理6.2 校验 =');
    [rPA, rPxA, rCkA, rPB, rPxB, rCkB].forEach(function (r) { right.appendChild(r.row); });

    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mx(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>'); }
    function mx1(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('  '); }
    function inv2(M) { var d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; }
    function mm2(X, Y) {
      var n = X.length, k = Y.length, m = Y[0].length, Z = [];
      for (var i = 0; i < n; i++) { var rv = []; for (var j = 0; j < m; j++) { var s = 0; for (var t = 0; t < k; t++) s += X[i][t] * Y[t][j]; rv.push(s); } Z.push(rv); }
      return Z;
    }
    function maxAbs(M) { var v = 0; M.forEach(function (r) { r.forEach(function (x) { v = Math.max(v, Math.abs(x)); }); }); return v; }

    function drawA() {
      var u = wU.get(), v = wV.get(), x = wX2.get();
      var M2 = [[u[0], v[0]], [u[1], v[1]]];
      var d = M2[0][0] * M2[1][1] - M2[0][1] * M2[1][0];
      if (Math.abs(d) < 1e-9) {
        rPA.v.textContent = 'u 与 v 共线：L⊕M 不成立，投影算子不存在';
        rPxA.v.textContent = '—'; rCkA.v.textContent = '—';
        paintA(null);
        return;
      }
      var Mi = inv2(M2);
      var XM = [[u[0], 0], [u[1], 0]];
      var P = mm2(XM, Mi);
      var Px = [P[0][0] * x[0] + P[0][1] * x[1], P[1][0] * x[0] + P[1][1] * x[1]];
      var rs = [x[0] - Px[0], x[1] - Px[1]];
      var P2 = mm2(P, P);
      var eId = maxAbs([[P2[0][0] - P[0][0], P2[0][1] - P[0][1]], [P2[1][0] - P[1][0], P2[1][1] - P[1][1]]]);
      var eH = maxAbs([[P[0][1] - P[1][0], 0], [0, P[1][0] - P[0][1]]]);
      rPA.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.85rem">' + mx(P) + '</span>';
      rPxA.v.textContent = 'Px = ' + mx1([Px]) + '；x−Px = ' + mx1([rs]);
      rCkA.v.textContent = '‖P²−P‖∞ = ' + fmt(eId) + '（幂等 ✓ 定理6.1）；‖P−Pᵀ‖ = ' + fmt(eH) +
        '；Px×u = ' + fmt(Px[0] * u[1] - Px[1] * u[0]) + '（Px∈L）；(x−Px)×v = ' + fmt(rs[0] * v[1] - rs[1] * v[0]) + '（残差∈M）';
      paintA({ u: u, v: v, x: x, Px: Px, rs: rs });
    }
    function paintA(d) {
      var g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, cv.width, cv.height);
      var S = cv.width / 9, O = cv.width / 2;
      function sx(p) { return O + p[0] * S; }
      function sy(p) { return O - p[1] * S; }
      g.strokeStyle = '#ddd6c8'; g.lineWidth = 1;
      for (var i = -4; i <= 4; i++) {
        g.beginPath(); g.moveTo(sx([i, 0]), sy([i, -4.5])); g.lineTo(sx([i, 0]), sy([i, 4.5])); g.stroke();
        g.beginPath(); g.moveTo(sx([-4.5, i]), sy([0, i])); g.lineTo(sx([4.5, i]), sy([0, i])); g.stroke();
      }
      if (!d) return;
      function line(dir, col) {
        var t = 4.4 / Math.max(1e-9, Math.max(Math.abs(dir[0]), Math.abs(dir[1])));
        var p1 = [-dir[0] * t, -dir[1] * t], p2 = [dir[0] * t, dir[1] * t];
        g.strokeStyle = col; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(sx(p1), sy(p1)); g.lineTo(sx(p2), sy(p2)); g.stroke();
      }
      function arrow(p, col, dash) {
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2;
        g.setLineDash(dash || []);
        g.beginPath(); g.moveTo(O, O); g.lineTo(sx(p), sy(p)); g.stroke();
        g.setLineDash([]);
        var an = Math.atan2(O - sy(p), sx(p) - O);
        g.beginPath();
        g.moveTo(sx(p), sy(p));
        g.lineTo(sx(p) - 9 * Math.cos(an - 0.4), sy(p) + 9 * Math.sin(an - 0.4));
        g.lineTo(sx(p) - 9 * Math.cos(an + 0.4), sy(p) + 9 * Math.sin(an + 0.4));
        g.closePath(); g.fill();
      }
      line(d.u, '#2b5f8b'); line(d.v, '#a06a17');
      arrow(d.x, '#2b2620');
      arrow(d.Px, '#2f7d5b');
      g.strokeStyle = '#9e3b46'; g.lineWidth = 1.6; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(sx(d.Px), sy(d.Px)); g.lineTo(sx(d.x), sy(d.x)); g.stroke();
      g.setLineDash([]);
      g.font = '12px Microsoft YaHei, sans-serif';
      g.fillStyle = '#2b5f8b'; g.fillText('L', sx([d.u[0] * 4.1, d.u[1] * 4.1]), sy([d.u[0] * 4.1, d.u[1] * 4.1]));
      g.fillStyle = '#a06a17'; g.fillText('M', sx([d.v[0] * 4.1, d.v[1] * 4.1]), sy([d.v[0] * 4.1, d.v[1] * 4.1]));
      g.fillStyle = '#2b2620'; g.fillText('x', sx(d.x) + 6, sy(d.x) - 6);
      g.fillStyle = '#2f7d5b'; g.fillText('Px', sx(d.Px) + 6, sy(d.Px) + 14);
    }

    function drawB() {
      var a = wA3.get(), b = wB3.get(), x = wX3.get();
      var X = [[a[0], b[0]], [a[1], b[1]], [a[2], b[2]]];
      var G = [[a[0] * a[0] + a[1] * a[1] + a[2] * a[2], a[0] * b[0] + a[1] * b[1] + a[2] * b[2]],
               [a[0] * b[0] + a[1] * b[1] + a[2] * b[2], b[0] * b[0] + b[1] * b[1] + b[2] * b[2]]];
      var dg = G[0][0] * G[1][1] - G[0][1] * G[1][0];
      if (Math.abs(dg) < 1e-9) {
        rPB.v.textContent = 'α 与 β 线性相关：不是 L 的基';
        rPxB.v.textContent = '—'; rCkB.v.textContent = '—';
        return;
      }
      var Gi = inv2(G);
      var T = mm2(X, Gi);            // 3×2
      var XT = [[X[0][0], X[1][0], X[2][0]], [X[0][1], X[1][1], X[2][1]]];
      var P = mm2(T, XT);            // 3×3
      var Px = [0, 0, 0], i;
      for (i = 0; i < 3; i++) Px[i] = P[i][0] * x[0] + P[i][1] * x[1] + P[i][2] * x[2];
      var rs = [x[0] - Px[0], x[1] - Px[1], x[2] - Px[2]];
      var P2 = mm2(P, P);
      var d1 = [], d2 = [];
      for (i = 0; i < 3; i++) {
        var r1 = [], r2 = [];
        for (var j = 0; j < 3; j++) { r1.push(P2[i][j] - P[i][j]); r2.push(P[i][j] - P[j][i]); }
        d1.push(r1); d2.push(r2);
      }
      rPB.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.85rem;line-height:1.6">' + mx(P) + '</span>';
      rPxB.v.textContent = 'Px = ' + mx1([Px]) + '；x−Px = ' + mx1([rs]);
      rCkB.v.textContent = '‖P²−P‖∞ = ' + fmt(maxAbs(d1)) + '；‖P−Pᵀ‖ = ' + fmt(maxAbs(d2)) +
        '（两者皆 0 ⇔ 幂等 Hermite，定理6.2）；(x−Px)·α = ' + fmt(rs[0] * a[0] + rs[1] * a[1] + rs[2] * a[2]) +
        '；(x−Px)·β = ' + fmt(rs[0] * b[0] + rs[1] * b[1] + rs[2] * b[2]) + '（残差⊥L）';
    }

    var presA = [
      { name: '例6.1', u: [[1], [0]], v: [[1], [-1]], x: [[2], [1]] },
      { name: '正交情形', u: [[1], [0]], v: [[0], [1]], x: [[2], [1]] },
      { name: '斜 45°', u: [[1], [1]], v: [[1], [-1]], x: [[3], [1]] }
    ];
    presA.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wU.set(p.u); wV.set(p.v); wX2.set(p.x); drawA(); });
      pBarA.appendChild(b2);
    });
    var presB = [
      { name: '例6.2', a: [[1], [2], [0]], b: [[0], [1], [1]], x: [[1], [2], [3]] },
      { name: '习题6.1-7(2)', a: [[1], [0], [0]], b: [[0], [1], [0]], x: [[2], [3], [1]] },
      { name: '直线 L', a: [[1], [1], [1]], b: [[1], [-1], [0]], x: [[0], [0], [3]] }
    ];
    presB.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wA3.set(p.a); wB3.set(p.b); wX3.set(p.x); drawB(); });
      pBarB.appendChild(b2);
    });

    var mode = 'A';
    function setMode(m) {
      mode = m;
      panA.style.display = m === 'A' ? '' : 'none';
      panB.style.display = m === 'B' ? '' : 'none';
      [rPA, rPxA, rCkA].forEach(function (r) { r.row.style.display = m === 'A' ? '' : 'none'; });
      [rPB, rPxB, rCkB].forEach(function (r) { r.row.style.display = m === 'B' ? '' : 'none'; });
      bA.style.fontWeight = m === 'A' ? '700' : '';
      bB.style.fontWeight = m === 'B' ? '700' : '';
      if (m === 'A') drawA(); else drawB();
    }
    bA.addEventListener('click', function () { setMode('A'); });
    bB.addEventListener('click', function () { setMode('B'); });
    [wU, wV, wX2].forEach(function (w) { w.wrap.addEventListener('input', drawA); });
    [wA3, wB3, wX3].forEach(function (w) { w.wrap.addEventListener('input', drawB); });
    setMode('A');
  }

  /* ============================================================
     ㉖ Moore–Penrose 逆验证器 [data-penrose-lab]（2×2，四方程残差）
     ============================================================ */
  function initPenroseLab(root) {
    var presets = [
      { name: '例6.3 秩1', A: [[1, 1], [0, 0]] },
      { name: '秩1 对称', A: [[1, 2], [2, 4]] },
      { name: '非奇异', A: [[1, 2], [3, 4]] },
      { name: '半零', A: [[2, 0], [0, 0]] },
      { name: '零阵', A: [[0, 0], [0, 0]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('A（2×2）', presets[0].A, false, 2);
    left.appendChild(wA.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rM = mkOutRow('计算路径 =');
    var rX = mkOutRow('A⁺ =');
    var r1 = mkOutRow('‖AXA−A‖ =');
    var r2 = mkOutRow('‖XAX−X‖ =');
    var r3 = mkOutRow('‖(AX)ᵀ−AX‖ =');
    var r4 = mkOutRow('‖(XA)ᵀ−XA =');
    var r5 = mkOutRow('定理6.10 校验 =');
    [rM, rX, r1, r2, r3, r4, r5].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      var n = X.length, k = Y.length, m = Y[0].length, Z = [];
      for (var i = 0; i < n; i++) { var rv = []; for (var j = 0; j < m; j++) { var s = 0; for (var t = 0; t < k; t++) s += X[i][t] * Y[t][j]; rv.push(s); } Z.push(rv); }
      return Z;
    }
    function tr2(M) { return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]; }
    function inv2(M) { var d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; }
    function sub(X, Y) { return [[X[0][0] - Y[0][0], X[0][1] - Y[0][1]], [X[1][0] - Y[1][0], X[1][1] - Y[1][1]]]; }
    function fro(M) { var s = 0; M.forEach(function (r) { r.forEach(function (x) { s += x * x; }); }); return Math.sqrt(s); }
    function mx(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>'); }
    function rk(M) {
      var n = 0; M.forEach(function (r) { r.forEach(function (x) { if (Math.abs(x) > 1e-9) n = 1; }); });
      if (!n) return 0;
      var d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      return Math.abs(d) > 1e-9 ? 2 : 1;
    }
    function draw() {
      var A = wA.get();
      var r = rk(A), X;
      if (r === 2) { X = inv2(A); rM.v.textContent = 'rank A = 2（非奇异）：A⁺ = A⁻¹（定义 6.4 条件3 退化）'; }
      else if (r === 1) {
        var s = 0; A.forEach(function (row) { row.forEach(function (x) { s += x * x; }); });
        X = [[A[0][0] / s, A[1][0] / s], [A[0][1] / s, A[1][1] / s]];
        rM.v.textContent = 'rank A = 1：秩1公式 A⁺ = Aᵀ/A‖_F²（推论2 的矩阵版）';
      } else { X = [[0, 0], [0, 0]]; rM.v.textContent = 'rank A = 0：A⁺ = O（定理 6.3 存在性证明的首情形）'; }
      var AX = mm(A, X), XA = mm(X, A);
      rX.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.85rem">' + mx(X) + '</span>';
      r1.v.textContent = fmt(fro(sub(mm(AX, A), A))) + '（Penrose i）';
      r2.v.textContent = fmt(fro(sub(mm(XA, X), X))) + '（Penrose ii）';
      r3.v.textContent = fmt(fro(sub(tr2(AX), AX))) + '（Penrose iii：AX 对称）';
      r4.v.textContent = fmt(fro(sub(tr2(XA), XA))) + '（Penrose iv：XA 对称）';
      var XX = rk(X);
      var Xp = (XX === 2) ? inv2(X) : (XX === 1 ? (function () { var s2 = 0; X.forEach(function (row) { row.forEach(function (x) { s2 += x * x; }); }); return [[X[0][0] / s2, X[1][0] / s2], [X[0][1] / s2, X[1][1] / s2]]; })() : [[0, 0], [0, 0]]);
      r5.v.textContent = 'rank A⁺ = ' + XX + '（应 = rank A = ' + r + '，定理6.10(1)）；‖(A⁺)⁺−A‖ = ' + fmt(fro(sub(Xp, A))) + '（定理6.10(2)）';
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wA.set(p.A); draw(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉗ 广义逆计算方法对比台 [data-ginv-lab]（3×3，五法对照）
     ============================================================ */
  function initGinvLab(root) {
    var presets = [
      { name: '秩1', A: [[1, 2, 0], [2, 4, 0], [0, 0, 0]] },
      { name: '秩2', A: [[1, 0, 1], [0, 1, 1], [1, 1, 2]] },
      { name: '非奇异', A: [[1, 2, 0], [0, 1, 1], [1, 0, 1]] },
      { name: '零阵', A: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('A（3×3）', presets[0].A, false, 3);
    left.appendChild(wA.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rR = mkOutRow('rank A =');
    var rFG = mkOutRow('满秩分解 =');
    var rM1 = mkOutRow('① 满秩分解法 A⁺ =');
    var rM2 = mkOutRow('② Zlobec A⁺ =');
    var rM3 = mkOutRow('③ Greville A⁺ =');
    var rIt1 = mkOutRow('④ 一阶迭代 =');
    var rIt2 = mkOutRow('⑤ 二阶迭代 =');
    var rCk = mkOutRow('四方程残差（①）=');
    [rR, rFG, rM1, rM2, rM3, rIt1, rIt2, rCk].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      var n = X.length, k = Y.length, m = Y[0].length, Z = [];
      for (var i = 0; i < n; i++) {
        var rv = [];
        for (var j = 0; j < m; j++) { var s = 0; for (var t = 0; t < k; t++) s += X[i][t] * Y[t][j]; rv.push(s); }
        Z.push(rv);
      }
      return Z;
    }
    function tr(X) {
      var Z = [];
      for (var j = 0; j < X[0].length; j++) { var rv = []; for (var i = 0; i < X.length; i++) rv.push(X[i][j]); Z.push(rv); }
      return Z;
    }
    function madd(X, Y, s) {
      return X.map(function (r, i) { return r.map(function (x, j) { return x + s * Y[i][j]; }); });
    }
    function invN(M) { // 高斯-约旦求逆（方阵）
      var n = M.length, i, j, k;
      var B = M.map(function (r, i2) { return r.concat(Array.apply(null, Array(n)).map(function (_, q) { return q === i2 ? 1 : 0; })); });
      for (i = 0; i < n; i++) {
        var p = i;
        for (k = i + 1; k < n; k++) if (Math.abs(B[k][i]) > Math.abs(B[p][i])) p = k;
        var t = B[p]; B[p] = B[i]; B[i] = t;
        var d = B[i][i];
        for (j = 0; j < 2 * n; j++) B[i][j] /= d;
        for (k = 0; k < n; k++) if (k !== i) {
          var f = B[k][i];
          for (j = 0; j < 2 * n; j++) B[k][j] -= f * B[i][j];
        }
      }
      return B.map(function (r) { return r.slice(n); });
    }
    function fro(M) { var s = 0; M.forEach(function (r) { r.forEach(function (x) { s += x * x; }); }); return Math.sqrt(s); }
    function rref(A) { // 返回 {B, piv, Q}
      var n = A.length, m = A[0].length;
      var M = A.map(function (r, i) { return r.concat(Array.apply(null, Array(n)).map(function (_, q) { return q === i ? 1 : 0; })); });
      var piv = [], row = 0, i, j, k;
      for (var col = 0; col < m && row < n; col++) {
        var p = -1;
        for (i = row; i < n; i++) if (Math.abs(M[i][col]) > 1e-10) { p = i; break; }
        if (p < 0) continue;
        var t = M[row]; M[row] = M[p]; M[p] = t;
        var d = M[row][col];
        for (j = 0; j < m + n; j++) M[row][j] /= d;
        for (k = 0; k < n; k++) if (k !== row) {
          var f = M[k][col];
          for (j = 0; j < m + n; j++) M[k][j] -= f * M[row][j];
        }
        piv.push(col); row++;
      }
      return { B: M.map(function (r) { return r.slice(0, m); }), piv: piv, Q: M.map(function (r) { return r.slice(m); }) };
    }
    function mx(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>'); }
    function eye(n) { var I = []; for (var i = 0; i < n; i++) { var r = []; for (var j = 0; j < n; j++) r.push(i === j ? 1 : 0); I.push(r); } return I; }

    function pinvByFullRank(A, r, piv, B) {
      var F = A.map(function (r) { return piv.map(function (c) { return r[c]; }); }); // 3×r
      var G = B.slice(0, r);                                                          // r×3
      var Ft = tr(F), Gt = tr(G);
      var W = mm(mm(Ft, A), Gt);                  // r×r = (F^H F)(G G^H)
      var Ap = mm(mm(Gt, invN(W)), Ft);
      return { F: F, G: G, Ap: Ap };
    }
    function zlobec(A) {
      var At = tr(A);
      var C = mm(mm(At, A), At);
      var info = rref(C);
      // C1 = P [I_r O; O O] Q，P 为把主元列换到最前的列置换阵：第 j 列为 e_{order[j]}
      var n = 3, r = info.piv.length;
      var rest = [];
      for (var c = 0; c < n; c++) if (info.piv.indexOf(c) < 0) rest.push(c);
      var order = info.piv.concat(rest);
      var Pm = [];
      for (var i = 0; i < n; i++) {
        var rv0 = [];
        for (var j0 = 0; j0 < n; j0++) rv0.push(0);
        Pm.push(rv0);
      }
      for (var j = 0; j < n; j++) Pm[order[j]][j] = 1;
      var D = [];
      for (var i2 = 0; i2 < n; i2++) {
        var row2 = [];
        for (var j2 = 0; j2 < n; j2++) row2.push(i2 < r && j2 < r && i2 === j2 ? 1 : 0);
        D.push(row2);
      }
      var C1 = mm(mm(Pm, D), info.Q);
      return mm(mm(At, C1), At);
    }
    function greville(A) {
      function cplus(c) {
        var s = 0; c.forEach(function (x) { s += x * x; });
        return [c.map(function (x) { return s > 1e-20 ? x / s : 0; })]; // 1×3
      }
      var a0 = A.map(function (r) { return [r[0]]; });
      var Akp = cplus(a0.map(function (r) { return r[0]; })); // 1×3
      for (var k = 1; k < 3; k++) {
        var Ak = A.map(function (r) { return r.slice(0, k); }); // 3×k
        var a = A.map(function (r) { return [r[k]]; });         // 3×1
        var d = mm(Akp, a);                                     // k×1
        var c = madd(a, mm(Ak, d), -1);                         // 3×1
        var cv = c.map(function (r) { return r[0]; });
        var cn = 0; cv.forEach(function (x) { cn += x * x; });
        var bh;
        if (cn > 1e-20) {
          bh = cplus(cv);                                       // 1×3
        } else {
          var dt = tr(d);                                      // 1×k
          var den = 1 + (function () { var s = 0; d.forEach(function (r) { s += r[0] * r[0]; }); return s; })();
          bh = mm(tr(d).map(function (r) { return r.map(function (x) { return x / den; }); }), Akp); // 1×3
        }
        var top = madd(Akp, mm(d, bh), -1);                     // k×3
        Akp = top.concat(bh);
      }
      return Akp;
    }
    function iterate(A, Ap0, beta, order) {
      var X = Ap0.map(function (r) { return r.slice(); });
      if (beta === 0) return { X: X, steps: 0 };
      var At = tr(A), I3 = eye(3);
      var twoI = I3.map(function (r) { return r.map(function (x) { return 2 * x; }); });
      function resid() { return fro(madd(mm(mm(A, X), A), A, -1)); }
      if (resid() < 1e-11) return { X: X, steps: 0 };
      for (var k = 1; k <= 200000; k++) {
        if (order === 1) {
          // X + β A^T (I − AX)，式 (6.3.46)
          X = madd(X, mm(At, madd(I3, mm(A, X), -1)).map(function (r) { return r.map(function (x) { return beta * x; }); }), 1);
        } else {
          // X (2I − AX)，式 (6.3.51)
          X = mm(X, madd(twoI, mm(A, X), -1));
        }
        if (resid() < 1e-11) return { X: X, steps: k };
      }
      return { X: X, steps: -1 };
    }

    function draw() {
      var A = wA.get();
      var info = rref(A), r = info.piv.length;
      rR.v.textContent = r;
      if (r === 0) {
        rFG.textContent = '';
        rFG.v.textContent = 'A=O：所有方法均得 A⁺=O';
        [rM1, rM2, rM3].forEach(function (rr) { rr.v.textContent = 'O'; });
        rIt1.v.textContent = '0 步（X₀=O）';
        rIt2.v.textContent = '0 步（X₀=O）';
        rCk.v.textContent = '四个残差均为 0';
        return;
      }
      var fr = pinvByFullRank(A, r, info.piv, info.B);
      rFG.v.innerHTML = 'F（3×' + r + '）、G（' + r + '×3）已取定，F^HAG^H 可逆';
      rM1.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.55">' + mx(fr.Ap) + '</span>';
      var Z = zlobec(A);
      rM2.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.55">' + mx(Z) + '</span>';
      var Gp = greville(A);
      rM3.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.55">' + mx(Gp) + '</span>';

      var trAAt = 0; mm(A, tr(A)).forEach(function (row, i) { row.forEach(function (x, j) { if (i === j) trAAt += x; }); });
      var beta = 1 / trAAt;
      var X0 = tr(A).map(function (row) { return row.map(function (x) { return beta * x; }); });
      var i1 = iterate(A, X0, beta, 1);
      var i2 = iterate(A, X0, beta, 2);
      rIt1.v.innerHTML = (i1.steps < 0 ? '20 万步未收敛' : i1.steps + ' 步') +
        '，β=1/tr(AAᵀ)=' + fmt(beta) + '，末值与①相同：' +
        '<span style="font-family:Consolas,monospace;font-size:.82rem"><br>' + mx(i1.X) + '</span>';
      rIt2.v.innerHTML = (i2.steps < 0 ? '不收敛' : i2.steps + ' 步（二阶，式6.3.51）') +
        '，末值：<span style="font-family:Consolas,monospace;font-size:.82rem"><br>' + mx(i2.X) + '</span>';

      var X = fr.Ap, AX = mm(A, X), XA = mm(X, A);
      var e1 = fro(madd(mm(AX, A), A, -1));
      var e2 = fro(madd(mm(XA, X), X, -1));
      var e3 = fro(madd(tr(AX), AX, -1));
      var e4 = fro(madd(tr(XA), XA, -1));
      rCk.v.textContent = '(i)' + fmt(e1) + '　(ii)' + fmt(e2) + '　(iii)' + fmt(e3) + '　(iv)' + fmt(e4) +
        '；三法互差 ‖Δ‖=' + fmt(Math.max(fro(madd(fr.Ap, Z, -1)), fro(madd(fr.Ap, Gp, -1))));
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wA.set(p.A); draw(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉘ 最小二乘工作台 [data-ls-lab]（2×2 实矩阵，双画板）
     左：b 空间 R(A)、Pb=Ax*、残差；右：x 空间解集直线与 A⁺b
     ============================================================ */
  function initLsLab(root) {
    var presets = [
      { name: '相容·满秩', A: [[1, 1], [0, 1]], b: [[3], [1]] },
      { name: '矛盾·秩1(对称)', A: [[1, 1], [1, 1]], b: [[2], [0]] },
      { name: '相容·秩1', A: [[1, 1], [1, 1]], b: [[3], [3]] },
      { name: '矛盾·拟合直线', A: [[1, 0], [1, 0]], b: [[1], [0]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('A（2×2）', presets[0].A, false, 2);
    var wB = mkMatrixInputs('b（R²）', presets[0].b, true, 2);
    left.appendChild(wA.wrap); left.appendChild(wB.wrap);
    var cvB = document.createElement('canvas'); cvB.width = cvB.height = 300;
    cvB.setAttribute('role','img'); cvB.setAttribute('aria-label','b 空间：值域与正交投影');
    cvB.style.cssText = 'width:48%;max-width:300px;display:inline-block;margin:8px 1% 0';
    var cvX = document.createElement('canvas'); cvX.width = cvX.height = 300;
    cvX.setAttribute('role','img'); cvX.setAttribute('aria-label','x 空间：最小二乘解集');
    cvX.style.cssText = 'width:48%;max-width:300px;display:inline-block;margin:8px 0 0 1%';
    var capB = document.createElement('div'); capB.textContent = 'b 空间：R(A) 与投影';
    capB.style.cssText = 'text-align:center;font-size:.8rem;color:#666;width:48%;display:inline-block';
    var capX = document.createElement('div'); capX.textContent = 'x 空间：解集与极小范数点';
    capX.style.cssText = 'text-align:center;font-size:.8rem;color:#666;width:48%;display:inline-block;margin-left:1%';
    var rowCv = document.createElement('div'); rowCv.style.cssText = 'display:flex;margin-top:6px';
    var col1 = document.createElement('div'); col1.style.cssText = 'width:50%'; col1.appendChild(cvB); col1.appendChild(capB);
    var col2 = document.createElement('div'); col2.style.cssText = 'width:50%'; col2.appendChild(cvX); col2.appendChild(capX);
    rowCv.appendChild(col1); rowCv.appendChild(col2);
    left.appendChild(rowCv);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rR = mkOutRow('rank / 相容性 =');
    var rX = mkOutRow('x* = A⁺b =');
    var rP = mkOutRow('Ax* = P_R(A)b =');
    var rE = mkOutRow('残差 b−Ax* 与法方程 =');
    var rSet = mkOutRow('解集（秩1时）=');
    [rR, rX, rP, rE, rSet].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mm(X, Y) {
      var n = X.length, k = Y.length, m = Y[0].length, Z = [];
      for (var i = 0; i < n; i++) { var rv = []; for (var j = 0; j < m; j++) { var s = 0; for (var t = 0; t < k; t++) s += X[i][t] * Y[t][j]; rv.push(s); } Z.push(rv); }
      return Z;
    }
    function tr2(M) { return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]; }
    function mv(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; }
    function inv2(M) { var d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; }
    function norm(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1]); }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function v1(v) { return '[ ' + v.map(fmt).join('　') + ' ]ᵀ'; }
    function pinv2(A, r) {
      if (r === 2) return inv2(A);
      if (r === 1) { var s = A[0][0] * A[0][0] + A[0][1] * A[0][1] + A[1][0] * A[1][0] + A[1][1] * A[1][1]; var At = tr2(A); return At.map(function (row) { return row.map(function (x) { return x / s; }); }); }
      return [[0, 0], [0, 0]];
    }
    function paint(cv, space, data) {
      var g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, cv.width, cv.height);
      var S = cv.width / 9, O = cv.width / 2;
      function sx(p) { return O + p[0] * S; }
      function sy(p) { return O - p[1] * S; }
      g.strokeStyle = '#ddd6c8'; g.lineWidth = 1;
      for (var i = -4; i <= 4; i++) {
        g.beginPath(); g.moveTo(sx([i, 0]), sy([i, -4.5])); g.lineTo(sx([i, 0]), sy([i, 4.5])); g.stroke();
        g.beginPath(); g.moveTo(sx([-4.5, i]), sy([0, i])); g.lineTo(sx([4.5, i]), sy([0, i])); g.stroke();
      }
      function dirLine(d, col, w) {
        var t = 4.4 / Math.max(1e-9, Math.max(Math.abs(d[0]), Math.abs(d[1])));
        g.strokeStyle = col; g.lineWidth = w || 1.6;
        g.beginPath(); g.moveTo(sx([-d[0] * t, -d[1] * t]), sy([-d[0] * t, -d[1] * t]));
        g.lineTo(sx([d[0] * t, d[1] * t]), sy([d[0] * t, d[1] * t])); g.stroke();
      }
      function dot(p, col) {
        g.fillStyle = col; g.beginPath(); g.arc(sx(p), sy(p), 4, 0, Math.PI * 2); g.fill();
      }
      function arrow(a, p, col, dash) {
        g.strokeStyle = col; g.lineWidth = 2; g.setLineDash(dash || []);
        g.beginPath(); g.moveTo(sx(a), sy(a)); g.lineTo(sx(p), sy(p)); g.stroke(); g.setLineDash([]);
      }
      g.font = '12px Microsoft YaHei, sans-serif';
      if (space === 'b') {
        if (data.full) {
          g.fillStyle = '#2b5f8b'; g.fillText('R(A)=R²（满秩）', sx([-3.2, 3.4]), sy([0, 3.4]));
        } else {
          dirLine(data.ran, '#2b5f8b');
          g.fillStyle = '#2b5f8b'; g.fillText('R(A)', sx([data.ran[0] * 3.6, data.ran[1] * 3.6]), sy([data.ran[0] * 3.6, data.ran[1] * 3.6]));
        }
        dot(data.b, '#2b2620'); g.fillStyle = '#2b2620'; g.fillText('b', sx(data.b) + 6, sy(data.b) - 6);
        dot(data.Pb, '#2f7d5b'); g.fillStyle = '#2f7d5b'; g.fillText('Ax*', sx(data.Pb) + 6, sy(data.Pb) + 14);
        arrow([0, 0], data.b, '#2b2620');
        arrow([0, 0], data.Pb, '#2f7d5b');
        arrow(data.Pb, data.b, '#9e3b46', [5, 4]);
      } else {
        if (data.nullDir) {
          // 解集平行线 x*+tv：过 xs0 沿 nullDir
          var d = data.nullDir, t = 4.4 / Math.max(Math.abs(d[0]), Math.abs(d[1]), 1e-9);
          g.strokeStyle = '#a06a17'; g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(sx([data.xs0[0] - d[0] * t, data.xs0[1] - d[1] * t]), sy([data.xs0[0] - d[0] * t, data.xs0[1] - d[1] * t]));
          g.lineTo(sx([data.xs0[0] + d[0] * t, data.xs0[1] + d[1] * t]), sy([data.xs0[0] + d[0] * t, data.xs0[1] + d[1] * t]));
          g.stroke();
          g.fillStyle = '#a06a17'; g.fillText('解集 x*+t·v', sx([data.xs0[0] + d[0] * 2.2, data.xs0[1] + d[1] * 2.2]), sy([data.xs0[0] + d[0] * 2.2, data.xs0[1] + d[1] * 2.2]));
          arrow([0, 0], data.xs, '#9e3b46', [5, 4]);
        } else {
          arrow([0, 0], data.xs, '#2f7d5b');
        }
        dot(data.xs, '#2f7d5b'); g.fillStyle = '#2f7d5b'; g.fillText('x*=A⁺b', sx(data.xs) + 6, sy(data.xs) - 6);
      }
    }

    function draw() {
      var A = wA.get();
      var b = wB.get();
      var det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      var r = Math.abs(det) > 1e-9 ? 2 : ((Math.abs(A[0][0]) + Math.abs(A[0][1]) + Math.abs(A[1][0]) + Math.abs(A[1][1]) > 1e-9) ? 1 : 0);
      var Ap = pinv2(A, r);
      var x = mv(Ap, b), Pb = mv(A, x), res = sub(b, Pb);
      var consistent = norm(res) < 1e-6;
      // R(A) 方向：A 的一个非零列
      var ran = [0, 0];
      var c0 = [A[0][0], A[1][0]], c1 = [A[0][1], A[1][1]];
      ran = norm(c0) > 1e-9 ? c0 : c1;
      // N(A) 方向：秩1时 c1=λc0，取 v=(-λ,1) 使 Av=0
      var nd = null;
      if (r === 1) {
        if (norm(c0) > 1e-9) {
          var lam = (c1[0] * c0[0] + c1[1] * c0[1]) / (c0[0] * c0[0] + c0[1] * c0[1]);
          nd = [-lam, 1];
        } else {
          nd = [1, 0];
        }
      }
      // 法方程校验
      var At = tr2(A);
      var lhs = mv(mm(At, A), x), rhs = mv(At, b);
      var eN = norm(sub(lhs, rhs));

      rR.v.textContent = 'rank A = ' + r + '；' + (consistent ? '相容（b∈R(A)，残差为 0）' : '矛盾：最小二乘残差 ‖b−Ax*‖ = ' + fmt(norm(res)));
      rX.v.textContent = v1(x) + '（' + (consistent ? '极小范数解（定理6.30）' : '极小范数最小二乘解（定理6.33）') + '）';
      rP.v.textContent = v1(Pb) + (consistent ? ' = b' : '（b 到 R(A) 的正交垂足）');
      rE.v.textContent = '残差 r = ' + v1(res) + (r < 2 ? '；法方程 AᵀAx*=Aᵀb 误差 = ' + fmt(eN) : '；满秩时 AᵀA 可逆，法方程直接给唯一解');

      if (r === 1) {
        var nn = Math.sqrt(nd[0] * nd[0] + nd[1] * nd[1]); nd = [nd[0] / nn, nd[1] / nn];
        rSet.v.textContent = 'x = ' + v1(x) + ' + t' + v1(nd) + '；x* 与 v 内积 = ' + fmt(x[0] * nd[0] + x[1] * nd[1]) + '（垂足 ⇒ 范数最小）';
      } else {
        rSet.v.textContent = r === 0 ? 'A=O：最小二乘解为全空间，极小范数点 x*=0' : '满秩：解唯一，无自由度';
      }
      paint(cvB, 'b', { ran: ran, b: b, Pb: Pb, full: r === 2 });
      paint(cvX, 'x', { xs: x, xs0: x, nullDir: nd });
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wA.set(p.A); wB.set(p.b); draw(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', draw);
    wB.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉙ 约束 / 加权最小二乘台 [data-cw-lab]（R²，双模式）
     模式S：X = P_S(AP_S)⁺（定理6.38）；模式N：A_{I,N}⁺（定理6.41）
     ============================================================ */
  function initCwLab(root) {
    var tabs = document.createElement('div');
    tabs.className = 'sf-buttons';
    var bS = document.createElement('button'); bS.type = 'button'; bS.className = 'sf-btn'; bS.textContent = '约束模式（子空间 S）';
    var bN = document.createElement('button'); bN.type = 'button'; bN.className = 'sf-btn'; bN.textContent = '加权模式（N-椭圆范数）';
    tabs.appendChild(bS); tabs.appendChild(bN);

    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(tabs);

    function numBox(label, val, step) {
      var row = document.createElement('label');
      row.style.cssText = 'display:inline-block;margin:4px 10px 4px 0;font-size:.85rem';
      var sp = document.createElement('span'); sp.textContent = label + ' ';
      var inp = document.createElement('input');
      inp.type = 'number'; inp.value = String(val); inp.step = step || 'any'; inp.style.width = '64px';
      row.appendChild(sp); row.appendChild(inp);
      return { row: row, inp: inp };
    }
    var wA = mkMatrixInputs('A（2×2，默认秩1）', [[1, 1], [1, 1]], false, 2);
    var wB = mkMatrixInputs('b（R²）', [[2], [0]], true, 2);
    left.appendChild(wA.wrap); left.appendChild(wB.wrap);

    // 约束面板
    var panS = document.createElement('div');
    var thS = numBox('S 与 x₁ 轴夹角 θ（度）', 45, 10);
    panS.appendChild(thS.row);
    // 加权面板
    var panN = document.createElement('div');
    var bx1 = numBox('n₁', 1), bx2 = numBox('n₂', 4);
    panN.appendChild(bx1.row); panN.appendChild(bx2.row);
    panN.style.display = 'none';
    left.appendChild(panS); left.appendChild(panN);

    var cv = document.createElement('canvas');
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','约束/加权解的几何示意');
    cv.width = cv.height = 320;
    cv.style.cssText = 'width:100%;max-width:330px;display:block;margin:8px auto 0';
    left.appendChild(cv);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var rInfo = mkOutRow('模式信息 =');
    var rX = mkOutRow('X 与解 x =');
    var rXu = mkOutRow('欧氏解 A⁺b =');
    var rCk = mkOutRow('校验 =');
    [rInfo, rX, rXu, rCk].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mv(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; }
    function mm(X, Y) {
      var Z = [];
      for (var i = 0; i < X.length; i++) { var rv = []; for (var j = 0; j < Y[0].length; j++) { var s = 0; for (var t = 0; t < Y.length; t++) s += X[i][t] * Y[t][j]; rv.push(s); } Z.push(rv); }
      return Z;
    }
    function tr2(M) { return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]; }
    function inv2(M) { var d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; }
    function pinv2(A, r) {
      if (r === 2) return inv2(A);
      if (r === 1) { var s = A[0][0] * A[0][0] + A[0][1] * A[0][1] + A[1][0] * A[1][0] + A[1][1] * A[1][1]; var At = tr2(A); return At.map(function (row) { return row.map(function (x) { return x / s; }); }); }
      return [[0, 0], [0, 0]];
    }
    function rank2(A) {
      if (Math.abs(A[0][0] * A[1][1] - A[0][1] * A[1][0]) > 1e-9) return 2;
      return (Math.abs(A[0][0]) + Math.abs(A[0][1]) + Math.abs(A[1][0]) + Math.abs(A[1][1]) > 1e-9) ? 1 : 0;
    }
    function nullDir(A) {
      var c0 = [A[0][0], A[1][0]], c1 = [A[0][1], A[1][1]];
      var n0 = c0[0] * c0[0] + c0[1] * c0[1], v;
      if (n0 > 1e-12) { var lam = (c1[0] * c0[0] + c1[1] * c0[1]) / n0; v = [-lam, 1]; }
      else v = [1, 0];
      var nn = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      return [v[0] / nn, v[1] / nn];
    }
    function v1(v) { return '[ ' + v.map(fmt).join('　') + ' ]ᵀ'; }

    function paint(mode, data) {
      var g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, cv.width, cv.height);
      var S = cv.width / 9, O = cv.width / 2;
      function sx(p) { return O + p[0] * S; }
      function sy(p) { return O - p[1] * S; }
      g.strokeStyle = '#ddd6c8'; g.lineWidth = 1;
      for (var i = -4; i <= 4; i++) {
        g.beginPath(); g.moveTo(sx([i, 0]), sy([i, -4.5])); g.lineTo(sx([i, 0]), sy([i, 4.5])); g.stroke();
        g.beginPath(); g.moveTo(sx([-4.5, i]), sy([0, i])); g.lineTo(sx([4.5, i]), sy([0, i])); g.stroke();
      }
      function dirLine(d, col, w) {
        var t = 4.4 / Math.max(1e-9, Math.max(Math.abs(d[0]), Math.abs(d[1])));
        g.strokeStyle = col; g.lineWidth = w || 1.6;
        g.beginPath(); g.moveTo(sx([-d[0] * t, -d[1] * t]), sy([-d[0] * t, -d[1] * t]));
        g.lineTo(sx([d[0] * t, d[1] * t]), sy([d[0] * t, d[1] * t])); g.stroke();
      }
      function offLine(p0, d, col) {
        var t = 4.4 / Math.max(1e-9, Math.max(Math.abs(d[0]), Math.abs(d[1])));
        g.strokeStyle = col; g.lineWidth = 1.6; g.setLineDash([6, 4]);
        g.beginPath();
        g.moveTo(sx([p0[0] - d[0] * t, p0[1] - d[1] * t]), sy([p0[0] - d[0] * t, p0[1] - d[1] * t]));
        g.lineTo(sx([p0[0] + d[0] * t, p0[1] + d[1] * t]), sy([p0[0] + d[0] * t, p0[1] + d[1] * t]));
        g.stroke(); g.setLineDash([]);
      }
      function dot(p, col) { g.fillStyle = col; g.beginPath(); g.arc(sx(p), sy(p), 4, 0, Math.PI * 2); g.fill(); }
      g.font = '12px Microsoft YaHei, sans-serif';

      if (mode === 'S') {
        dirLine(data.u, '#6b4e9e');
        g.fillStyle = '#6b4e9e'; g.fillText('S', sx([data.u[0] * 3.8, data.u[1] * 3.8]), sy([data.u[0] * 3.8, data.u[1] * 3.8]));
        if (data.r === 1) offLine(data.xu, data.v, '#a06a17');
        dot(data.xu, '#2f7d5b'); g.fillStyle = '#2f7d5b'; g.fillText('A⁺b', sx(data.xu) + 6, sy(data.xu) - 6);
        dot(data.x, '#9e3b46'); g.fillStyle = '#9e3b46'; g.fillText('约束解', sx(data.x) + 6, sy(data.x) + 14);
      } else {
        if (data.r === 1) offLine(data.xu, data.v, '#a06a17');
        // N-椭圆族 n1 x1² + n2 x2² = r²
        var n1 = data.n1, n2 = data.n2;
        var rw = Math.sqrt(n1 * data.xw[0] * data.xw[0] + n2 * data.xw[1] * data.xw[1]);
        [0.45, 0.75, 1].forEach(function (f, idx) {
          var rr = rw * f;
          g.strokeStyle = idx === 2 ? '#2b5f8b' : '#bcd0e0'; g.lineWidth = idx === 2 ? 2 : 1;
          g.beginPath();
          for (var t2 = 0; t2 <= 64; t2++) {
            var ang = t2 / 64 * Math.PI * 2;
            var p = [rr / Math.sqrt(n1) * Math.cos(ang), rr / Math.sqrt(n2) * Math.sin(ang)];
            if (t2 === 0) g.moveTo(sx(p), sy(p)); else g.lineTo(sx(p), sy(p));
          }
          g.stroke();
        });
        g.fillStyle = '#2b5f8b'; g.fillText('‖x‖_N 椭圆', sx([2.6]), sy([2.9]));
        dot(data.xu, '#2f7d5b'); g.fillStyle = '#2f7d5b'; g.fillText('欧氏 A⁺b', sx(data.xu) + 6, sy(data.xu) - 6);
        dot(data.xw, '#9e3b46'); g.fillStyle = '#9e3b46'; g.fillText('加权切点', sx(data.xw) + 6, sy(data.xw) + 14);
      }
    }

    function draw() {
      var A = wA.get(), b = wB.get(), r = rank2(A);
      var Ap = pinv2(A, r), xu = mv(Ap, b), v = null;
      if (r === 1) v = nullDir(A);
      var mode = bS.style.fontWeight === '700' ? 'S' : 'N';
      if (mode === 'S') {
        var th = num(thS.inp.value) * Math.PI / 180;
        var u = [Math.cos(th), Math.sin(th)];
        var Ps = [[u[0] * u[0], u[0] * u[1]], [u[1] * u[0], u[1] * u[1]]];
        var Bm = mm(A, Ps), rB = rank2(Bm);
        var X = mm(Ps, pinv2(Bm, rB));
        var x = mv(X, b);
        rInfo.v.textContent = 'rank A=' + r + '，rank(AP_S)=' + rB + '；S 方向 u=' + v1(u);
        rX.v.textContent = 'X=P_S(AP_S)⁺，约束解 x = ' + v1(x) + '（定理 6.38，x∈S：xᵀu⊥ 校验 ' + fmt(Math.abs(x[0] * u[1] - x[1] * u[0])) + '）';
        rXu.v.textContent = v1(xu) + (r === 1 ? '（无约束最小二乘解，在金色直线上滑动）' : '（满秩：解唯一）');
        var res = [mv(A, x)[0] - b[0], mv(A, x)[1] - b[1]];
        rCk.v.textContent = '残差 Ax−b = ' + v1(res) + '，‖残差‖=' + fmt(Math.sqrt(res[0] * res[0] + res[1] * res[1])) + '（S 上的最小值）';
        paint('S', { u: u, v: v, xu: xu, x: x, r: r });
      } else {
        var n1 = Math.max(1e-6, num(bx1.inp.value)), n2 = Math.max(1e-6, num(bx2.inp.value));
        var GN = [[Math.sqrt(n1), 0], [0, Math.sqrt(n2)]];
        var GNi = inv2(GN);
        var At = mm(A, GNi); // G_M=I：Ã=A G_N⁻¹
        var X = mm(GNi, pinv2(At, rank2(At)));
        var xw = mv(X, b);
        var normW = Math.sqrt(n1 * xw[0] * xw[0] + n2 * xw[1] * xw[1]);
        var normU = Math.sqrt(n1 * xu[0] * xu[0] + n2 * xu[1] * xu[1]);
        var tan = r === 1 ? (xw[0] * n1 * v[0] + xw[1] * n2 * v[1]) : 0;
        rInfo.v.textContent = 'G_N=diag(√n₁,√n₂)，Ã=A G_N⁻¹；rank Ã = ' + rank2(At);
        rX.v.textContent = 'x* = G_N⁻¹Ã⁺b = ' + v1(xw) + '（定理 6.41 取 M=I）';
        rXu.v.textContent = '欧氏解 A⁺b = ' + v1(xu);
        rCk.v.textContent = '‖x*‖_N=' + fmt(normW) + ' ≤ ‖A⁺b‖_N=' + fmt(normU) + '；切点条件 x*ᵀNv = ' + fmt(tan) + '（=0 ⇔ 椭圆与解直线相切）';
        paint('N', { n1: n1, n2: n2, v: v, xu: xu, xw: xw, r: r });
      }
    }
    function setMode(m) {
      bS.style.fontWeight = m === 'S' ? '700' : '';
      bN.style.fontWeight = m === 'N' ? '700' : '';
      panS.style.display = m === 'S' ? '' : 'none';
      panN.style.display = m === 'N' ? '' : 'none';
      draw();
    }
    bS.addEventListener('click', function () { setMode('S'); });
    bN.addEventListener('click', function () { setMode('N'); });
    [wA, wB].forEach(function (w) { w.wrap.addEventListener('input', draw); });
    [thS.inp, bx1.inp, bx2.inp].forEach(function (i) { i.addEventListener('input', draw); });
    setMode('S');
  }

  /* ============================================================
     ㉚ Drazin 逆 / 群逆计算器 [data-drazin-lab]（3×3）
     指标 k = 秩序列首次稳定；A^(d)=A^k (A^{2k+1})^(1) A^k
     ============================================================ */
  function initDrazinLab(root) {
    var presets = [
      { name: '非奇异(指标1)', A: [[1, 2, 0], [0, 1, 1], [1, 0, 1]] },
      { name: '混合块(指标2)', A: [[0, 1, 0], [0, 0, 0], [0, 0, 2]] },
      { name: '3阶幂零(指标3)', A: [[0, 1, 0], [0, 0, 1], [0, 0, 0]] },
      { name: '秩稳奇异(指标1)', A: [[1, 1, 0], [1, 1, 0], [0, 0, 1]] },
      { name: '投影阵(指标1)', A: [[1, 0, 0], [0, 0.5, 0.5], [0, 0.5, 0.5]] }
    ];
    var pBar = document.createElement('div');
    pBar.className = 'sf-buttons';
    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(pBar);
    var wA = mkMatrixInputs('A（3×3）', presets[0].A, false, 3);
    left.appendChild(wA.wrap);
    var right = document.createElement('div');
    right.className = 'cl-out';
    var rK = mkOutRow('指标 k =');
    var rRk = mkOutRow('秩序列 =');
    var rX = mkOutRow('A^(d) =');
    var rE1 = mkOutRow('方程 (i^k) =');
    var rE2 = mkOutRow('方程 (ii)(iii) =');
    var rEv = mkOutRow('谱 λ → λ⁺ =');
    var rG = mkOutRow('群逆 / 与 A⁺ 关系 =');
    [rK, rRk, rX, rE1, rE2, rEv, rG].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function mpow(M, p) {
      var R = eye3(), i;
      for (i = 0; i < p; i++) R = mm3(R, M);
      return R;
    }
    function eye3() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
    function mm3(X, Y) {
      var Z = [];
      for (var i = 0; i < 3; i++) { var rv = []; for (var j = 0; j < 3; j++) { var s = 0; for (var t = 0; t < 3; t++) s += X[i][t] * Y[t][j]; rv.push(s); } Z.push(rv); }
      return Z;
    }
    function rank3(M) {
      var B = M.map(function (r) { return r.slice(); }), rk = 0;
      for (var c = 0; c < 3 && rk < 3; c++) {
        var p = -1;
        for (var i = rk; i < 3; i++) if (Math.abs(B[i][c]) > 1e-9) { p = i; break; }
        if (p < 0) continue;
        var t = B[rk]; B[rk] = B[p]; B[p] = t;
        for (i = rk + 1; i < 3; i++) { var f = B[i][c] / B[rk][c]; for (var j = c; j < 3; j++) B[i][j] -= f * B[rk][j]; }
        rk++;
      }
      return rk;
    }
    function fro(M) { var s = 0; M.forEach(function (r) { r.forEach(function (x) { s += x * x; }); }); return Math.sqrt(s); }
    function sub3(X, Y) { var Z = []; for (var i = 0; i < 3; i++) { var rv = []; for (var j = 0; j < 3; j++) rv.push(X[i][j] - Y[i][j]); Z.push(rv); } return Z; }
    function mx(M) { return M.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>'); }
    // 3×3 对称特征值（Jacobi）仅用于 A^+ 与谱对照；A^+ 此处对一般阵用 SVD-free 近似：
    // 采用 A^+ = A^T (A A^T A A^T...) 不便；改用多项式? 简单起见用满秩/幂等特例判定。
    // 对 3×3 一般阵，用 Zlobec：A^+ = A^T (A^T A A^T)^(1) A^T，{1}-逆取 pinv(高斯消元)。
    function tr3(M) {
      return [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
    }
    function pinv3(M) { // 对 3×3：满秩用伴随/行列式，秩亏用 Zlobec 不便——这里仅处理可逆与秩0/秩1/秩2 via SVD 替代：
      var eps = 1e-9;
      // 伴随求逆
      function det3(B) {
        return B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) -
          B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) +
          B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
      }
      var d = det3(M);
      if (Math.abs(d) > 1e-8) {
        var ad = [
          [M[1][1] * M[2][2] - M[1][2] * M[2][1], M[0][2] * M[2][1] - M[0][1] * M[2][2], M[0][1] * M[1][2] - M[0][2] * M[1][1]],
          [M[1][2] * M[2][0] - M[1][0] * M[2][2], M[0][0] * M[2][2] - M[0][2] * M[2][0], M[0][2] * M[1][0] - M[0][0] * M[1][2]],
          [M[1][0] * M[2][1] - M[1][1] * M[2][0], M[0][1] * M[2][0] - M[0][0] * M[2][1], M[0][0] * M[1][1] - M[0][1] * M[1][0]]
        ];
        return ad.map(function (r) { return r.map(function (x) { return x / d; }); });
      }
      return null;
    }
    function oneInverse(M) { // 3×3 的一个 {1}-逆：P diag(I_r,O) Q（定理 6.14，L=O）
      var info = rref3(M), piv = info.piv, r = piv.length;
      if (r === 0) return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      // 完整 3×3 列置换阵 P：第 j 列为 e_{order[j]}（主元列换到最前）
      var rest = [];
      for (var c = 0; c < 3; c++) if (piv.indexOf(c) < 0) rest.push(c);
      var order = piv.concat(rest);
      var Pm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var j = 0; j < 3; j++) Pm[order[j]][j] = 1;
      var D = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var i = 0; i < r; i++) D[i][i] = 1;
      return mm3(mm3(Pm, D), info.Q);
    }
    function pinvGeneral(A) { // Zlobec：A^T (A^T A A^T)^(1) A^T
      var At = tr3(A), C = mm3(mm3(At, A), At);
      return mm3(mm3(At, oneInverse(C)), At);
    }
    function rref3(A) {
      var B = A.map(function (r, i) { return r.concat(i === 0 ? [1, 0, 0] : i === 1 ? [0, 1, 0] : [0, 0, 1]); });
      var piv = [], row = 0;
      for (var c = 0; c < 3 && row < 3; c++) {
        var p = -1;
        for (var i = row; i < 3; i++) if (Math.abs(B[i][c]) > 1e-9) { p = i; break; }
        if (p < 0) continue;
        var t = B[row]; B[row] = B[p]; B[p] = t;
        var d = B[row][c];
        for (var j = 0; j < 6; j++) B[row][j] /= d;
        for (i = 0; i < 3; i++) if (i !== row) { var f = B[i][c]; for (j = 0; j < 6; j++) B[i][j] -= f * B[row][j]; }
        piv.push(c); row++;
      }
      return { piv: piv, Q: B.map(function (r) { return r.slice(3); }) };
    }
    function eigReal3(M) { // 对称阵 Jacobi
      var B = M.map(function (r) { return r.slice(); }), ev = [1, 1, 1], it;
      for (it = 0; it < 50; it++) {
        var p = 0, q = 1, mx = 0;
        for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) if (Math.abs(B[i][j]) > mx) { mx = Math.abs(B[i][j]); p = i; q = j; }
        if (mx < 1e-10) break;
        var tau = (B[q][q] - B[p][p]) / (2 * B[p][q]), t2 = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        var c2 = 1 / Math.sqrt(1 + t2 * t2), s2 = t2 * c2;
        for (i = 0; i < 3; i++) { var bpi = B[p][i], bqi = B[q][i]; B[p][i] = c2 * bpi - s2 * bqi; B[q][i] = s2 * bpi + c2 * bqi; }
        for (i = 0; i < 3; i++) { var bip = B[i][p], biq = B[i][q]; B[i][p] = c2 * bip - s2 * biq; B[i][q] = s2 * bip + c2 * biq; }
      }
      return [B[0][0], B[1][1], B[2][2]];
    }

    function draw() {
      var A = wA.get();
      var ranks = [rank3(A)];
      var k = 1, P = A;
      while (k <= 3) {
        var Pn = mm3(P, A); // A^{k+1}
        var r2 = rank3(Pn);
        ranks.push(r2);
        if (r2 === ranks[ranks.length - 2]) break;
        P = Pn; k++;
      }
      if (ranks[ranks.length - 1] !== ranks[ranks.length - 2]) k = 3; // 兜底
      rRk.v.textContent = 'rank A, A², A³, A⁴ = ' + ranks.join(', ') + '（首次相等给出 k=' + k + '）';
      rK.v.textContent = k + (k === 1 ? '（存在群逆 A#）' : '');
      var Ak = mpow(A, k), A2k1 = mpow(A, 2 * k + 1);
      var C1 = pinv3(A2k1) || oneInverse(A2k1);
      var X = mm3(mm3(Ak, C1), Ak);
      rX.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.84rem;line-height:1.55">' + mx(X) + '</span>';
      var Ak1 = mpow(A, k + 1);
      rE1.v.textContent = '‖A^{k+1}X−A^k‖ = ' + fmt(fro(sub3(mm3(Ak1, X), Ak))) + '（方程 i^k：A^{k+1}X=A^k）';
      var e2 = fro(sub3(mm3(mm3(X, A), X), X));
      var AX = mm3(A, X), XA = mm3(X, A);
      var e3 = fro(sub3(AX, XA));
      rE2.v.textContent = '‖XAX−X‖ = ' + fmt(e2) + '（ii）；‖AX−XA‖ = ' + fmt(e3) + '（iii 交换性）';
      // 谱：用 A 与 X 的特征值（非对称时 eigReal3 不适用，改为报告 X 多项式型说明）
      var symA = Math.abs(A[0][1] - A[1][0]) + Math.abs(A[0][2] - A[2][0]) + Math.abs(A[1][2] - A[2][1]) < 1e-8;
      if (symA) {
        var ea = eigReal3(A).map(function (x) { return Math.abs(x) < 1e-8 ? 0 : x; }).sort(function (a, b) { return a - b; });
        var ex = eigReal3(X).map(function (x) { return Math.abs(x) < 1e-8 ? 0 : x; }).sort(function (a, b) { return a - b; });
        var map = ea.map(function (lam) { return Math.abs(lam) < 1e-8 ? 0 : 1 / lam; });
        rEv.v.textContent = 'spec(A) = {' + ea.map(fmt).join(', ') + '}；λ⁺ = {' + map.map(fmt).join(', ') + '}；spec(A^(d)) = {' + ex.map(fmt).join(', ') + '}（定理6.44）';
      } else {
        rEv.v.textContent = 'A 非对称：定理 6.44 仍成立（非零特征值取倒数），此处略去复特征值数值';
      }
      if (k === 1) {
        var Ap = pinvGeneral(A);
        var d1 = fro(sub3(mm3(A, Ap), mm3(Ap, A)));
        var d2 = fro(sub3(X, Ap));
        rG.v.textContent = '群逆存在；‖AA⁺−A⁺A‖=' + fmt(d1) + (d1 < 1e-6 ? '（=0 ⇒ A#=A⁺，定理6.50）' : '（≠0 ⇒ A#≠A⁺，二者差 ‖A#−A⁺‖=' + fmt(d2) + '）');
      } else {
        rG.v.textContent = '指标 ' + k + ' > 1：无群逆；注意幂零部分被 A^(d) 消去（幂零 Jordan 块对应特征值 0）';
      }
    }
    presets.forEach(function (p) {
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name;
      b2.addEventListener('click', function () { wA.set(p.A); draw(); });
      pBar.appendChild(b2);
    });
    wA.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉛ 正定 / 正稳定判别台 [data-pd-lab]
     正定模式：3×3 对称（谱、主子式、Cholesky、Loewner 序、二次型等值线）
     稳定模式：2×2 一般（谱复平面、迹-行列式判据、Cayley 变换）
     ============================================================ */
  function initPdLab(root) {
    var tabs = document.createElement('div');
    tabs.className = 'sf-buttons';
    var bP = document.createElement('button'); bP.type = 'button'; bP.className = 'sf-btn'; bP.textContent = '正定判别（3×3 对称）';
    var bS = document.createElement('button'); bS.type = 'button'; bS.className = 'sf-btn'; bS.textContent = '正稳定判别（2×2）';
    tabs.appendChild(bP); tabs.appendChild(bS);

    var body = document.createElement('div');
    body.className = 'lab-body';
    var left = document.createElement('div');
    left.className = 'cl-left';
    left.appendChild(tabs);

    var wA = mkMatrixInputs('A（3×3 对称）', [[2, 1, 0], [1, 2, 1], [0, 1, 2]], false, 3);
    var wB = mkMatrixInputs('B（比较用，3×3 对称）', [[1, 0, 0], [0, 1, 0], [0, 0, 1]], false, 3);
    var wM2 = mkMatrixInputs('A（2×2 一般实矩阵）', [[-3, -6], [4, 5]], false, 2);
    wM2.wrap.style.display = 'none';
    left.appendChild(wA.wrap); left.appendChild(wB.wrap); left.appendChild(wM2.wrap);

    var cv = document.createElement('canvas');
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','二次型等值线或复平面特征值位置');
    cv.width = cv.height = 320;
    cv.style.cssText = 'width:100%;max-width:330px;display:block;margin:8px auto 0';
    left.appendChild(cv);

    var right = document.createElement('div');
    right.className = 'cl-out';
    var r1 = mkOutRow('特征值 =');
    var r2 = mkOutRow('顺序主子式 =');
    var r3 = mkOutRow('判别结论 =');
    var r4 = mkOutRow('Loewner 序 / Cayley =');
    [r1, r2, r3, r4].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right);
    root.appendChild(body);

    function jacobi3(M) {
      var B = M.map(function (r) { return r.slice(); });
      for (var it = 0; it < 60; it++) {
        var p = 0, q = 1, mx = 0, i, j;
        for (i = 0; i < 3; i++) for (j = i + 1; j < 3; j++) if (Math.abs(B[i][j]) > mx) { mx = Math.abs(B[i][j]); p = i; q = j; }
        if (mx < 1e-11) break;
        var tau = (B[q][q] - B[p][p]) / (2 * B[p][q]), t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        var c = 1 / Math.sqrt(1 + t * t), s = t * c;
        for (i = 0; i < 3; i++) { var bp = B[p][i], bq = B[q][i]; B[p][i] = c * bp - s * bq; B[q][i] = s * bp + c * bq; }
        for (i = 0; i < 3; i++) { var ip = B[i][p], iq = B[i][q]; B[i][p] = c * ip - s * iq; B[i][q] = s * ip + c * iq; }
      }
      return [B[0][0], B[1][1], B[2][2]].sort(function (a, b) { return b - a; });
    }
    function fmt3(x) { return (Math.abs(x) < 1e-8 ? 0 : x).toFixed(4); }
    function det3(B) {
      return B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) -
        B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) +
        B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
    }
    function paintContour(A) { // x^T A x=1 的等值线（用前 2×2 主子块）
      var g = cv.getContext('2d');
      g.clearRect(0, 0, 320, 320);
      g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, 320, 320);
      var S = 320 / 9, O = 160;
      function sx(x) { return O + x * S; }
      function sy(y) { return O - y * S; }
      function grid() {
        g.strokeStyle = '#ddd6c8'; g.lineWidth = 1;
        for (var i = -4; i <= 4; i++) {
          g.beginPath(); g.moveTo(sx(i), sy(-4.5)); g.lineTo(sx(i), sy(4.5)); g.stroke();
          g.beginPath(); g.moveTo(sx(-4.5), sy(i)); g.lineTo(sx(4.5), sy(i)); g.stroke();
        }
        g.strokeStyle = '#b8b0a4'; g.lineWidth = 1.2; // 过原点的坐标轴
        g.beginPath(); g.moveTo(sx(-4.5), sy(0)); g.lineTo(sx(4.5), sy(0)); g.stroke();
        g.beginPath(); g.moveTo(sx(0), sy(-4.5)); g.lineTo(sx(0), sy(4.5)); g.stroke();
      }
      function map(xx, yy, ang) { // 主轴坐标 → 原坐标
        return [Math.cos(ang) * xx - Math.sin(ang) * yy, Math.sin(ang) * xx + Math.cos(ang) * yy];
      }
      grid();
      var a = A[0][0], b = A[0][1], d = A[1][1];
      var disc = (a - d) * (a - d) + 4 * b * b;
      var lam1 = (a + d + Math.sqrt(Math.max(0, disc))) / 2;
      var lam2 = (a + d - Math.sqrt(Math.max(0, disc))) / 2;
      var ang = Math.abs(b) < 1e-9 ? 0 : Math.atan2(lam1 - a, b);
      g.font = '12px Microsoft YaHei';
      var N = 200;
      if (lam2 > 1e-8) {
        // 正定：椭圆
        var e1 = 1 / Math.sqrt(lam1), e2 = 1 / Math.sqrt(lam2);
        g.strokeStyle = '#2b5f8b'; g.lineWidth = 2; g.beginPath();
        for (var t = 0; t <= N; t++) {
          var th = t / N * Math.PI * 2;
          var p = map(e1 * Math.cos(th), e2 * Math.sin(th), ang);
          if (t === 0) g.moveTo(sx(p[0]), sy(p[1])); else g.lineTo(sx(p[0]), sy(p[1]));
        }
        g.stroke(); g.fillStyle = '#2b5f8b'; g.fillText('xᵀAx=1 椭圆（正定）', 12, 18);
      } else if (lam1 < -1e-8) {
        g.strokeStyle = '#9e3b46'; g.fillStyle = '#9e3b46'; g.fillText('负定（无实等值线）', 12, 18);
      } else if (lam1 > 1e-8 && lam2 < -1e-8) {
        // 不定：双曲线两支 x^T A x=1
        g.strokeStyle = '#9e3b46'; g.lineWidth = 1.8;
        var ap = 1 / Math.sqrt(lam1), am = 1 / Math.sqrt(-lam2);
        [-1, 1].forEach(function (sgn) {
          g.beginPath();
          for (var v = -2; v <= 2.001; v += 0.04) {
            var p = map(sgn * ap * Math.cosh(v), am * Math.sinh(v), ang);
            if (v === -2) g.moveTo(sx(p[0]), sy(p[1])); else g.lineTo(sx(p[0]), sy(p[1]));
          }
          g.stroke();
        });
        g.fillStyle = '#9e3b46'; g.fillText('xᵀAx=1 双曲线（不定）', 12, 18);
      } else if (lam1 > 1e-8) {
        // 半正定 λ2≈0：两条平行直线（沿零方向开放）
        g.strokeStyle = '#a06a17'; g.lineWidth = 1.8;
        var ap0 = 1 / Math.sqrt(lam1);
        [-1, 1].forEach(function (sgn) {
          var p0 = map(sgn * ap0, -4, ang), p1 = map(sgn * ap0, 4, ang);
          g.beginPath(); g.moveTo(sx(p0[0]), sy(p0[1])); g.lineTo(sx(p1[0]), sy(p1[1])); g.stroke();
        });
        g.fillStyle = '#a06a17'; g.fillText('xᵀAx=1 平行线（半正定）', 12, 18);
      } else {
        // 退化：λ₁≈λ₂≈0（数值上的零矩阵）。此前这里无条件取 1/√λ₁，零矩阵会得到 Infinity 坐标。
        g.fillStyle = '#a06a17'; g.fillText('退化：A 数值上为零矩阵，xᵀAx=1 无实解', 12, 18);
      }
    }
    function paintPlane(tr, det, eigIm) {
      var g = cv.getContext('2d');
      g.clearRect(0, 0, 320, 320);
      g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, 320, 320);
      var S = 60, O = 160; // 1 单位 = 60px
      function sx(x) { return O + x * S; }
      function sy(y) { return O - y * S; }
      // 右半平面淡色
      g.fillStyle = 'rgba(61,125,78,0.10)'; g.fillRect(O, 12, O - 12, 296);
      g.strokeStyle = '#888'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(O, 12); g.lineTo(O, 308); g.stroke(); // 虚轴
      g.beginPath(); g.moveTo(12, O); g.lineTo(308, O); g.stroke(); // 实轴
      g.fillStyle = '#888'; g.font = '11px Microsoft YaHei';
      g.fillText('Re→', 280, O - 5); g.fillText('Im', O + 5, 24); g.fillText('右半平面(Reλ>0)', O + 8, 300);
      var re = tr / 2;
      function dot(x, y, col, txt) {
        g.fillStyle = col; g.beginPath(); g.arc(sx(x), sy(y), 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#333'; g.fillText(txt, sx(x) + 7, sy(y) - 6);
      }
      dot(re, eigIm, '#2b5f8b', 'λ');
      if (Math.abs(eigIm) > 1e-9) dot(re, -eigIm, '#2b5f8b', 'λ̄');
      // Cayley 点 γ=(λ-1)/(λ+1) 与单位圆
      g.strokeStyle = '#a06a17'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(O, O, S, 0, Math.PI * 2); g.stroke();
      function cay(zre, zim) { var den = (zre + 1) * (zre + 1) + zim * zim; return [(zre * zre - 1 + zim * zim) / den, 2 * zim / den]; }
      var c1 = cay(re, eigIm);
      g.fillStyle = '#a06a17'; g.beginPath(); g.arc(sx(c1[0]), sy(c1[1]), 4, 0, Math.PI * 2); g.fill();
      if (Math.abs(eigIm) > 1e-9) { var c2 = cay(re, -eigIm); g.beginPath(); g.arc(sx(c2[0]), sy(c2[1]), 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#a06a17'; g.font = '11px Microsoft YaHei'; g.fillText('γ=(λ−1)/(λ+1)', sx(c1[0]) + 7, sy(c1[1]) + 14);
    }

    function draw() {
      if (bS.style.fontWeight === '700') {
        var A = wM2.get();
        var tr = A[0][0] + A[1][1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        var disc = (A[0][0] - A[1][1]) * (A[0][0] - A[1][1]) + 4 * A[0][1] * A[1][0];
        var im = disc < 0 ? Math.sqrt(-disc) / 2 : 0;
        r1.v.textContent = disc >= 0 ? 'λ₁=' + fmt3((tr + Math.sqrt(disc)) / 2) + '，λ₂=' + fmt3((tr - Math.sqrt(disc)) / 2)
          : 'λ=' + fmt3(tr / 2) + ' ± ' + fmt3(im) + 'i（共轭）';
        r2.v.textContent = 'tr A = ' + fmt3(tr) + '，det A = ' + fmt3(det) + '（二阶判据：tr>0 且 det>0 ⇔ 正稳定）';
        var ok = tr > 1e-9 && det > 1e-9;
        r3.v.innerHTML = ok ? '<b style="color:#2f7d5b">正稳定</b>（教材约定 Reλ>0；工程 Hurwitz 约定下结论相反）' : '<b style="color:#9e3b46">不正定/不稳定</b>（特征值不全在右半平面）';
        var gam = Math.abs(disc) < 1e-9 ? Math.max(Math.abs((tr + Math.sqrt(Math.max(0, disc)) / 2 - 1) / ((tr + Math.sqrt(Math.max(0, disc)) / 2 + 1))), Math.abs((tr - Math.sqrt(Math.max(0, disc)) / 2 - 1) / ((tr - Math.sqrt(Math.max(0, disc)) / 2 + 1)))) : Math.sqrt(((tr / 2) ** 2 + im ** 2 + 1 - 2 * (tr / 2)) / ((tr / 2 + 1) ** 2 + im ** 2));
        r4.v.textContent = 'Cayley G=(A+I)⁻¹(A−I)，ρ(G)=' + fmt3(gam) + (gam < 1 ? ' < 1（收敛，与谱判据一致）' : ' ≥ 1');
        paintPlane(tr, det, im);
        return;
      }
      var S = wA.get(), B = wB.get();
      // 强制对称化读取（忽略非对称输入误差）
      var A = [[S[0][0], (S[0][1] + S[1][0]) / 2, (S[0][2] + S[2][0]) / 2],
               [(S[0][1] + S[1][0]) / 2, S[1][1], (S[1][2] + S[2][1]) / 2],
               [(S[0][2] + S[2][0]) / 2, (S[1][2] + S[2][1]) / 2, S[2][2]]];
      var ev = jacobi3(A);
      r1.v.textContent = 'λ = ' + ev.map(fmt3).join('，');
      var d1 = A[0][0], d2 = A[0][0] * A[1][1] - A[0][1] * A[0][1], d3 = det3(A);
      r2.v.textContent = 'Δ₁=' + fmt3(d1) + '，Δ₂=' + fmt3(d2) + '，Δ₃=detA=' + fmt3(d3) + '（全正 ⇔ 正定）';
      var pos = ev[2] > 1e-8, semi = ev[2] > -1e-8;
      r3.v.innerHTML = pos ? '<b style="color:#2f7d5b">正定</b>：谱全正、主子式全正、Cholesky 可行'
        : semi ? '<b style="color:#a06a17">仅非负定（半正定）</b>：有零特征值，Cholesky 需用平方根广义形式'
        : '<b style="color:#9e3b46">不定</b>：存在负特征值，二次型等值线为双曲线';
      var BB = [[B[0][0], (B[0][1] + B[1][0]) / 2, (B[0][2] + B[2][0]) / 2],
               [(B[0][1] + B[1][0]) / 2, B[1][1], (B[1][2] + B[2][1]) / 2],
               [(B[0][2] + B[2][0]) / 2, (B[1][2] + B[2][1]) / 2, B[2][2]]];
      var Dm = [[A[0][0] - BB[0][0], A[0][1] - BB[0][1], A[0][2] - BB[0][2]],
               [A[1][0] - BB[1][0], A[1][1] - BB[1][1], A[1][2] - BB[1][2]],
               [A[2][0] - BB[2][0], A[2][1] - BB[2][1], A[2][2] - BB[2][2]]];
      var ed = jacobi3(Dm);
      r4.v.textContent = 'Loewner 序：spec(A−B) = ' + ed.map(fmt3).join('，') +
        (ed[2] > 1e-8 ? ' ⇒ A>B' : ed[0] < -1e-8 ? ' ⇒ B>A' : ed[2] > -1e-8 ? ' ⇒ A≥B' : 'A 与 B 不可比较');
      paintContour(A);
    }
    function setMode(m) {
      bP.style.fontWeight = m === 'P' ? '700' : '';
      bS.style.fontWeight = m === 'S' ? '700' : '';
      wA.wrap.style.display = m === 'P' ? '' : 'none';
      wB.wrap.style.display = m === 'P' ? '' : 'none';
      wM2.wrap.style.display = m === 'S' ? '' : 'none';
      draw();
    }
    bP.addEventListener('click', function () { setMode('P'); });
    bS.addEventListener('click', function () { setMode('S'); });
    [wA, wB, wM2].forEach(function (w) { w.wrap.addEventListener('input', draw); });
    setMode('P');
  }

  /* 共享：3×3 实矩阵特征值（特征多项式 Cardano 解析法），返回 [{re,im}] */
  function eig3(M) {
    var c1 = M[0][0] + M[1][1] + M[2][2];
    var c2 = (M[0][0]*M[1][1] - M[0][1]*M[1][0]) +
             (M[0][0]*M[2][2] - M[0][2]*M[2][0]) +
             (M[1][1]*M[2][2] - M[1][2]*M[2][1]);
    var c3 = M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) -
             M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) +
             M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    // 化为 t^3 + p t + q = 0，t = λ − c1/3
    var p = c2 - c1*c1/3;
    var q = -2*c1*c1*c1/27 + c1*c2/3 - c3;
    var qh = q/2, ph = p/3;
    var disc = qh*qh + ph*ph*ph;
    // 判别式随矩阵整体缩放按 6 次方变化，必须用相对判据：绝对阈值 1e-12 会把
    // 「元素很小但确有共轭复根」的矩阵（如 0.01·A）误判为三实根（见 audit\ledger.md 2026-09-28）
    var dtol = 1e-12 * Math.max(Math.abs(ph*ph*ph), Math.abs(qh*qh));
    var shift = c1/3, out = [];
    if (disc > dtol) {
      var sq = Math.sqrt(disc);
      var u = Math.cbrt(-q/2 + sq), v = Math.cbrt(-q/2 - sq);
      var t1 = u + v;
      out.push({ re: shift + t1, im: 0 });
      out.push({ re: shift - t1/2, im: (u - v)*Math.sqrt(3)/2 });
      out.push({ re: shift - t1/2, im: -(u - v)*Math.sqrt(3)/2 });
    } else {
      var r = Math.sqrt(Math.max(0, -(p/3)*(p/3)*(p/3)));
      var phi = Math.acos(Math.max(-1, Math.min(1, (-q/2)/(r || 1e-30))));
      var rr = 2*Math.sqrt(Math.max(0, -p/3));
      out.push({ re: shift + rr*Math.cos(phi/3), im: 0 });
      out.push({ re: shift + rr*Math.cos((phi + 2*Math.PI)/3), im: 0 });
      out.push({ re: shift + rr*Math.cos((phi + 4*Math.PI)/3), im: 0 });
    }
    return out;
  }

  /* ============================================================
     ㉜ 对角占优判定台 [data-dd-lab]（3×3）
     ============================================================ */
  function initDdLab(root) {
    var presets = [
      { name: '强占优', A: [[4, 1, 0], [1, 3, 1], [0, 1, 4]] },
      { name: '不可约占优', A: [[2, 1, 1], [1, 2, 0], [0, 1, 1]] },
      { name: '链占优反例', A: [[1, 1, 0], [0, 1, 1], [0, -0.5, 1]] },
      { name: '拟占优(上三角)', A: [[1, 1, 1], [0, 1, 1], [0, 0, 1]] },
      { name: '不占优', A: [[1, 2, 0], [2, 1, 3], [0, 2, 1]] }
    ];
    var pBar = document.createElement('div'); pBar.className = 'sf-buttons';
    var body = document.createElement('div'); body.className = 'lab-body';
    var left = document.createElement('div'); left.className = 'cl-left'; left.appendChild(pBar);
    var wA = mkMatrixInputs('A（3×3）', presets[0].A, false, 3);
    left.appendChild(wA.wrap);
    var cv = document.createElement('canvas'); cv.width = cv.height = 320;
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','Gerschgorin 圆盘与实轴区间');
    cv.style.cssText = 'width:100%;max-width:330px;display:block;margin:8px auto 0';
    left.appendChild(cv);
    var right = document.createElement('div'); right.className = 'cl-out';
    var rRows = mkOutRow('逐行检验 =');
    var rClass = mkOutRow('占优类别 =');
    var rIrred = mkOutRow('不可约性 =');
    var rH = mkOutRow('拟占优 / 缩放权重 =');
    var rSpec = mkOutRow('B=I−D⁻¹A 谱半径 =');
    [rRows, rClass, rIrred, rH, rSpec].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right); root.appendChild(body);

    function reachable(A) { // 有向图强连通
      function bfs(start) {
        var seen = [false, false, false], q = [start]; seen[start] = true;
        while (q.length) { var i = q.shift(); for (var j = 0; j < 3; j++) if (i !== j && Math.abs(A[i][j]) > 1e-12 && !seen[j]) { seen[j] = true; q.push(j); } }
        return seen;
      }
      var r0 = bfs(0);
      if (!(r0[0] && r0[1] && r0[2])) return false;
      return bfs(1).every(Boolean) && bfs(2).every(Boolean);
    }
    function paint(discs, include0) {
      var g = cv.getContext('2d');
      g.clearRect(0, 0, 320, 320); g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, 320, 320);
      var O = 160, S = 52;
      function sx(x) { return O + x * S; } function sy(y) { return O - y * S; }
      g.fillStyle = include0 ? 'rgba(158,59,70,0.08)' : 'rgba(61,125,78,0.08)';
      g.fillRect(O, 10, O - 10, 300);
      g.strokeStyle = '#888'; g.beginPath(); g.moveTo(O, 10); g.lineTo(O, 310); g.stroke();
      g.beginPath(); g.moveTo(10, O); g.lineTo(310, O); g.stroke();
      var cols = ['#2b5f8b', '#2f7d5b', '#a06a17'];
      discs.forEach(function (d, i) {
        g.strokeStyle = cols[i]; g.lineWidth = 1.5;
        g.beginPath(); g.arc(sx(d.c), sy(0), d.r * S, 0, Math.PI * 2); g.stroke();
        g.fillStyle = cols[i]; g.fillRect(sx(d.c) - 2, O - 2, 4, 4);
      });
      g.fillStyle = '#9e3b46'; g.beginPath(); g.arc(O, O, 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#666'; g.font = '11px Microsoft YaHei'; g.fillText('原点', O + 6, O + 14);
      g.fillText('Re', 292, O - 5); g.fillText('Im', O + 5, 22);
    }
    function draw() {
      var A = wA.get();
      var diag = [A[0][0], A[1][1], A[2][2]];
      var rows = [], discs = [], strict = [false, false, false], weak = [false, false, false];
      var okDiag = true;
      for (var i = 0; i < 3; i++) {
        if (Math.abs(diag[i]) < 1e-12) okDiag = false;
        var s = 0; for (var j = 0; j < 3; j++) if (j !== i) s += Math.abs(A[i][j]);
        strict[i] = Math.abs(diag[i]) > s + 1e-9;
        weak[i] = Math.abs(diag[i]) >= s - 1e-9;
        rows.push('行' + (i + 1) + '：|aᵢᵢ|=' + fmt(Math.abs(diag[i])) + (strict[i] ? ' > ' : weak[i] ? ' ≥ ' : ' < ') + 'Σ|aᵢⱼ|=' + fmt(s));
        discs.push({ c: diag[i], r: s });
      }
      rRows.v.innerHTML = rows.join('<br>');
      var allStrict = strict.every(Boolean), allWeak = weak.every(Boolean);
      var irred = reachable(A);
      rIrred.v.textContent = irred ? '有向图强连通 ⇒ 不可约' : '存在不可达下标对 ⇒ 可约';
      // 非零元素链：弱占优 + 严行非空 + 每个非严行能到严行
      var K = []; strict.forEach(function (t, i) { if (t) K.push(i); });
      var chain = false;
      if (allWeak && K.length) {
        chain = true;
        for (var i2 = 0; i2 < 3; i2++) if (!strict[i2]) {
          // BFS 到 K
          var seen = [false, false, false], q = [i2]; seen[i2] = true; var hit = false;
          while (q.length) { var u = q.shift(); if (K.indexOf(u) >= 0) { hit = true; break; } for (var v2 = 0; v2 < 3; v2++) if (u !== v2 && Math.abs(A[u][v2]) > 1e-12 && !seen[v2]) { seen[v2] = true; q.push(v2); } }
          if (!hit) { chain = false; break; }
        }
      }
      var cls = [];
      if (allStrict) cls.push('强对角占优');
      if (allWeak && irred && K.length && !allStrict) cls.push('不可约对角占优');
      if (chain) cls.push('具非零元素链对角占优');
      // 拟占优：网格搜索正权重
      var foundW = null;
      if (okDiag) {
        var grid = [0.2, 0.4, 0.7, 1, 1.6, 2.5];
        outer:
        for (var a = 0; a < grid.length; a++) for (var b = 0; b < grid.length; b++) for (var c = 0; c < grid.length; c++) {
          var w = [grid[a], grid[b], grid[c]];
          var good = true;
          for (var ii = 0; ii < 3; ii++) { var lhs = Math.abs(diag[ii]) * w[ii], rhs = 0; for (var jj = 0; jj < 3; jj++) if (jj !== ii) rhs += Math.abs(A[ii][jj]) * w[jj]; if (!(lhs > rhs + 1e-9)) { good = false; break; } }
          if (good) { foundW = w; break outer; }
        }
      }
      if (foundW) cls.push('拟对角占优（D=diag(' + foundW.map(fmt).join(',') + ')）');
      rH.v.textContent = foundW ? '存在正对角阵 D 使 AD 强占优，权重 ξ=(' + foundW.map(fmt).join(',') + ')' : '在权重网格内未找到缩放（可能非拟占优，或需更细搜索）';
      rClass.v.innerHTML = cls.length ? cls.map(function (c, i) { return '<b style="color:' + (i === 0 ? '#2f7d5b' : '#2b5f8b') + '">' + c + '</b>'; }).join('；') : '<b style="color:#9e3b46">不属于五类占优</b>';
      // B=I-D^-1 A 的特征值
      if (okDiag) {
        var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var bi = 0; bi < 3; bi++) for (var bj = 0; bj < 3; bj++) B[bi][bj] = (bi === bj ? 1 : 0) - A[bi][bj] / diag[bi];
        var ev = eig3(B), rho = 0; ev.forEach(function (e) { rho = Math.max(rho, Math.sqrt(e.re * e.re + e.im * e.im)); });
        var dpos = diag.every(function (x) { return x > 0; });
        rSpec.v.textContent = 'ρ(B)=' + fmt(rho) + (rho < 1 ? ' < 1（非奇异；Jacobi 型迭代收敛）' : ' ≥ 1') + (dpos ? '；对角元为正 ⇒ Reλᵢ(A)>0（正稳定，Gerschgorin 圆盘全在右半平面）' : '');
        var include0 = discs.some(function (d) { return d.c < 0 ? Math.abs(d.c) <= d.r : d.r >= d.c; });
        paint(discs, include0);
      } else {
        rSpec.v.textContent = '存在零对角元，无法构造 B=I−D⁻¹A';
        paint(discs, true);
      }
    }
    presets.forEach(function (p) { var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name; b2.addEventListener('click', function () { wA.set(p.A); draw(); }); pBar.appendChild(b2); });
    wA.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉝ Perron–Frobenius / 单调矩阵台 [data-perron-lab]
     ============================================================ */
  function initPerronLab(root) {
    var tabs = document.createElement('div'); tabs.className = 'sf-buttons';
    var bP = document.createElement('button'); bP.type = 'button'; bP.className = 'sf-btn'; bP.textContent = 'Perron–Frobenius（非负矩阵）';
    var bM = document.createElement('button'); bM.type = 'button'; bM.className = 'sf-btn'; bM.textContent = '单调矩阵与解夹逼';
    tabs.appendChild(bP); tabs.appendChild(bM);
    var body = document.createElement('div'); body.className = 'lab-body';
    var left = document.createElement('div'); left.className = 'cl-left'; left.appendChild(tabs);
    var wA = mkMatrixInputs('A（3×3 非负）', [[1, 2, 0], [2, 1, 3], [0, 2, 1]], false, 3);
    var panM = document.createElement('div');
    var wM = mkMatrixInputs('A（3×3，单调）', [[1, -0.25, -0.25], [-0.25, 1, 0], [-0.25, 0, 1]], false, 3);
    var wb = mkMatrixInputs('b', [[0.6], [0.6], [0.66]], true, 3);
    var wxlo = mkMatrixInputs("x'（试探下界）", [[1.0], [0.8], [0.9]], true, 3);
    var wxhi = mkMatrixInputs('x″（试探上界）', [[2], [2], [2]], true, 3);
    [wM, wb, wxlo, wxhi].forEach(function (w) { panM.appendChild(w.wrap); });
    wM.wrap.style.display = 'none'; wb.wrap.style.display = 'none'; wxlo.wrap.style.display = 'none'; wxhi.wrap.style.display = 'none';
    left.appendChild(wA.wrap); left.appendChild(panM);
    var right = document.createElement('div'); right.className = 'cl-out';
    var r1 = mkOutRow('谱与 Perron 向量 =');
    var r2 = mkOutRow('不可约与单调性 =');
    var r3 = mkOutRow('元素扰动 =');
    [r1, r2, r3].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right); root.appendChild(body);

    function power(A) {
      var v = [1, 1, 1];
      for (var it = 0; it < 2000; it++) {
        var w = [0, 0, 0]; for (var i = 0; i < 3; i++) for (var k = 0; k < 3; k++) w[i] += A[i][k] * v[k];
        var nrm = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]);
        if (nrm < 1e-14) return { rho: 0, v: [0, 0, 0] };
        var nv = [w[0] / nrm, w[1] / nrm, w[2] / nrm];
        var d = 0; for (var d2 = 0; d2 < 3; d2++) d += Math.abs(nv[d2] - v[d2]);
        var diff = Math.abs(nv[0] - v[0]) + Math.abs(nv[1] - v[1]) + Math.abs(nv[2] - v[2]);
        v = nv;
        if (diff < 1e-11) { var ray = 0; for (var i2 = 0; i2 < 3; i2++) { var Av = 0; for (var k2 = 0; k2 < 3; k2++) Av += A[i2][k2] * v[k2]; ray += v[i2] * Av; } return { rho: ray, v: v }; }
      }
      var ray2 = 0; for (var i3 = 0; i3 < 3; i3++) { var Av2 = 0; for (var k3 = 0; k3 < 3; k3++) Av2 += A[i3][k3] * v[k3]; ray2 += v[i3] * Av2; }
      return { rho: ray2, v: v };
    }
    function inv3(B) {
      var det = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
      var scl = 0;
      for (var q0 = 0; q0 < 3; q0++) for (var q1 = 0; q1 < 3; q1++) scl = Math.max(scl, Math.abs(B[q0][q1]));
      if (Math.abs(det) < 1e-12 * Math.max(scl*scl*scl, 1e-30)) return null;   // 相对判据：绝对阈值会把 1e-4·Laplace 这类秩 3 矩阵误判为奇异
      var ad = [
        [B[1][1] * B[2][2] - B[1][2] * B[2][1], B[0][2] * B[2][1] - B[0][1] * B[2][2], B[0][1] * B[1][2] - B[0][2] * B[1][1]],
        [B[1][2] * B[2][0] - B[1][0] * B[2][2], B[0][0] * B[2][2] - B[0][2] * B[2][0], B[0][2] * B[1][0] - B[0][0] * B[1][2]],
        [B[1][0] * B[2][1] - B[1][1] * B[2][0], B[0][1] * B[2][0] - B[0][0] * B[2][1], B[0][0] * B[1][1] - B[0][1] * B[1][0]]
      ];
      return ad.map(function (r) { return r.map(function (x) { return x / det; }); });
    }
    function mv(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]]; }
    function drawP() {
      var A = wA.get();
      var nonneg = A.every(function (r) { return r.every(function (x) { return x >= -1e-9; }); });
      var pw = power(A);
      var ev = eig3(A), rhoMax = 0; ev.forEach(function (e) { rhoMax = Math.max(rhoMax, Math.sqrt(e.re * e.re + e.im * e.im)); });
      r1.v.innerHTML = '幂法 ρ(A)≈<b>' + fmt(pw.rho) + '</b>，Perron 向量（归一化）≈[' + pw.v.map(function (x) { return fmt(x < 0 && x > -1e-8 ? 0 : x); }).join('，') + ']ᵀ<br>完整谱模长：' + ev.map(function (e) { return fmt(Math.sqrt(e.re * e.re + e.im * e.im)); }).join('，') + '（ρ 是特征值：' + (Math.abs(pw.rho - rhoMax) < 1e-6 ? '✓' : '✗') + '）';
      // 不可约
      function bfs(start) { var seen = [0, 0, 0].map(function () { return false; }); seen[start] = true; var q = [start]; while (q.length) { var i = q.shift(); for (var j = 0; j < 3; j++) if (A[i][j] > 1e-12 && !seen[j]) { seen[j] = true; q.push(j); } } return seen; }
      var irred = bfs(0).every(Boolean) && bfs(1).every(Boolean) && bfs(2).every(Boolean);
      var pvPos = pw.v.every(function (x) { return x > 1e-6; });
      r2.v.textContent = (nonneg ? 'A≥O；' : '<b style="color:#9e3b46">A 含负元素，P-F 不适用</b>；') + (irred ? '不可约（Perron 向量应严格为正：' + (pvPos ? '✓' : '✗') + '）' : '可约（特征向量仅保证非负）');
      var A2 = A.map(function (r, i) { return r.map(function (x, j) { return x + (i === 0 && j === 1 ? 0.5 : 0); }); });
      var pw2 = power(A2);
      r3.v.textContent = '把 a₁₂ 增加 0.5：ρ ' + fmt(pw.rho) + ' → ' + fmt(pw2.rho) + (pw2.rho >= pw.rho - 1e-9 ? '（不减，定理 7.2(3)' + (irred ? '；不可约应严格增：' + (pw2.rho > pw.rho + 1e-9 ? '✓' : '✗（该元素可能不在有效路径）') : '') + '）' : '（异常）');
    }
    function drawM() {
      var A = wM.get(), b = wb.get(), xl = wxlo.get(), xh = wxhi.get();
      var Ai = inv3(A);
      if (!Ai) { r1.v.textContent = 'A 奇异'; r2.v.textContent = '—'; r3.v.textContent = '—'; return; }
      var nonnegInv = Ai.every(function (r) { return r.every(function (x) { return x >= -1e-9; }); });
      r1.v.innerHTML = 'A⁻¹=' + (nonnegInv ? '<b style="color:#2f7d5b">≥O（A 单调）</b>' : '<b style="color:#9e3b46">含负元素（不单调）</b>') + '，元素范围 [' + fmt(Math.min.apply(null, Ai.map(function (r) { return Math.min.apply(null, r); }))) + ', ' + fmt(Math.max.apply(null, Ai.map(function (r) { return Math.max.apply(null, r); }))) + ']';
      var xs = mv(Ai, b), blo = mv(A, xl), bhi = mv(A, xh);
      r2.v.textContent = '精确解 x̃=A⁻¹b=[' + xs.map(fmt).join('，') + ']ᵀ；Ax′=[' + blo.map(fmt).join('，') + ']ᵀ；Ax″=[' + bhi.map(fmt).join('，') + ']ᵀ';
      var lo = blo.every(function (x, i) { return x <= b[i] + 1e-8; }), hi = bhi.every(function (x, i) { return x >= b[i] - 1e-8; });
      var loOk = xs.every(function (x, i) { return xl[i] <= x + 1e-8; }), hiOk = xs.every(function (x, i) { return x <= xh[i] + 1e-8; });
      r3.v.innerHTML = '条件：Ax′≤b ' + (lo ? '✓' : '✗') + '，Ax″≥b ' + (hi ? '✓' : '✗') + '；夹逼结论 x′≤x̃ ' + (loOk ? '✓' : '✗') + '，x̃≤x″ ' + (hiOk ? '✓' : '✗') + (nonnegInv && lo && hi && loOk && hiOk ? '（定理 7.3.2 成立）' : '');
    }
    function setMode(m) {
      bP.style.fontWeight = m === 'P' ? '700' : ''; bM.style.fontWeight = m === 'M' ? '700' : '';
      wA.wrap.style.display = m === 'P' ? '' : 'none';
      [wM, wb, wxlo, wxhi].forEach(function (w) { w.wrap.style.display = m === 'M' ? '' : 'none'; });
      if (m === 'P') drawP(); else drawM();
    }
    bP.addEventListener('click', function () { setMode('P'); });
    bM.addEventListener('click', function () { setMode('M'); });
    wA.wrap.addEventListener('input', drawP);
    [wM, wb, wxlo, wxhi].forEach(function (w) { w.wrap.addEventListener('input', drawM); });
    setMode('P');
  }

  /* ============================================================
     ㉞ M 矩阵判定台 [data-m-lab]（3×3）
     同时点亮多条充要条件：Z-型、对角正、顺序主子式、逆非负、
     ρ(I−D⁻¹A)<1、特征值实部、半正性 ∃x>0:Ax>0、拟占优、S 矩阵
     ============================================================ */
  function initMLab(root) {
    var presets = [
      { name: '教材三阶例', A: [[1, -0.5, 0], [0, 1, -0.5], [0, 0, 1]] },
      { name: '1.74(非Z型)', A: [[1.74, -1, 1], [-3, 1.74, -1], [-2, 1, 1.74]] },
      { name: '差分 Laplace 型', A: [[2, -1, 0], [-1, 2, -1], [0, -1, 2]] },
      { name: '上三角(非Z型?)', A: [[1, -0.5, -0.5], [0, 1, -0.5], [0, 0, 1]] },
      { name: '单调但非 M', A: [[1, -0.5, 0.125], [0, 1, -0.5], [0, 0, 1]] }
    ];
    var pBar = document.createElement('div'); pBar.className = 'sf-buttons';
    var body = document.createElement('div'); body.className = 'lab-body';
    var left = document.createElement('div'); left.className = 'cl-left'; left.appendChild(pBar);
    var wA = mkMatrixInputs('A（3×3）', presets[0].A, false, 3);
    left.appendChild(wA.wrap);
    var right = document.createElement('div'); right.className = 'cl-out';
    var rZ = mkOutRow('Z-型与对角 =');
    var rMinors = mkOutRow('顺序主子式 =');
    var rInv = mkOutRow('逆非负检验 =');
    var rRho = mkOutRow('ρ(I−D⁻¹A) =');
    var rEig = mkOutRow('谱（实部）=');
    var rPos = mkOutRow('半正性 ∃x>0:Ax>0 =');
    var rVerdict = mkOutRow('综合判定 =');
    [rZ, rMinors, rInv, rRho, rEig, rPos, rVerdict].forEach(function (r) { right.appendChild(r.row); });
    body.appendChild(left); body.appendChild(right); root.appendChild(body);

    function inv3(B) {
      var det = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
      var scl = 0;
      for (var q0 = 0; q0 < 3; q0++) for (var q1 = 0; q1 < 3; q1++) scl = Math.max(scl, Math.abs(B[q0][q1]));
      if (Math.abs(det) < 1e-12 * Math.max(scl*scl*scl, 1e-30)) return null;   // 相对判据：绝对阈值会把 1e-4·Laplace 这类秩 3 矩阵误判为奇异
      var ad = [
        [B[1][1] * B[2][2] - B[1][2] * B[2][1], B[0][2] * B[2][1] - B[0][1] * B[2][2], B[0][1] * B[1][2] - B[0][2] * B[1][1]],
        [B[1][2] * B[2][0] - B[1][0] * B[2][2], B[0][0] * B[2][2] - B[0][2] * B[2][0], B[0][2] * B[1][0] - B[0][0] * B[1][2]],
        [B[1][0] * B[2][1] - B[1][1] * B[2][0], B[0][1] * B[2][0] - B[0][0] * B[2][1], B[0][0] * B[1][1] - B[0][1] * B[1][0]]
      ];
      return ad.map(function (r) { return r.map(function (x) { return x / det; }); });
    }
    function mv(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]]; }
    function draw() {
      var A = wA.get();
      var isZ = true, diagPos = true, symmetric = true;
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
        if (i !== j && A[i][j] > 1e-9) isZ = false;
        if (i !== j && Math.abs(A[i][j] - A[j][i]) > 1e-8) symmetric = false;
      }
      for (var d = 0; d < 3; d++) if (A[d][d] <= 1e-9) diagPos = false;
      rZ.v.innerHTML = (isZ ? 'Z-型 ✓（非对角元≤0）' : '<b style="color:#9e3b46">非 Z-型</b>（有正的非对角元，M 矩阵判据不适用）') + '；对角元 ' + (diagPos ? '全正 ✓' : '非全正 ✗') + (symmetric ? '；对称 ⇒ 若为 M 则是 <b>S 矩阵</b>' : '；不对称');
      var d1 = A[0][0];
      var d2 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      var Ai = inv3(A);
      var d3 = Ai ? (A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])) : NaN;
      var minorsOk = d1 > 1e-9 && d2 > 1e-9 && d3 > 1e-9;
      rMinors.v.textContent = 'Δ₁=' + fmt(d1) + '，Δ₂=' + fmt(d2) + '，Δ₃=detA=' + fmt(d3) + (minorsOk ? '（全正 ✓，判据③）' : '（非全正）');
      if (!Ai) { rInv.v.textContent = 'A 奇异'; rRho.v.textContent = '—'; rEig.v.textContent = '—'; rPos.v.textContent = '—'; rVerdict.v.innerHTML = '<b style="color:#9e3b46">非 M 矩阵（奇异）</b>'; return; }
      var negInv = Ai.every(function (r) { return r.every(function (x) { return x >= -1e-8; }); });
      var minInv = Math.min.apply(null, Ai.map(function (r) { return Math.min.apply(null, r); }));
      rInv.v.innerHTML = negInv ? '<b style="color:#2f7d5b">A⁻¹≥O ✓（定义 7.4.1 直接成立）</b>' : 'A⁻¹ 含负元素（最小值 ' + fmt(minInv) + '）✗';
      // ρ(I−D⁻¹A)
      var rhoB = NaN;
      if (diagPos) {
        var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var bi = 0; bi < 3; bi++) for (var bj = 0; bj < 3; bj++) B[bi][bj] = (bi === bj ? 1 : 0) - A[bi][bj] / A[bi][bi];
        var evB = eig3(B);
        rhoB = 0; evB.forEach(function (e) { rhoB = Math.max(rhoB, Math.sqrt(e.re * e.re + e.im * e.im)); });
        rRho.v.textContent = 'ρ=' + fmt(rhoB) + (rhoB < 1 ? ' < 1 ✓（判据①；Jacobi 型迭代收敛）' : ' ≥ 1 ✗');
      } else rRho.v.textContent = '对角元非正，无法构造';
      var ev = eig3(A);
      var reMin = 1e9; ev.forEach(function (e) { reMin = Math.min(reMin, e.re); });
      rEig.v.textContent = '特征值 = ' + ev.map(function (e) { return fmt(e.re) + (Math.abs(e.im) > 1e-6 ? '±' + fmt(Math.abs(e.im)) + 'i' : ''); }).join('，') + (reMin > 1e-8 ? '；实部全正 ✓（正稳定，J₂₉）' : '；有实部≤0 的特征值');
      // 半正性：网格搜 x>0 使 Ax>0
      var found = null;
      var grid = [0.2, 0.5, 0.8, 1, 1.5, 2, 3, 4];
      outer:
      for (var a = 0; a < grid.length; a++) for (var b = 0; b < grid.length; b++) for (var c = 0; c < grid.length; c++) {
        var x = [grid[a], grid[b], grid[c]], Ax = mv(A, x);
        if (Ax[0] > 1e-9 && Ax[1] > 1e-9 && Ax[2] > 1e-9) { found = x; break outer; }
      }
      rPos.v.innerHTML = found ? '存在 x=(' + found.map(fmt).join(',') + ')ᵀ&gt;0 使 Ax=(' + mv(A, found).map(fmt).join(',') + ')ᵀ&gt;0 ✓（K₃₃ 半正）' : '网格内未找到半正向量 ✗';
      var isM = isZ && diagPos && negInv;
      var reasons = [];
      if (isZ && diagPos && rhoB < 1) reasons.push('判据①');
      if (minorsOk) reasons.push('判据③');
      if (found) reasons.push('半正 K₃₃');
      if (negInv) reasons.push('F₁₅ 逆非负');
      rVerdict.v.innerHTML = isM
        ? '<b style="color:#2f7d5b">A 为 M 矩阵</b>（' + reasons.join('、') + ' 相互印证）' + (symmetric ? '，且为 <b>S（Stieltjes）矩阵</b>' : '')
        : '<b style="color:#9e3b46">A 不是 M 矩阵</b>' + (!isZ ? '（不是 Z-型；但可能单调——单调不要求非对角元非正）' : (!negInv ? '（Z-型但逆含负元素）' : ''));
    }
    presets.forEach(function (p) { var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'sf-btn'; b2.textContent = p.name; b2.addEventListener('click', function () { wA.set(p.A); draw(); }); pBar.appendChild(b2); });
    wA.wrap.addEventListener('input', draw);
    draw();
  }

  /* ============================================================
     ㉟ 循环矩阵 DFT 台 [data-circ-lab]
     输入 n 个系数，显示循环矩阵、f(λₖ)、行列式、迹校验、单位根图
     ============================================================ */
  function initCircLab(root) {
    var bar = document.createElement('div'); bar.className = 'sf-buttons';
    [['n=3', 3], ['n=4', 4], ['n=5', 5]].forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sf-btn'; b.textContent = p[0];
      b.addEventListener('click', function () { build(p[1]); }); bar.appendChild(b);
    });
    var holder = document.createElement('div');
    holder.className = 'lab-body';
    root.appendChild(bar); root.appendChild(holder);

    function build(n) {
      holder.innerHTML = '';
      var body = document.createElement('div'); body.className = 'lab-body';
      var left = document.createElement('div'); left.className = 'cl-left';
      var defs = { 3: [[1], [1], [0]], 4: [[1], [0], [1], [0]], 5: [[1], [1], [0], [0], [0]] };
      var w = document.createElement('div');
      w.className = 'cl-matrix';
      var nm = document.createElement('div'); nm.className = 'cl-name'; nm.textContent = '循环系数 c₀…cₙ₋₁'; w.appendChild(nm);
      var grid = document.createElement('div'); grid.className = 'cl-grid n1';
      var ins = [];
      for (var i = 0; i < n; i++) { var inp = document.createElement('input'); inp.type = 'text'; inp.value = String(defs[n][i][0]); inp.setAttribute('aria-label', '循环系数 c' + SUBSCRIPTS[i]); grid.appendChild(inp); ins.push(inp); }
      w.appendChild(grid); left.appendChild(w);
      var cv = document.createElement('canvas'); cv.width = cv.height = 300;
    cv.setAttribute('role','img'); cv.setAttribute('aria-label','单位圆上的单位根与特征值 f(λₖ)');
      cv.style.cssText = 'width:100%;max-width:310px;display:block;margin:8px auto 0'; left.appendChild(cv);
      var right = document.createElement('div'); right.className = 'cl-out';
      var rC = mkOutRow('循环矩阵 Cₙ =');
      var rEig = mkOutRow('特征值 f(λₖ) =');
      var rCheck = mkOutRow('校验 =');
      [rC, rEig, rCheck].forEach(function (r) { right.appendChild(r.row); });
      body.appendChild(left); body.appendChild(right); holder.appendChild(body);

      function fmtC(re, im) {
        if (Math.abs(im) < 1e-7) return fmt(re);
        return fmt(re) + (im >= 0 ? '+' : '−') + fmt(Math.abs(im)) + 'i';
      }
      function draw(ev) {
        var c = ins.map(function (i) { return num(i.value); });
        var C = [];
        for (var i = 0; i < n; i++) { var row = []; for (var j = 0; j < n; j++) row.push(c[(j - i + n) % n]); C.push(row); }
        var mxC = C.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>');
        rC.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.5">' + mxC + '</span>';
        var eig = [], tr = 0, det = 1;
        for (var k = 0; k < n; k++) {
          var re = 0, im = 0;
          for (var t = 0; t < n; t++) {
            var ang = 2 * Math.PI * k * t / n;
            re += c[t] * Math.cos(ang); im += c[t] * Math.sin(ang);
          }
          eig.push({ re: re, im: im }); tr += re; det *= (Math.abs(im) < 1e-9 ? re : null) || (re * re + im * im);
        }
        rEig.v.innerHTML = eig.map(function (e, k) {
          var lam = 'λ' + k + '=e^{2πi·' + k + '/' + n + '}';
          return 'k=' + k + '：<b>' + fmtC(e.re, e.im) + '</b>';
        }).join('；');
        var detV = 1; for (var k2 = 0; k2 < n; k2++) { var e2 = eig[k2]; detV *= (Math.abs(e2.im) < 1e-9 ? e2.re : e2.re * e2.re + e2.im * e2.im); }
        // 数值行列式
        var detNum = detN(C);
        var trEq = Math.abs(tr - n * c[0]) < 1e-6;
        rCheck.v.innerHTML = '迹：(1/n)Σf(λₖ)=' + fmt(tr / n) + ' vs c₀=' + fmt(c[0]) + (trEq ? ' ✓（式7.5.30）' : ' ✗') +
          '；det=∏f(λₖ)=' + fmt(detV) + '，直接计算 det Cₙ=' + fmt(detNum) +
          (Math.abs(detV - detNum) < 1e-5 ? ' ✓' : '');
        paint(eig);
      }
      function detN(M) {
        if (n === 3) return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
        var s = 0;
        function rec(col, used, prod) {
          if (col === n) { var inv = 0; for (var i = 0; i < used.length; i++) for (var j = i + 1; j < used.length; j++) if (used[i] > used[j]) inv++; s += (inv % 2 ? -1 : 1) * prod; return; }
          for (var row = 0; row < n; row++) if (used.indexOf(row) < 0) { used.push(row); rec(col + 1, used, prod * M[row][col]); used.pop(); }
        }
        rec(0, [], 1); return s;
      }
      function paint(eig) {
        var g = cv.getContext('2d'); g.clearRect(0, 0, 300, 300);
        g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, 300, 300);
        var O = 150, S = 95;
        function sx(x) { return O + x * S; } function sy(y) { return O - y * S; }
        g.strokeStyle = '#ddd6c8'; g.beginPath(); g.moveTo(8, O); g.lineTo(292, O); g.moveTo(O, 8); g.lineTo(O, 292); g.stroke();
        g.strokeStyle = '#888'; g.lineWidth = 1.2; g.beginPath(); g.arc(O, O, S, 0, 2 * Math.PI); g.stroke();
        for (var k = 0; k < n; k++) {
          var ang = 2 * Math.PI * k / n;
          var lx = Math.cos(ang), ly = Math.sin(ang);
          g.fillStyle = '#2b5f8b'; g.beginPath(); g.arc(sx(lx), sy(ly), 3.5, 0, 2 * Math.PI); g.fill();
          g.fillStyle = '#666'; g.font = '10px Microsoft YaHei'; g.fillText('λ' + k, sx(lx) + 5, sy(ly) - 5);
          var f = eig[k], mag = Math.sqrt(f.re * f.re + f.im * f.im);
          var rr = Math.min(mag, 2.6) / 2.6 * 26;
          g.strokeStyle = '#9e3b46'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(sx(lx), sy(ly)); g.lineTo(sx(lx) + (f.re / (mag || 1)) * rr * (f.re >= 0 ? 1 : 1), sy(ly) + (f.im / (mag || 1)) * rr); g.stroke();
          g.fillStyle = '#9e3b46'; g.beginPath();
          var fx = sx(lx); // 特征值画在自身坐标（曾有 ×0 恒零项，已清理）
          var ex = O + f.re / 2.6 * S, ey = O - f.im / 2.6 * S;
          g.arc(ex, ey, 4, 0, 2 * Math.PI); g.fill();
        }
        g.fillStyle = '#9e3b46'; g.font = '11px Microsoft YaHei'; g.fillText('红点=f(λₖ)（谱）', 12, 20);
        g.fillStyle = '#2b5f8b'; g.fillText('蓝点=单位根 λₖ', 12, 36);
      }
      ins.forEach(function (i) { i.addEventListener('input', draw); });
      draw();
    }
    build(4);
  }

  /* ============================================================
     ㊞ 三名矩阵展示台 [data-name-lab]
     Vandermonde 插值 / Hilbert 条件数 / Hadamard Sylvester
     ============================================================ */
  function initNameLab(root) {
    var tabs = document.createElement('div'); tabs.className = 'sf-buttons';
    var bV = document.createElement('button'); bV.type = 'button'; bV.className = 'sf-btn'; bV.textContent = 'Vandermonde 插值';
    var bH = document.createElement('button'); bH.type = 'button'; bH.className = 'sf-btn'; bH.textContent = 'Hilbert 病态';
    var bD = document.createElement('button'); bD.type = 'button'; bD.className = 'sf-btn'; bD.textContent = 'Hadamard 构造';
    tabs.appendChild(bV); tabs.appendChild(bH); tabs.appendChild(bD);
    var body = document.createElement('div'); body.className = 'lab-body';
    var left = document.createElement('div'); left.className = 'cl-left';
    var right = document.createElement('div'); right.className = 'cl-out';
    body.appendChild(left); body.appendChild(right); root.appendChild(tabs); root.appendChild(body);

    function clearL() { left.innerHTML = ''; right.innerHTML = ''; }
    function showV() {
      clearL();
      var wN = mkMatrixInputs('节点 α（列向量）', [[1], [2], [3], [4]], true, 4);
      var wF = mkMatrixInputs('函数值 f（列向量）', [[1], [4], [9], [16]], true, 4);
      left.appendChild(wN.wrap); left.appendChild(wF.wrap);
      var r1 = mkOutRow('Vandermonde Vᵀ ='), r2 = mkOutRow('det V ='), r3 = mkOutRow('插值系数 c ='), r4 = mkOutRow('检验 =');
      [r1, r2, r3, r4].forEach(function (r) { right.appendChild(r.row); });
      function draw() {
        var a = wN.get(), f = wF.get(), n = a.length;
        var VT = [];
        for (var pw = 0; pw < n; pw++) VT.push(a.map(function (x) { return Math.pow(x, pw); }));
        r1.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.82rem;line-height:1.5">' + VT.map(function (r) { return '[ ' + r.map(fmt).join('　') + ' ]'; }).join('<br>') + '</span>';
        // det 乘积
        var d = 1; for (var i = 0; i < n; i++) for (var j = 0; j < i; j++) d *= (a[i] - a[j]);
        r2.v.textContent = fmt(d) + (Math.abs(d) > 1e-9 ? '（≠0，插值唯一）' : '（节点有重复，V 奇异）');
        // 解 V^T c = f：牛顿差商
        var dd = f.slice();
        var coef = [dd[0]];
        for (var k = 1; k < n; k++) { var nd = []; for (var t = 0; t < n - k; t++) nd.push((dd[t + 1] - dd[t]) / (a[t + k] - a[t])); dd = nd; coef.push(dd[0]); }
        // Newton 形式 → 幂系数：从最高阶差商起，poly ← poly·(x−αₖₖ) + coef[kk]
        var poly = [coef[n - 1]];
        for (var kk = n - 2; kk >= 0; kk--) {
          var grown = new Array(poly.length + 1).fill(0);
          for (var t3 = 0; t3 < poly.length; t3++) { grown[t3 + 1] += poly[t3]; grown[t3] -= a[kk] * poly[t3]; }
          grown[0] += coef[kk];
          poly = grown;
        }
        r3.v.textContent = 'c = [' + poly.map(fmt).join('，') + ']ᵀ（Newton 差商递推，O(n²)）';
        var chk = a.map(function (x) { var s = 0; for (var p = 0; p < n; p++) s += poly[p] * Math.pow(x, p); return s; });
        r4.v.textContent = 'p(αᵢ) = [' + chk.map(fmt).join('，') + '] vs f=[' + f.map(fmt).join('，') + ']';
      }
      wN.wrap.addEventListener('input', draw); wF.wrap.addEventListener('input', draw); draw();
    }
    function hilb(n) { var H = []; for (var i = 0; i < n; i++) { var r = []; for (var j = 0; j < n; j++) r.push(1 / (i + j + 1)); H.push(r); } return H; }
    function showH() {
      clearL();
      var bar = document.createElement('div'); bar.className = 'sf-buttons';
      var disp = document.createElement('div');
      left.appendChild(bar); left.appendChild(disp);
      var r1 = mkOutRow('Hₙ ='), r2 = mkOutRow('det Hₙ ='), r3 = mkOutRow('Hₙ⁻¹ ='), r4 = mkOutRow('条件数 =');
      [r1, r2, r3, r4].forEach(function (r) { right.appendChild(r.row); });
      // 数值求逆（伴随法仅 n<=4，其余用高斯-约当）
      function invN(M) {
        var n = M.length, B = [];
        for (var i = 0; i < n; i++) { var r = M[i].slice(); for (var j = 0; j < n; j++) r.push(i === j ? 1 : 0); B.push(r); }
        for (var c = 0; c < n; c++) {
          var p = c; for (var i2 = c + 1; i2 < n; i2++) if (Math.abs(B[i2][c]) > Math.abs(B[p][c])) p = i2;
          var t = B[c]; B[c] = B[p]; B[p] = t;
          var pv = B[c][c]; for (var j2 = 0; j2 < 2 * n; j2++) B[c][j2] /= pv;
          for (var i3 = 0; i3 < n; i3++) if (i3 !== c) { var f = B[i3][c]; for (var j3 = 0; j3 < 2 * n; j3++) B[i3][j3] -= f * B[c][j3]; }
        }
        return B.map(function (r) { return r.slice(n); });
      }
      function show(n) {
        var H = hilb(n);
        disp.innerHTML = '<div style="margin:10px 0;color:#555">阶数 n = ' + n + '（点按钮切换）</div>';
        r1.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.8rem;line-height:1.45">' + H.map(function (r) { return '[ ' + r.map(function (x) { return fmt(x); }).join('　') + ' ]'; }).join('<br>') + '</span>';
        var inv = invN(H);
        var det = 1; for (var i = 0; i < n; i++) det *= H[i][i]; // 占位，下面用逆对角乘积反推不稳妥；用 LU 消元
        var M = H.map(function (r) { return r.slice(); }), dd = 1;
        for (var c = 0; c < n; c++) { for (var i2 = c; i2 < n; i2++) if (Math.abs(M[i2][c]) > 1e-14) { if (i2 !== c) { var tt = M[c]; M[c] = M[i2]; M[i2] = tt; } break; } dd *= M[c][c]; for (var j2 = c + 1; j2 < n; j2++) { var f = M[j2][c] / M[c][c]; for (var k = c; k < n; k++) M[j2][k] -= f * M[c][k]; } }
        r2.v.textContent = fmt(dd) + (dd < 1e-6 ? '（极小，趋于 0）' : '');
        var showInv = n <= 6;
        r3.v.innerHTML = showInv ? '<span style="font-family:Consolas,monospace;font-size:.78rem;line-height:1.4">' + inv.map(function (r) { return '[ ' + r.map(function (x) { var y = Math.abs(x) < 0.01 ? 0 : x; return (y >= 0 ? ' ' : '') + y.toFixed(1); }).join('　') + ' ]'; }).join('<br>') + '</span>' : '（n&gt;6 数值逆已不可靠，这正是病态的体现）';
        // 2-范数条件数：用 Rayleigh 幂法近似 λmax；λmin 由逆的 λmax
        function lamMaxSym(A) { var v = A.map(function (r, i) { return i === 0 ? 1 : 0.2; }); for (var it = 0; it < 2000; it++) { var w = []; for (var i3 = 0; i3 < n; i3++) { var s = 0; for (var k3 = 0; k3 < n; k3++) s += A[i3][k3] * v[k3]; w.push(s); } var nm = Math.sqrt(w.reduce(function (a, b) { return a + b * b; }, 0)); v = w.map(function (x) { return x / nm; }); if (it > 0) { var ray = 0; for (var i4 = 0; i4 < n; i4++) { var s4 = 0; for (var k4 = 0; k4 < n; k4++) s4 += A[i4][k4] * v[k4]; ray += v[i4] * s4; } if (it % 50 === 0 && Math.abs(ray - (lamMaxSym._l || 0)) < 1e-10) return ray; lamMaxSym._l = ray; } } return lamMaxSym._l; }
        var lmax = lamMaxSym(H), lminInv = lamMaxSym(inv);
        r4.v.innerHTML = 'cond₂(Hₙ)=λmax/λmin ≈ λmax(H)·λmax(H⁻¹) = <b>' + (lmax * lminInv).toExponential(3) + '</b>' +
          (n >= 8 ? '（约 10¹⁰ 量级，双精度损失约 ' + Math.ceil(Math.log10(lmax * lminInv)) + ' 位有效数字）' : '（随 n 指数增长，参见教材表 7.1）');
      }
      [3, 4, 5, 6, 8, 10].forEach(function (n) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sf-btn'; b.textContent = 'n=' + n; b.addEventListener('click', function () { show(n); }); bar.appendChild(b); });
      show(4);
    }
    function hada(H) {
      var n = H.length;
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var s = 0; for (var k = 0; k < n; k++) s += H[i][k] * H[j][k]; if (i === j && Math.abs(s - n) > 1e-9) return false; if (i !== j && Math.abs(s) > 1e-9) return false; }
      return true;
    }
    function showD() {
      clearL();
      var disp = document.createElement('div');
      left.appendChild(disp);
      var r1 = mkOutRow('H（Sylvester 构造）='), r2 = mkOutRow('HHᵀ 检验 ='), r3 = mkOutRow('det H ='), r4 = mkOutRow('阶数条件 =');
      [r1, r2, r3, r4].forEach(function (r) { right.appendChild(r.row); });
      function syl(k) {
        var H = [[1]];
        for (var s = 0; s < k; s++) { var m = H.length, N = []; for (var i = 0; i < 2 * m; i++) { var r = []; for (var j = 0; j < 2 * m; j++) { var bi = i < m ? H[i] : H[i - m]; var bj = j < m ? H[j % m] : (j >= m ? (function (jj) { var rr = []; for (var t = 0; t < m; t++) rr.push(H[jj - m][t] * (i < m ? 1 : 1)); return rr; })(j) : null); } } }
        // 直接 Kronecker 递归
        H = kron(H);
        return H;
        function kron(P) { var q = P.length, R = []; for (var ii = 0; ii < 2 * q; ii++) { var row = []; for (var jj = 0; jj < 2 * q; jj++) { var pi = ii % q, pj = jj % q, sgn = (ii >= q && jj >= q) ? -1 : 1; row.push(sgn * P[pi][pj]); } R.push(row); } return R; }
      }
      function show(k) {
        var H = syl(k), n = H.length;
        disp.innerHTML = '<div style="margin:10px 0;color:#555">2<sup>' + k + '</sup> 阶 Hadamard（k=' + k + '，n=' + n + '）</div>';
        r1.v.innerHTML = '<span style="font-family:Consolas,monospace;font-size:.85rem;line-height:1.5">' + H.map(function (r) { return '[ ' + r.map(function (x) { return x > 0 ? ' 1' : '−1'; }).join('　') + ' ]'; }).join('<br>') + '</span>';
        r2.v.textContent = hada(H) ? 'HHᵀ = ' + n + '·I ✓（行向量两两正交，长度 √' + n + '）' : '检验失败';
        var d = Math.pow(n, n / 2);
        r3.v.textContent = '|det H| = n^(n/2) = ' + (n >= 8 ? d.toExponential(2) : d) + '（达 Hadamard 行列式上界）';
        r4.v.textContent = 'n=' + n + (n > 2 ? ' 是 4 的倍数 ✓；非 4 倍数阶（n&gt;2）不存在' : '（n=1,2 为低阶特例）');
      }
      var bar = document.createElement('div'); bar.className = 'sf-buttons';
      [[1, 'H₁'], [2, 'H₄'], [3, 'H₈']].forEach(function (p) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sf-btn'; b.textContent = p[1]; b.addEventListener('click', function () { show(p[0]); }); bar.appendChild(b); });
      disp.appendChild(bar); show(2);
    }
    bV.addEventListener('click', function () { setMode('V'); }); bH.addEventListener('click', function () { setMode('H'); }); bD.addEventListener('click', function () { setMode('D'); });
    function setMode(m) { bV.style.fontWeight = m === 'V' ? '700' : ''; bH.style.fontWeight = m === 'H' ? '700' : ''; bD.style.fontWeight = m === 'D' ? '700' : ''; if (m === 'V') showV(); else if (m === 'H') showH(); else showD(); }
    setMode('V');
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-axiom-stepper]'), initAxiomStepper);
    Array.prototype.forEach.call(document.querySelectorAll('[data-coord-lab]'), initCoordLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-subspace-fig]'), initSubspaceFig);
    Array.prototype.forEach.call(document.querySelectorAll('[data-eigen-lab]'), initEigenLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-jordan-lab]'), initJordanLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-angle-lab]'), initAngleLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-gs-lab]'), initGsLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-lp-ball]'), initLpBall);
    Array.prototype.forEach.call(document.querySelectorAll('[data-norm-lab]'), initNormLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-matrix-norm-lab]'), initMatrixNormLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-power-lab]'), initPowerLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-sequence-lab]'), initSequenceLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-neumann-lab]'), initNeumannLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-mfunc-lab]'), initMfuncLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-gradient-lab]'), initGradientLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-ode-lab]'), initOdeLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-lu-lab]'), initLuLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-qr-lab]'), initQrLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-fullrank-lab]'), initFullrankLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-svd-lab]'), initSvdLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-gershgorin-lab]'), initGershgorinLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-geig-lab]'), initGeigLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-rayleigh-lab]'), initRayleighLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-kron-lab]'), initKronLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-proj-lab]'), initProjLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-penrose-lab]'), initPenroseLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-ginv-lab]'), initGinvLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-ls-lab]'), initLsLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-cw-lab]'), initCwLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-drazin-lab]'), initDrazinLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-pd-lab]'), initPdLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-dd-lab]'), initDdLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-perron-lab]'), initPerronLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-m-lab]'), initMLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-circ-lab]'), initCircLab);
    Array.prototype.forEach.call(document.querySelectorAll('[data-name-lab]'), initNameLab);
  });
})();
