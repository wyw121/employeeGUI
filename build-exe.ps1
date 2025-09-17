#!/usr/bin/env pwsh
# 快速构建脚本 - 只生成可执行文件，不打包安装程序

Write-Host "🚀 开始构建员工引流工具..." -ForegroundColor Green

# 确保在正确的目录
if (!(Test-Path "src-tauri/tauri.conf.json")) {
    Write-Error "❌ 请在项目根目录运行此脚本"
    exit 1
}

# 执行构建
Write-Host "📦 正在编译..." -ForegroundColor Yellow
npx tauri build --no-bundle

if ($LASTEXITCODE -eq 0) {
    $exePath = "src-tauri\target\release\employee-gui.exe"
    if (Test-Path $exePath) {
        $fileInfo = Get-ChildItem $exePath
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        Write-Host "✅ 构建成功！" -ForegroundColor Green
        Write-Host "📍 可执行文件位置: $exePath" -ForegroundColor Cyan
        Write-Host "📏 文件大小: $sizeMB MB" -ForegroundColor Cyan
        Write-Host "⏰ 构建时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
        
        # 可选：复制到项目根目录
        $rootExe = "employee-gui.exe"
        Copy-Item $exePath $rootExe -Force
        Write-Host "📋 已复制到根目录: $rootExe" -ForegroundColor Cyan
    } else {
        Write-Error "❌ 可执行文件未找到"
    }
} else {
    Write-Error "❌ 构建失败，请检查错误信息"
}

Write-Host "`n🎉 构建完成！" -ForegroundColor Green