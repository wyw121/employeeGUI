# Script Builder 重构计划 (骨架建立阶段)

日期: 2025-09-26

## 背景
原文档 `docs/大文件清理/9.26清理计划.md` 中列出的超大文件 `src/components/universal-ui/UniversalScriptBuilder.tsx` (1506 行) 在当前分支已不存在，疑似之前被删除或拆散到多个组件（如 `EnhancedDraggableStepsContainer`, `DraggableStepCard`, `FlowScriptBuilder` 等）。为防止再次形成巨型文件，同时为未来统一“脚本步骤构建”体验，现已建立标准化骨架目录：

```
src/components/universal-ui/script-builder/
  index.ts
  types.ts
  hooks/
    useScriptBuilderState.ts
    useScriptValidation.ts
  utils/
    reorder.ts
  components/
    ScriptBuilderView.tsx
```

## 目标
1. 提供一个可增量迁移的脚本构建器最小壳组件，使未来特性（拖拽、循环、批量匹配、执行控制、保存/导入、策略标签）在独立子组件/Hook 中演进。
2. 杜绝重新出现单文件 > 400 行的“巨石式”实现。
3. 保持对外兼容：将来可用 `import { UniversalScriptBuilder } from '@/components/universal-ui/script-builder'` 替代旧路径。

## 拆分来源映射（待迁移逻辑）
| 现存来源 | 计划迁移内容 | 目标位置 |
|----------|--------------|----------|
| `FlowScriptBuilder.tsx` | 模板/流程建模 (FlowTemplate / FlowStepTemplate) | `script-builder/services/flowTemplates.ts` 或单独模块 (可选) |
| `EnhancedDraggableStepsContainer.tsx` | 步骤拖拽 + 循环步骤配对逻辑 | `hooks/useStepDragAndDrop.ts` + `components/StepList.tsx` |
| `DraggableStepsContainer.tsx` | 通用拖拽排序行为 | 复用 / 抽象到 `components/DraggableListCore.tsx` |
| `DraggableStepCard/*` | 单步骤展示与操作 (编辑/删除/测试按钮) | `components/StepItem.tsx` + 子 action 组件 |
| 各步骤执行按钮 (StepTestButton) | 单步测试入口 | `components/StepItemActions.tsx` |
| 批量匹配 / 页面分析器入口 | 参数编辑与匹配 UI | `components/StepParameterPanel.tsx` + 现有分析器集成 |
| Loop Start/End 配对 & 同步参数 | 循环视图模型 | `hooks/useLoopPairing.ts` |
| 序列化 / 导入导出 | 导出 JSON、克隆、规范化 | `services/stepSerialization.ts` |
| 脚本校验 (必填字段 / 循环完整性) | 校验规则扩展 | `hooks/useScriptValidation.ts` (追加策略) |

## 下一阶段 (建议 PR 划分)
1. PR1 (已完成): 建立骨架目录与占位类型 + 基础 Hook + reorder 工具。
2. PR2: 从 `EnhancedDraggableStepsContainer` 抽象“拖拽+排序+循环配对”逻辑到独立 Hook；保持原组件调用新 Hook。
3. PR3: 抽离 Step 视图（`StepItem` / `StepList`），减少容器文件体积；为循环步骤加上 pair 高亮。
4. PR4: 引入序列化服务 + 校验扩展（循环完整性、必填字段、禁用步骤跳过规则）。
5. PR5: 统一执行/测试入口 → `ExecutionPanel` 组件；移除分散的执行按钮逻辑。
6. PR6 (可选): 合并 Flow 模板逻辑（若仍需要“流程向导”模式）到一个可配置层。

## 代码体积控制策略
- 单组件文件不超过 250 行；超过 200 行需评审是否拆分。
- Hook 超过 150 行时预警，200 行绝对拆分。
- 纯函数/工具保持无副作用，禁止直接访问全局 store，使用参数传入数据。

## 验证方式
- PR 引入后运行 `npm run type-check` 确认无类型回归。
- 添加最小单元测试（未来计划）：
  - `reorderSteps` 
  - 循环配对 `findLoopPairStep` (迁移后)
  - 序列化/反序列化一致性

## 未决问题
- 旧 `UniversalScriptBuilder` 是否仍在其他分支存在：需要后续合并时解决命名冲突；当前采取“桶文件导出 `UniversalScriptBuilder`”策略以提供兼容点。
- 循环配置与步骤参数结构 (`LoopConfig`, `ExtendedSmartScriptStep`) 需要统一到 `types.ts`（待下一阶段迁移）。

---
如继续，请在下一个任务中指定：“迁移 EnhancedDraggableStepsContainer 拖拽逻辑”或其它优先块。
