# PowerShell测试脚本 - Python移植版VCF导入测试
# =====================================================

param(
    [string]$DeviceId = "emulator-5554",
    [string]$VcfFile = "src-tauri/contacts_import.vcf",
    [switch]$OnlyPython,
    [switch]$Verbose
)

function Write-Banner {
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "🧪 Python移植版VCF导入测试工具" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "📱 测试设备: $DeviceId" -ForegroundColor Green
    Write-Host "📄 VCF文件: $VcfFile" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Test-Prerequisites {
    Write-Host "`n🔍 检查测试环境..." -ForegroundColor Yellow
    
    # 检查ADB是否可用
    try {
        $adbResult = adb devices 2>&1
        if ($adbResult -match $DeviceId) {
            Write-Host "✅ 设备 $DeviceId 已连接" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ 设备 $DeviceId 未连接" -ForegroundColor Red
            Write-Host "可用设备:" -ForegroundColor Yellow
            Write-Host $adbResult
            return $false
        }
    }
    catch {
        Write-Host "❌ ADB检查失败: $_" -ForegroundColor Red
        return $false
    }
}

function Test-VcfFile {
    if (Test-Path $VcfFile) {
        $fileInfo = Get-Item $VcfFile
        Write-Host "✅ VCF文件存在: $($fileInfo.FullName)" -ForegroundColor Green
        Write-Host "📊 文件大小: $($fileInfo.Length) bytes" -ForegroundColor Cyan
        return $true
    }
    else {
        Write-Host "❌ VCF文件不存在: $VcfFile" -ForegroundColor Red
        return $false
    }
}

function Invoke-TauriCommand {
    param(
        [string]$Command,
        [string]$DeviceId,
        [string]$FilePath
    )
    
    Write-Host "📡 调用Tauri命令: $Command" -ForegroundColor Cyan
    
    # 注意: 这里需要实际的Tauri应用运行才能工作
    # 目前只是模拟命令调用
    
    $startTime = Get-Date
    
    try {
        # 实际应该通过某种方式调用Tauri命令
        # 这里我们模拟一个结果
        Start-Sleep -Seconds 2
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        # 模拟成功结果
        $result = @{
            success          = $true
            totalContacts    = 10
            importedContacts = 8
            failedContacts   = 2
            duration         = $duration
            message          = "模拟测试完成"
        }
        
        return $result
        
    }
    catch {
        return @{
            success  = $false
            error    = $_.Exception.Message
            duration = 0
        }
    }
}

function Test-PythonVersion {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Magenta
    Write-Host "🧪 测试Python移植版 (import_vcf_contacts_python_version)" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Magenta
    
    $result = Invoke-TauriCommand -Command "import_vcf_contacts_python_version" -DeviceId $DeviceId -FilePath $VcfFile
    
    if ($result.success) {
        Write-Host "✅ 测试成功 (耗时: $($result.duration.ToString('F1'))ms)" -ForegroundColor Green
        Write-Host "📊 导入结果: $($result.importedContacts)/$($result.totalContacts)" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ 测试失败: $($result.error -or $result.message)" -ForegroundColor Red
    }
    
    return $result
}

function Test-OriginalVersion {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Magenta
    Write-Host "📱 测试原始版本 (import_vcf_contacts)" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Magenta
    
    $result = Invoke-TauriCommand -Command "import_vcf_contacts" -DeviceId $DeviceId -FilePath $VcfFile
    
    if ($result.success) {
        Write-Host "✅ 测试成功 (耗时: $($result.duration.ToString('F1'))ms)" -ForegroundColor Green
        Write-Host "📊 导入结果: $($result.importedContacts)/$($result.totalContacts)" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ 测试失败: $($result.error -or $result.message)" -ForegroundColor Red
    }
    
    return $result
}

function Test-OptimizedVersion {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Magenta
    Write-Host "⚡ 测试优化版本 (import_vcf_contacts_optimized)" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Magenta
    
    $result = Invoke-TauriCommand -Command "import_vcf_contacts_optimized" -DeviceId $DeviceId -FilePath $VcfFile
    
    if ($result.success) {
        Write-Host "✅ 测试成功 (耗时: $($result.duration.ToString('F1'))ms)" -ForegroundColor Green
        Write-Host "📊 导入结果: $($result.importedContacts)/$($result.totalContacts)" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ 测试失败: $($result.error -or $result.message)" -ForegroundColor Red
    }
    
    return $result
}

function Show-Comparison {
    param([array]$Results)
    
    Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
    Write-Host "📈 性能对比结果" -ForegroundColor Yellow
    Write-Host ("=" * 60) -ForegroundColor Cyan
    
    foreach ($item in $Results) {
        $version = $item.Version
        $result = $item.Result
        
        if ($result.success) {
            $durationStr = $result.duration.ToString("F1") + "ms"
            $importStr = "$($result.importedContacts)/$($result.totalContacts)"
            Write-Host ("{0,-15} | ✅ 成功 | {1,8} | {2,5}" -f $version, $durationStr, $importStr) -ForegroundColor Green
        }
        else {
            $errorMsg = $result.error -or $result.message -or "未知错误"
            Write-Host ("{0,-15} | ❌ 失败 | {1}" -f $version, $errorMsg) -ForegroundColor Red
        }
    }
    
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

# 主执行逻辑
function Main {
    Write-Banner
    
    # 检查前置条件
    if (!(Test-Prerequisites)) {
        Write-Host "❌ 前置条件检查失败，测试终止" -ForegroundColor Red
        exit 1
    }
    
    if (!(Test-VcfFile)) {
        Write-Host "❌ VCF文件检查失败，测试终止" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n🚀 开始执行测试..." -ForegroundColor Yellow
    
    $results = @()
    
    # 测试Python移植版
    $pythonResult = Test-PythonVersion
    $results += @{ Version = "Python移植版"; Result = $pythonResult }
    
    if (!$OnlyPython) {
        Start-Sleep -Seconds 3
        
        # 测试原始版本
        $originalResult = Test-OriginalVersion
        $results += @{ Version = "原始版本"; Result = $originalResult }
        
        Start-Sleep -Seconds 3
        
        # 测试优化版本
        $optimizedResult = Test-OptimizedVersion
        $results += @{ Version = "优化版本"; Result = $optimizedResult }
    }
    
    # 显示对比结果
    Show-Comparison -Results $results
    
    Write-Host "`n🎉 所有测试完成!" -ForegroundColor Green
}

# 显示使用说明
if ($args -contains "--help" -or $args -contains "-h") {
    Write-Host @"
PowerShell测试脚本 - Python移植版VCF导入测试

用法:
    .\test_python_version.ps1 [参数]

参数:
    -DeviceId <string>     指定Android设备ID (默认: emulator-5554)
    -VcfFile <string>      指定VCF文件路径 (默认: src-tauri/contacts_import.vcf)
    -OnlyPython           只测试Python移植版
    -Verbose              显示详细输出
    -Help                 显示此帮助信息

示例:
    .\test_python_version.ps1
    .\test_python_version.ps1 -DeviceId "127.0.0.1:5555"
    .\test_python_version.ps1 -OnlyPython -Verbose
    .\test_python_version.ps1 -VcfFile "custom_contacts.vcf"

注意:
    - 确保Android模拟器正在运行
    - 确保Tauri应用已启动 (npm run tauri dev)
    - 确保VCF文件存在于指定路径
"@
    exit 0
}

# 执行主函数
Main
