# VCF通讯录导入功能集成指南

本文档介绍如何在员工GUI桌面程序中使用VCF通讯录导入功能。

## 🎯 功能概览

VCF通讯录导入功能允许用户将联系人数据批量导入到Android设备的通讯录中，主要包含以下模块：

- **VcfImportService** - 核心服务类，负责调用后端API和处理业务逻辑
- **VcfImportDialog** - 导入对话框组件，提供友好的用户界面
- **VcfImporter** - 主要的导入组件，整合了所有功能
- **VcfImportDemo** - 演示页面，展示如何使用导入功能

## 📁 文件结构

```
src/
├── services/
│   └── VcfImportService.ts          # VCF导入服务
├── components/contact/
│   ├── VcfImporter.tsx              # VCF导入主组件
│   ├── VcfImportDialog.tsx          # VCF导入对话框
│   ├── VcfImportDemo.tsx            # 功能演示页面
│   └── index.ts                     # 组件导出
├── api/
│   └── ContactAPI.ts                # 联系人API（已更新）
└── types/
    └── Contact.ts                   # 类型定义（已包含VCF相关类型）
```

## 🚀 快速开始

### 1. 基本使用

```tsx
import React from 'react';
import { VcfImporter } from '../components/contact';
import { Contact } from '../types';

const MyComponent: React.FC = () => {
  const contacts: Contact[] = [
    {
      id: '1',
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com'
    }
  ];

  const handleImportComplete = (result: VcfImportResult) => {
    if (result.success) {
      console.log(`导入成功！共导入 ${result.importedContacts} 个联系人`);
    } else {
      console.error(`导入失败：${result.message}`);
    }
  };

  return (
    <VcfImporter
      selectedDevice="127.0.0.1:5555"
      contacts={contacts}
      onImportComplete={handleImportComplete}
      onError={(error) => console.error(error)}
    />
  );
};
```

### 2. 使用对话框组件

```tsx
import React, { useState } from 'react';
import { VcfImportDialog } from '../components/contact';

const MyComponent: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [contacts] = useState<Contact[]>([/* 联系人数据 */]);

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        开始导入
      </button>

      <VcfImportDialog
        visible={showDialog}
        contacts={contacts}
        onClose={() => setShowDialog(false)}
        onImportComplete={(result) => {
          console.log('导入完成:', result);
          setShowDialog(false);
        }}
      />
    </>
  );
};
```

### 3. 直接使用服务类

```tsx
import { VcfImportService } from '../services/VcfImportService';

// 检查工具是否可用
const toolAvailable = await VcfImportService.checkToolAvailable();

// 获取设备列表
const devices = await VcfImportService.getAdbDevices();

// 执行导入
const result = await VcfImportService.importVcfFile(vcfFilePath, deviceId);
```

## ⚙️ 配置要求

### 前端依赖

确保项目已安装以下依赖：

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.x.x",
    "antd": "^5.x.x",
    "lucide-react": "^0.x.x",
    "react": "^18.x.x"
  }
}
```

### 后端要求

需要在Tauri后端实现以下命令处理程序：

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            execute_vcf_import,
            check_vcf_import_tool,
            get_adb_devices,
            write_file,
            delete_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn execute_vcf_import(vcf_file_path: String, device_id: String) -> Result<VcfImportResult, String> {
    // 调用 adb_xml_reader.exe 执行导入
    // 实现细节请参考后端开发文档
}

#[tauri::command]
async fn check_vcf_import_tool() -> Result<bool, String> {
    // 检查 adb_xml_reader.exe 是否存在和可执行
}

#[tauri::command]
async fn get_adb_devices() -> Result<Vec<String>, String> {
    // 获取连接的ADB设备列表
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    // 写入文件内容
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    // 删除文件
}
```

### 外部工具

1. **adb_xml_reader.exe** - 位于 `../Flow_Farm/adb_xml_reader/target/release/`
2. **ADB工具** - Android Debug Bridge，需要在系统PATH中
3. **Android设备** - 启用USB调试，已连接并授权

## 📋 API接口

### VcfImportService

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `importVcfFile` | `vcfFilePath: string, deviceId: string` | `Promise<VcfImportResult>` | 执行VCF导入 |
| `checkToolAvailable` | - | `Promise<boolean>` | 检查工具是否可用 |
| `getAdbDevices` | - | `Promise<string[]>` | 获取设备列表 |
| `generateTempVcfPath` | - | `string` | 生成临时文件路径 |
| `convertContactsToVcfContent` | `contacts: Contact[]` | `string` | 转换为VCF格式 |
| `writeVcfFile` | `filePath: string, content: string` | `Promise<void>` | 写入VCF文件 |
| `deleteTempFile` | `filePath: string` | `Promise<void>` | 删除临时文件 |

### 组件Props

#### VcfImporter
```typescript
interface VcfImporterProps {
  selectedDevice?: string;           // 选中的设备ID
  contacts: Contact[];              // 待导入的联系人数组
  onImportComplete?: (result: VcfImportResult) => void; // 导入完成回调
  onError?: (error: string) => void; // 错误处理回调
}
```

#### VcfImportDialog
```typescript
interface VcfImportDialogProps {
  visible: boolean;                 // 对话框是否可见
  contacts: Contact[];              // 待导入的联系人数组
  onClose: () => void;              // 关闭对话框回调
  onImportComplete?: (result: VcfImportResult) => void; // 导入完成回调
}
```

## 🔧 自定义配置

### 修改工具路径

如果需要修改adb_xml_reader.exe的路径，可以在后端代码中配置：

```rust
const ADB_XML_READER_PATH: &str = "your/custom/path/adb_xml_reader.exe";
```

### 自定义VCF格式

可以修改`VcfImportService.convertContactsToVcfContent`方法来支持不同的VCF格式：

```typescript
static convertContactsToVcfContent(contacts: Contact[]): string {
  return contacts.map(contact => 
    // 自定义格式: 姓名,电话,地址,职业,邮箱
    `${contact.name},${contact.phone || ''},${contact.address || ''},${contact.occupation || ''},${contact.email || ''}`
  ).join('\n');
}
```

## 🐛 故障排除

### 常见问题

1. **工具不可用**
   - 检查 `adb_xml_reader.exe` 是否存在
   - 确认文件有执行权限
   - 检查路径配置是否正确

2. **设备连接失败**
   - 确认ADB已安装并在PATH中
   - 检查设备USB调试是否开启
   - 确认设备已授权ADB连接

3. **导入失败**
   - 检查VCF文件格式是否正确
   - 确认设备存储空间充足
   - 检查联系人应用权限

### 调试方法

1. **启用详细日志**
```typescript
// 在浏览器控制台查看详细日志
console.log('VCF导入调试信息');
```

2. **检查后端日志**
```rust
// 在Rust代码中添加日志
println!("VCF导入执行: {:?}", result);
```

3. **测试命令行工具**
```bash
# 直接测试adb_xml_reader.exe
./adb_xml_reader.exe --import-vcf test.txt --device "127.0.0.1:5555"
```

## 📈 性能优化

1. **批量处理** - 避免频繁的单个联系人导入
2. **缓存设备列表** - 减少重复的设备查询
3. **异步处理** - 使用后台任务处理大量数据
4. **错误重试** - 实现智能重试机制

## 🔄 更新日志

### v1.0.0 (2025-09-09)
- ✅ 初始版本发布
- ✅ 支持VCF格式通讯录导入
- ✅ 提供友好的用户界面
- ✅ 集成adb_xml_reader工具
- ✅ 支持批量联系人导入
- ✅ 提供详细的导入结果反馈

## 📝 许可证

本功能作为员工GUI桌面程序的一部分，遵循项目的开源许可证。
