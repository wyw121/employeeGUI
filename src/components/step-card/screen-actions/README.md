# Screen Actions 子模块

提供屏幕交互步骤的“模板工厂 + 选择入口”能力，保持与步骤卡片解耦的模块化组织。

## 组成
- `screenTemplates.ts`
  - `createScrollStepTemplate(direction, overrides?)`: 生成单个滚动步骤模板
  - `createScrollStepsBatch(direction, times=3, overrides?)`: 生成多步连续滚动模板
  - `ScreenActionTemplates`: 常用方向预设（上/下/左/右）
- `ScreenActionDropdownButton.tsx`
  - 下拉按钮，包含单步、批量与自定义入口；统一阻断拖拽事件
- `CustomScrollModal.tsx`
  - 自定义滚动配置（方向/距离/速度/次数）
- `index.ts`
  - 桶文件导出，便于上层按需引入

## 用法示例
```tsx
import { ScreenActionDropdownButton } from '@/components/step-card';

<ScreenActionDropdownButton onSelectTemplate={(tpl) => onCreateScreenInteraction(tpl)} />
```

## 设计约束
- 仅负责“模板生成与选择”，不直接修改 Store 或步骤列表
- 追加步骤的顺序与 ID 由页面层统一赋值
- UI 组件需阻断 `pointer/mouse/touch` 事件，避免干扰 DnD
