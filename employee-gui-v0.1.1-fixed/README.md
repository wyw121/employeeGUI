# Employee GUI 桌面应用使用指南

## 简介
Employee GUI 是一个基于 Tauri 开发的桌面应用程序，用于员工管理和设备自动化操作。

## 系统要求
- Windows 10 或更高版本
- 需要 Android 设备和 ADB 调试模式

## 安装与使用

### 快速开始
1. 解压整个 `employee-gui-release` 文件夹到你想要的位置
2. 双击 `employee-gui.exe` 启动应用程序

### 文件说明
```
employee-gui-release/
├── employee-gui.exe          # 主程序文件
├── platform-tools/           # ADB 工具集（必需）
│   ├── adb.exe               # Android Debug Bridge
│   ├── AdbWinApi.dll         # ADB Windows API
│   ├── AdbWinUsbApi.dll      # ADB USB API
│   └── ...                   # 其他相关工具
└── README.md                 # 本说明文件
```

### ADB 依赖说明
本应用依赖 Android Debug Bridge (ADB) 工具来与 Android 设备通信。程序会自动查找以下位置的 ADB：

1. 应用程序目录下的 `platform-tools/adb.exe`（推荐）
2. 系统 PATH 环境变量中的 `adb.exe`

**重要：** 请确保整个 `platform-tools` 文件夹与 `employee-gui.exe` 在同一目录下，不要移动或删除其中的任何文件。

### 设备连接设置
1. 在 Android 设备上启用 USB 调试：
   - 进入设置 → 关于手机 → 连续点击版本号 7 次启用开发者模式
   - 进入设置 → 开发者选项 → 启用 USB 调试

2. 用 USB 线连接设备到电脑

3. 首次连接时，设备会询问是否允许 USB 调试，选择"允许"

### 功能特性
- 员工信息管理
- Android 设备自动化操作
- 联系人管理和导入
- 小红书自动关注功能
- 设备状态监控

### 故障排除

#### 应用无法启动
- 确保 Windows 版本兼容（Windows 10+）
- 检查是否被杀毒软件拦截
- 尝试以管理员身份运行

#### 设备连接问题
- 确保设备已启用 USB 调试
- 尝试重新连接 USB 线
- 检查设备驱动是否正确安装
- 在命令行运行 `platform-tools\adb.exe devices` 检查设备连接状态

#### ADB 相关错误
- 确保 `platform-tools` 文件夹完整
- 检查是否有其他 ADB 进程占用（可重启电脑解决）
- 确保 USB 线支持数据传输（不是仅充电线）

### 技术支持
如遇到问题，请检查：
1. Windows 事件查看器中的应用程序日志
2. 应用程序目录下的日志文件（如果有）
3. 确保所有文件完整且未被修改

### 注意事项
- 本应用需要与 Android 设备建立连接，请确保设备处于开发者模式
- 某些功能可能需要设备 root 权限
- 请合法合规使用自动化功能
- 建议在使用前备份重要数据

### 更新说明
要更新应用程序：
1. 下载新版本的发布包
2. 关闭当前运行的应用
3. 用新文件替换旧的 `employee-gui.exe`
4. 保留 `platform-tools` 文件夹（除非特别说明需要更新）

---
*版本：0.1.0*  
*构建日期：2025年9月14日*