# 万物成界

> 拍下任何东西，然后进入它的世界。

输入一段话、三个表情或一张照片，系统会生成一个 **60–90 秒的 3D 异世界挑战**：

**观察 → 收集 → 世界突变 → Boss 追逐 → 点亮节点 → 穿越出口**

## 项目状态

这是可继续开发和构建的正式版工程，不是静态概念稿。

- 运行方式：Web / 桌面浏览器
- 技术栈：React 19、TypeScript、Vite、Three.js、React Three Fiber
- 画质档位：自动识别 `high` / `low`
- 必过门禁：引擎冒烟测试、关卡冒烟测试、TypeScript 与生产构建
- 严格检查：在必过门禁基础上增加 ESLint
- 构建产物：`dist/`

## 环境要求

- Node.js 22（仓库已提供 `.nvmrc`）
- npm 10 或更高版本
- 支持 WebGL 的现代浏览器

使用 nvm 时：

```bash
nvm use
```

## 快速开始

```bash
git clone https://github.com/yniantongtian-oss/wanwu-chengjie.git
cd wanwu-chengjie
npm ci
npm run dev
```

Vite 启动后会在终端显示本地访问地址。

国内网络安装较慢时，可临时使用镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm ci
```

## 常用命令

```bash
npm run dev             # 启动开发服务器
npm run lint            # ESLint 检查
npm run sanity:engine   # 引擎冒烟测试
npm run sanity:level    # 关卡生成冒烟测试
npm test                # 运行全部冒烟测试
npm run build           # TypeScript 校验并生成生产版本
npm run check           # 全部冒烟测试 + 生产构建
npm run check:strict    # ESLint + 全部冒烟测试 + 生产构建
npm run preview         # 本地预览 dist/
```

验证项目能否交付时执行：

```bash
npm run check
```

清理代码质量问题或准备高标准合并时执行：

```bash
npm run check:strict
```

## 游戏流程

1. 输入文本、表情或图片，生成世界主题。
2. 进入场景并观察环境提示。
3. 收集记忆晶体碎片。
4. 触发世界突变与 Boss 追逐。
5. 激活能量节点。
6. 打开传送门并完成挑战。

## 画质与兼容性

系统会根据设备能力自动选择画质：

- 低核心数、软件渲染或 Intel 非 Arc 核显：默认 `low`
- 其他设备：默认 `high`

也可手动覆盖：

```text
/play/:id?q=high
/play/:id?q=low
```

运行中若持续低帧，帧率看门狗会自动关闭泛光并将渲染分辨率降低到 1x，不会中断当前对局。

## 自动质量检查

仓库的 GitHub Actions 会在推送到 `main` 或创建 Pull Request 时自动执行：

1. `npm ci`
2. ESLint 检查并报告现有代码质量问题（当前为建议项，不阻断构建）
3. 引擎冒烟测试
4. 关卡冒烟测试
5. TypeScript 与生产构建
6. 上传 `dist/` 构建产物

冒烟测试或生产构建失败会阻止合并。现有 ESLint 历史问题会单独治理，不会掩盖项目是否能够运行和交付。

## 冒烟测试

当前冒烟测试覆盖引擎与关卡生成，共计 150+ 条断言。

需要单独调试时：

```bash
npm run sanity:engine
npm run sanity:level
```

## 生产构建

```bash
npm run build
npm run preview
```

可部署目录为：

```text
dist/
```

任何支持静态站点的服务均可托管该目录。部署时需要确保 SPA 路由回退到 `index.html`。

## 已完成的正式版优化

### 建模与画面

- 记忆晶体碎片、能量方尖塔、符文传送门、六形态 Boss 与玩家灵核全部重做。
- 地形加入顶点色高度渐变、主路径微光、噪声斑驳、浮岛分层岩体和装饰晶簇。
- 天空加入双色渐变天穹、星云、双月辉光、极光波动和蚀环日冕。
- 12 种建筑模块精细化，场景数量由 14 个提升至 18 个。
- 高画质模式启用 UnrealBloom、FXAA、动态阴影与氛围暗角。

### 反馈与手感

- 收集、节点激活、Boss 解体和传送门开启均有事件粒子与冲击环。
- 加入落地尘埃、涟漪、跳跃音效和落地音效。
- 冲刺阶段移动速度提高 18%，同时推进视野角度。

### 修复与性能

- 修复浮岛世界 Boss 出生点落入虚空。
- 修复碎片被相邻高岛掩埋。
- 修复 `skyBottom` 定义后未使用。
- 相机更新实现每帧零分配。
- 临时向量改为模块级共享，减少垃圾回收压力。

## 常见问题

### 安装依赖失败

先确认 Node.js 版本：

```bash
node -v
npm -v
```

然后清理并重新安装：

```bash
rm -rf node_modules
npm ci
```

Windows PowerShell 可使用：

```powershell
Remove-Item node_modules -Recurse -Force
npm ci
```

### 页面能打开但画面异常

尝试低画质模式：

```text
?q=low
```

并检查浏览器是否启用了硬件加速。

### 刷新子页面后出现 404

这是静态服务器没有配置 SPA 回退。将所有未知路径重写到 `index.html`。

## 开发约定

- 功能改动通过独立分支和 Pull Request 提交。
- 合并前必须通过 `npm run check`。
- 新增或重构代码应尽量通过 `npm run check:strict`。
- 不提交 `node_modules/`、`dist/`、日志或本地缓存。
- 性能优化需要同时检查高画质和低画质模式。
