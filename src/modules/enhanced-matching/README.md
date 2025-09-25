/**
 * enhanced-matching/README.md
 * 增强匹配系统说明文档
 */

# 增强匹配系统 (Enhanced Matching System)

## 📋 项目背景

本模块旨在解决当前XML匹配系统中的**父子节点字段混淆**问题。

### 问题描述
在原有的 `DefaultMatchingBuilder.ts` 中，存在以下核心问题：
- 生成的匹配条件如 `clickable=true + first_child_text=关注`
- 但实际XML结构中 `clickable=false` 在外层，`text=关注` 在更深的孙子节点
- 导致Standard策略匹配失败，回退到固定坐标点击

### XML结构示例
```xml
<FrameLayout clickable="false">  <!-- 父节点 -->
  <FrameLayout clickable="true">  <!-- 子节点 -->
    <TextView text="关注"/>        <!-- 孙子节点 -->
  </FrameLayout>
</FrameLayout>
```

## 🏗️ 模块架构

### 核心组件

#### 1. 类型系统 (`types.ts`)
- `NodeLevel`: 节点层级枚举
- `FieldHierarchy`: 字段层级定义
- `NodeHierarchyAnalysis`: 层级分析结果
- `SmartMatchingConditions`: 智能匹配条件

#### 2. 层级分析器 (`analyzer/HierarchyAnalyzer.ts`)
**职责**: 智能分析XML结构中的父子关系
- `analyzeNodeHierarchy()`: 分析节点层级结构
- `classifyFieldHierarchy()`: 智能分类字段层级
- `findTextFieldLocation()`: 检测文本字段实际位置
- `generateIntelligentFieldCombination()`: 生成智能字段组合

**解决问题**:
- ✅ 准确识别字段所在的层级（self/parent/child/descendant）
- ✅ 避免混合不同层级的字段进行匹配
- ✅ 智能检测文本在深层嵌套中的实际位置

#### 3. 智能条件生成器 (`generator/SmartConditionGenerator.ts`)
**职责**: 替代DefaultMatchingBuilder中存在问题的逻辑
- `generateSmartConditions()`: 主入口方法
- `generateEnhancedFields()`: 生成增强匹配字段
- `calculateFieldConfidence()`: 计算字段置信度
- `optimizeFieldSelection()`: 优化字段选择
- `selectOptimalStrategy()`: 选择最优匹配策略

**解决问题**:
- ✅ 生成层级感知的字段名（如`child_0_text`, `parent_clickable`）
- ✅ 避免父子字段混淆导致的匹配失败
- ✅ 提供置信度评分和智能策略选择

#### 4. UI组件 (`components/HierarchyFieldDisplay.tsx`)
**职责**: 为用户展示清晰的字段层级关系
- `HierarchyFieldDisplay`: 完整的层级显示组件
- `HierarchyFieldChips`: 简化的芯片显示组件

**解决问题**:
- ✅ 用户能清楚看到每个字段来源于哪个层级
- ✅ 提供可视化的置信度和描述信息
- ✅ 支持自定义字段选择和修改

## 🔧 使用方式

### 基础用法
```typescript
import { 
  generateEnhancedMatching, 
  analyzeNodeHierarchy,
  MATCHING_PRESETS 
} from '@/modules/enhanced-matching';

// 快速生成增强匹配条件
const conditions = generateEnhancedMatching(element, xmlDocument);
console.log(conditions.strategy); // 'standard'
console.log(conditions.fields); // ['resource-id', 'child_0_text', 'parent_clickable']
```

### 高级配置
```typescript
import { SmartConditionGenerator } from '@/modules/enhanced-matching';

const conditions = SmartConditionGenerator.generateSmartConditions(
  element, 
  xmlDocument, 
  {
    enableParentContext: true,
    enableChildContext: true,
    maxDepth: 3,
    prioritizeSemanticFields: true,
    excludePositionalFields: true
  }
);
```

### UI集成
```tsx
import { HierarchyFieldDisplay } from '@/modules/enhanced-matching';

<HierarchyFieldDisplay
  fields={conditions.hierarchy}
  analysis={conditions.analysis}
  onFieldSelect={handleFieldSelect}
  selectedFields={selectedFields}
  showConfidence={true}
/>
```

## 📊 预设配置

### CROSS_DEVICE (跨设备兼容)
- 启用父子上下文
- 排除位置字段
- 优先语义字段
- **适用**: 不同分辨率设备间的脚本复用

### STRICT (精确匹配)
- 仅使用当前节点字段
- 包含位置信息
- **适用**: 单设备高精度定位

### SMART_HIERARCHY (智能层级)
- 启用深度搜索
- 最大深度3层
- **适用**: 复杂嵌套结构的智能分析

## 🚀 集成计划

### 阶段1: 核心模块集成
- [x] 创建增强匹配模块
- [ ] 集成到 `usePageFinder.tsx` 
- [ ] 替换 `DefaultMatchingBuilder.ts` 逻辑

### 阶段2: UI增强
- [ ] 集成到节点详情面板
- [ ] 步骤卡片显示字段层级
- [ ] 用户自定义字段选择器

### 阶段3: 后端支持
- [ ] Rust层级匹配算法增强
- [ ] 支持arbitrary depth搜索
- [ ] 性能优化

## 📈 预期效果

### 匹配准确性提升
- **当前**: Standard策略匹配成功率 ~60%
- **预期**: 增强后匹配成功率 >85%

### 用户体验改善  
- 清晰的字段层级显示
- 智能的匹配策略建议
- 直观的置信度反馈

### 跨设备兼容性
- 避免硬编码坐标回退
- 语义字段优先匹配
- 分辨率无关的定位方式

## 🔍 调试支持

### 开发模式日志
```typescript
// 启用详细日志
const conditions = generateEnhancedMatching(element, xmlDocument, {
  debug: true  // 输出分析过程详情
});
```

### 测试用例覆盖
- 单元测试: 层级分析准确性
- 集成测试: 端到端匹配流程
- 性能测试: 大型XML文档处理

---

**注意**: 本模块严格遵循项目的DDD架构原则和模块化约束，确保与现有系统的无缝集成。