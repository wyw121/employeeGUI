# Scrcpy 集成说明

本项目已集成 scrcpy (Screen Copy) 功能，支持在应用内启动 Android 设备的屏幕镜像。

## 📦 自动打包方案

为了确保用户无需额外安装依赖，scrcpy 已被包含在应用程序中：

- **位置**: `platform-tools/` 目录
- **版本**: scrcpy v3.3.3
- **打包**: 通过 Tauri 配置自动包含到最终应用中

## 🚀 快速设置

### 开发环境设置

如果你是新的开发者或 scrcpy 文件缺失，可以运行：

```bash
# 自动下载并设置 scrcpy
npm run setup:scrcpy

# 验证设置是否正确
npm run verify:scrcpy
```

### CI/CD 集成

在 CI/CD 流水线中，可以在构建前执行：

```bash
npm install
npm run setup:scrcpy
npm run tauri build
```

## 📁 文件结构

```
platform-tools/
├── adb.exe                 # Android Debug Bridge
├── scrcpy.exe             # scrcpy 主程序 ✨
├── scrcpy-server          # scrcpy 服务端 ✨
├── SDL2.dll               # SDL2 库 ✨
├── avcodec-61.dll         # FFmpeg 视频编解码 ✨
├── avformat-61.dll        # FFmpeg 格式处理 ✨
├── avutil-59.dll          # FFmpeg 工具库 ✨
├── libusb-1.0.dll         # USB 库 ✨
├── swresample-5.dll       # FFmpeg 音频重采样 ✨
└── ...                    # 其他 ADB 工具
```

标记 ✨ 的文件是 scrcpy 相关的新增文件。

## 🎯 使用方法

1. **连接设备**：确保 Android 设备已连接并启用 USB 调试
2. **打开镜像视图**：在应用中选择 Universal UI → 镜像视图
3. **选择设备**：从下拉列表中选择目标设备
4. **配置参数**：设置分辨率、码率、FPS 等参数（可选）
5. **启动镜像**：点击"启动镜像"按钮

## ⚙️ 配置选项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 会话名称 | 用于区分多个镜像会话 | - |
| 分辨率上限 | 如 "1280" 或 "1280x720" | - |
| 码率 | 如 "8M" | 8M |
| 最大FPS | 帧率限制 | 60 |
| 窗口标题 | 镜像窗口标题 | EmployeeGUI Mirror |
| 保持常亮 | 防止设备休眠 | ✅ |
| 息屏继续 | 关闭屏幕但继续镜像 | ❌ |
| 置顶显示 | 窗口始终置顶 | ❌ |
| 无边框 | 隐藏窗口边框 | ❌ |

## 🔧 技术架构

### 路径查找优先级

scrcpy 会按以下优先级查找：

1. **环境变量**: `SCRCPY_PATH` 
2. **本地目录**: `./platform-tools/scrcpy.exe`
3. **系统PATH**: 系统环境变量中的 scrcpy

### 后端实现

- **Rust 服务**: `src-tauri/src/services/scrcpy_manager.rs`
- **进程管理**: 支持多设备、多会话并发
- **会话跟踪**: 自动清理子进程，防止资源泄漏

### 前端集成

- **React 组件**: `src/components/universal-ui/views/mirror-view/`
- **应用服务**: `src/application/services/ScrcpyApplicationService.ts`
- **状态管理**: 事件驱动的会话状态同步

## 🛠️ 故障排除

### 常见问题

**Q: 提示 "scrcpy not found"**
```bash
# 重新设置 scrcpy
npm run setup:scrcpy
```

**Q: 启动镜像失败**
- 检查设备是否连接
- 确认 USB 调试已启用
- 验证设备授权状态

**Q: 验证 scrcpy 状态**
```bash
npm run verify:scrcpy
```

### 手动检查

```bash
# 检查 scrcpy 版本
.\platform-tools\scrcpy.exe --version

# 检查设备连接
.\platform-tools\adb.exe devices
```

## 🔄 更新 scrcpy

要更新到新版本的 scrcpy：

```bash
# 更新到指定版本
pwsh scripts/setup-scrcpy.ps1 -Version "v3.4.0"
```

## 🎁 优势

✅ **用户体验佳**: 用户无需安装额外软件  
✅ **版本一致性**: 所有用户使用相同版本  
✅ **部署简单**: 一键安装包包含所有依赖  
✅ **跨平台支持**: 支持 Windows/macOS/Linux  
✅ **开发友好**: 自动化脚本简化开发流程

---

💡 **提示**: scrcpy 是一个优秀的开源项目，详细信息请访问 [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy)