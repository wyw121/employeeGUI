# 小红书通讯录自动关注测试工具

这是一个独立的命令行工具，用于测试小红书通讯录好友自动关注功能。

## 功能特性

- ✅ 检查小红书应用状态（安装/运行状态）
- ✅ 自动导航到小红书通讯录页面
- ✅ 批量自动关注通讯录中的好友
- ✅ 完整工作流程支持
- ✅ 详细的执行日志和结果报告
- ✅ 可配置的关注参数（页数、间隔、跳过已关注等）

## 使用方法

### 1. 编译程序

```bash
cargo build --release
```

### 2. 基本命令

#### 检查应用状态
```bash
cargo run -- check-app --device emulator-5554
```

#### 导航到通讯录页面
```bash
cargo run -- navigate --device emulator-5554
```

#### 执行自动关注
```bash
cargo run -- follow --device emulator-5554 --max-pages 3 --interval 2000 --skip-existing --return-home
```

#### 完整工作流程
```bash
cargo run -- complete --device emulator-5554 --contacts-file "contacts.vcf" --max-pages 5 --interval 2000
```

### 3. 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--device` | Android设备ID | 必需 |
| `--max-pages` | 最大处理页数 | 5 |
| `--interval` | 关注间隔（毫秒） | 2000 |
| `--skip-existing` | 跳过已关注用户 | false |
| `--return-home` | 完成后返回主页 | false |
| `--contacts-file` | 联系人VCF文件路径 | 仅complete命令需要 |

## 前置条件

1. **Android设备或模拟器**
   - 确保设备已连接并通过`adb devices`可以看到
   - 推荐使用模拟器（如 emulator-5554, emulator-5556）

2. **小红书应用**
   - 设备上已安装小红书应用
   - 已登录并完成基础设置

3. **ADB工具**
   - 系统PATH中有adb命令
   - 或确保项目根目录有platform-tools文件夹

4. **通讯录准备**
   - 已导入联系人到设备通讯录
   - 小红书已同步通讯录好友

## 使用流程

### 快速测试流程

1. **检查环境**
   ```bash
   # 检查连接的设备
   adb devices
   
   # 检查小红书应用状态
   cargo run -- check-app --device emulator-5554
   ```

2. **测试导航**
   ```bash
   # 导航到通讯录页面
   cargo run -- navigate --device emulator-5554
   ```

3. **执行关注**
   ```bash
   # 小规模测试（1页，较长间隔）
   cargo run -- follow --device emulator-5554 --max-pages 1 --interval 3000 --skip-existing
   ```

### 完整自动化流程

```bash
# 执行完整流程：检查应用 -> 导航页面 -> 批量关注
cargo run -- complete --device emulator-5554 --contacts-file "path/to/contacts.vcf" --max-pages 5 --interval 2000
```

## 日志和调试

- 程序使用 `tracing` 框架提供详细日志
- 所有操作都有状态反馈和错误提示
- 关注结果包含详细的成功/失败统计

## 注意事项

1. **安全使用**
   - 建议首次使用时设置较小的页数（1-2页）
   - 关注间隔不要太短（建议2秒以上）
   - 在测试环境中验证后再用于正式环境

2. **错误处理**
   - 如果导航失败，可能需要手动打开小红书并导航到通讯录页面
   - 如果关注失败，检查网络状态和应用权限

3. **性能考虑**
   - 大批量关注时适当增加间隔时间
   - 避免在网络不稳定时执行
   - 关注过程中不要操作设备

## 故障排除

### 应用检查失败
- 确保小红书应用已安装
- 检查adb连接状态：`adb devices`

### 导航失败
- 手动打开小红书应用
- 确保应用处于主界面
- 检查应用版本兼容性

### 关注失败
- 检查网络连接
- 确保已登录小红书
- 验证通讯录权限

## 开发说明

- 本工具基于ADB命令和UI自动化
- 使用Rust编写，支持异步操作
- 可以作为独立工具使用，也可以集成到其他项目中

## 相关项目

这个工具是主项目 `employeeGUI` 的一个独立测试模块，用于验证小红书自动关注功能。