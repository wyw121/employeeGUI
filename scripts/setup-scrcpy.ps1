#!/usr/bin/env pwsh
# 自动下载并设置 scrcpy 到 platform-tools 目录
# 用于确保所有开发者和 CI/CD 环境都有 scrcpy 依赖

param(
    [string]$Version = "v3.3.3",
    [string]$PlatformToolsDir = "platform-tools"
)

Write-Host "🚀 开始设置 scrcpy 环境..." -ForegroundColor Green

# 确保 platform-tools 目录存在
if (-not (Test-Path $PlatformToolsDir)) {
    New-Item -ItemType Directory -Path $PlatformToolsDir
    Write-Host "✅ 创建 platform-tools 目录" -ForegroundColor Green
}

# 检查是否已经存在 scrcpy
$scrcpyPath = Join-Path $PlatformToolsDir "scrcpy.exe"
if (Test-Path $scrcpyPath) {
    try {
        $currentVersion = & $scrcpyPath --version 2>$null | Select-String "scrcpy (\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
        $targetVersion = $Version.TrimStart('v')
        
        if ($currentVersion -eq $targetVersion) {
            Write-Host "✅ scrcpy $currentVersion 已存在，无需下载" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "⚠️  发现 scrcpy $currentVersion，但目标版本是 $targetVersion，将更新..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  检测到 scrcpy 但版本检查失败，将重新下载..." -ForegroundColor Yellow
    }
}

# 构建下载 URL
$downloadUrl = "https://github.com/Genymobile/scrcpy/releases/download/$Version/scrcpy-win64-$Version.zip"
$zipFile = "scrcpy-win64-$Version.zip"
$tempDir = "temp_scrcpy_$([System.Guid]::NewGuid().ToString('N')[0..7] -join '')"

try {
    Write-Host "📥 下载 scrcpy $Version..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    
    Write-Host "📦 解压 scrcpy..." -ForegroundColor Cyan
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    
    # 查找解压后的文件夹
    $extractedDir = Get-ChildItem -Path $tempDir -Directory | Select-Object -First 1
    if (-not $extractedDir) {
        throw "解压失败：未找到 scrcpy 文件夹"
    }
    
    $scrcpySourceDir = $extractedDir.FullName
    
    Write-Host "📋 复制 scrcpy 文件到 platform-tools..." -ForegroundColor Cyan
    
    # 复制 scrcpy 主程序和服务端
    Copy-Item (Join-Path $scrcpySourceDir "scrcpy.exe") $PlatformToolsDir -Force
    Copy-Item (Join-Path $scrcpySourceDir "scrcpy-server") $PlatformToolsDir -Force
    
    # 复制必要的 DLL 依赖
    $dlls = @(
        "avcodec-*.dll",
        "avformat-*.dll", 
        "avutil-*.dll",
        "libusb-*.dll",
        "SDL2.dll",
        "swresample-*.dll"
    )
    
    foreach ($dllPattern in $dlls) {
        $dllFiles = Get-ChildItem -Path $scrcpySourceDir -Name $dllPattern
        foreach ($dllFile in $dllFiles) {
            Copy-Item (Join-Path $scrcpySourceDir $dllFile) $PlatformToolsDir -Force
        }
    }
    
    Write-Host "✅ 验证 scrcpy 安装..." -ForegroundColor Green
    $version = & $scrcpyPath --version 2>$null | Select-String "scrcpy (\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
    Write-Host "🎉 scrcpy $version 安装成功！" -ForegroundColor Green
    
    # 显示安装的文件列表
    Write-Host "`n📁 已安装的文件:" -ForegroundColor Cyan
    Get-ChildItem -Path $PlatformToolsDir | Where-Object { 
        $_.Name -like "scrcpy*" -or 
        $_.Name -like "avcodec*" -or 
        $_.Name -like "avformat*" -or 
        $_.Name -like "avutil*" -or 
        $_.Name -like "libusb*" -or 
        $_.Name -eq "SDL2.dll" -or 
        $_.Name -like "swresample*"
    } | ForEach-Object { 
        Write-Host "  ✓ $($_.Name)" -ForegroundColor Gray 
    }

} catch {
    Write-Error "❌ scrcpy 安装失败: $($_.Exception.Message)"
    exit 1
} finally {
    # 清理临时文件
    if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}

Write-Host "`n✨ scrcpy 环境设置完成！现在可以使用镜像视图功能了。" -ForegroundColor Green