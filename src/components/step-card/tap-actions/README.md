# tap-actions 子模块

轻点/长按等点击行为的模板与下拉选择器，遵循步骤卡模块化原则。

- 位置：`src/components/step-card/tap-actions/`
- 导出：通过上层 `step-card/index.ts` 桶文件统一导出

## 组件与方法

- `TapActionDropdownButton`：下拉菜单按钮，内置
  - 单步：轻点中心、长按中心
  - 批量：连续轻点中心 ×3 / ×5
  - 自定义：输入 X/Y 坐标与次数，生成单步或批量
- `tapTemplates.ts`
  - `createTapStepTemplate(overrides?)`
  - `createTapStepsBatch(times, overrides?)`
  - `TapActionTemplates`：`tapCenter()`、`tapAt(x,y)`、`longPressCenter(duration)`

## 参数约定（与后端解耦）

- `step_type`: `tap`
- `parameters`：
  - `position`: `center` | `absolute`
  - `x`, `y`: 坐标（当 `position=absolute` 时）
  - `duration_ms`: 长按时长（毫秒，可选）

## 集成方式

- 在容器中：
  - `DraggableStepsContainer` 新增 `onCreateTapAction` 回调，并在顶部/底部操作区渲染 `TapActionDropdownButton`。
  - `EnhancedDraggableStepsContainer` 透传 `onCreateTapAction`。
- 在页面中：
  - `SmartScriptBuilderPage` 实现 `onCreateTapAction`，接收单个或数组模板，统一补齐 `id/step_type/parameters/order` 后插入步骤。

## DnD 事件安全

- 组件内对 `click/mousedown/pointerdown/touchstart` 做了统一 `stopPropagation/ preventDefault`，避免激活拖拽。

## 后续扩展建议

- 新增 `TapParamsEditor` 内联编辑器（时长、坐标）并在 `DraggableStepCard` 中按 `step_type = tap` 挂载。
- 与 ADB 执行层对齐：在应用服务中为 `tap` 步骤提供统一执行路径（若后端尚未实现，可由 Tauri 命令映射到 `input tap`/`long press`）。
