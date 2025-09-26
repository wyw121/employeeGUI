# element-name-editor / tabs 模块说明

该目录包含 `ElementNameEditor` 拆分后的**各独立 Tab 组件**，实现单一职责、可扩展与一致的暗色主题视觉风格。所有样式需尽量复用 `uiTokens.ts` 中定义的令牌，避免硬编码颜色与重复样式。

## 结构概览

```
./tabs/
├─ FieldDetailTab.tsx        # 展示原始 XML 字段、稳定性、AI 分析、ADB 推荐命令
├─ BasicConfigTab.tsx        # 基础显示名称配置（表单 / 智能命名建议）
├─ ConstraintsTab.tsx        # 匹配约束（字段启用开关、权重、值可视化）
├─ HierarchyTab.tsx          # XML 层级结构查看（复用通用缓存组件）
├─ uiTokens.ts               # 局部 UI 设计令牌（暗色表面 / 边框 / 状态色 / 文本）
└─ index.ts                  # Barrel 导出聚合
```

## 设计令牌（Design Tokens）使用规范

`uiTokens.ts` 暂为局部令牌文件（scoped to element-name-editor）。若其他模块存在复用需求，再上移到全局 `@/theme/tokens`。

| 分类 | 示例 | 说明 |
| ---- | ---- | ---- |
| colors.surface | `#2d2d2d` | 主卡片背景色 |
| colors.surfaceAlt | `#1f1f1f` | 次级区域/代码块背景 |
| colors.border | `#404040` | 统一边框色 |
| colors.accentBlue | `#1890ff` | 信息 / 主强调 |
| colors.accentGreen | `#52c41a` | 成功 / 稳定高 |
| colors.accentOrange | `#faad14` | 警示 / 中等稳定 |
| colors.accentRed | `#ff4d4f` | 失败 / 风险 |
| colors.accentInfoBg | `#0f3460` | 信息块深色背景 |

辅助：`textStyles`, `tagStyles`, `layout` 提供文本 / Tag 尺寸及圆角常量。

### 使用示例

```tsx
import { colors, textStyles, tagStyles } from './uiTokens';

<Card style={{ background: colors.surface, border: `1px solid ${colors.border}` }} />
<Tag style={tagStyles.small}>示例</Tag>
<AntText style={textStyles.codeValue}>value</AntText>
```

## Tab 组件职责边界

| 组件 | 职责 | 禁止事项 |
| ---- | ---- | ---- |
| FieldDetailTab | 展示字段稳定性、AI 推荐、ADB 命令 | 修改全局状态、副作用请求（除内置 hook 分析） |
| BasicConfigTab | 编辑与提交显示名称、智能命名建议 | 直接操控除提交回调外的业务层状态 |
| ConstraintsTab | 勾选/调整匹配约束（布尔） | 引入与约束无关的展示逻辑 |
| HierarchyTab | 展示层级结构并支持回传选择 | 内部缓存 / 重复 XML 解析 |

## 扩展约定

新增 Tab 时：
1. 创建 `YourNewTab.tsx`（保持 <200 行，超出需拆分子组件 / hooks）
2. 复用 `uiTokens.ts` 颜色与样式，不得硬编码重复色值
3. 在 `index.ts` 中追加导出
4. 若需要较多副作用逻辑：
   - 抽离至 `../hooks/useYourNewTabLogic.ts`
   - 逻辑函数放入 `../logic/yourNewTabLogic.ts`
5. 保持**展示与数据读取分离**，不直接写入全局 store

## 行数与复杂度守护

- 单文件建议 < 300 行（Tab 组件推荐 < 250 行）
- 发现重复色值 / 样式 > 2 处时提炼至 `uiTokens.ts`
- 函数 > 80 行需拆分

## 命名约定

- 组件：PascalCase (`FieldDetailTab`)
- Hook：`useXxx` (`usePrecisionAnalysis`)
- Token：驼峰 (`accentBlue`, `surfaceAlt`)

## 后续可演进方向

- 将 tokens 升级到 CSS Variables（支持主题切换）
- 引入 Storybook 做可视回归（若团队需要）
- 通过 ESLint 插件检测硬编码颜色并提示迁移

---

更新日期：2025-09-26
维护人：AI 自动化重构助手
