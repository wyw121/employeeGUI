# Field Detail 子组件模块

`FieldDetailTab` 已拆分为多个关注点单一的展示组件，提升可维护性与复用性。

## 目录结构
```
field-detail/
├─ FieldListCard.tsx        # 左侧字段列表 + 稳定性标签
├─ DisplayNameCard.tsx      # 当前显示名称与工作原理说明
├─ CachedMappingCard.tsx    # 已缓存映射信息
├─ AiRecommendationsCard.tsx# AI 优化建议列表（颜色编码）
├─ AdbCommandsCard.tsx      # 推荐 ADB 命令（前三条）
├─ RealtimeEditorCard.tsx   # 实验功能占位
└─ index.ts                 # Barrel 导出
```

## 设计规范
- 所有颜色、边框、文本样式统一来自 `../uiTokens.ts`。
- 禁止在子组件中直接写死重复颜色（例外：少量业务特例背景，如 ✅ 成功绿背景保留）。
- 组件仅接收数据 props，不到全局 store 读取或写入。

## Props 契约
| 组件 | 核心 Props | 说明 |
| ---- | ---------- | ---- |
| FieldListCard | `fields: {key,value,stability}[]` | 排序后的字段数据 |
| DisplayNameCard | `currentName`, `existingMapping` | existingMapping 可为空 |
| CachedMappingCard | `values` | null 时不渲染 |
| AiRecommendationsCard | `recommendations: string[]` | 文本含图标/标记 |
| AdbCommandsCard | `commands: {type,command,reliability}[]` | reliability 0-1 |
| RealtimeEditorCard | (无) | 纯占位展示 |

## 扩展指引
新增视觉块：
1. 创建 `YourBlockCard.tsx`，严格 < 150 行；逻辑复杂再拆子组件。
2. 颜色与字号优先复用 tokens。
3. 在 `index.ts` 追加导出。
4. 在上层 `FieldDetailTab` 中以组合方式插入。

## 性能注意
- 字段列表滚动区域限定 `maxHeight`，避免一次渲染过长页面。
- 如后续字段项 > 500，可考虑虚拟化（react-window），当前无需。

## 未来演进（可选）
- 将风险标签与价值标签抽成小型 `<FieldBadges />`。
- 引入 memo 优化大数据量场景。
- 将硬编码成功 / 警告 / 失败背景纳入 tokens (需全局复用场景出现时)。

更新日期：2025-09-26
