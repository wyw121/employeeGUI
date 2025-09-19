# 循环控制和拖拽排序功能依赖安装指南

## 🚀 必需依赖

### 1. React Beautiful DnD（拖拽排序功能）

```bash
npm install react-beautiful-dnd
npm install --save-dev @types/react-beautiful-dnd
```

### 2. 验证安装

安装完成后，请验证依赖是否正确安装：

```bash
npm list react-beautiful-dnd
```

## 📁 模块结构

```
src/modules/
├── loop-control/           # 循环控制模块
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── components/        # React组件
│   │   ├── LoopStepCard.tsx
│   │   └── LoopControlIntegration.tsx
│   ├── hooks/            # React Hooks
│   │   └── useLoopControl.ts
│   ├── utils/            # 工具函数
│   │   ├── LoopExecutionEngine.ts
│   │   └── loopUtils.ts
│   └── index.ts          # 导出入口
└── drag-sort/             # 拖拽排序模块
    ├── types/            # 类型定义
    │   └── index.ts
    ├── components/       # React组件
    │   └── DragSortContainer.tsx
    ├── hooks/           # React Hooks
    │   └── index.ts
    ├── utils/           # 工具函数
    │   └── index.ts
    └── index.ts         # 导出入口
```

## 🔧 集成步骤

### 1. 安装依赖

首先安装必需的依赖包：

```bash
npm install react-beautiful-dnd
npm install --save-dev @types/react-beautiful-dnd
```

### 2. 启用拖拽功能

安装依赖后，在 `DragSortContainer.tsx` 中取消注释相关代码：

```typescript
// 取消以下导入的注释
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
```

### 3. 集成到主组件

在你的主脚本构建器组件中使用：

```typescript
import { LoopControlIntegration } from '@/modules/loop-control/components/LoopControlIntegration';

// 在组件中使用
<LoopControlIntegration
  steps={steps}
  onStepsChange={setSteps}
  onExecuteStep={handleExecuteStep}
/>
```

### 4. 类型扩展

确保你的步骤类型支持循环扩展：

```typescript
import { ExtendedSmartScriptStep, ExtendedStepActionType } from '@/modules/loop-control/types';

// 使用扩展的步骤类型
const [steps, setSteps] = useState<ExtendedSmartScriptStep[]>([]);
```

## 🎯 功能特性

### 循环控制
- ✅ 循环开始/结束卡片
- ✅ 支持固定次数、条件循环、无限循环
- ✅ 循环嵌套支持
- ✅ 实时执行状态显示
- ✅ 循环配置界面

### 拖拽排序
- ✅ 步骤卡片拖拽排序
- ✅ 跨容器拖拽（步骤移入/移出循环）
- ✅ 可视化拖拽反馈
- ✅ 拖拽约束和验证

### 执行引擎
- ✅ 循环执行引擎
- ✅ 变量管理和传递
- ✅ 错误处理和恢复
- ✅ 执行进度跟踪

## 📊 API 参考

### useLoopControl Hook

```typescript
const {
  loops,                    // 所有循环数据
  executingLoops,          // 正在执行的循环
  createLoop,              // 创建循环
  deleteLoop,              // 删除循环
  executeLoop,             // 执行循环
  stopLoop,                // 停止循环
  addStepToLoop,           // 添加步骤到循环
  removeStepFromLoop,      // 从循环移除步骤
  extractLoopsFromSteps,   // 从步骤提取循环结构
  flattenLoopsToSteps      // 将循环展开为步骤
} = useLoopControl({ stepExecutor });
```

### LoopStepCard 组件

```typescript
<LoopStepCard
  startStep={startStep}
  endStep={endStep}
  innerSteps={innerSteps}
  executing={isExecuting}
  currentIteration={iteration}
  onConfigChange={handleConfigChange}
  onDelete={handleDelete}
  renderInnerSteps={renderFunction}
/>
```

## 🔧 故障排除

### 常见问题

1. **拖拽功能不工作**
   - 确保安装了 `react-beautiful-dnd`
   - 检查是否取消了导入的注释

2. **类型错误**
   - 确保使用了 `ExtendedSmartScriptStep` 类型
   - 检查导入路径是否正确

3. **循环执行异常**
   - 检查步骤执行器是否正确配置
   - 确认循环配置参数有效

### 调试建议

1. 开启控制台日志：
```typescript
const { logs } = useLoopControl({ 
  stepExecutor, 
  debug: true 
});
```

2. 检查循环状态：
```typescript
console.log('当前循环:', loops);
console.log('执行状态:', executingLoops);
```

## 📝 使用示例

完整的使用示例请参考 `LoopControlIntegration.tsx` 文件。

这个集成示例展示了如何：
- 创建和管理循环
- 执行循环控制
- 处理步骤拖拽
- 实时显示执行状态

## 🎉 完成

安装依赖并按照集成步骤操作后，你就可以在脚本构建器中使用强大的循环控制和拖拽排序功能了！