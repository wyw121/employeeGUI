@echo off
chcp 65001 > nul
title 多设备VCF导入功能测试

echo 🎯 多设备VCF导入功能专项测试
echo ===============================
echo.
echo 📱 本测试专门验证以下功能:
echo   • 多品牌Android设备自动识别
echo   • 10+种导入策略智能选择
echo   • VCF联系人文件批量导入
echo   • 设备兼容性实时测试
echo.

echo 🔍 环境检查...
if exist "src-tauri\target\release\employee-gui.exe" (
    echo ✅ 发布版本已就绪
) else (
    echo ❌ 发布版本不存在，请先运行 npm run tauri build
    pause
    exit /b 1
)

if exist "platform-tools\adb.exe" (
    echo ✅ ADB工具已准备
) else (
    echo ❌ platform-tools目录缺失
    pause
    exit /b 1
)
echo.

echo 📱 检查设备连接...
platform-tools\adb.exe devices
echo.

echo 🚀 启动应用...
echo.
echo 💡 测试指南:
echo   1. 应用启动后，导航到 "联系人管理" 页面
echo   2. 点击 "多设备导入演示" 选项卡
echo   3. 选择已连接的Android设备
echo   4. 上传VCF联系人文件进行测试
echo   5. 观察多策略导入过程和结果
echo.

echo ⏰ 正在启动应用，请稍候...
start "" "src-tauri\target\release\employee-gui.exe"

echo.
echo 🎉 应用已启动！
echo.
echo 📋 测试要点:
echo   • 验证设备品牌检测是否准确
echo   • 测试VCF文件导入是否成功
echo   • 检查联系人是否正确显示在设备中
echo   • 尝试不同品牌设备的兼容性
echo.

echo 📝 如遇问题，请记录:
echo   • 设备型号和Android版本
echo   • 错误信息截图
echo   • 导入策略测试结果
echo.

echo 👋 按任意键结束测试程序
pause > nul