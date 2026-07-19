# 万物成界 · 正式版

拍下任何东西，然后进入它的世界。
输入一段话 / 三个表情 / 一张照片，引擎会生成一个 60–90 秒的 3D 异世界挑战：
观察 → 收集 → 世界突变 → Boss 追逐 → 点亮节点 → 穿越出口。

## 运行

```bash
npm install        # 安装依赖（建议 registry.npmmirror.com，见 .npmrc）
npm run dev        # 开发调试
npm run build      # 生产构建 → dist/
npm run preview    # 本地预览构建产物
```

冒烟测试（引擎 + 关卡生成，共 150+ 断言）：

```bash
npx esbuild scripts/engine-sanity.ts --bundle --platform=node --format=cjs --outfile=node_modules/.cache/sanity-e.cjs && node node_modules/.cache/sanity-e.cjs
npx esbuild scripts/level-sanity.ts --bundle --platform=node --format=cjs --outfile=node_modules/.cache/sanity-l.cjs && node node_modules/.cache/sanity-l.cjs
```

## 画质与兼容性

- 自动分级：低核心数 / 软件渲染 / Intel 核显（非 Arc）默认 `low`，其余 `high`。
- 手动覆盖：`/play/:id?q=high` 或 `?q=low`。
- 帧率看门狗：连续低帧自动关闭泛光并把渲染分辨率降到 1x（不打断对局）。

## 正式版相对原型版的改动

建模与画面：

- 全部实体重做：记忆晶体碎片（嵌套晶体 + 环绕微星 + 双层光柱）、能量方尖塔（三层基座 + 双四面体核心 + 激活光束）、刻度符文传送门（旋涡着色器门盘）、六形态 Boss 全部增加细节与内部动画（眼核 / 伞骨 / 嚎刺电弧 / 牧环幼体 / 颌齿张合 / 镜像卫星）、玩家灵核（内核 + 壳 + 赤道环 + 环绕微星 + 速度拖尾）。
- 地形：顶点色高度渐变 + 主路径微光 + 噪声斑驳；浮岛分层岩体（台面 / 岩身 / 节理 / 根锥）+ 装饰晶簇；平台补全基座、收边光条与角柱。
- 天空：双色渐变天穹着色器（skyTop/skyBottom 全量启用）、星云六团、双月辉光、极光顶点波动、蚀环日冕。
- 12 种建筑模块全部精细化（基座 / 顶饰 / 发光缝线 / 小饰件），数量 14 → 18，三分之一沿主路径布置。
- UnrealBloom 泛光 + FXAA（high 画质）；玩家跟随动态阴影；常驻氛围暗角。

反馈与手感：

- 事件粒子系统：收集 / 节点激活 / Boss 解体 / 传送门开启爆发粒子 + 地面冲击环；落地尘埃与涟漪（落差越大越明显）。
- 跳跃 / 落地音效；冲刺阶段移速 +18% 且 FOV 推进。

修复与优化：

- 修复浮岛世界 Boss 出生点落入虚空（z=-48 超出主链，改至 -42.5）。
- 修复浮岛碎片被相邻高岛掩埋（按实际地面高度钳制）。
- 修复 skyBottom 定义后未使用；相机每帧零分配；模块级共享临时向量。
- 关卡/引擎全量冒烟测试（scripts/level-sanity.ts、scripts/engine-sanity.ts）。
