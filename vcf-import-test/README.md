# VCF通讯录导入测试模块

这是一个独立的Rust项目，专门用于测试VCF通讯录导入功能。通过这个模块，您可以：

1. 快速测试通讯录导入的核心功能
2. 验证不同设备上的导入效果
3. 调试和优化导入流程
4. 为主GUI程序提供经过验证的导入逻辑

## 项目结构

```
vcf-import-test/
├── Cargo.toml          # Rust项目配置
├── README.md           # 本文档
├── src/
│   ├── main.rs         # 命令行工具主程序
│   └── vcf_importer.rs # 核心导入逻辑
└── test-data/          # 测试数据目录
    └── sample_contacts.txt # 示例联系人文件
```

## 快速开始

### 1. 生成示例数据

```bash
cd vcf-import-test
cargo run -- sample
```

这会在 `test-data/sample_contacts.txt` 生成示例联系人数据。

### 2. 测试解析功能

```bash
cargo run -- parse -f test-data/sample_contacts.txt
```

验证联系人文件是否能够正确解析。

### 3. 测试导入功能

首先确保您的雷电模拟器已启动，然后：

```bash
# 替换 emulator-5554 为您的设备ID
cargo run -- import -d emulator-5554 -f test-data/sample_contacts.txt
```

## 联系人文件格式

支持TXT格式，每行一个联系人，字段用逗号分隔：

```
姓名,电话,地址,职业,邮箱
张三,13800138001,北京市朝阳区,软件工程师,zhangsan@example.com
李四,13800138002,上海市浦东新区,产品经理,lisi@example.com
```

## 命令参考

### 导入联系人

```bash
cargo run -- import -d <设备ID> -f <联系人文件>
```

**参数说明：**
- `-d, --device`: 目标Android设备ID (例如: emulator-5554)
- `-f, --file`: 联系人文件路径

**示例：**
```bash
cargo run -- import -d emulator-5554 -f test-data/sample_contacts.txt
```

### 解析测试

```bash
cargo run -- parse -f <联系人文件>
```

**参数说明：**
- `-f, --file`: 要解析的联系人文件路径

### 生成示例

```bash
cargo run -- sample [-o <输出路径>]
```

**参数说明：**
- `-o, --output`: 输出文件路径 (默认: test-data/sample_contacts.txt)

## 工作流程

1. **解析联系人文件** - 读取TXT格式的联系人数据
2. **生成VCF文件** - 将联系人转换为标准VCF格式
3. **推送到设备** - 使用ADB将VCF文件传输到Android设备
4. **触发导入** - 使用Android Intent打开VCF文件
5. **等待完成** - 等待用户在设备上完成导入操作

## 前置条件

1. **ADB工具** - 确保系统PATH中有adb命令
2. **Android设备** - 雷电模拟器或真实设备
3. **USB调试** - 设备已开启USB调试模式
4. **联系人应用** - 设备上已安装联系人/通讯录应用

## 设备连接验证

在运行测试之前，请确认设备连接正常：

```bash
adb devices
```

应该能看到类似输出：
```
List of devices attached
emulator-5554   device
emulator-5556   device
```

## 测试结果说明

导入测试完成后，程序会显示详细结果：

```
=== 导入结果 ===
设备: emulator-5554
成功: true
总联系人数: 5
导入成功: 5
导入失败: 0
消息: VCF文件已推送到设备并打开
耗时: 3秒
详细信息: 设备路径: /sdcard/Download/contacts_import.vcf

✅ 导入测试成功！
```

## 故障排除

### 常见问题

1. **设备连接失败**
   - 检查adb devices输出
   - 确认设备已开启USB调试
   - 尝试重启ADB: `adb kill-server && adb start-server`

2. **推送文件失败**
   - 检查设备存储权限
   - 确认/sdcard/Download目录存在
   - 尝试使用其他目录路径

3. **Intent打开失败**
   - 确认设备上已安装联系人应用
   - 检查VCF文件是否正确生成
   - 尝试手动在设备上打开VCF文件

## 集成到主程序

当此模块测试稳定后，可以将 `vcf_importer.rs` 中的核心逻辑集成到主GUI程序的通讯录管理功能中。

主要集成步骤：
1. 复制 `VcfImporter` 结构体和方法
2. 适配Tauri命令接口
3. 更新前端调用逻辑
4. 进行完整的端到端测试

## 开发建议

1. **优先在此模块中验证新功能** - 避免在主GUI程序中进行复杂调试
2. **保持接口简洁** - 为未来集成做好准备
3. **详细记录测试结果** - 帮助识别不同设备上的兼容性问题
4. **逐步增强功能** - 从基础导入开始，逐步添加高级特性