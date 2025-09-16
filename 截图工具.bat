@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo ========================================
echo     ADB 手机截图工具
echo ========================================
echo.
node scripts/screenshot.js
echo.
echo 按任意键退出...
pause > nul