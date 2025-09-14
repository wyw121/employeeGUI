## 员工GUI管理系统 - 发布版本## 员工GUI管理系统 - 发布版本



### 📋 使用说明### 📋 使用说明



1. **运行程序**1. **运行程序**

   - 双击 `employee-gui.exe` 启动程序   - 双击 `employee-gui.exe` 启动程序

   - 首次运行可能需要几秒钟加载时间   - 首次运行可能需要几秒钟加载时间



2. **系统要求**2. **系统要求**

   - Windows 10/11 64位系统   - Windows 10/11 64位系统

   - 已安装Microsoft Edge WebView2运行时（通常Windows已内置）   - 已安装Microsoft Edge WebView2运行时（通常Windows已内置）



3. **功能特性**3. **功能特性**

   - 员工信息管理   - 员工信息管理

   - 联系人导入导出（VCF格式）   - 联系人导入导出（VCF格式）

   - Android设备自动化操作   - Android设备自动化操作

   - 小红书自动化功能   - 小红书自动化功能



4. **文件结构**4. **文件结构**

   ```   ```

   employee-gui-release/   employee-gui-release/

   ├── employee-gui.exe          # 主程序   ├── employee-gui.exe          # 主程序

   ├── platform-tools/          # ADB工具包   ├── platform-tools/          # ADB工具包

   │   ├── adb.exe              # Android调试工具   │   ├── adb.exe              # Android调试工具

   │   └── ...                  # 其他依赖文件   │   └── ...                  # 其他依赖文件

   └── README.md                # 本说明文件   └── README.md                # 本说明文件

   ```   ```



5. **重要修复**5. **注意事项**

   - ✅ 已修复所有终端CMD窗口弹出问题   - 请保持 `platform-tools` 文件夹与主程序在同一目录

   - ✅ 现在所有操作都在后台静默执行   - 如果Windows提示安全警告，选择"仍要运行"

   - ✅ 提供专业的GUI用户体验   - 使用Android功能需要启用USB调试模式



6. **注意事项**6. **故障排除**

   - 请保持 `platform-tools` 文件夹与主程序在同一目录   - 如果程序无法启动，请检查是否安装了WebView2

   - 如果Windows提示安全警告，选择"仍要运行"   - 如果Android设备连接失败，请检查USB调试设置

   - 使用Android功能需要启用USB调试模式   - 程序运行过程中不会弹出命令行窗口（专业GUI体验）



7. **故障排除**### 🔧 技术支持

   - 如果程序无法启动，请检查是否安装了WebView2

   - 如果Android设备连接失败，请检查USB调试设置如有问题请联系开发者。

   - 程序运行过程中不会弹出命令行窗口（专业GUI体验）

---

### 🔧 技术支持版本：0.1.0

构建时间：2025年9月14日
如有问题请联系开发者。

---
版本：0.1.0
构建时间：2025年9月14日
修复：完全消除CMD窗口弹出