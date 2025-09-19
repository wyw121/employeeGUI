# 智能脚本管理模块使用指南

## 📋 模块概述

这个模块化的智能脚本管理系统为您提供了完整的脚本生命周期管理功能：

### 🏗️ 架构设计

```
src/modules/smart-script-management/
├── types/              # 完整的类型定义
├── services/           # 后端API服务
├── utils/              # 序列化工具
├── hooks/              # React状态管理
├── components/         # UI组件
└── index.ts            # 统一导出
```

### ✨ 核心功能

1. **完整的数据持久化** - 保存所有步骤状态、参数、配置
2. **智能序列化/反序列化** - UI状态与存储格式的完美转换
3. **脚本生命周期管理** - 创建、编辑、执行、删除
4. **模板系统** - 预定义脚本模板
5. **导入/导出** - 脚本的备份和分享
6. **草稿自动保存** - 防止意外丢失

## 🚀 快速开始

### 1. 在SmartScriptBuilderPage中集成

```typescript
import { ScriptBuilderIntegration } from '../modules/smart-script-management/components/ScriptBuilderIntegration';

// 在您的构建器组件中添加
<ScriptBuilderIntegration
  steps={steps}
  executorConfig={executorConfig}
  onLoadScript={(script) => {
    // 处理脚本加载
  }}
  onUpdateSteps={(newSteps) => {
    setSteps(newSteps);
  }}
  onUpdateConfig={(newConfig) => {
    setExecutorConfig(newConfig);
  }}
/>
```

### 2. 使用Hook进行脚本管理

```typescript
import { useScriptEditor, useScriptManager } from '../modules/smart-script-management';

function MyComponent() {
  const { saveFromUIState, loadScript } = useScriptEditor();
  const { scripts, loading } = useScriptManager();

  // 保存当前UI状态为脚本
  const handleSave = async () => {
    await saveFromUIState(
      'My Script',
      'Description',
      steps,
      config
    );
  };

  // 加载脚本到UI
  const handleLoad = async (scriptId: string) => {
    const script = await loadScript(scriptId);
    // 更新UI状态
  };
}
```

## 📊 数据结构

### SmartScriptStep - 完整步骤定义

```typescript
interface SmartScriptStep {
  id: string;                    // 唯一标识
  step_type: StepActionType;     // 步骤类型
  name: string;                  // 显示名称
  description: string;           // 详细描述
  parameters: StepParams;        // 类型安全的参数
  enabled: boolean;              // 是否启用
  order: number;                 // 执行顺序
  
  // 扩展功能
  conditions?: {...};            // 执行条件
  error_handling?: {...};        // 错误处理
  ui_state?: {...};             // UI状态
}
```

### SmartScript - 完整脚本定义

```typescript
interface SmartScript {
  id: string;
  name: string;
  description: string;
  version: string;
  
  created_at: string;
  updated_at: string;
  
  author: string;
  category: string;
  tags: string[];
  
  steps: SmartScriptStep[];      // 所有步骤
  config: ScriptConfig;          // 执行配置
  metadata: {...};               // 元数据
}
```

## 🔄 序列化机制

### 从UI状态保存脚本

```typescript
// 当前UI状态
const currentSteps = [
  {
    id: 'step1',
    type: 'tap',  // 旧格式
    params: { x: 100, y: 200 },  // 旧格式
    enabled: true
  }
];

// 自动序列化为标准格式
const script = ScriptSerializer.serializeScript(
  'Script Name',
  'Description', 
  currentSteps,
  executorConfig
);

// 保存到后端
await ScriptManagementService.saveScript(script);
```

### 从脚本恢复UI状态

```typescript
// 从后端加载脚本
const script = await ScriptManagementService.loadScript(scriptId);

// 反序列化为UI状态
const { steps, config } = ScriptSerializer.deserializeScript(script);

// 恢复UI状态
setSteps(steps);
setExecutorConfig(config);
```

## 🎯 关键优势

### 1. 完整的状态保存

- ✅ 保存所有步骤参数
- ✅ 保存UI状态（折叠、编辑状态等）
- ✅ 保存执行配置
- ✅ 保存元数据和统计信息

### 2. 智能数据转换

- ✅ 自动处理字段名差异 (`type` ↔ `step_type`)
- ✅ 参数结构标准化 (`params` ↔ `parameters`)
- ✅ 类型安全的序列化
- ✅ 向后兼容性

### 3. 完整的生命周期

```
创建 → 编辑 → 保存 → 执行 → 分析
  ↓      ↓      ↓      ↓      ↓
草稿   序列化  持久化  监控   统计
```

## 📝 使用场景

### 场景1: 保存当前工作

```typescript
// 用户在构建器中创建了复杂脚本
const handleQuickSave = async () => {
  await saveFromUIState(
    `自动保存_${new Date().toLocaleString()}`,
    '工作进度保存',
    steps,
    executorConfig
  );
};
```

### 场景2: 加载已保存脚本

```typescript
// 用户想要继续之前的工作
const handleLoadPrevious = async (scriptId: string) => {
  const script = await loadScript(scriptId);
  const { steps, config } = ScriptSerializer.deserializeScript(script);
  
  // 完全恢复工作状态
  setSteps(steps);
  setExecutorConfig(config);
  message.success(`已加载脚本: ${script.name}`);
};
```

### 场景3: 脚本管理和复用

```typescript
// 管理所有脚本
const ScriptManagementPage = () => {
  return (
    <ScriptManager 
      onEditScript={(script) => {
        // 加载到编辑器
        navigateToBuilder(script);
      }}
      onExecuteScript={(scriptId) => {
        // 直接执行
        executeInBackground(scriptId);
      }}
    />
  );
};
```

## 🔧 集成到现有代码

### 步骤1: 替换保存逻辑

**替换前 (SmartScriptBuilderPage.tsx):**
```typescript
// 旧的保存逻辑 - 数据不完整
const handleSaveScript = async () => {
  const scriptData = {
    name: 'Script',
    steps: steps.map(step => ({
      type: step.type,  // 字段不匹配
      config: step.params  // 结构不标准
    }))
  };
  
  await invoke('save_smart_script', { script: scriptData });
};
```

**替换后:**
```typescript
// 新的保存逻辑 - 完整且标准
import { useScriptEditor } from '../modules/smart-script-management';

const { saveFromUIState } = useScriptEditor();

const handleSaveScript = async () => {
  await saveFromUIState(
    scriptName,
    scriptDescription,
    steps,           // 自动处理所有字段映射
    executorConfig   // 完整配置序列化
  );
};
```

### 步骤2: 添加脚本管理功能

```typescript
// 在构建器页面添加管理功能
import { ScriptBuilderIntegration } from '../modules/smart-script-management/components/ScriptBuilderIntegration';

// 在原有的按钮组中添加
<Space>
  <Button onClick={handleExecuteScript}>执行脚本</Button>
  
  {/* 新增的脚本管理功能 */}
  <ScriptBuilderIntegration 
    steps={steps}
    executorConfig={executorConfig}
    onLoadScript={handleLoadScript}
    onUpdateSteps={setSteps}
    onUpdateConfig={setExecutorConfig}
  />
</Space>
```

## 🎉 完成！

现在您拥有了一个完整的、模块化的智能脚本管理系统！

- 📁 **完整保存**: 所有状态都会被保存
- 🔄 **完美恢复**: 加载时完全恢复工作状态  
- 🎯 **类型安全**: 完整的TypeScript支持
- 🚀 **高性能**: 智能缓存和优化
- 🎨 **用户友好**: 直观的管理界面

您的脚本现在可以像真正的软件项目一样进行版本管理了！