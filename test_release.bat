@echo off
echo ============================================
echo 🎉 多设备兼容VCF导入系统 - 发布版测试
echo ============================================
echo.
echo 📁 构建产物位置:
echo 💾 独立EXE文件: src-tauri\target\release\employee-gui.exe
echo 📦 NSIS安装包: src-tauri\target\release\bundle\nsis\Employee GUI_0.2.0_x64-setup.exe
echo.
echo 🧪 测试步骤:
echo 1. 安装或直接运行EXE文件
echo 2. 连接Android设备并启用USB调试
echo 3. 测试多设备兼容VCF导入功能
echo.
echo ⚡ 新功能特点:
echo ✅ 华为/荣耀设备专用导入策略
echo ✅ 小米MIUI系统优化
echo ✅ OPPO/vivo/三星品牌支持
echo ✅ 智能策略自动选择
echo ✅ 三重备选方案保障
echo.
echo 🚀 开始测试...
echo.

REM 检查是否有连接的ADB设备
echo 🔍 检查ADB设备连接状态:
.\platform-tools\adb.exe devices

echo.
echo 📋 构建详情:
echo 🗓️ 构建时间: %date% %time%
echo 🏷️ 版本: v0.2.0
echo 🎯 目标: Windows x64
echo 📊 文件大小: ~18MB (EXE) + ~9MB (安装包)
echo.

echo ⚠️ 注意事项:
echo - 确保设备已启用USB调试
echo - 首次使用需要授权ADB调试
echo - 测试时可以查看控制台日志
echo.

echo 🎊 准备就绪！现在可以开始测试多设备兼容VCF导入功能了！
echo.
pause