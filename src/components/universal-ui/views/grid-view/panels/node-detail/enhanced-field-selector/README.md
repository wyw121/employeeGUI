# 增强字段选择器模块

## 📋 模块概述

增强字段选择器模块为网格检查器提供了完整的字段自定义选择功能，解决了增强字段（父节点、子节点、交互状态等）无法在UI中自定义选择的问题。

## 🎯 解决的问题

1. **字段暴露不完整**: 之前只有基础字段可选，增强字段被隐藏
2. **缺乏分类管理**: 所有字段混在一起，难以理解和选择
3. **缺少使用指导**: 用户不知道何时使用哪些字段
4. **策略推荐缺失**: 没有根据策略推荐合适的字段组合

## 🏗️ 模块架构

```
enhanced-field-selector/
├── fieldDefinitions.ts        # 字段分组定义和配置
├── AdvancedFieldSelector.tsx  # 高级字段选择器组件
├── FieldDescriptionPanel.tsx  # 字段说明和帮助面板
├── index.ts                   # 模块导出
└── README.md                  # 模块文档
```

## 📊 字段分组体系

### 🎯 基础字段组
传统UI元素属性，适用于大多数匹配场景
- `resource-id` - 资源ID（最稳定）
- `text` - 文本内容
- `content-desc` - 内容描述
- `class` - 控件类型
- `package` - 应用包名
- `bounds` - 位置边界
- `index` - 索引位置

### 👨‍👦 父节点字段组
向上查找父元素信息，解决子元素有文本但父容器才可点击的问题
- `parent_class` - 父节点类型
- `parent_text` - 父节点文本
- `parent_resource_id` - 父节点资源ID
- `parent_content_desc` - 父节点内容描述

### 👶 子节点字段组
向下查找子元素信息，解决父容器有文本但子元素内容更具体的问题
- `first_child_text` - 首个子节点文本
- `first_child_content_desc` - 首个子节点描述
- `first_child_resource_id` - 首个子节点ID
- `descendant_texts` - 后代节点文本集

### 🎭 交互状态字段组
元素的交互状态属性，提供动态匹配能力
- `clickable` - 可点击状态
- `checkable` - 可选中状态
- `checked` - 选中状态
- `scrollable` - 可滚动状态
- `enabled` - 启用状态
- `password` - 密码字段

### 🎪 可点击祖先字段组
向上查找最近的可点击容器，实现智能点击目标识别
- `clickable_ancestor_class` - 可点击祖先类型
- `clickable_ancestor_resource_id` - 可点击祖先ID
- `clickable_ancestor_text` - 可点击祖先文本

## 🚀 使用方法

### 基础使用

```tsx
import { AdvancedFieldSelector } from './enhanced-field-selector';

function MyComponent() {
  const [selectedFields, setSelectedFields] = useState<string[]>(['resource-id', 'text']);
  const [strategy, setStrategy] = useState<string>('standard');

  return (
    <AdvancedFieldSelector
      selectedFields={selectedFields}
      strategy={strategy}
      onFieldsChange={setSelectedFields}
      onGroupToggle={(groupId, enabled) => {
        console.log(`Group ${groupId} ${enabled ? 'enabled' : 'disabled'}`);
      }}
    />
  );
}
```

### 字段说明面板

```tsx
import { FieldDescriptionPanel } from './enhanced-field-selector';

function MyComponent() {
  const [selectedFieldForHelp, setSelectedFieldForHelp] = useState<string | null>(null);

  return (
    <FieldDescriptionPanel
      fieldKey={selectedFieldForHelp}
      onClose={() => setSelectedFieldForHelp(null)}
    />
  );
}
```

### 字段信息查询

```tsx
import { getFieldInfo, analyzeFieldUsage } from './enhanced-field-selector';

// 获取单个字段信息
const fieldInfo = getFieldInfo('parent_class');

// 分析字段使用情况
const analysis = analyzeFieldUsage(['resource-id', 'text', 'parent_class']);
console.log('分组统计:', analysis.groupStats);
console.log('缺失推荐字段:', analysis.missingRecommended);
```

## 🎨 组件特性

### AdvancedFieldSelector 组件

**功能特性:**
- ✅ 分组展示所有可用字段
- ✅ 智能推荐基于当前策略的字段组
- ✅ 支持字段批量选择和取消选择
- ✅ 紧凑模式和详细模式切换
- ✅ 字段优先级和使用场景提示

**Props 接口:**
```tsx
interface AdvancedFieldSelectorProps {
  selectedFields: string[];           // 当前选中的字段
  strategy: string;                   // 当前匹配策略
  onFieldsChange: (fields: string[]) => void;    // 字段变化回调
  onGroupToggle?: (groupId: string, enabled: boolean) => void;  // 分组切换回调
  compact?: boolean;                  // 紧凑模式
}
```

### FieldDescriptionPanel 组件

**功能特性:**
- ✅ 详细的字段说明和使用指导
- ✅ 适用场景和兼容策略展示
- ✅ 示例值和最佳实践建议
- ✅ 可折叠和关闭的界面设计

**Props 接口:**
```tsx
interface FieldDescriptionPanelProps {
  fieldKey: string | null;           // 要显示说明的字段键
  onClose?: () => void;              // 关闭回调
  className?: string;                // 自定义样式类
}
```

## 🔧 集成指南

### 1. 集成到现有组件

```tsx
import { AdvancedFieldSelector, FieldDescriptionPanel } from './enhanced-field-selector';

// 在现有的 NodeDetailPanel 中集成
export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  // ... 其他 props
}) => {
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [helpFieldKey, setHelpFieldKey] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* 现有的匹配预设 */}
      <MatchPresetsRow {...existingProps} />
      
      {/* 🆕 高级字段选择器 */}
      {showAdvancedFields && (
        <AdvancedFieldSelector
          selectedFields={selectedFields}
          strategy={strategy}
          onFieldsChange={setSelectedFields}
          onGroupToggle={(groupId, enabled) => {
            // 处理分组切换逻辑
          }}
        />
      )}
      
      {/* 🆕 字段帮助面板 */}
      {helpFieldKey && (
        <FieldDescriptionPanel
          fieldKey={helpFieldKey}
          onClose={() => setHelpFieldKey(null)}
        />
      )}
    </div>
  );
};
```

### 2. 更新字段预设定义

需要扩展现有的 `PRESET_FIELDS` 来包含增强字段：

```typescript
// 在 helpers.ts 中扩展预设字段
import { getRecommendedFieldsForStrategy } from './enhanced-field-selector';

export const ENHANCED_PRESET_FIELDS = {
  ...PRESET_FIELDS,
  // 为每个策略添加推荐的增强字段
  standard: [...PRESET_FIELDS.standard, 'first_child_text', 'parent_class'],
  positionless: [...PRESET_FIELDS.positionless, 'parent_resource_id', 'parent_class'],
  // ... 其他策略
};
```

## 🧪 测试建议

### 单元测试

```tsx
import { render, fireEvent, screen } from '@testing-library/react';
import { AdvancedFieldSelector } from './enhanced-field-selector';

test('应该正确展示字段分组', () => {
  render(
    <AdvancedFieldSelector
      selectedFields={['resource-id']}
      strategy="standard"
      onFieldsChange={() => {}}
    />
  );
  
  expect(screen.getByText('基础字段')).toBeInTheDocument();
  expect(screen.getByText('资源ID')).toBeInTheDocument();
});

test('应该支持字段选择和取消', () => {
  const onFieldsChange = jest.fn();
  
  render(
    <AdvancedFieldSelector
      selectedFields={[]}
      strategy="standard"
      onFieldsChange={onFieldsChange}
    />
  );
  
  fireEvent.click(screen.getByLabelText('资源ID'));
  expect(onFieldsChange).toHaveBeenCalledWith(['resource-id']);
});
```

### 集成测试

```tsx
test('应该与现有匹配系统集成', async () => {
  // 模拟真实的匹配场景
  const mockNode = createMockUiNode();
  const mockXmlContent = createMockXmlContent();
  
  render(
    <NodeDetailPanel
      node={mockNode}
      xmlContent={mockXmlContent}
      // ... 其他 props
    />
  );
  
  // 选择增强字段
  fireEvent.click(screen.getByText('显示高级字段'));
  fireEvent.click(screen.getByLabelText('首个子节点文本'));
  
  // 验证匹配结果包含增强字段
  const result = await waitFor(() => screen.getByText('匹配成功'));
  expect(result).toBeInTheDocument();
});
```

## 📈 性能考虑

1. **懒加载**: 高级字段面板默认不渲染，按需展开
2. **记忆化**: 字段分析和推荐结果使用 useMemo 缓存
3. **虚拟化**: 大量字段时考虑使用虚拟滚动
4. **防抖**: 字段变化回调使用防抖避免频繁更新

## 🔮 未来扩展

1. **自定义字段**: 允许用户定义和保存自定义字段
2. **字段预设**: 保存和复用常用的字段组合
3. **智能建议**: 基于匹配成功率智能推荐字段
4. **字段验证**: 实时验证字段值的有效性
5. **导入导出**: 支持字段配置的导入导出

## 📝 维护说明

1. **字段定义更新**: 新增字段时需要更新 `fieldDefinitions.ts`
2. **分组调整**: 根据用户反馈调整字段分组和优先级
3. **文档同步**: 功能更新时同步更新 README 和使用说明
4. **测试覆盖**: 新功能需要相应的单元测试和集成测试

---

**增强字段选择器模块现已完整实现，为网格检查器提供了强大的字段自定义能力，大大提升了用户的使用体验和匹配效果！** 🚀