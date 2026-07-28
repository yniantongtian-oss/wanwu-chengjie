# Campus Horror Starter

一个可直接扩展为校园民俗恐怖游戏的 Godot 4 第一人称原型。

## 已配置内容

- 第一人称移动、鼠标视角与奔跑
- 手电筒开关
- 射线交互提示
- 可拾取钥匙
- 带条件检查的门锁
- 女鬼激活、追逐与抓捕重开
- JSON 状态存档
- 纯基础几何体测试关卡，不依赖外部美术资源
- Windows 一键下载 Godot 并打开项目
- 写实人物与 3D 校园楼宇制作流程
- 大型 3D 资产 Git LFS 规则
- 第三方素材来源和授权登记表

## Windows 直接启动

克隆本分支：

```powershell
git clone -b godot-campus-horror-starter --single-branch https://github.com/yniantongtian-oss/wanwu-chengjie.git campus-horror-starter
cd campus-horror-starter
```

双击 `run-editor.bat`，或执行：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
./tools/setup-windows.ps1
```

脚本会从 Godot 官方 GitHub Release 下载最新稳定版 Windows 编辑器到 `.tools/godot/`，随后打开本项目。

## 初始化写实美术管线

双击：

```text
setup-art-pipeline.bat
```

它会：

1. 检查 Git 和 Git LFS；
2. 在当前仓库启用 Git LFS；
3. 创建人物、动画、楼宇、道具、贴图、音频和授权目录；
4. 检查 Blender 是否已安装；
5. 检查写实资产流程文档、授权登记表和 LFS 规则是否完整。

完整制作流程：

- [`docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md`](docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md)
- [`assets/README.md`](assets/README.md)
- [`assets/ASSET_REGISTER.md`](assets/ASSET_REGISTER.md)

推荐路线：

```text
人物：MakeHuman/MPFB → Blender 清理 → Mixamo 或 Rigify → GLB → Godot
楼宇：Godot 灰盒 → Blender 模块化建模 → PBR 材质 → 分区 GLB → Godot 灯光/碰撞/导航
```

所有下载素材必须先登记许可证。不要使用其他游戏提取物、来源不明网盘素材或未经授权的真人肖像。

## 操作

- `WASD`：移动
- `Shift`：奔跑
- `E`：交互
- `F`：手电筒
- `Esc`：释放鼠标
- 鼠标左键：重新捕获鼠标

## 当前试玩流程

1. 找到黄色钥匙，对准后按 `E`。
2. 走到红色门前，按 `E` 解锁并开门。
3. 拾取钥匙后，门后的女鬼开始追逐。
4. 被抓到后关卡会自动重新开始。

## 引擎兼容目标

项目按 Godot 4.3+ API 编写。自动安装脚本使用 Godot 官方最新稳定 Release。

## 第三方代码

第一人称移动控制核心源自 Brackeys 的 `brackeys-proto-controller`，采用 CC0 许可。详见 `THIRD_PARTY.md`。

## 下一步建议

1. 先完成一层走廊、两间教室、厕所、楼梯和地下室的灰盒。
2. 制作或导入一个可动画的人体，替换当前胶囊女鬼。
3. 建立墙、门、窗、楼梯和栏杆模块化套件。
4. 加入柜子躲藏、声音感知 AI、恐怖事件和剧情对话。
5. 完成碰撞、导航、LOD、遮挡剔除与性能分级。
6. 使用正式模型、动画、音频和灯光完成 10～15 分钟 Demo。
