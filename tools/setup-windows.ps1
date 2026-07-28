$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$toolRoot = Join-Path $root ".tools\godot"
$existing = Get-ChildItem -Path $toolRoot -Filter "Godot*.exe" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "console" } |
    Select-Object -First 1

if (-not $existing) {
    New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
    Write-Host "正在查询 Godot 官方最新稳定版……"

    $headers = @{ "User-Agent" = "Campus-Horror-Starter" }
    $release = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/godotengine/godot/releases/latest"
    $asset = $release.assets |
        Where-Object { $_.name -match '^Godot_v.*_win64\.exe\.zip$' -and $_.name -notmatch 'mono' } |
        Select-Object -First 1

    if (-not $asset) {
        throw "未在 Godot 官方 Release 中找到 Windows 64 位标准版。"
    }

    $zipPath = Join-Path $toolRoot $asset.name
    Write-Host "正在下载 $($asset.name)……"
    Invoke-WebRequest -Headers $headers -Uri $asset.browser_download_url -OutFile $zipPath

    Write-Host "正在解压……"
    Expand-Archive -Path $zipPath -DestinationPath $toolRoot -Force
    Remove-Item $zipPath -Force

    $existing = Get-ChildItem -Path $toolRoot -Filter "Godot*.exe" -Recurse |
        Where-Object { $_.Name -notmatch "console" } |
        Select-Object -First 1
}

if (-not $existing) {
    throw "Godot 下载完成，但未找到编辑器可执行文件。"
}

Write-Host "正在打开项目：$root"
Start-Process -FilePath $existing.FullName -ArgumentList @("--editor", "--path", $root)
