# 联系人导入错误修复报告

## 🚫 问题描述

用户在使用"联系人导入向导"页面的设备卡片进行"专家模式导入"时遇到错误：

```
导入联系人过程中出现未知错误
错误详情：invalid args `deviceId` for command `adb_start_activity`: command adb_start_activity missing required key deviceId
```

## 🔍 问题分析

### 根本原因
**参数命名不一致**：`ImportStrategyExecutor.ts` 中直接使用 `invoke()` 调用 Tauri 后端命令，但没有使用项目的参数名称自动转换机制。

### 技术细节

1. **Rust后端定义** (`adb_activity.rs`):
   ```rust
   pub async fn adb_start_activity(
       device_id: String,        // snake_case 命名
       action: String,
       data_uri: Option<String>,
       mime_type: Option<String>,
       component: Option<String>,
   )
   ```

2. **前端调用** (`ImportStrategyExecutor.ts`):
   ```typescript
   // ❌ 错误：直接使用 invoke，参数名不匹配
   const result = await invoke('adb_start_activity', {
     device_id: deviceId,  // 混用了 snake_case 和 camelCase
     action: '...',
   });
   ```

3. **项目有自动转换机制** (`tauriInvoke.ts`):
   ```typescript
   // ✅ invokeCompat 会自动处理参数名称转换
   // snake_case ↔ camelCase 兼容
   ```

## ✅ 解决方案

### 修复内容

1. **替换调用方式**：
   ```typescript
   // ✅ 修复前
   import { invoke } from '@tauri-apps/api/core';
   
   // ✅ 修复后  
   import invokeCompat from '../../../../api/core/tauriInvoke';
   ```

2. **统一使用 invokeCompat**：
   ```typescript
   // ✅ 修复后 - adb_start_activity 调用
   const result = await invokeCompat('adb_start_activity', {
     deviceId: deviceId,           // 使用 camelCase，自动转换为 device_id
     action: 'android.intent.action.VIEW',
     dataUri: `file://${vcfPath}`,  // 自动转换为 data_uri
     mimeType: mimeType,           // 自动转换为 mime_type
     component
   });
   ```

3. **修复的命令调用**：
   - `adb_start_activity` (2处)
   - `safe_adb_push` (1处) 
   - `adb_query_contact_by_phone` (1处)
   - `safe_adb_shell_command` (1处)

### 额外修复

**Antd 废弃 API 警告**：
```typescript
// ❌ 修复前
<Select onDropdownVisibleChange={...} />

// ✅ 修复后  
<Select onOpenChange={...} />
```

## 🎯 修复文件列表

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `ImportStrategyExecutor.ts` | 核心修复 | 替换所有`invoke`为`invokeCompat` |
| `DeviceCard.tsx` | API更新 | 修复Antd废弃警告 |

## 🧪 验证步骤

修复完成后，建议验证：

1. **功能测试**：
   - 打开"联系人导入向导"页面
   - 选择设备卡片，点击"导入"按钮
   - 选择"专家模式导入"
   - 确认不再出现 `deviceId` 参数错误

2. **日志检查**：
   - 检查浏览器控制台，确认没有参数相关错误
   - 确认导入过程正常执行

3. **回归测试**：
   - 测试其他导入策略是否正常工作
   - 验证设备连接和文件推送功能

## 📋 技术要点

### invokeCompat 机制优势

1. **自动参数转换**：
   - 前端使用 `camelCase`
   - 后端接收 `snake_case` 
   - 自动双向兼容

2. **错误回退机制**：
   - 优先尝试 `snake_case`
   - 失败时自动回退到 `camelCase`
   - 提供详细的错误日志

3. **项目一致性**：
   - 所有 Tauri 调用都应使用 `invokeCompat`
   - 避免参数命名不匹配问题

### 开发规范建议

1. **强制使用 invokeCompat**：
   ```typescript
   // ❌ 避免直接使用
   import { invoke } from '@tauri-apps/api/core';
   
   // ✅ 统一使用
   import invokeCompat from '../../../../api/core/tauriInvoke';
   ```

2. **参数命名约定**：
   - 前端始终使用 `camelCase`
   - 让 `invokeCompat` 处理转换
   - 不要手动混用命名风格

## 🎉 预期结果

修复后：
- ✅ 联系人导入功能正常工作
- ✅ 消除 `deviceId` 参数错误
- ✅ 消除 Antd 废弃 API 警告  
- ✅ 提升代码一致性和维护性

---

**修复时间**: 2024年12月19日  
**影响范围**: 联系人导入模块  
**风险等级**: 低 (向下兼容)  
**测试状态**: ✅ 类型检查通过