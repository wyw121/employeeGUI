# DnD 统一使用规范

本目录提供统一的拖拽基础设施，基于 dnd-kit：

- DragSensorsProvider：在列表容器处包裹一次，提供统一的 PointerSensor 激活约束（默认 distance=6）。
- SortableList：包裹一组可排序的 items（传入 id 数组与策略）。
- SortableItem：为单个条目提供拖拽绑定（外层 div），卡片组件内部不得再次使用 useSortable。
- DragOverlayGhost：轻量幽灵预览，避免复杂渲染导致掉帧。
- noDragProps / wrapNoDrag：用于交互区阻断拖拽（Button/Input/Popover/Popconfirm 容器等）。

推荐用法：

1) 容器层

```tsx
<DragSensorsProvider activationDistance={6} onDragEnd={handleDragEnd}>
  <SortableList items={ids}>
    {ids.map(id => (
      <SortableItem key={id} id={id}>
        <YourCard ... />
      </SortableItem>
    ))}
  </SortableList>
  <DragOverlay>
    {active ? <DragOverlayGhost title={...} subtitle={...} index={...} /> : null}
  </DragOverlay>
</DragSensorsProvider>
```

2) 卡片层（纯展示组件）

- 不使用 useSortable。
- 在非交互区（空白处、标题背景等）允许拖拽。
- 在交互区统一套上 `noDragProps`：

```tsx
<Space {...noDragProps}>
  <Button ... />
  <Input ... />
</Space>
```

注意事项：
- 统一以距离触发优先（activationDistance），避免长按导致空白拖不动等误触。
- 卡片根元素建议设置 `style={{ touchAction: 'none' }}`，提升触控环境拖拽响应。
- Overlay 尽量保持最小 UI，禁用昂贵阴影/渐变/动画。
- 如需在同一页面放置多个独立可排序列表，请为每个列表单独包一层 DragSensorsProvider。

## 全局 UI 配置（Provider）

使用 `DnDUIConfigProvider` 在页面/布局层统一配置拖拽 UI 行为：

```tsx
import { DnDUIConfigProvider } from '@/components/universal-ui/dnd/DnDUIConfigContext';

export default function ScriptBuilderLayout() {
  return (
    <DnDUIConfigProvider value={{ useGhostOverlay: true }}>
      {/* 页面内容：含多个拖拽容器 */}
    </DnDUIConfigProvider>
  );
}
```

初始化合并顺序：默认值 < localStorage 持久化值 < Provider 传入的 value。

存储键：`app.dndUiConfig.v1`。

容器组件（如 `DraggableStepsContainer`、`DragSortContainer`）会读取该配置按条件渲染幽灵预览层。

## 运行时开关与持久化

UI 中可使用 `GhostOverlayToggle` 切换“幽灵模式”（拖拽预览）开关：

```tsx
import { useDnDUIConfig } from '@/components/universal-ui/dnd/DnDUIConfigContext';

const { config, setUseGhostOverlay } = useDnDUIConfig();
// config.useGhostOverlay -> boolean
// setUseGhostOverlay(true/false)
```

切换后会自动持久化到 localStorage。

## 最佳实践补充

- 拖拽只在容器层使用 dnd-kit，卡片保持“展示组件”，避免多层监听。
- 预览层尽量简单，减少拖拽中的重绘；如需自定义，请复用 `DragOverlayGhost` 的轻量样式策略。
- 统一通过 `DnDUIConfigProvider` 管理配置，便于灰度和实验特性开关。
