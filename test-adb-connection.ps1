# ADB连接测试脚本
# 用于验证雷电模拟器ADB连接

Write-Host "=== 雷电模拟器ADB连接测试 ===" -ForegroundColor Green
Write-Host ""

# 检查ADB路径
$adbPath = "D:\leidian\LDPlayer9\adb.exe"
Write-Host "1. 检查ADB文件..." -ForegroundColor Yellow

if (Test-Path $adbPath) {
    Write-Host "✅ ADB文件存在: $adbPath" -ForegroundColor Green

    # 检查ADB版本
    Write-Host ""
    Write-Host "2. 检查ADB版本..." -ForegroundColor Yellow
    try {
        $version = & $adbPath version
        Write-Host "✅ ADB版本信息:" -ForegroundColor Green
        Write-Host $version -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ 无法获取ADB版本: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 检查设备连接
    Write-Host ""
    Write-Host "3. 检查连接的设备..." -ForegroundColor Yellow
    try {
        $devices = & $adbPath devices
        Write-Host "📱 设备列表:" -ForegroundColor Green
        Write-Host $devices -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ 无法获取设备列表: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 尝试连接雷电模拟器
    Write-Host ""
    Write-Host "4. 尝试连接雷电模拟器..." -ForegroundColor Yellow

    $ports = @(5555, 5556, 5557)
    foreach ($port in $ports) {
        Write-Host "  尝试端口 $port..." -ForegroundColor Cyan
        try {
            $result = & $adbPath connect "127.0.0.1:$port"
            Write-Host "    结果: $result" -ForegroundColor Gray
        }
        catch {
            Write-Host "    ❌ 端口 $port 连接失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "❌ ADB文件不存在: $adbPath" -ForegroundColor Red
    Write-Host "请检查雷电模拟器安装路径是否正确" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
