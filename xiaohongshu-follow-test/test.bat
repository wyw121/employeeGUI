@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 小红书自动关注测试脚本 (Windows)
REM 使用前请确保：
REM 1. Android设备/模拟器已连接
REM 2. 小红书应用已安装并登录
REM 3. 通讯录已导入到设备

REM 设备ID - 请根据实际情况修改
set DEVICE_ID=emulator-5554

echo 🚀 小红书自动关注测试开始
echo 📱 目标设备: %DEVICE_ID%
echo.

REM 步骤1: 检查设备连接
echo 📋 步骤1: 检查设备连接
adb devices
echo.

REM 步骤2: 检查小红书应用状态
echo 📋 步骤2: 检查小红书应用状态
cargo run -- check-app --device %DEVICE_ID%
echo.

REM 等待用户确认
pause
echo.

REM 步骤3: 导航到通讯录页面
echo 📋 步骤3: 导航到通讯录页面
cargo run -- navigate --device %DEVICE_ID%
echo.

REM 等待用户确认
pause
echo.

REM 步骤4: 小规模测试（1页）
echo 📋 步骤4: 小规模测试关注功能（1页）
cargo run -- follow --device %DEVICE_ID% --max-pages 1 --interval 3000 --skip-existing --return-home
echo.

REM 等待用户确认是否继续大规模测试
set /p "continue=📝 小规模测试完成，是否继续大规模测试？(y/n): "

if /i "%continue%"=="y" (
    echo 📋 步骤5: 大规模测试关注功能（5页）
    cargo run -- follow --device %DEVICE_ID% --max-pages 5 --interval 2000 --skip-existing --return-home
    echo.
)

echo 🎉 测试完成！
echo 💡 如需查看详细日志，请检查控制台输出
echo 📊 如需完整工作流程，请使用: cargo run -- complete --device %DEVICE_ID% --contacts-file contacts.vcf --max-pages 5 --interval 2000

pause