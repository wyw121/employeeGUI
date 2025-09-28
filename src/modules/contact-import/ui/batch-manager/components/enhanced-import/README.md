# 通用导入增强组件使用指南

## 概述

`UniversalImportButton` 是基于 enhanced-import 模块化架构设计的通用导入增强按钮组件，为所有导入场景提供统一的策略选择功能。

## 特性

- ✅ **统一的导入策略选择**：集成 ImportStrategyDialog，提供 9 种导入策略（vCard 2.1/3.0/4.0 × 3 种触发方式）
- ✅ **高度可定制**：支持自定义按钮样式、大小、类型等
- ✅ **TypeScript 类型安全**：完整的类型定义和接口约束
- ✅ **统一错误处理**：规范化的成功/失败回调机制
- ✅ **遵循 DDD 架构**：符合项目架构约束和最佳实践
- ✅ **模块化设计**：可在不同导入场景中复用

## 使用场景

### 1. 权限测试页面
```tsx
import { UniversalImportButton } from '../modules/contact-import/ui/batch-manager/components/enhanced-import';

<UniversalImportButton
  buttonText="测试完整VCF导入（选择策略）"
  buttonType="primary"
  vcfFilePath={contactsFile}
  context="权限测试"
  onImportSuccess={(result) => {
    setTestResult(`VCF导入测试成功: ${JSON.stringify(result, null, 2)}`);
  }}
  onImportError={(error) => {
    setTestResult(`VCF导入测试失败: ${error.message}`);
  }}
/>
```

### 2. 智能VCF导入器
```tsx
import { UniversalImportButton } from '../modules/contact-import/ui/batch-manager/components/enhanced-import';

{/* 智能导入按钮 */}
<UniversalImportButton
  buttonText="🤖 智能导入 (选择策略)"
  buttonType="default"
  vcfFilePath={contactsFile}
  context="智能导入"
  disabled={!selectedDevice || isImporting}
  loading={isImporting}
  onImportSuccess={(result) => {
    addLog(`🎉 智能导入成功：${JSON.stringify(result)}`);
  }}
/>

{/* 完整导入按钮 */}
<UniversalImportButton
  buttonText="🚀 完整导入 (选择策略)"
  buttonType="primary"
  vcfFilePath={contactsFile}
  context="完整导入"
  disabled={!selectedDevice || !contactsFile || isImporting}
  loading={isImporting}
  onImportSuccess={(result) => {
    addLog(`🎊 完整导入成功：${JSON.stringify(result)}`);
  }}
/>
```

### 3. 设备卡片导入
```tsx
import { UniversalImportButton } from '../modules/contact-import/ui/batch-manager/components/enhanced-import';

<UniversalImportButton
  buttonText="导入到设备"
  buttonType="primary" 
  buttonSize="small"
  vcfFilePath={vcfPath}
  context={`设备 ${device.id}`}
  loading={importing}
  onImportSuccess={(result) => {
    onImportSuccess?.(device.id, result);
  }}
  onImportError={(error) => {
    onImportError?.(device.id, error);
  }}
/>
```

## API 接口

### UniversalImportButtonProps

| 属性 | 类型 | 默认值 | 必填 | 描述 |
|------|------|--------|------|------|
| `buttonText` | `string` | - | ✅ | 按钮显示文本 |
| `vcfFilePath` | `string` | - | ✅ | VCF文件路径 |
| `buttonType` | `'primary' \| 'default' \| 'dashed' \| 'link' \| 'text'` | `'primary'` | ❌ | 按钮类型 |
| `buttonSize` | `'small' \| 'middle' \| 'large'` | `'middle'` | ❌ | 按钮大小 |
| `danger` | `boolean` | `false` | ❌ | 是否为危险按钮 |
| `loading` | `boolean` | `false` | ❌ | 是否为加载状态 |
| `disabled` | `boolean` | `false` | ❌ | 是否禁用 |
| `className` | `string` | - | ❌ | 自定义按钮类名 |
| `context` | `string` | `'Universal Import'` | ❌ | 导入场景标识，用于日志和调试 |
| `onImportSuccess` | `(result: any) => void` | - | ❌ | 导入成功回调 |
| `onImportError` | `(error: any) => void` | - | ❌ | 导入失败回调 |

## 架构集成

### 1. 与 ImportStrategyDialog 集成
- 自动处理策略选择对话框的显示/隐藏
- 统一的策略选择和执行流程
- 自动设备检测和策略推荐

### 2. 与 ADB 架构集成
- 遵循 `useAdb()` 统一接口约束
- 集成设备状态管理
- 符合 DDD 分层架构

### 3. 错误处理机制
- 统一的消息提示（message.success/error）
- 结构化的错误信息传递
- 上下文相关的日志记录

## 最佳实践

### 1. 文件路径验证
```tsx
// ✅ 推荐：在使用前验证文件路径
const handleImport = () => {
  if (!vcfFilePath) {
    message.error('请先选择VCF文件');
    return;
  }
  // 使用 UniversalImportButton
};
```

### 2. 状态管理
```tsx
// ✅ 推荐：配合加载状态使用
const [isImporting, setIsImporting] = useState(false);

<UniversalImportButton
  buttonText="导入联系人"
  vcfFilePath={filePath}
  loading={isImporting}
  disabled={!deviceSelected || isImporting}
  onImportSuccess={() => setIsImporting(false)}
  onImportError={() => setIsImporting(false)}
/>
```

### 3. 错误处理
```tsx
// ✅ 推荐：完整的错误处理
<UniversalImportButton
  buttonText="导入"
  vcfFilePath={filePath}
  context="批量导入"
  onImportSuccess={(result) => {
    // 处理成功结果
    updateUI(result);
    logSuccess(result);
  }}
  onImportError={(error) => {
    // 处理错误
    logError(error);
    showErrorDetails(error);
  }}
/>
```

## 迁移指南

### 从旧版导入按钮迁移

#### 旧代码（PermissionTestPage）：
```tsx
// ❌ 旧版本
<button onClick={testVcfImportWithPermission}>
  测试完整VCF导入
</button>
```

#### 新代码：
```tsx
// ✅ 新版本 - 使用 UniversalImportButton
<UniversalImportButton
  buttonText="测试完整VCF导入（选择策略）"
  vcfFilePath={contactsFile}
  context="权限测试"
  onImportSuccess={handleImportSuccess}
/>
```

### 从 SmartVcfImporter 迁移

#### 旧代码：
```tsx
// ❌ 旧版本
<button onClick={startSmartImport}>
  智能导入 (仅打开)
</button>
<button onClick={startCompleteImport}>
  完整导入 (传输+打开)
</button>
```

#### 新代码：
```tsx
// ✅ 新版本 - 使用 UniversalImportButton
<UniversalImportButton
  buttonText="🤖 智能导入 (选择策略)"
  vcfFilePath={contactsFile}
  context="智能导入"
  onImportSuccess={handleImportSuccess}
/>
<UniversalImportButton
  buttonText="🚀 完整导入 (选择策略)"
  vcfFilePath={contactsFile}
  context="完整导入"
  onImportSuccess={handleImportSuccess}
/>
```

## 文件位置

- **组件文件**: `src/modules/contact-import/ui/batch-manager/components/enhanced-import/UniversalImportButton.tsx`
- **导出文件**: `src/modules/contact-import/ui/batch-manager/components/enhanced-import/index.ts`
- **类型定义**: 内置在组件文件中

## 依赖项

- `@antd` - Button 和 App 组件
- `ImportStrategyDialog` - 导入策略选择对话框
- `React` - 基础 React hooks 和组件

---

通过使用 `UniversalImportButton`，你可以确保所有导入功能都具有一致的用户体验和完整的策略选择功能。