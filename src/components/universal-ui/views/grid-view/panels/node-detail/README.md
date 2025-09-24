# Node Detail Submodule

位置：`src/components/universal-ui/views/grid-view/panels/node-detail/`

该子模块聚焦“节点详情”面板的纯展示与轻交互组件，原则：
- 仅做 UI 展示与受控交互；不持有全局状态
- 通过上层 `NodeDetailPanel.tsx` 提供的 props 进行数据与回调绑定
- 严格类型化（禁止 `any`）

## 包含组件

- `MatchPresetsRow.tsx`
  - 预设按钮（现已合并策略选择）：absolute / strict / relaxed / positionless / standard；当用户手动调整字段/值/包含/排除条件时，自动进入 `custom` 状态
  - 通过 `onApply(criteria)` 输出 `{ strategy, fields, values }`
  - 可选 `onPreviewFields` 通知外层预览字段
  - 支持 `activeStrategy` 用于指示当前激活的预设或自定义

- `MatchingStrategySelector.tsx`
  - 通用的策略选择器（保留导出以供其他模块复用），在 NodeDetail 面板 UI 中已由 `MatchPresetsRow` 承担策略合并逻辑
  - 支持显示 `custom`（自定义）
  - props: `{ value: MatchStrategy, onChange(next) }`

- `SelectedFieldsChips.tsx`
  - 字段勾选 Chips，受控组件
  - props: `{ selected: string[], onToggle(field) }`

- `SelectedFieldsPreview.tsx`
  - 选中字段 + 值 的只读展示
  - props: `{ node: UiNode | null, fields: string[] }`

- `SelectedFieldsEditor.tsx`
  - 选中字段的可编辑输入（不含勾选逻辑，纯编辑器）
  - props: `{ node: UiNode | null, fields: string[], values: Record<string,string>, onChange(next) }`

- `SelectedFieldsTable.tsx`
  - 集成“字段勾选 + 值编辑”的表格式组件（推荐）
  - props: `{ node: UiNode | null, selected: string[], values: Record<string,string>, onToggle(field), onChangeValue(field,value), excludes?: Record<string,string[]>, onChangeExcludes?(field,next) }`

- `NegativeConditionsEditor.tsx`
  - 针对单字段维护“不包含（排除词）”集合的编辑器
  - props: `{ field: string, excludes: string[], onChange(next: string[]) }`

- `types.ts`
  - `MatchStrategy` | `MatchCriteria` | `MatchResultSummary`

## 导出入口

通过同目录下的 `index.ts` 统一导出，推荐按需导入：

```ts
import {
  MatchPresetsRow,
  SelectedFieldsPreview,
  SelectedFieldsChips,
  SelectedFieldsEditor,
  SelectedFieldsTable,
  NegativeConditionsEditor,
  // types
  MatchStrategy,
  MatchCriteria,
} from '@/components/universal-ui/views/grid-view/panels/node-detail';
```

## 约束

- 严格遵守 DDD：此处仅为表现层，统一从应用层 `useAdb()` 获取能力，不得直连基础设施/领域层
- 禁止复制已有逻辑，若发现复用场景，请抽象为公共函数或子组件
- 类型必须完整，禁止 `any`

## 自定义策略（custom）说明

- 当用户在 `SelectedFieldsChips` 中自行勾选/取消勾选字段，使得集合与任何预设完全不一致时，面板会自动将策略切换为 `custom`。
- 若字段集合刚好与某个预设完全一致，则自动回退为该预设策略。
- 发送到后端时，`custom` 会被映射为等效策略：包含位置字段（bounds/index）→ 采用 `absolute`；否则采用 `standard`；字段集合原样传递，确保后端匹配逻辑不受影响。

## “留空=任意”语义

- 在值编辑器中，对任何字段如果输入框留空（空串/仅空白），该字段会在发送/应用前被移除，不参与匹配，等效于“忽略该维度”。
- 对位置相关字段 `bounds` 与 `index`，UI 会提示“留空=任意”。当两者均为空或未选时，表示不施加位置约束；一旦至少一个位置字段提供了非空值，则会被视为存在“有效的位置约束”。

## 交互规则补充（节点切换 / 回填 / 缓存）

- 节点切换自动回填值：当你在“节点树/屏幕预览”切换选中的元素，面板会用该元素的默认属性值，自动替换“当前已勾选字段”的值；字段选择与策略不变。
- 保留包含/不包含：上述自动回填只影响字段值，不会改动 per-field 的“包含/不包含”条件。
- 点击“设置为步骤元素”：确认回填，将当前匹配条件应用到步骤（在“页面分析”中新建步骤；在“修改参数”中更新当前步骤），并关闭面板。
- 关闭模态：取消回填，只关闭不写回步骤（保留你在网格检查器中的选择与修改供后续继续编辑）。
- 视图切换缓存：从“网格检查器”切换到其它视图时，仅缓存“策略与字段”的最新选择，用于稍后回到网格检查器继续；不会自动写回步骤。

### 默认预设

- 当你首次在“节点树/屏幕预览”选择元素且当前没有勾选任何字段时：
  1) 若存在最近一次的匹配缓存（策略/字段），优先自动恢复；
  2) 否则默认应用“标准匹配”预设，并基于所选元素的属性回填字段值。
