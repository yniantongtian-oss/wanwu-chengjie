# 正式资产目录

本目录用于存放写实人物、楼宇、道具、贴图、动画和音频。

## 目录约定

```text
assets/
├── characters/
│   ├── source/
│   ├── exports/
│   ├── textures/
│   └── animations/
├── environment/
│   ├── school/
│   │   ├── source/
│   │   ├── modules/
│   │   ├── props/
│   │   ├── textures/
│   │   └── exports/
│   └── shared/
├── audio/
├── reference/
├── licenses/
└── ASSET_REGISTER.md
```

Git 不保存空目录。首次加入某类资产时，再创建对应目录即可。

## 文件职责

- `source/`：Blender、绘画、扫描等原始可编辑工程。
- `exports/`：Godot 实际使用的 `.glb` 文件。
- `textures/`：已整理、命名和压缩的 PBR 贴图。
- `animations/`：独立或合并的角色动画。
- `reference/`：平面图、尺寸、照片和概念参考，通常不随游戏发布。
- `licenses/`：第三方许可、订单和书面授权记录。

## 命名规则

```text
SM_  静态网格
SK_  骨骼网格
M_   材质
T_   贴图
AN_  动画
COL_ 碰撞
OCC_ 遮挡体
SFX_ 音效
VO_  配音
```

例如：

```text
SK_Ghost_Female_A.glb
AN_Ghost_Chase_A.glb
SM_School_Door_Classroom_A.glb
T_WallPaint_Dirty_BaseColor.png
T_WallPaint_Dirty_Normal.png
SFX_Hallway_FluorescentBuzz_A.ogg
```

## 提交前检查

1. 已在 `ASSET_REGISTER.md` 登记来源和许可证。
2. 不包含其他游戏提取物、来源不明网盘素材或未授权真人肖像。
3. `.blend`、`.fbx`、`.glb`、HDR、无损音频等大型文件已通过 Git LFS 管理。
4. Godot 使用的是 `exports/` 内文件，不直接依赖个人电脑上的绝对路径。
5. 导出模型比例为米制，变换已应用，材质和纹理路径完整。
6. 人物有 LOD，建筑已拆分区域，碰撞不是直接使用高模。

完整流程见：`docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md`。
