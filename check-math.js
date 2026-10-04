#!/usr/bin/env node
/* ============================================================
   check-math.js —— 交互组件「数值断言」回归测试
   用法:  node check-math.js            （全部用例）
          node check-math.js <关键词>   （只跑名称含关键词的用例）
   原理:  用 Edge headless (CDP) 打开真实课时页 → 点击组件预设 →
          读取组件输出文本 → 断言其中包含预期数值子串。
   说明:  期望值均来自教材例题或 sympy 精确算术独立复算（先算再看组件输出；
           不一致时按 sympy 结果修组件，不把组件的错误输出抄成期望）。
          每条用例的 note 字段即完整推导过程（含 sympy 精确值与取整规则），可据此复核；
           当初用于批量复算的脚本放在任务临时区，已随 tmp 清理而丢失，现以 note 内的逐步算式为准
          （如需重建成体系的复算脚本，见 output 报告"剩余风险"）。
          结束时自动关闭无头 Edge 并清理临时 profile。
   ============================================================ */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = __dirname;

/* ---------- 用例表 ----------
   page   : 课时页相对路径
   lab    : 组件属性（data-xxx）
   preset : 预设按钮下标（-1 表示不改预设，用默认值）
   sel    : 读取输出的选择器（默认 '.cl-out'；卡片类输出用 '.lab-body'）
   expect : 输出中必须出现的子串（可多条）
   note   : 期望值来源（均为 sympy 精确算术独立复算，逐步算式写在 note 内，可据此复核）
------------------------------- */
const CASES = [
  { name: '1.1 坐标与基', page: 'chapters/ch1/1.1-linear-spaces.html', lab: 'coord-lab', preset: -1, expect: ['det C = 1', '往返成立'], note: '默认预设：过渡矩阵 det=1、坐标往返一致' },

  /* ---- 以下 17 条为 2026-09-28 强化的弱断言用例：期望值全部由 sympy 精确算术独立复算 ---- */

  { name: '1.2 Jordan 标准形', page: 'chapters/ch1/1.2-linear-transformations.html', lab: 'jordan-lab', preset: -1,
    expect: ['Jordan 块数 = 1（= 几何重数，即特征子空间维数）', '各块阶数 = 3',
      'm(λ) = (λ − 2)^3（指数取最大块阶数）', 'φ(λ) = (λ − 2)^3（代数重数恒为 3）', '只有 1 个块：几何重数 1，亏损矩阵，不能对角化。'],
    note: 'm=3、分拆 [3]（单个 3 阶块 ⇒ 块数 1 = 几何重数 1）、λ=2：最小多项式指数取最大块阶数 3，特征多项式 (λ−2)^3 = λ³−6λ²+12λ−8（sympy expand 核对）' },
  { name: '1.3 内积与夹角', page: 'chapters/ch1/1.3-special-spaces.html', lab: 'angle-lab', preset: -1,
    expect: ['内积 (x, y) = 0', '|x| = 3', '|y| = 2.236', 'cos⟨x,y⟩ = 0', '夹角 = 90.0°（1.571 弧度）',
      'x 在 y 上的投影 = (0, 0, 0)ᵀ', '正交：(x, y) = 0，即 x ⟂ y'],
    note: 'x=(1,2,2)、y=(−2,1,0)：(x,y)=−2+2+0=0；|x|=√9=3；|y|=√5=2.236067977→2.236；cos=0 ⇒ θ=π/2=90.0°=1.571 rad；系数 t=(x,y)/(y,y)=0/5=0 ⇒ 投影=0（sympy 精确）' },
  { name: '2.1 范数等价性', page: 'chapters/ch2/2.1-vector-norms.html', lab: 'norm-lab', preset: -1,
    expect: ['‖x‖₁ = 7', '‖x‖₂ = 5', '‖x‖∞ = 4', 'p = 2 时为 5', '4 ≤ 5 ≤ 6.928  ✓'],
    note: 'x=(3,−4,0)：‖x‖₁=3+4=7，‖x‖₂=√(9+16)=5，‖x‖∞=4，p=2 时 ‖x‖_p=5；等价性界 n^{1/p}‖x‖∞=3^{1/2}·4=4√3=6.928203230→6.928，链式不等式成立（sympy）' },
  { name: '2.2 矩阵范数', page: 'chapters/ch2/2.2-matrix-norms.html', lab: 'matrix-norm-lab', preset: -1,
    expect: ['所有元素绝对值和） 12', 'n·max|aᵢⱼ| 9', 'Frobenius ‖A‖_F 4.69',
      '列和范数 ‖A‖₁（最大列和） 5', '行和范数 ‖A‖∞（最大行和） 6', '√λₘₐₓ(AᵀA) 4.097', '16.787', '谱半径 ρ(A)（参考） 2.433'],
    note: 'A=[[1,−2,3],[0,2,1],[−1,1,−1]]：m₁=12；m∞=3·max|aᵢⱼ|=3·3=9；‖A‖_F=√22=4.690415760→4.69；列和 (2,5,5)⇒5，行和 (6,3,3)⇒6；AᵀA=[[2,−3,4],[−3,9,−5],[4,−5,11]]，特征多项式 λ³−22λ²+89λ−25，根 0.303328957/4.909681449/16.786989594 ⇒ ‖A‖₂=√16.786989594=4.097192892→4.097；A 的特征值 2.433427664 与 −0.216713832±1.416950946i ⇒ ρ=2.433427664→2.433（sympy nroots）' },
  { name: '3.2 Neumann 级数', page: 'chapters/ch3/3.2-matrix-series.html', lab: 'neumann-lab', preset: -1, sel: '.lab-body',
    expect: ['特征值 = 0.2, 0.1', '谱半径 ρ(A) = 0.2', '收敛于 (I−A)⁻¹',
      'N=1 1.2 0.3 0 1.1', 'N=2 1.24 0.39 0 1.11', 'N=3 1.248 0.411 0 1.111',
      'N=5 1.25 0.416 0 1.111', 'N=20 1.25 0.417 0 1.111', '最大元素误差 ≈ 0'],
    note: 'A=[[0.2,0.3],[0,0.1]]：Δ=0.09−0.08=0.01⇒特征值 0.2,0.1，ρ=0.2<1 收敛于 (I−A)⁻¹=[[5/4,5/12],[0,10/9]]；部分和 S_N=I+A+…+A^N 逐项由 sympy 精确求和（S1=[[6/5,3/10],[0,11/10]]、S2=[[31/25,39/100],[0,111/100]]、S3=[[156/125,411/1000],[0,1111/1000]]、S5、S20），S20 与精确解最大元素误差 7.86e−15→0' },
  { name: '3.3 矩阵函数', page: 'chapters/ch3/3.3-matrix-functions.html', lab: 'mfunc-lab', preset: -1,
    expect: ['A = [ 2 1 ; 0 2 ]', 'eᴬ = [ 7.389 7.389 ; 0 7.389 ]', 'eᵗᴬ = [ 7.389 7.389 ; 0 7.389 ]',
      'sin A = [ 0.909 -0.416 ; 0 0.909 ]', 'cos A = [ -0.416 -0.909 ; 0 -0.416 ]'],
    note: 'λ=2、n=1、t=1：A=2I+N（N=[[0,1],[0,0]]，N²=0）⇒ f(A)=f(2)I+f′(2)N：e^A=[[e²,e²],[0,e²]]=7.389056099→7.389；e^tA（t=1）同 e^A；sin A=[[sin2,cos2],[0,sin2]]=0.909297427/−0.416146837；cos A=[[cos2,−sin2],[0,cos2]]（sympy Matrix.exp + 手算）' },
  { name: '4.1 LU/Cholesky', page: 'chapters/ch4/4.1-lu-decomposition.html', lab: 'lu-lab', preset: -1,
    expect: ['Δ₁=2，Δ₂=5，Δ₃=det A=0', 'L（单位下三角）= [ 1 0 0 ] [ 0.5 1 0 ] [ 1 2 1 ]',
      'U（上三角）= [ 2 -1 3 ] [ 0 2.5 -0.5 ] [ 0 0 0 ]', 'D=diag(2, 2.5, 0)',
      '单位上三角 U₀=[ 1 -0.5 1.5 ] [ 0 1 -0.2 ] [ 0 0 1 ]', '不对称，不适用 Cholesky',
      '验证 LU = [ 2 -1 3 ] [ 1 2 1 ] [ 2 4 2 ]  ✓ 与 A 一致'],
    note: 'A=[[2,−1,3],[1,2,1],[2,4,2]]：Δ₁=2；Δ₂=2·2−(−1)(1)=5；Δ₃=det A=2(4−4)+1(2−2)+3(4−4)=0（sympy det）。Doolittle：L=[[1,0,0],[1/2,1,0],[1,2,1]]、U=[[2,−1,3],[0,5/2,−1/2],[0,0,0]]，L·U 逐元素核对 = A；U 对角 D=diag(2,5/2,0)，U₀=D⁻¹U=[[1,−1/2,3/2],[0,1,−1/5],[0,0,1]]；A[0][1]=−1≠A[1][0]=1 非对称故不适用 Cholesky' },
  { name: '4.2 QR 分解', page: 'chapters/ch4/4.2-qr-decomposition.html', lab: 'qr-lab', preset: -1,
    expect: ['Q（正交列）= [ 0.408 0.577 0.707 ] [ 0.816 -0.577 0 ] [ 0.408 0.577 -0.707 ]',
      'R（上三角）= [ 2.449 2.449 2.858 ] [ 0 1.732 0.577 ] [ 0 0 0.707 ]',
      '验证 QR = [ 1 2 2 ] [ 2 1 2 ] [ 1 2 1 ]  ✓ 与 A 一致',
      'QᵀQ = [ 1 0 0 ] [ 0 1 0 ] [ 0 0 1 ]'],
    note: 'A=[[1,2,2],[2,1,2],[1,2,1]]：Schmidt 得 b0=(1,2,1)、‖b0‖=√6；系数 c00=(a1·b0)/6=1 ⇒ R01=a1·q0=√6，b1=(1,−1,1)、‖b1‖=√3；R02=a2·q0=7√6/6，R12=a2·q1=√3/3，b2=(1/2,0,−1/2)、‖b2‖=1/√2 ⇒ R=[[√6,√6,7√6/6],[0,√3,√3/3],[0,0,√2/2]]（与 sympy QRdecomposition 逐元素相同），QᵀQ=I、QR=A 精确成立' },
  { name: '4.3 满秩分解', page: 'chapters/ch4/4.3-full-rank-decomposition.html', lab: 'fullrank-lab', preset: -1,
    expect: ['秩 rank A = 2', 'Hermite 标准形 B = [ 1 0 2 1 ] [ 0 1 0.5 -0.5 ] [ 0 0 0 0 ]',
      'F（A 的主元列）= [ 1 2 ] [ 0 2 ] [ 1 0 ]', 'G（B 的非零行）= [ 1 0 2 1 ] [ 0 1 0.5 -0.5 ]',
      '验证 FG = [ 1 2 3 0 ] [ 0 2 1 -1 ] [ 1 0 2 1 ]  ✓ 与 A 一致'],
    note: 'A=[[1,2,3,0],[0,2,1,−1],[1,0,2,1]]：sympy rref ⇒ rank 2、主元列 (0,1)，B=[[1,0,2,1],[0,1,1/2,−1/2],[0,0,0,0]]；F=A 的主元列=[[1,2],[0,2],[1,0]]，G=B 前 2 行=[[1,0,2,1],[0,1,1/2,−1/2]]；F·G 逐元素核对 = A' },
  { name: '4.4 SVD', page: 'chapters/ch4/4.4-svd.html', lab: 'svd-lab', preset: -1,
    expect: ['AᵀA 的特征值 = 2.618，0.382', 'σ₁=1.618，σ₂=0.618',
      'V = [ 0.526 -0.851 ] [ 0.851 0.526 ]', 'U = [ 0.851 -0.526 ] [ 0.526 0.851 ]',
      '验证 UΣVᵀ = [ 1 1 ] [ 0 1 ]  ✓ 与 A 一致', '非奇异时 ‖A⁻¹‖₂ = 1/σ₂ = 1.618'],
    note: 'A=[[1,1],[0,1]]：AᵀA=[[1,1],[1,2]] 特征值 (3±√5)/2=2.618033989/0.381966011 ⇒ σ=((1+√5)/2, (√5−1)/2)=1.618033989/0.618033989；v1=(1,φ)/√(1+φ²)=(0.525731112,0.850650808)，v2=(−0.850650808,0.525731112)；u1=Av1/σ1=(0.850650808,0.525731112)，u2=Av2/σ2=(−0.525731112,0.850650808)；UΣVᵀ=A、1/σ2=φ=1.618033989（sympy 精确核对）' },
  { name: '5.1 Gerschgorin 圆盘', page: 'chapters/ch5/5.1-eigenvalue-estimation.html', lab: 'gershgorin-lab', preset: -1,
    expect: ['G1：|z−(1)| ≤ 0.3', 'G2：|z−(3)| ≤ 0.6', 'G3：|z−(-1)| ≤ 1.3',
      'λ1=-1.099，λ2=1.061，λ3=3.038', '全部 3 个特征值均在盖尔圆并集内 ✓'],
    note: 'A=[[1,0.1,0.2],[0.5,3,0.1],[1,0.3,−1]]：R₁=0.1+0.2=0.3，R₂=0.5+0.1=0.6，R₃=1+0.3=1.3；特征多项式 λ³−3λ²−(32/25)λ+177/50，数值根 −1.098545998/1.060800177/3.037745821（sympy nroots，升序）；三根分别落在 G3/G1/G2 内 ⇒ 并集包含全部特征值；|−1|>1.3 不成立故非严格对角占优（det A=−3.54≠0）' },
  { name: '5.2 广义特征值', page: 'chapters/ch5/5.2-generalized-eigenproblem.html', lab: 'geig-lab', preset: -1,
    expect: ['Cholesky B=GGᵀ，G = [ 2.236 0 ] [ 0.894 0.447 ]',
      '对称化 S=G⁻¹AG⁻ᵀ = [ 0.2 -1.4 ] [ -1.4 14.8 ]（对称 ✓）', 'λ₁=14.933，λ₂=0.067',
      'x₁=(-0.933, 2.226)ᵀ，x₂=(-0.361, -0.212)ᵀ', 'x₁ᵀBx₁=1，x₂ᵀBx₂=1，x₁ᵀBx₂=0'],
    note: 'A=[[1,−1],[−1,2]]、B=[[5,2],[2,1]]（det B=1）：G=[[√5,0],[2/√5,√5/5]]=2.236067977/0.894427191/0.447213595；S=G⁻¹AG⁻ᵀ=[[1/5,−7/5],[−7/5,74/5]]=0.2/−1.4/14.8；det(A−λB)=λ²−15λ+1 ⇒ λ=(15±√221)/2=14.933034374/0.066965626；取 y₁=[b,λ₁−a] 归一化后 xᵢ=(G⁻¹)ᵀyᵢ ⇒ x₁=(−0.932670,2.225700)、x₂=(−0.360566,−0.211511)，并验证 A xᵢ=λᵢ B xᵢ、xᵢᵀBxⱼ=δᵢⱼ（sympy 精确）' },
  { name: '5.3 Rayleigh 商', page: 'chapters/ch5/5.3-rayleigh-extremum.html', lab: 'rayleigh-lab', preset: -1,
    expect: ['λ₁=1，λ₂=3', '[1, 3]（定理 5.16）', 'θ₁=135°（R=λ₁ 最小），θ₂=45°（R=λ₂ 最大）'],
    note: 'A=[[2,1],[1,2]]：特征值 1,3（升序）；λ₁ 特征方向 (1,−1)/√2 ⇒ θ=−45°≡135°(mod 180)，λ₂ 方向 (1,1)/√2 ⇒ θ=45°；R(θ)=xᵀAx=2+sin2θ，θ=135° 时 R=1=λ₁、θ=45° 时 R=3=λ₂（sympy 符号）' },
  { name: '5.4 Kronecker 积', page: 'chapters/ch5/5.4-kronecker-product.html', lab: 'kron-lab', preset: -1,
    expect: ['A⊗B = [ 0 1 0 2 ] [ 1 0 2 0 ] [ 0 3 0 4 ] [ 3 0 4 0 ]',
      'A: -0.372, 5.372；B: -1, 1；A⊗B: -0.372, -5.372, 0.372, 5.372',
      '4（=(detA)²(detB)²，推论2）', '0（=(trA)(trB)，推论3）', '4（=(rankA)(rankB)，性质9）'],
    note: 'A=[[1,2],[3,4]]、B=[[0,1],[1,0]]：sympy kronecker_product ⇒ A⊗B=[[0,1,0,2],[1,0,2,0],[0,3,0,4],[3,0,4,0]]；A 特征值 (5±√33)/2=−0.372281323/5.372281323，B 特征值 −1,1，乘积集合 {±0.372281323, ±5.372281323} 按字符串排序为 −0.372/−5.372/0.372/5.372（推论1）；det(A⊗B)=(detA)²(detB)²=(−2)²(−1)²=4；tr(A⊗B)=trA·trB=5·0=0；rank=rankA·rankB=2·2=4' },
  { name: '6.4 最小二乘工作台', page: 'chapters/ch6/6.4-linear-systems.html', lab: 'ls-lab', preset: -1,
    expect: ['rank A = 2；相容（b∈R(A)，残差为 0）', 'x* = A⁺b = [ 2 1 ]ᵀ（极小范数解（定理6.30））',
      'Ax* = P_R(A)b = [ 3 1 ]ᵀ = b', '残差 r = [ 0 0 ]ᵀ', '满秩：解唯一，无自由度'],
    note: 'A=[[1,1],[0,1]]、b=(3,1)ᵀ：det A=1⇒rank 2，A⁺=A⁻¹=[[1,−1],[0,1]]，x*=A⁺b=(2,1)ᵀ；Ax*=(3,1)ᵀ=b ⇒ 残差 r=(0,0)ᵀ、相容、满秩解唯一（sympy 逐项核对）' },
  { name: '6.5 约束/加权台', page: 'chapters/ch6/6.5-constrained-weighted-inverse.html', lab: 'cw-lab', preset: -1,
    expect: ['rank A=1，rank(AP_S)=1', 'S 方向 u=[ 0.707 0.707 ]ᵀ', '约束解 x = [ 0.5 0.5 ]ᵀ',
      'xᵀu⊥ 校验 0）', '残差 Ax−b = [ -1 1 ]ᵀ，‖残差‖=1.414'],
    note: 'A=[[1,1],[1,1]]（rank 1）、b=(2,0)ᵀ、θ=45°：u=(√2/2,√2/2)=0.707106781；P_S=[[1/2,1/2],[1/2,1/2]]，AP_S=[[1,1],[1,1]]（rank 1），X=P_S(AP_S)⁺=[[1/4,1/4],[1/4,1/4]]（(AP_S)⁺=(AP_S)ᵀ/4），x=Xb=(1/2,1/2)ᵀ；残差 Ax−b=(−1,1)ᵀ，‖·‖=√2=1.414213562→1.414；x∈S 校验 |x₁u₂−x₂u₁|=0；参数化 ‖A(tu)−b‖²=8t²−8√2t+4 驻点 t=1/√2 一致（sympy）' },
  { name: '6.6 Drazin 逆计算器', page: 'chapters/ch6/6.6-drazin-inverse.html', lab: 'drazin-lab', preset: -1,
    expect: ['rank A, A², A³, A⁴ = 3, 3（首次相等给出 k=1）', '1（存在群逆 A#）',
      'A^(d) = [ 0.333 -0.667 0.667 ] [ 0.333 0.333 -0.333 ] [ -0.333 0.667 0.333 ]',
      '‖A^{k+1}X−A^k‖ = 0（方程 i^k：A^{k+1}X=A^k）', '‖XAX−X‖ = 0（ii）；‖AX−XA‖ = 0（iii 交换性）',
      'A 非对称：定理 6.44 仍成立', '群逆存在；‖AA⁺−A⁺A‖=0（=0 ⇒ A#=A⁺，定理6.50）'],
    note: 'A=[[1,2,0],[0,1,1],[1,0,1]]：det A=3⇒非奇异，rank A=rank A²=rank A³=3⇒指标 k=1；A^(d)=A(A^{2k+1})⁻¹A=A(A³)⁻¹A=A⁻¹=(1/3)[[1,−2,2],[1,1,−1],[−1,2,1]]；‖A²X−A‖_F=‖XAX−X‖_F=‖AX−XA‖_F=0（sympy 精确为 0）；A 非对称故走定理 6.44 说明分支；k=1 时 A#=A⁺' },

  /* ---- 覆盖度补齐：原用例表未覆盖的高风险组件（特征值/级数/矩阵函数/ODE/梯度类） ---- */

  { name: '1.2 特征值实验室（新增覆盖）', page: 'chapters/ch1/1.2-linear-transformations.html', lab: 'eigen-lab', preset: -1,
    expect: ['tr A = 4', 'det A = 3', 'λ² − 4λ + 3', '判别式 Δ = 4 > 0', 'λ₁ = 3，λ₂ = 1（互异）',
      'v₁: (-1, -1)ᵀ（可乘任意非零倍数）', 'v₂: (-1, 1)ᵀ（可乘任意非零倍数）', 'A 可对角化（定理1.26）'],
    note: 'A=[[2,1],[1,2]]：tr=4，det=2·2−1·1=3，φ(λ)=λ²−4λ+3，Δ=16−12=4>0 ⇒ λ₁=3、λ₂=1；(A−3I)=[[−1,1],[1,−1]] 零空间=span{(1,1)}、(A−I)=[[1,1],[1,1]] 零空间=span{(−1,1)}，几何重数各 1 ⇒ 互异特征值可对角化（sympy nullspace）' },
  { name: '2.3 幂收敛/谱半径（新增覆盖）', page: 'chapters/ch2/2.3-norm-applications.html', lab: 'power-lab', preset: -1,
    expect: ['谱半径 ρ(A) = 0.5（特征值 0.5, 0.5）', '‖A‖₁=0.7，‖A‖₂=0.61，‖A‖∞=0.7',
      'k=2: 0.25；k=5: 0.031；k=10: 0.001；k=30: 0', 'ρ(A) < 1 ⇒ Aᵏ → O（收敛矩阵，迭代法收敛）'],
    note: 'A=[[0.5,0.2],[0,0.5]]：tr=1、det=0.25 ⇒ Δ=1−1=0，特征值 0.5(重根)，ρ=0.5；‖A‖₁=max(0.5,0.7)=0.7，‖A‖∞=max(0.7,0.5)=0.7；AᵀA=[[1/4,1/10],[1/10,29/100]] 特征值 0.168019610/0.371980390 ⇒ ‖A‖₂=√0.371980390=0.609901951→0.61；ρᵏ=2^{−k}：1/4、1/32、1/1024、1/2^30（sympy）' },
  { name: '3.1 幂序列查看器（新增覆盖）', page: 'chapters/ch3/3.1-matrix-sequences.html', lab: 'sequence-lab', preset: -1, sel: '.lab-body',
    expect: ['特征值 = 0.675, 0.025', '谱半径 ρ(A) = 0.675', 'Aᵏ → O（收敛矩阵）',
      'k=1 0.5 0.333 0.25 0.2', 'k=2 0.333 0.233 0.175 0.123', 'k=3 0.225 0.158 0.118 0.083',
      'k=5 0.103 0.072 0.054 0.038', 'k=10 0.014 0.01 0.008 0.005', 'k=20 0 0 0 0'],
    note: 'A=[[1/2,1/3],[1/4,1/5]]：tr=7/10、det=1/2·1/5−1/3·1/4=1/60，Δ=49/100−1/15=127/300 ⇒ λ=(7±√(127/300))/2 对应 0.675320355/0.024679645，ρ=0.675320355<1 ⇒ Aᵏ→O；A^k 由 sympy 精确幂逐项复算：k=1 [[1/2,1/3],[1/4,1/5]]、k=2 [[1/3,7/30],[7/40,37/300]]、k=3 [[9/40,71/450],[71/600,83/1000]]、k=5、k=10，k=20 元素 <1e−4 显示 0' },
  { name: '3.4 二次型梯度（新增覆盖）', page: 'chapters/ch3/3.4-differentiation-integration.html', lab: 'gradient-lab', preset: -1,
    expect: ['对称化后 A*=[2, 1 ; 1, 3]', '∂f/∂x₁ = 2(2 x₁ + 1 x₂) − (1)', '∂f/∂x₂ = 2(1 x₁ + 3 x₂) − (-2)',
      'df/dx = (A + Aᵀ)x − b（一般公式）', '2Ax − b（本题 A 对称）= [4 x₁+2x₂−1 ; 2x₁+6x₂−-2]'],
    note: 'A=[[2,1],[1,3]]（对称）、b=(1,−2)ᵀ：f=xᵀAx−bᵀx=2x₁²+2x₁x₂+3x₂²−x₁+2x₂（sympy expand），∂f/∂x₁=4x₁+2x₂−1=2(2x₁+1x₂)−1，∂f/∂x₂=2x₁+6x₂+2=2(1x₁+3x₂)−(−2)；2Ax−b 系数 [4,2,−1] 与 [2,6,2]，与 2A−b 一致' },
  { name: '3.5 线性 ODE 求解器（新增覆盖）', page: 'chapters/ch3/3.5-matrix-function-applications.html', lab: 'ode-lab', preset: -1,
    expect: ['e^{tA} = [ 2.718 1.359 ; 0 2.718 ]', 'x(t)=e^{tA}c = (2.718, 0)ᵀ',
      '检验 x′=Ax = (5.437, 0)ᵀ', '特征值 2, 2；长期发散'],
    note: 'A=[[2,1],[0,2]]=2I+N（N=[[0,1],[0,0]]，N²=0），c=(1,0)ᵀ，t=0.5：e^{tA}=e^{2t}(I+tN)=[[e,e/2],[0,e]]=2.718281828/1.359140914；x=e^{tA}c=(e,0)=(2.718281828,0)；Ax=(2e,0)=(5.436563657,0)⇒0.437 与 0.718 一致（x′=Ax）；特征值 2(重根)，max|λ|=2>1 ⇒ 长期发散（sympy Matrix.exp 精确核对）' },

  /* ---- 边界回归：判别式必须用相对判据（变异测试 M11 依赖本用例） ---- */
  { name: '7.3 小量级共轭复根（相对判据回归）', page: 'chapters/ch7/7.3-nonnegative-matrices.html', lab: 'perron-lab', preset: -1,
    fill: ['0.01', '0.01', '0', '0', '0.01', '0.01', '-0.01', '-0.01', '-0.01'],
    expect: ['完整谱模长：0.008，0.012，0.012'],
    note: 'A=0.01·[[1,1,0],[0,1,1],[-1,-1,-1]]：sympy 特征值 −0.007549、0.008774±0.007449j ⇒ 模长 0.007549/0.01151/0.01151 ⇒ 显示 0.008/0.012/0.012。' +
      '判别式 disc=(q/2)²+(p/3)³=2.13e−13：绝对阈值 1e−12 会误走「三实根」分支（结果全错），' +
      '相对判据 1e−12·max(|(p/3)³|,|(q/2)²|)=2.14e−25 才能正确判为「一实根+共轭复对」（audit\\ledger.md 2026-09-28）' },

  /* ---- 原有强断言用例（未改动） ---- */

  { name: '2.1 p-范数单位球', page: 'chapters/ch2/2.1-vector-norms.html', lab: 'lp-ball', preset: -1, expect: ['单位圆盘', '||(3,4)||₂ = √(9+16) = 5'], note: '默认 p=2：单位圆盘与欧氏范数例' },
  { name: '6.1 投影矩阵（例6.1 斜投影）', page: 'chapters/ch6/6.1-projection-matrices.html', lab: 'proj-lab', preset: 0, expect: ['P_{L,M} = [ 1 1 ] [ 0 0 ]', 'Px = [ 3 0 ]；x−Px = [ -1 1 ]', '‖P²−P‖∞ = 0（幂等 ✓ 定理6.1）', '‖P−Pᵀ‖ = 1', 'Px×u = 0（Px∈L）', '(x−Px)×v = 0（残差∈M）'], note: '教材例 6.1：u=(1,0)ᵀ、v=(1,−1)ᵀ、x=(2,1)ᵀ；(X,O)=[[1,1],[0,−1]]，(X,O)⁻¹=[[1,1],[0,−1]] ⇒ P=[[1,1],[0,0]]；Px=(3,0)ᵀ，x−Px=(−1,1)ᵀ；P²−P=0 ⇒ 幂等（定理6.1）；P−Pᵀ=[[0,1],[−1,0]] 故 max=1（非 Hermite，符合斜投影）；Px×u=0、(x−Px)×v=0（sympy 精确核对）' },
  { name: '6.1 投影矩阵（例6.2 正交投影）', page: 'chapters/ch6/6.1-projection-matrices.html', lab: 'proj-lab', preset: 1, expect: ['0.333', '2.5'], note: '教材例 6.2：P_L=(1/6)[[2,2,-2],[2,5,1],[-2,1,5]]、Px=(0,5/2,5/2)' },
  { name: '6.2 Moore–Penrose 验证器', page: 'chapters/ch6/6.2-penrose-existence.html', lab: 'penrose-lab', preset: -1, expect: ['rank A = 1：秩1公式 A⁺ = Aᵀ/A‖_F²（推论2 的矩阵版）', 'A⁺ = [ 0.5 0 ] [ 0.5 0 ]', '‖AXA−A‖ = 0（Penrose i）', '‖XAX−X‖ = 0（Penrose ii）', '‖(AX)ᵀ−AX‖ = 0（Penrose iii：AX 对称）', '（Penrose iv：XA 对称）', 'rank A⁺ = 1（应 = rank A = 1，定理6.10(1)）', '‖(A⁺)⁺−A‖ = 0（定理6.10(2)）'], note: '教材例 6.3：A=[1 1;0 0]，rank 1，‖A‖_F²=2 ⇒ A⁺=Aᵀ/2=[[0.5,0],[0.5,0]]；AXA−A、XAX−X、(AX)ᵀ−AX、(XA)ᵀ−XA 四式残差全为 0 阵（sympy 精确）；‖A⁺‖_F²=0.5 ⇒ (A⁺)⁺=A⁺ᵀ/0.5=[[1,1],[0,0]]=A ⇒ 残差 0，且 rank A⁺=rank A=1' },
  { name: '6.3 五法对比台（秩1）', page: 'chapters/ch6/6.3-generalized-inverse-computation.html', lab: 'ginv-lab', preset: 0, expect: ['0.04', '0.08'], note: 'A=[[1,2,0],[2,4,0],[0,0,0]] ⇒ A⁺=Aᵀ/25' },
  { name: '7.1 正定/正稳定台', page: 'chapters/ch7/7.1-positive-definite-stable.html', lab: 'pd-lab', preset: -1, expect: ['3.4142', '0.5858'], note: 'A=[[2,1,0],[1,2,1],[0,1,2]] 的特征值 2±√2, 2' },
  { name: '7.2 对角占优判定台', page: 'chapters/ch7/7.2-diagonally-dominant.html', lab: 'dd-lab', preset: -1, expect: ['强对角占优', '0.408'], note: 'A=[[4,1,0],[1,3,1],[0,1,4]]：强占优，ρ(I−D⁻¹A)=√(1/6)≈0.408' },
  { name: '7.3 Perron–Frobenius', page: 'chapters/ch7/7.3-nonnegative-matrices.html', lab: 'perron-lab', preset: -1, expect: ['4.162'], note: '教材例题：ρ=1+√10≈4.162' },
  { name: '7.4 M 矩阵判定台', page: 'chapters/ch7/7.4-m-matrices.html', lab: 'm-lab', preset: -1, expect: ['Z-型 ✓（非对角元≤0）；对角元 全正 ✓；不对称', 'Δ₁=1，Δ₂=1，Δ₃=detA=1（全正 ✓，判据③）', 'A⁻¹≥O ✓（定义 7.4.1 直接成立）', 'ρ=0 < 1 ✓（判据①；Jacobi 型迭代收敛）', '特征值 = 1，1，1；实部全正 ✓（正稳定，J₂₉）', '存在 x=(0.2,0.2,0.2)ᵀ>0 使 Ax=(0.1,0.1,0.2)ᵀ>0 ✓（K₃₃ 半正）', 'A 为 M 矩阵（判据①、判据③、半正 K₃₃、F₁₅ 逆非负 相互印证）'], note: '教材三阶例 A=[[1,−0.5,0],[0,1,−0.5],[0,0,1]]：非对角元 −1/2,0,0,−1/2,0,0 全 ≤0 ⇒ Z-型；对角 1,1,1 全正；Δ1=Δ2=Δ3=det A=1 全正；A⁻¹=[[1,1/2,1/4],[0,1,1/2],[0,0,1]] 逐元素 ≥0；B=I−D⁻¹A=[[0,1/2,0],[0,0,1/2],[0,0,0]] 幂零（B³=0）⇒ ρ=0<1；A 上三角 ⇒ 特征值 1,1,1；x=(1/5,1/5,1/5) ⇒ Ax=(1/10,1/10,1/5)>0；A 非对称 ⇒ 不是 S 矩阵（sympy 精确核对）' },
  { name: '7.5 循环矩阵 DFT', page: 'chapters/ch7/7.5-toeplitz.html', lab: 'circ-lab', preset: -1, expect: ['k=0：2', 'k=2：2', 'k=1：0'], note: 'circ(1,0,1,0) 的谱 {2,0,2,0}' },
  { name: '7.6 三名矩阵台（Hilbert）', page: 'chapters/ch7/7.6-other-special-matrices.html', lab: 'name-lab', preset: 1, expect: ['1.551'], note: 'Hilbert n=4 条件数 ≈1.55e4（教材表 7.1）' }
];

/* ---------- CDP 驱动 ---------- */
const PORT = 9400 + Math.floor(Math.random() * 60);
const PROFILE = path.join(os.tmpdir(), 'checkmath-' + PORT);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => {
  const req = http.get(u, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  });
  req.on('error', rej);
});
async function retryJson(u, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { return await getJson(u); }
    catch (e) {
      if (i === tries - 1) throw e;
      await sleep(400);
    }
  }
}

async function main() {
  const filter = process.argv[2] || '';
  const cases = CASES.filter(c => !filter || c.name.includes(filter) || c.page.includes(filter));
  if (!cases.length) { console.error('无匹配用例'); process.exit(1); }

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, '--window-size=1440,1400', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tg = null;
  for (let i = 0; i < 60 && !tg; i++) {
    await sleep(400);
    try { const t = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = t.find(x => x.type === 'page'); if (p && p.webSocketDebuggerUrl) tg = p; }
    catch (e) { /* Edge 尚未就绪，继续重试 */ }
  }
  if (!tg) { console.error('无法连接 Edge'); process.exit(1); }
  const ws = new WebSocket(tg.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (m, p) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  // 收集页面控制台错误
  let consoleErrors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text || 'exception');
  });

  let pass = 0, fail = 0;
  const failures = [];
  let currentPage = '';
  for (const c of cases) {
    if (c.page !== currentPage) {
      await send('Page.navigate', { url: 'file:///' + path.join(ROOT, c.page).split(path.sep).join('/') });
      for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState' }); if (r.result && r.result.value === 'complete') break; await sleep(250); }
      await sleep(800);
      currentPage = c.page;
    }
    const js = "(function(){" +
      "var lab=document.querySelector('[data-" + c.lab + "]');" +
      "if(!lab) return 'NO_LAB';" +
      (c.preset >= 0 ? "var btns=lab.querySelectorAll('.sf-btn'); if(btns[" + c.preset + "]) btns[" + c.preset + "].click();" : "") +
      // 可选：先向实验台输入框灌入指定值（覆盖「用户手输」路径，如小量级矩阵）
      (c.fill ? "(function(){var f=" + JSON.stringify(c.fill) + ";" +
        "var ins=lab.querySelectorAll('input[type=text]');" +
        "for(var i=0;i<ins.length;i++){ if(f[i]!==undefined){ ins[i].value=f[i];" +
        " ins[i].dispatchEvent(new Event('input',{bubbles:true}));" +
        " ins[i].dispatchEvent(new Event('change',{bubbles:true})); } }})();" : "") +
      "var out=lab.querySelector('" + (c.sel || '.cl-out') + "');" +
      "return out? out.innerText : lab.innerText;})()";
    const r = await send('Runtime.evaluate', { expression: js, returnByValue: true });
    const raw = (r.result && r.result.value) || '';
    // 空白归一化：组件输出含全角/不换行空格，断言统一按半角单空格比较
    const text = raw.replace(/[\s 　]+/g, ' ');
    if (raw === 'NO_LAB') { fail++; failures.push(c.name + ' → 找不到 [data-' + c.lab + ']'); continue; }
    const missing = c.expect.filter(s => !text.includes(s.replace(/[\s 　]+/g, ' ')));
    if (missing.length === 0) { pass++; console.log('  ✓ ' + c.name); }
    else {
      fail++;
      failures.push(c.name + ' → 缺少 ' + JSON.stringify(missing) + '（' + c.note + '）\n      实际输出片段: ' + text.replace(/\s+/g, ' ').slice(0, 180));
      console.log('  ✗ ' + c.name);
    }
    // 注入过输入的用例会改坏实验台状态，且各台的「第一个 .sf-btn」未必是预设按钮
    // （如 perron-lab 的首按钮是模式切换），因此不做点击式复位，改为让下一条用例重新加载页面
    if (c.fill) currentPage = '';
  }
  console.log('\n断言结果: ' + pass + ' 通过 / ' + fail + ' 失败 / 共 ' + cases.length + ' 条');
  if (consoleErrors.length) console.log('页面异常: ' + consoleErrors.slice(0, 3).join(' | '));
  if (failures.length) { console.log('\n失败详情:'); failures.forEach(f => console.log('  - ' + f)); }

  ws.close();
  await sleep(300);
  try { execSync('taskkill /PID ' + edge.pid + ' /T /F', { stdio: 'ignore' }); } catch (e) {}
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
}
main();
