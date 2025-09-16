# ADB路径智能检测功能说明

## 概述
实现了环境感知的ADB路径检测，支持开发和生产环境下的自动路径选择。

## 路径检测优先级

### 1. 生产环境（发布后的exe）
- **优先路径**: `platform-tools\adb.exe` (相对路径)
- **说明**: 发布时，platform-tools目录与exe文件在同一目录下

### 2. 开发环境（npm run tauri dev）
- **优先路径**: `platform-tools/adb.exe` (Unix风格相对路径)
- **说明**: 开发时使用项目根目录下的platform-tools

### 3. 系统环境路径
- `%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- `%TEMP%\platform-tools\adb.exe`
- Android SDK标准安装路径

### 4. 模拟器路径（向后兼容）
- 雷电模拟器各版本的ADB路径

## 实现细节

### 后端 (Rust)
- **文件**: `src-tauri/src/services/adb_service.rs`
- **函数**: `detect_smart_adb_path_impl()`
- **Tauri命令**: `detect_smart_adb_path`

### 前端 (TypeScript)
- **服务**: `src/services/adbService.ts`
- **状态管理**: `src/store/deviceStore.ts`
- **组件**: 各设备相关组件都使用智能检测

## 配置文件
- **Tauri配置**: `src-tauri/tauri.conf.json`
- **资源打包**: `"../platform-tools/*"` 确保ADB工具被包含在发布包中

## 使用场景

### 开发时
```bash
npm run tauri dev
```
- 自动检测项目根目录下的 `platform-tools/adb.exe`
- 如果不存在，回退到系统路径

### 生产发布后
```
employee-gui.exe (程序主文件)
platform-tools/
  ├── adb.exe
  ├── fastboot.exe
  └── ... (其他工具)
```
- 自动检测相对路径 `platform-tools\adb.exe`
- 确保与exe文件打包在一起的ADB工具被优先使用

## 优势
1. **零配置**: 用户无需手动设置ADB路径
2. **环境适应**: 自动适应开发和生产环境
3. **向后兼容**: 支持现有的模拟器配置
4. **错误恢复**: 多级回退机制确保稳定性

## 测试验证
- ✅ 开发环境ADB检测
- ✅ 设备连接功能
- ✅ 生产构建
- ✅ 相对路径配置

最终用户在使用发布版本时，ADB工具使用相对路径 `platform-tools\adb.exe`，确保了便携性和可靠性。