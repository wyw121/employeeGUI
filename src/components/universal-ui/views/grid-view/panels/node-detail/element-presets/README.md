# 元素预设（Element Presets）

该子模块以"元素语义"为中心，提供一键可复用的匹配条件模板，例如：关注按钮、通用社交按钮、点赞按钮、评论按钮。

- 位置：`node-detail/element-presets/`
- 组成：
  - `types.ts`：预设类型定义
  - `registry.ts`：预设清单与构造逻辑（从 UiNode 构造 `MatchCriteria`）
  - `ElementPresetsRow.tsx`：展示可点击的预设按钮行

## 设计原则
- 模块化：与 `helpers.ts` 的"策略预设"解耦，互不影响
- 语义优先：优先选用 standard/positionless 策略与子节点增强字段，回避 bounds/index
- 可编辑：预设仅作为初始条件，应用后仍可在面板中继续调整字段与 includes/excludes
- 跨APP兼容：支持小红书、抖音等不同APP的相似功能按钮

## 当前可用预设

### 1. 关注按钮 (`follow_button`)
- **用途**：专门适配小红书关注功能
- **特点**：基于真实XML分析优化，使用子节点文本匹配
- **适用场景**：小红书用户关注/取消关注操作

### 2. 通用社交按钮 (`universal_social_button`) 🆕
- **用途**：跨APP的通用社交功能按钮预设
- **特点**：
  - 支持多种文本：关注、删除好友、添加好友、私聊等
  - 跨APP兼容：抖音、小红书、微信等
  - 智能排除：自动排除"已关注"、"已添加"等已操作状态
  - 灵活字段：同时支持`text`和`first_child_text`匹配
- **适用场景**：
  - 抖音删除好友按钮
  - 微信添加好友按钮  
  - 各种社交APP的互动按钮
  - 需要跨APP测试的社交功能自动化

## 新增一个预设
1. 在 `registry.ts` 中追加一个 `ElementPreset`：
   - 在 `ElementPresetId` 类型中添加新的 ID
   - 为 `buildCriteria` 填充 `strategy/fields/values/includes/excludes`
   - 以 `PRESET_FIELDS.standard` 作为基础字段集合，并依据 `UiNode` 实际属性回填 values
2. 在 `ElementPresetsRow.tsx` 无需修改，预设会自动出现在按钮列表。

## 与 DDD 约束
- 仅在表现层定义模板，仍通过 `useAdb()` 执行真机匹配
- 不新增状态存储，沿用 `NodeDetailPanel` 的状态