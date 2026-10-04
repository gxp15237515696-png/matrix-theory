# 矩阵论精讲 · 离线教学网页

程云鹏、张凯院、徐仲《矩阵论》（第 3 版，西北工业大学出版社）逐小节配套课件。
纯 HTML + CSS + 原生 JavaScript，**零构建、零网络依赖**，公式用本地 KaTeX 排版。

## 如何使用

- 双击 `index.html` 进入课程主页；或直接双击 `chapters/ch1/1.1-linear-spaces.html` 打开课时。
- 完全离线：样式、脚本、KaTeX 字体全部在本文件夹内，断网可用，整个文件夹拷走/打包均可。
  页面通过 CSP 头（`connect-src 'none'` 等禁止型指令）**由浏览器强制**禁止一切外发连接。
- **对外分发前请删除 `textbook/`**（受版权保护的教材原件，仅供本人对照查阅；页面不会引用它）。
- 用浏览器「打印 → 另存为 PDF」可存档，打印时折叠的证明与解答会自动展开。
- 推荐用 Edge / Chrome 打开。

## 目录结构

```
matrix-theory/
├── index.html                 # 课程主页（章节目录由 common.js 自动生成）
├── _template.html             # 课时母版：新增小节时复制它
├── check-katex.js             # 公式与裸"<"离线校验脚本（无参数＝全量 chapters）
├── check-site.js              # 全站结构一致性校验（标签/链接/资源/目录/芯片计数/交叉引用/标题与导航/进度挂钩）
├── check-math.js              # 交互组件数值回归（无头 Edge 实测，期望值均由 sympy 独立复算）
├── vendor/katex/              # 本地 KaTeX（css/js/woff2 字体）
├── assets/
│   ├── css/base.css           # 设计令牌、三栏布局、响应式、打印
│   ├── css/components.css     # 定义/定理/证明/例题/注意/习题/实验 组件
│   ├── js/common.js           # 课程目录数据 COURSE_TOC、KaTeX 配置、侧栏等
│   └── js/interactives.js     # 36 个交互实验组件
├── tools/qa/                  # 质量工具（见下表）
├── chapters/chN/N.M-*.html    # 各小节课时
├── audit/                     # 审查台账、报告与截图
└── textbook/                  # 教材 PDF（素材，分发前删除）
```

## 质量工具（`tools\qa\`，均离线、仅需 Node ≥ 18 与本机 Edge）

| 工具 | 用途 |
|---|---|
| `site-sweep.js` | 全站控制台错误 / 未捕获异常 / 资源 404 + 逐页截图 |
| `mobile-sweep.js` | 375px 横向溢出巡检（折叠态 + 全部 details 展开态） |
| `print-check.js` | 打印媒体模拟 + printToPDF，检查打印态横向溢出 |
| `mutation-check.js` | **变异测试**：注入 26 类错误，检验各检查器是否真会失败（检查器自身崩溃不计"检出"） |
| `csp-verify.js` | 验证 CSP 确实阻断外发、且不误伤本地资源 |
| `lab-robustness.js` | 实验台输入鲁棒性：247 个输入灌恶劣值 + 112 次预设点击；默认态/预设态输出零 NaN·Infinity·undefined，且零异常 |
| `template-drift.js` | **结构门禁**：7 项不变量（可执行内联脚本为 0、head 资源、meta、title、h1、nav 可访问名、footer/src-note），漂移即失败 |
| `chip-census.js` | hero chips 计数三口径对照（自述 / 卡片 / 陈述） |
| `count-findings.js` | 统计 `tmp\review\` 逐节报告的 P0/P1/P2 行数（统一口径；该目录为历史审查产物，已随 tmp 清理） |
| `check-features.js` | 功能自检（主题切换、进度写入、首页进度条等 9 项） |
| `shot.js` / `stack-trace.js` | 调试用单页截图 / 调用栈打印 |

> 门禁 vs 报告：`check-katex` / `check-site` / `check-math` / `check-features` / `site-sweep` / `mobile-sweep`
> / `print-check` / `csp-verify` / `lab-robustness` / `template-drift` / `mutation-check` 会判定并以退出码表态；
> `chip-census` / `count-findings` / `shot` / `stack-trace` 只出报告，不作判定。

> 约定：hero chips 的条目数口径＝**该页陈述的该类条目数**（编号去重集合，含表格内声明与编号区间展开，不含正文括注引用），
> 唯一实现见 `tools\qa\lib\counts.js`，`check-site.js` 与维护脚本共用，禁止另写一套。

## 新增一个小节

1. 复制 `_template.html` 到 `chapters/chN/`，命名为 `N.M-英文短名.html`；
2. 替换标题、面包屑、`data-active="N.M"`、正文；
3. 打开 `assets/js/common.js`，在 `COURSE_TOC` 对应章的 `lessons` 里把该节 `ready` 改为 `true` 并核对文件名与标题；
4. 公式约定：行内 `\( … \)`、独立 `\[…\]`、编号 `\tag{1.2.3}`；
   **公式中的小于号必须写 `&lt;`**（如 `r&lt;n`），否则会被浏览器当成 HTML 标签截断；
5. **标题六处同源**（`check-site.js` 会逐项比对，改一处就要改全套）：
   | 位置 | 写法 |
   |---|---|
   | `<h1>` | `§N.M 节名` |
   | `<title>` | `§N.M 节名（选学可加「（选学）」） · 矩阵论` |
   | 顶栏 `<span class="tt">` | 与 `<title>` 去掉「 · 矩阵论」后相同 |
   | 面包屑末段 | 与 `.tt` 相同 |
   | `COURSE_TOC` 的 `title` | `节名`（选学节末尾加「（选学）」，口径与 `<title>` 一致） |
   | 页脚翻页 `ln-ttl` | 同章 `§N.M 节名`；**跨章** `第 N 章 §N.M 节名`，且 `ln-dir` 用「上一章/下一章」 |
   小结区保留 `id="sec-summary"`：「标记本节为已完成」按钮挂在这个 id 上，删掉就无法记进度。
6. 交稿前校验（**PowerShell 7**，在项目根目录逐条执行；不要用 `chapters/ch*/*.html` 这类通配符，PowerShell 不会展开）：
   ```powershell
   node check-katex.js                 # 全量公式与裸"<"（无参数即全量；也可只传单个文件）
   node check-site.js                  # 结构/链接/资源/芯片计数/交叉引用/标题与导航一致性
   node check-math.js                  # 交互组件数值回归（需本机 Edge）
   node tools\qa\check-features.js     # 功能自检（需本机 Edge）
   node tools\qa\template-drift.js     # 结构不变量（母版 / 首页 / 课时页）
   node tools\qa\site-sweep.js         # 全站控制台错误/资源加载扫描
   node tools\qa\mobile-sweep.js       # 375px 横向溢出
   node tools\qa\print-check.js        # 打印态
   node tools\qa\csp-verify.js         # CSP 阻断外发且不误伤本地资源
   node tools\qa\lab-robustness.js     # 实验台输入鲁棒性 + 默认/预设态输出无 NaN
   node tools\qa\mutation-check.js     # 变异测试：确认上面这些检查器本身有效（放最后，最慢）
   ```
   离线两项也可以直接 `npm test`（等价于 `node check-katex.js && node check-site.js`，不需要联网）。
   全部全绿（公式错误 0、check-site 通过、断言全通过、结构不变量成立、无页面异常、无溢出、
   默认/预设态输出无 NaN、变异全部被检出且无检查器崩溃）即可。
   新增小节时记得同步 `assets/js/common.js` 的 `COURSE_TOC`、页内 `data-*` 实验台属性与 hero chips 计数。

## 依赖说明

- 运行课件不需要 Node / npm；`vendor/katex` 已包含全部运行时文件。
- 仅当需要重新拉取 KaTeX 时：`npm install`（依赖记录在 package.json，默认走 npmmirror 镜像可自行指定 `--registry`）。
- `check-site.js` 解析 `COURSE_TOC` 用 Node 内置 `vm` 沙箱（不使用 `eval`，沙箱内无 `require`/`process` 等宿主能力）；站点页面本身不执行任何动态代码，也不含 `eval`/`new Function`/`document.write`。
