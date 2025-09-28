#!/usr/bin/env pwsh
# 验证 scrcpy 集成是否正常工作

Write-Host "🔍 验证 scrcpy 集成..." -ForegroundColor Cyan

# 1. 检查 scrcpy 文件是否存在
$scrcpyPath = "platform-tools\scrcpy.exe"
if (-not (Test-Path $scrcpyPath)) {
    Write-Host "❌ scrcpy.exe 不存在于 platform-tools 目录" -ForegroundColor Red
    Write-Host "💡 请运行: npm run setup:scrcpy" -ForegroundColor Yellow
    exit 1
}

# 2. 检查版本
try {
    $versionOutput = & $scrcpyPath --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $version = $versionOutput | Select-String "scrcpy (\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
        Write-Host "✅ scrcpy $version 可正常执行" -ForegroundColor Green
    } else {
        Write-Host "❌ scrcpy 执行失败" -ForegroundColor Red
        Write-Host $versionOutput
        exit 1
    }
} catch {
    Write-Host "❌ scrcpy 执行异常: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. 检查必要的依赖文件
$requiredFiles = @(
    "scrcpy.exe",
    "scrcpy-server", 
    "SDL2.dll"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $filePath = "platform-tools\$file"
    if (-not (Test-Path $filePath)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ 缺少必要文件:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "💡 请运行: npm run setup:scrcpy" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ 所有必要文件都存在" -ForegroundColor Green
}

# 4. 检查 Tauri 配置
$tauriConfig = "src-tauri\tauri.conf.json"
if (Test-Path $tauriConfig) {
    $configContent = Get-Content $tauriConfig -Raw | ConvertFrom-Json
    if ($configContent.bundle.resources -contains "../platform-tools") {
        Write-Host "✅ Tauri 配置已包含 platform-tools 资源" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Tauri 配置中未找到 platform-tools 资源配置" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 未找到 Tauri 配置文件" -ForegroundColor Red
}

Write-Host "`n🎉 scrcpy 集成验证完成！" -ForegroundColor Green
Write-Host "📱 现在可以在应用中使用镜像视图功能了。" -ForegroundColor Cyan

# 显示使用提示
Write-Host "`n💡 使用提示:" -ForegroundColor Yellow
Write-Host "  1. 连接 Android 设备并启用 USB 调试" -ForegroundColor Gray
Write-Host "  2. 打开应用的 Universal UI → 镜像视图" -ForegroundColor Gray
Write-Host "  3. 选择设备并点击'启动镜像'" -ForegroundColor Gray