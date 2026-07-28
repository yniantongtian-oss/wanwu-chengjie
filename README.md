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

正式开发时依次补充：校园灰盒关卡、柜子躲藏、声音感知 AI、事件触发器、剧情对话、物品栏、检查点、正式模型、动画与音频。
