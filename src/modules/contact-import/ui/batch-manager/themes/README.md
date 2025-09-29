# 主题适配使用指南

## 🎯 概述

本模块提供了完整的主题适配解决方案，解决在暗黑主题下字体颜色看不清的问题，确保所有表格单元格组件在不同主题下都能正确显示。

## 🏗️ 架构设计

### 主题系统层级关系

```
src/theme/                          # 全局主题系统
├── ThemeProvider.tsx               # 主题上下文提供者
├── tokens.ts                       # 主题令牌定义
└── index.ts                       # 主题导出

src/modules/.../batch-manager/themes/  # 模块级主题适配
├── styles.ts                      # 主题样式工具
└── README.md                      # 本文档

src/modules/.../table-cells/       # 组件级主题实现
├── ThemeAwareCell.tsx            # 主题感知基础组件
├── TimeFormatterCell.tsx        # 时间格式化组件
└── BatchIdCell.tsx              # 批次ID组件
```

### 颜色继承关系

```
全局主题 (ThemeProvider)
    ↓
CSS变量映射 (tokens.ts)
    ↓  
主题样式工具 (themes/styles.ts)
    ↓
表格单元格组件 (table-cells/*.tsx)
    ↓
最终渲染效果
```

## 🎨 主题适配原理

### 1. 问题分析

**原问题**：TimeFormatterCell 硬编码颜色值
```tsx
// ❌ 硬编码颜色，暗黑主题下看不清
<div style={{ color: '#1f2937' }}>9月29日</div>
<div style={{ color: '#6b7280' }}>上午 10:30</div>
```

**解决方案**：使用主题感知的动态颜色
```tsx
// ✅ 主题适配，自动切换颜色
const { mode } = useTheme();
const styles = getTimeFormatterCellStyles(mode);
<div style={styles.dateRow}>9月29日</div>
<div style={styles.timeRow}>上午 10:30</div>
```

### 2. 颜色映射机制

| 主题模式 | 主要文本 | 次要文本 | 第三级文本 |
|---------|---------|---------|-----------|
| **亮色** | `#1f2937` | `#4b5563` | `#6b7280` |
| **暗黑** | `#f0f6fc` | `#8b949e` | `#6e7681` |

## 🛠️ 使用方式

### 1. 基础主题感知组件

```tsx
import { ThemeAwareCell, PrimaryText, SecondaryText } from '../table-cells';

// 基础使用
<PrimaryText>重要内容</PrimaryText>
<SecondaryText>次要内容</SecondaryText>

// 高级使用
<ThemeAwareCell 
  variant="primary" 
  clickable 
  onClick={() => {}}
>
  可点击内容
</ThemeAwareCell>
```

### 2. 时间格式化组件

```tsx
import { TimeFormatterCell } from '../table-cells';

// 标准显示（两行）
<TimeFormatterCell datetime="2025-09-29T10:30:00" />

// 紧凑显示（单行）
<TimeFormatterCell datetime="2025-09-29T10:30:00" compact />
```

### 3. 批次ID组件

```tsx
import { BatchIdCell } from '../table-cells';

// 基础使用
<BatchIdCell batchId="batch_20250929_103045_12345" />

// 初始展开
<BatchIdCell batchId="..." initialExpanded />

// 自定义参数
<BatchIdCell 
  batchId="..." 
  maxWidth={150}
  abbreviateLength={12}
/>
```

### 4. 自定义样式工具

```tsx
import { useTheme } from '../../../../../../theme';
import { getAllThemeStyles } from '../../themes/styles';

function CustomComponent() {
  const { mode } = useTheme();
  const styles = getAllThemeStyles(mode);
  
  return (
    <div>
      <span style={styles.text.primaryText}>主要文本</span>
      <span style={styles.text.secondaryText}>次要文本</span>
      <div style={styles.container.cardBg}>卡片背景</div>
    </div>
  );
}
```

## 🎯 最佳实践

### 1. 新组件开发

**DO ✅**
```tsx
// 使用主题感知组件
import { ThemeAwareCell } from '../table-cells';
import { useTheme } from '../../../../../../theme';
import { getThemeAwareTextStyles } from '../../themes/styles';

function NewTableCell() {
  const { mode } = useTheme();
  const textStyles = getThemeAwareTextStyles(mode);
  
  return (
    <ThemeAwareCell variant="primary">
      主题适配的内容
    </ThemeAwareCell>
  );
}
```

**DON'T ❌**
```tsx
// 硬编码颜色值
function BadTableCell() {
  return (
    <div style={{ color: '#1f2937' }}>
      硬编码颜色
    </div>
  );
}
```

### 2. 样式隔离原则

每个模块应该：
- ✅ 使用自己的 `themes/styles.ts` 文件
- ✅ 根据业务需求定制样式函数
- ✅ 通过 `useTheme()` 获取当前主题
- ❌ 不直接访问全局CSS变量
- ❌ 不硬编码颜色值

### 3. 性能优化

```tsx
// ✅ 在组件顶层调用，避免重复计算
function OptimizedComponent() {
  const { mode } = useTheme();
  const styles = useMemo(() => getTimeFormatterCellStyles(mode), [mode]);
  
  return <div style={styles.dateRow}>内容</div>;
}

// ❌ 在渲染函数中重复调用
function BadComponent() {
  return (
    <div style={getTimeFormatterCellStyles(useTheme().mode).dateRow}>
      内容
    </div>
  );
}
```

## 🔧 扩展指南

### 1. 添加新的文本样式变体

```tsx
// 在 themes/styles.ts 中添加
export function getThemeAwareTextStyles(mode: ThemeMode) {
  return {
    // ... 现有样式
    highlightText: {
      color: vars['--color-primary'],
      fontWeight: 700,
      textShadow: '0 0 4px rgba(255, 107, 138, 0.3)',
    },
  };
}

// 在 ThemeAwareCell.tsx 中添加类型
export type TextVariant = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'emphasized' 
  | 'error' 
  | 'success' 
  | 'warning'
  | 'highlight'; // 新增

// 使用新样式
<ThemeAwareCell variant="highlight">
  高亮文本
</ThemeAwareCell>
```

### 2. 创建专用样式函数

```tsx
// 为特定组件创建专用样式
export function getCustomCellStyles(mode: ThemeMode) {
  const vars = cssVars[mode];
  const textStyles = getThemeAwareTextStyles(mode);
  
  return {
    customCell: {
      ...textStyles.primaryText,
      backgroundColor: vars['--card-glass-bg'],
      border: `1px solid ${vars['--card-glass-border']}`,
      borderRadius: '8px',
      padding: '8px 12px',
    },
  };
}
```

### 3. CSS变量直接使用

```tsx
import { CSS_VARS } from '../../themes/styles';

// 在样式对象中使用
const styles = {
  container: {
    color: CSS_VARS.TEXT_PRIMARY,
    backgroundColor: CSS_VARS.BG_CONTAINER,
    border: `1px solid ${CSS_VARS.BORDER}`,
  },
};

// 在CSS文件中使用（如果需要）
// .custom-class {
//   color: var(--color-text);
//   background-color: var(--color-bg-container);
// }
```

## 🎪 Demo示例

### 完整的表格单元格示例

```tsx
import { 
  TimeFormatterCell, 
  BatchIdCell, 
  PrimaryText, 
  SecondaryText,
  SuccessText,
  ErrorText 
} from '../table-cells';

function DemoTable() {
  return (
    <table>
      <tbody>
        <tr>
          {/* 时间显示 */}
          <td>
            <TimeFormatterCell datetime="2025-09-29T10:30:00" />
          </td>
          
          {/* 批次ID */}
          <td>
            <BatchIdCell batchId="batch_20250929_103045_12345" />
          </td>
          
          {/* 状态显示 */}
          <td>
            <SuccessText>成功</SuccessText>
          </td>
          
          {/* 错误信息 */}
          <td>
            <ErrorText>失败</ErrorText>
          </td>
          
          {/* 普通文本 */}
          <td>
            <PrimaryText>主要信息</PrimaryText>
            <SecondaryText>附加信息</SecondaryText>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

## 🚀 迁移指南

### 从硬编码颜色迁移

```tsx
// 迁移前
function OldComponent() {
  return (
    <div>
      <span style={{ color: '#1f2937', fontWeight: 500 }}>
        重要文本
      </span>
      <span style={{ color: '#6b7280', fontSize: '12px' }}>
        次要文本
      </span>
    </div>
  );
}

// 迁移后
function NewComponent() {
  return (
    <div>
      <PrimaryText style={{ fontWeight: 500 }}>
        重要文本
      </PrimaryText>
      <SecondaryText style={{ fontSize: '12px' }}>
        次要文本
      </SecondaryText>
    </div>
  );
}
```

## 📋 检查清单

在开发新组件时，请确保：

- [ ] 使用 `useTheme()` 获取当前主题模式
- [ ] 通过 `themes/styles.ts` 工具函数获取样式
- [ ] 避免硬编码任何颜色值
- [ ] 在亮色和暗黑主题下都测试过显示效果
- [ ] 使用 `ThemeAwareCell` 或其预设组件
- [ ] 为自定义样式提供适当的类型定义
- [ ] 组件支持 `className` 和 `style` props 覆盖

---

**问题反馈**：如果发现主题适配问题或需要新的样式变体，请在相关Issue中提出。