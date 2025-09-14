@echo off
cd /d "%~dp0"
echo 测试 ADB 工具...
echo.
echo 检查 ADB 版本：
platform-tools\adb.exe version
echo.
echo 检查连接的设备：
platform-tools\adb.exe devices
echo.
echo 如果看到设备列表，说明 ADB 工作正常
echo 如果没有设备，请确保：
echo 1. Android 设备已连接
echo 2. 已启用 USB 调试
echo 3. 已允许此计算机进行调试
echo.
pause