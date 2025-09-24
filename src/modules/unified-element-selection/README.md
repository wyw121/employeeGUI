# 统一元素选择模块

## 概述

本模块解决了**元素选择路径不统一**的核心问题，确保所有视图（可视化、节点树、屏幕预览、匹配结果）的元素选择都通过统一接口处理，完整记录元素信息、XML快照、匹配预设、包含/排除条件。

## 核心功能

### 1. 统一元素选择处理
- **所有视图统一入口**：可视化视图、节点树、屏幕预览、匹配结果等所有选择路径
- **完整信息记录**：元素属性、XML快照、匹配策略、定位信息一应俱全
- **事件驱动架构**：支持监听器模式，便于扩展和集成

### 2. 增强元素指纹
- **多维度指纹**：结合resource-id、text、class、bounds、XPath等多重信息
- **稳定性优化**：权重算法确保指纹在页面小幅变化时保持稳定
- **相似度计算**：支持元素相似度对比，用于模糊匹配

### 3. 精确元素重定位
- **多策略定位**：精确XPath → 谓词XPath → 属性匹配 → Bounds匹配 → 模糊匹配
- **容错机制**：支持文本相似度、Bounds偏差容忍、结构变化适应
- **高置信度**：提供定位置信度评分，确保重定位结果可靠

## 使用方式

### 基本使用

```typescript
import { 
  unifiedElementSelectionHandler,
  type CompleteElementContext,
  type ElementSelectionSource 
} from '@/modules/unified-element-selection';

// 1. 设置XML上下文（必须在元素选择前调用）
unifiedElementSelectionHandler.setXmlContext(
  xmlContent,
  deviceInfo,
  pageInfo,
  xmlSnapshot // 可选，如果已有快照
);

// 2. 处理元素选择
const context = await unifiedElementSelectionHandler.handleElementSelection(
  selectedNode,
  'visual-view', // 选择来源
  { 
    userAction: 'click',
    viewMode: 'visual' 
  } // 可选元数据
);

// 3. 重定位元素（用于"修改参数"场景）
const relocationResult = unifiedElementSelectionHandler.relocateElement(
  context,
  newRootNode
);
```

### 监听元素选择事件

```typescript
// 添加监听器
unifiedElementSelectionHandler.addListener(async (event) => {
  console.log('Element selected:', event.context.elementId);
  console.log('Selection source:', event.source);
  
  // 根据选择事件执行相应逻辑
  if (event.source === 'visual-view') {
    // 可视化视图选择处理
  } else if (event.source === 'node-tree') {
    // 节点树选择处理
  }
});
```

### 从步骤参数重建上下文

```typescript
// 用于"修改参数"时恢复完整的元素上下文
const context = unifiedElementSelectionHandler.rebuildContextFromStepParameters(
  step.parameters
);

if (context) {
  // 使用重建的上下文进行重定位
  const result = unifiedElementSelectionHandler.relocateElement(
    context,
    currentRootNode
  );
  
  if (result.node) {
    console.log(`Element relocated with confidence: ${result.confidence}`);
  }
}
```

## 集成到各视图组件

### 可视化视图集成

```typescript
// 在 VisualElementView 中
const handleElementClick = async (element: VisualUIElement) => {
  const node = convertToUiNode(element);
  
  const context = await unifiedElementSelectionHandler.handleElementSelection(
    node,
    'visual-view',
    { userAction: 'click', viewMode: 'visual' }
  );
  
  // 上报给父组件
  onElementSelected?.(element);
};
```

### 节点树集成

```typescript
// 在 TreeRow 中
const handleNodeSelect = async (node: UiNode) => {
  const context = await unifiedElementSelectionHandler.handleElementSelection(
    node,
    'node-tree',
    { userAction: 'click', viewMode: 'grid' }
  );
  
  onSelect?.(node);
};
```

### 屏幕预览集成

```typescript
// 在 ScreenPreviewPanel 中
const handlePreviewElementClick = async (node: UiNode) => {
  const context = await unifiedElementSelectionHandler.handleElementSelection(
    node,
    'screen-preview',
    { userAction: 'click', viewMode: 'grid' }
  );
  
  onSelect?.(node);
};
```

### 匹配结果集成

```typescript
// 在 ResultsAndXPathPanel 中
const handleResultItemClick = async (node: UiNode, index: number) => {
  const context = await unifiedElementSelectionHandler.handleElementSelection(
    node,
    'match-results',
    { 
      userAction: 'click', 
      viewMode: 'grid',
      matchIndex: index 
    }
  );
  
  onJump?.(index, node);
};
```

## 数据结构

### CompleteElementContext

```typescript
interface CompleteElementContext {
  elementId: string;              // 唯一元素指纹
  node: UiNode;                  // 完整UI节点
  locator: ElementLocator;       // 标准定位器
  matching: MatchCriteria;       // 匹配条件
  xmlSnapshot: XmlSnapshot;      // XML快照
  selectionSource: ElementSelectionSource; // 选择来源
  selectedAt: number;            // 选择时间
  updatedAt: number;             // 更新时间
}
```

### ElementSelectionSource

```typescript
type ElementSelectionSource = 
  | 'visual-view'        // 可视化视图选择
  | 'node-tree'          // 节点树选择  
  | 'screen-preview'     // 屏幕预览选择
  | 'match-results'      // 匹配结果选择
  | 'xpath-results'      // XPath测试结果选择
  | 'programmatic';      // 程序化选择
```

## 重定位策略

1. **exact-xpath**: 精确XPath匹配（置信度最高）
2. **predicate-xpath**: 基于属性的谓词XPath
3. **attributes**: 属性权重匹配
4. **bounds**: 位置边界匹配
5. **fuzzy**: 模糊相似度匹配（兜底策略）

## 配置选项

### 指纹生成配置

```typescript
const config: ElementFingerprintConfig = {
  weights: {
    resourceId: 10,    // resource-id 最高权重
    text: 6,          // text 较高权重
    contentDesc: 6,   // content-desc 较高权重
    className: 4,     // class 中等权重
    bounds: 3,        // bounds 较低权重
    xpath: 8,         // xpath 高权重
    parentContext: 5, // 父级上下文中等权重
    siblingIndex: 2,  // 兄弟索引最低权重
  },
  algorithm: 'sha256',
  includeXmlHash: false,
  includePath: true,
};
```

### 重定位配置

```typescript
const config: ElementRelocationConfig = {
  strategies: ['exact-xpath', 'attributes', 'predicate-xpath', 'bounds', 'fuzzy'],
  attributeMatching: {
    exactMatch: ['resource-id'],
    fuzzyMatch: ['text', 'content-desc'],
    ignoreCase: true,
    allowPartialText: true,
  },
  tolerance: {
    boundsDeviation: 10,      // 10像素偏差
    textSimilarity: 0.7,      // 70%文本相似度
    structureChange: true,    // 容忍结构变化
  },
};
```

## 最佳实践

1. **及时设置XML上下文**：在元素选择前必须调用`setXmlContext`
2. **统一选择入口**：所有视图的元素选择都通过`handleElementSelection`
3. **合理使用监听器**：避免在监听器中执行重操作，影响性能
4. **定期清理**：长时间运行的应用应定期清理不需要的监听器
5. **错误处理**：重定位可能失败，应有合适的fallback策略

## 调试和诊断

模块提供详细的日志输出，可在开发者控制台中查看：

- 元素选择事件
- 指纹生成过程
- 重定位尝试过程
- 匹配置信度评分

在生产环境中可通过配置关闭详细日志。