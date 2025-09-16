@echo off
echo 测试发布版本的ADB路径检测功能
echo ================================

:: 创建临时测试目录
set TEST_DIR=%TEMP%\employee_gui_test
if exist "%TEST_DIR%" rmdir /s /q "%TEST_DIR%"
mkdir "%TEST_DIR%"

:: 复制exe文件
copy "src-tauri\target\release\employee-gui.exe" "%TEST_DIR%\"

:: 复制platform-tools目录
xcopy "platform-tools" "%TEST_DIR%\platform-tools\" /E /I /Q

echo.
echo 测试目录结构:
dir "%TEST_DIR%" /B
echo.
echo Platform-tools内容:
dir "%TEST_DIR%\platform-tools" /B

echo.
echo 现在可以在 %TEST_DIR% 目录下测试发布版本
echo 该目录包含:
echo - employee-gui.exe (主程序)
echo - platform-tools\adb.exe (ADB工具)
echo.
echo 这模拟了发布后的目录结构，应该使用相对路径 platform-tools\adb.exe

pause