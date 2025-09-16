@echo off
chcp 65001 > nul
echo 🚀 员工引流工具 v0.2.0 发布测试
echo ====================================
echo.

echo 📍 当前目录: %cd%
echo ⏰ 测试时间: %date% %time%
echo.

:MAIN_MENU
echo 🔍 检查发布产物...
if exist "src-tauri\target\release\employee-gui.exe" (
    echo ✅ 找到独立可执行文件: employee-gui.exe
    for %%F in ("src-tauri\target\release\employee-gui.exe") do echo    大小: %%~zF 字节 ^(约 %%~zF KB^)
) else (
    echo ❌ 未找到 employee-gui.exe
)
echo.

if exist "src-tauri\target\release\bundle\nsis\" (
    echo ✅ 找到NSIS安装包目录
    for /f %%i in ('dir "src-tauri\target\release\bundle\nsis\*.exe" /b 2^>nul') do (
        for %%F in ("src-tauri\target\release\bundle\nsis\%%i") do echo    %%i - 大小: %%~zF 字节
    )
) else (
    echo ❌ 未找到NSIS安装包
)
echo.

if exist "platform-tools\adb.exe" (
    echo ✅ platform-tools资源完整
    echo    adb.exe, fastboot.exe 等工具已包含
) else (
    echo ⚠️ platform-tools目录可能不完整
)
echo.

echo 🎯 测试选项:
echo [1] 🚀 运行独立EXE文件
echo [2] 📦 打开NSIS安装包目录
echo [3] 🔧 检查platform-tools完整性
echo [4] 📱 测试ADB连接
echo [5] 📋 查看发布说明
echo [6] 🧪 运行多设备导入演示
echo [7] 🔄 刷新状态
echo [8] 🚪 退出
echo.

set /p choice=请选择测试选项 (1-8): 

if "%choice%"=="1" (
    echo.
    echo 🚀 启动独立EXE文件...
    echo ℹ️ 如果是首次运行，可能需要几秒钟初始化
    start "" "src-tauri\target\release\employee-gui.exe"
    echo ✅ 应用已启动，请查看新窗口
    
) else if "%choice%"=="2" (
    echo.
    echo 📦 打开NSIS安装包目录...
    if exist "src-tauri\target\release\bundle\nsis" (
        explorer "src-tauri\target\release\bundle\nsis"
        echo ✅ 已打开安装包目录
    ) else (
        echo ❌ NSIS目录不存在
    )
    
) else if "%choice%"=="3" (
    echo.
    echo 🔧 检查platform-tools完整性...
    echo.
    echo 📁 platform-tools目录内容:
    if exist "platform-tools\" (
        dir platform-tools\ /b | findstr /v /c:"目录"
        echo.
        echo 🔍 关键文件检查:
        if exist "platform-tools\adb.exe" (echo ✅ adb.exe) else (echo ❌ adb.exe 缺失)
        if exist "platform-tools\fastboot.exe" (echo ✅ fastboot.exe) else (echo ❌ fastboot.exe 缺失)
        if exist "platform-tools\AdbWinApi.dll" (echo ✅ AdbWinApi.dll) else (echo ❌ AdbWinApi.dll 缺失)
    ) else (
        echo ❌ platform-tools目录不存在
    )
    
) else if "%choice%"=="4" (
    echo.
    echo 📱 测试ADB连接...
    if exist "platform-tools\adb.exe" (
        echo 🔍 检查ADB设备连接...
        platform-tools\adb.exe devices
        echo.
        echo ℹ️ 如需连接设备，请确保:
        echo   1. USB调试已开启
        echo   2. 设备已通过USB连接
        echo   3. 已授权调试权限
    ) else (
        echo ❌ adb.exe不存在，无法测试连接
    )
    
) else if "%choice%"=="5" (
    echo.
    echo 📋 查看发布说明...
    if exist "RELEASE_NOTES_v0.2.0.md" (
        echo ✅ 正在打开发布说明文档...
        start "" "RELEASE_NOTES_v0.2.0.md"
    ) else (
        echo ❌ 发布说明文档不存在
    )
    
) else if "%choice%"=="6" (
    echo.
    echo 🧪 启动应用并导航到多设备导入演示...
    echo ℹ️ 应用启动后，请手动导航到 "联系人管理" -> "多设备导入演示"
    start "" "src-tauri\target\release\employee-gui.exe"
    echo ✅ 应用已启动
    
) else if "%choice%"=="7" (
    echo.
    echo 🔄 刷新状态...
    goto MAIN_MENU
    
) else if "%choice%"=="8" (
    echo.
    echo 👋 退出测试程序
    echo 📝 测试完成时间: %date% %time%
    exit /b 0
    
) else (
    echo.
    echo ❌ 无效选择，请输入1-8之间的数字
)

echo.
echo 📝 按任意键继续...
pause > nul
echo.
goto MAIN_MENU