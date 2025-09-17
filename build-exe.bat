@echo off
chcp 65001 >nul
echo 🚀 构建员工引流工具 - 仅可执行文件
echo.

if not exist "src-tauri\tauri.conf.json" (
    echo ❌ 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo 📦 正在编译...
npx tauri build --no-bundle

if %errorlevel% == 0 (
    echo.
    echo ✅ 构建成功！
    echo 📍 可执行文件位置: src-tauri\target\release\employee-gui.exe
    
    REM 复制到根目录
    copy "src-tauri\target\release\employee-gui.exe" "employee-gui.exe" >nul 2>&1
    echo 📋 已复制到根目录: employee-gui.exe
    
    echo.
    echo 🎉 构建完成！
) else (
    echo ❌ 构建失败
)

echo.
pause