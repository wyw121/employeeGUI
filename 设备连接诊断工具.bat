@echo off
chcp 65001 >nul
echo ==========================================
echo    📱 设备连接自动诊断工具
echo ==========================================
echo.

echo 🔍 正在检查ADB工具...
if not exist "platform-tools\adb.exe" (
    echo ❌ 错误: 未找到ADB工具
    echo    请确保platform-tools文件夹在程序同目录下
    pause
    exit
)

echo ✅ ADB工具存在

echo.
echo 🔍 正在检查设备连接...
cd platform-tools
adb devices > temp_devices.txt

echo.
echo 📋 设备检测结果:
echo ==========================================
type temp_devices.txt
echo ==========================================
echo.

findstr /C:"device" temp_devices.txt > nul
if %errorlevel% == 0 (
    echo ✅ 检测到已连接的设备
) else (
    echo ❌ 未检测到设备
    echo.
    echo 💡 可能的解决方案:
    echo    1. 检查USB线是否为数据线
    echo    2. 确保手机已开启USB调试
    echo    3. 检查手机是否弹出授权提示
    echo    4. 尝试更换USB端口
)

findstr /C:"unauthorized" temp_devices.txt > nul
if %errorlevel% == 0 (
    echo ⚠️  设备未授权
    echo    请检查手机是否弹出ADB授权提示
    echo    选择"始终允许来自这台计算机"并确定
)

findstr /C:"offline" temp_devices.txt > nul
if %errorlevel% == 0 (
    echo ⚠️  设备离线
    echo    正在尝试重启ADB服务...
    adb kill-server
    timeout /t 2 >nul
    adb start-server
    echo    请重新检测设备连接
)

echo.
echo 🔍 检查ADB版本信息...
adb version

echo.
echo 🔍 检查系统驱动状态...
echo 请检查设备管理器中是否有带感叹号的Android设备
echo 如有，请右键更新驱动程序

del temp_devices.txt >nul 2>&1

echo.
echo ==========================================
echo 诊断完成！
echo.
echo 如果仍有问题，请：
echo 1. 以管理员身份运行本程序
echo 2. 关闭杀毒软件/防火墙
echo 3. 查看《设备连接问题解决指南.md》
echo ==========================================
echo.
pause