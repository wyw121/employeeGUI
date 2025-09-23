# Node Detail Submodule

位置：`src/components/universal-ui/views/grid-view/panels/node-detail/`

该子模块聚焦“节点详情”面板的纯展示与轻交互组件，原则：
- 仅做 UI 展示与受控交互；不持有全局状态
- 通过上层 `NodeDetailPanel.tsx` 提供的 props 进行数据与回调绑定
- 严格类型化（禁止 `any`）

## 包含组件

- `MatchPresetsRow.tsx`
  - 预设按钮：absolute / strict / relaxed / positionless / standard
  - 通过 `onApply(criteria)` 输出 `{ strategy, fields, values }`
  - 可选 `onPreviewFields` 通知外层预览字段

- `MatchingStrategySelector.tsx`
  - 受控策略选择器，负责策略切换 UI
  - props: `{ value: MatchStrategy, onChange(next) }`

- `SelectedFieldsChips.tsx`
  - 字段勾选 Chips，受控组件
  - props: `{ selected: string[], onToggle(field) }`

- `SelectedFieldsPreview.tsx`
  - 选中字段 + 值 的只读展示
  - props: `{ node: UiNode | null, fields: string[] }`

- `types.ts`
  - `MatchStrategy` | `MatchCriteria` | `MatchResultSummary`

## 导出入口

通过同目录下的 `index.ts` 统一导出，推荐按需导入：

```ts
import {
  MatchPresetsRow,
  MatchingStrategySelector,
  SelectedFieldsPreview,
  SelectedFieldsChips,
  // types
  MatchStrategy,
  MatchCriteria,
} from '@/components/universal-ui/views/grid-view/panels/node-detail';
```

## 约束

- 严格遵守 DDD：此处仅为表现层，统一从应用层 `useAdb()` 获取能力，不得直连基础设施/领域层
- 禁止复制已有逻辑，若发现复用场景，请抽象为公共函数或子组件
- 类型必须完整，禁止 `any`
