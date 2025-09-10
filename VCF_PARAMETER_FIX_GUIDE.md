# VCF导入参数修复指南

## 问题描述

用户在使用GUI程序导入VCF联系人时遇到错误：
```
导入失败: invalid args `deviceId` for command `import_vcf_contacts`: command import_vcf_contacts missing required key deviceId
```

该错误是由于前端和后端参数名称不匹配导致的。

## 根本原因分析

### 1. 后端命令定义
在 `src-tauri/src/services/contact_automation.rs` 中，命令定义为：
```rust
#[command]
pub async fn import_vcf_contacts(
    device_id: String,           // 使用snake_case
    contacts_file_path: String,  // 使用snake_case
) -> Result<VcfImportResult, String>
```

### 2. 前端API调用问题
在 `src/api/ContactAPI.ts` 中，错误地使用了camelCase参数名：
```typescript
// 错误的参数名称
return await invoke<VcfImportResult>("import_vcf_contacts", {
  deviceId,        // 应该是 device_id
  contactsFilePath, // 应该是 contacts_file_path
});
```

### 3. VcfImportService正确实现
在 `src/services/VcfImportService.ts` 中，使用了正确的参数名称：
```typescript
// 正确的参数名称
const result = await invoke<VcfImportResult>("import_vcf_contacts", {
  device_id: deviceId,
  contacts_file_path: vcfFilePath,
});
```

## 修复步骤

### 1. 修复ContactAPI.ts中的参数名称

**文件**: `src/api/ContactAPI.ts`

**修改前**:
```typescript
static async importVcfContacts(
  deviceId: string,
  contactsFilePath: string
): Promise<VcfImportResult> {
  return await invoke<VcfImportResult>("import_vcf_contacts", {
    deviceId,           // 错误：camelCase
    contactsFilePath,   // 错误：camelCase
  });
}
```

**修改后**:
```typescript
static async importVcfContacts(
  deviceId: string,
  contactsFilePath: string
): Promise<VcfImportResult> {
  return await invoke<VcfImportResult>("import_vcf_contacts", {
    device_id: deviceId,                    // 正确：snake_case
    contacts_file_path: contactsFilePath,   // 正确：snake_case
  });
}
```

### 2. 确保VcfImportService使用正确参数

**文件**: `src/services/VcfImportService.ts`

已经使用正确的参数名称：
```typescript
const result = await invoke<VcfImportResult>("import_vcf_contacts", {
  device_id: deviceId,
  contacts_file_path: vcfFilePath,
});
```

### 3. 添加详细错误日志

在 `src/services/VcfImportService.ts` 中添加了更详细的错误处理：
```typescript
} catch (error) {
  console.error("VCF导入执行失败:", error);
  console.error("详细错误信息:", error);
  
  // 如果是参数错误，提供更详细的调试信息
  if (error instanceof Error && error.message.includes('missing required key')) {
    console.error("参数传递问题 - 传递的参数:", {
      device_id: deviceId,
      contacts_file_path: vcfFilePath,
    });
  }
}
```

### 4. 后端日志增强

在 `src-tauri/src/services/contact_automation.rs` 中添加了参数接收日志：
```rust
pub async fn import_vcf_contacts(
    device_id: String,
    contacts_file_path: String,
) -> Result<VcfImportResult, String> {
    info!("开始VCF导入: 设备 {} 文件 {}", device_id, contacts_file_path);
    
    // 添加详细的参数日志
    info!("接收到的参数 - device_id: '{}', contacts_file_path: '{}'", device_id, contacts_file_path);
    
    // ... 其余代码
}
```

## 验证步骤

1. **重启应用程序**：
   ```bash
   npm run tauri dev
   ```

2. **测试VCF导入功能**：
   - 导航到联系人管理页面
   - 选择VCF文件
   - 选择目标设备
   - 执行导入操作

3. **检查控制台输出**：
   - 确认参数正确传递到后端
   - 验证没有参数名称错误

## 预期结果

修复后，VCF导入功能应该：

1. **正确传递参数**：前端使用snake_case参数名称与后端匹配
2. **显示详细日志**：可以在控制台看到参数传递的详细信息
3. **成功导入联系人**：联系人应该成功导入到指定的Android设备
4. **错误处理**：如果出现其他错误，会显示更有用的错误信息

## 注意事项

- 确保前端的任何invoke调用都使用snake_case参数名称与Rust后端匹配
- Tauri命令参数名称必须在前端和后端之间完全一致
- 如果添加新的命令，请确保参数命名约定一致

## 相关文件

- `src/api/ContactAPI.ts` - 修复参数名称
- `src/services/VcfImportService.ts` - 已正确实现
- `src-tauri/src/services/contact_automation.rs` - 命令定义和日志
- `src/components/contact/ContactImportManager.tsx` - 使用VcfImportService
