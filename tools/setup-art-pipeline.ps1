param(
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host ""
Write-Host "=== Campus Horror Starter：写实美术管线初始化 ===" -ForegroundColor Cyan
Write-Host "项目目录：$root"
Write-Host ""

# 1. Git LFS
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Warning "未检测到 Git。请先安装 Git，再重新运行本脚本。"
} else {
    git lfs version *> $null
    if ($LASTEXITCODE -eq 0) {
        git lfs install --local *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Git LFS 已安装，但无法在当前仓库初始化。"
        }
        Write-Host "[完成] Git LFS 已在当前仓库启用。" -ForegroundColor Green
    } else {
        Write-Warning "已检测到 Git，但没有可用的 Git LFS。请安装 Git LFS 后运行：git lfs install"
    }
}

# 2. Asset folders
$directories = @(
    "assets/characters/source",
    "assets/characters/exports",
    "assets/characters/textures",
    "assets/characters/animations",
    "assets/environment/school/source",
    "assets/environment/school/modules",
    "assets/environment/school/props",
    "assets/environment/school/textures",
    "assets/environment/school/exports",
    "assets/environment/shared",
    "assets/audio",
    "assets/reference",
    "assets/licenses"
)

foreach ($relativePath in $directories) {
    $fullPath = Join-Path $root $relativePath
    New-Item -ItemType Directory -Force -Path $fullPath | Out-Null
}
Write-Host "[完成] 人物、楼宇、动画、贴图、音频和授权目录已创建。" -ForegroundColor Green

# 3. Blender detection
$blenderCandidates = @()
$blenderCommand = Get-Command blender -ErrorAction SilentlyContinue
if ($blenderCommand) {
    $blenderCandidates += $blenderCommand.Source
}

$programFiles = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }
foreach ($base in $programFiles) {
    $blenderRoot = Join-Path $base "Blender Foundation"
    if (Test-Path $blenderRoot) {
        $blenderCandidates += Get-ChildItem -Path $blenderRoot -Filter "blender.exe" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName
    }
}

$blenderPath = $blenderCandidates | Select-Object -First 1
if ($blenderPath) {
    Write-Host "[完成] 检测到 Blender：$blenderPath" -ForegroundColor Green
} else {
    Write-Warning "未检测到 Blender。请从 blender.org 安装稳定版或 LTS 版。"
}

# 4. Required project docs
$requiredFiles = @(
    "docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md",
    "assets/ASSET_REGISTER.md",
    ".gitattributes"
)

foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $root $relativePath
    if (-not (Test-Path $fullPath)) {
        throw "缺少必要文件：$relativePath"
    }
}
Write-Host "[完成] 写实资产流程、授权登记表和 LFS 规则均存在。" -ForegroundColor Green

Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 阅读 docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md"
Write-Host "2. 制作或下载素材后，先填写 assets/ASSET_REGISTER.md"
Write-Host "3. Blender 源文件放入 source，导出的 .glb 放入 exports"
Write-Host "4. 在 Godot 中为导入模型创建继承场景，不直接修改导入场景"
Write-Host ""

if (-not $NonInteractive) {
    $openDocs = Read-Host "是否现在打开写实资产流程文档？(Y/N)"
    if ($openDocs -match '^[Yy]$') {
        Start-Process (Join-Path $root "docs/REALISTIC_ASSETS_PIPELINE.zh-CN.md")
    }
}
