@echo off
echo ============================================
echo 测试自动化VCF联系人导入功能
echo ============================================

cd /d "c:\开发\employeeGUI"

echo.
echo 1. 启动开发模式...
start "Tauri Dev" cmd /c "npm run tauri dev"

echo.
echo 等待应用启动...
timeout /t 10 /nobreak

echo.
echo 2. 准备测试...
echo 请在GUI中执行以下步骤：
echo    - 打开侧边栏的"通讯录管理"
echo    - 点击"通讯录导入到手机"
echo    - 选择任意CSV文件或使用默认联系人
echo    - 点击"开始导入"

echo.
echo 3. 观察导入过程...
echo 新的后端代码应该能够：
echo    ✅ 自动处理权限对话框
echo    ✅ 自动选择联系人应用
echo    ✅ 自动确认导入操作
echo    ✅ 无需手动干预完成导入

echo.
echo 4. 验证结果...
echo 请在手机上检查联系人是否成功导入

pause