/**
 * 增强元素信息类型定义
 * 包含完整的XML上下文和节点详情信息
 */

// XML节点在树中的位置信息
export interface XmlNodePath {
  /** 节点在XML树中的完整路径 */
  xpath: string;
  /** 节点在XML中的索引位置 */
  nodeIndex: number;
  /** 节点深度层级 */
  depth: number;
  /** 父节点路径 */
  parentPath?: string;
}

// XML上下文信息
export interface XmlContextInfo {
  /** XML缓存ID或文件名 */
  xmlCacheId: string;
  /** XML内容来源时间戳 */
  timestamp: number;
  /** 完整XML源码内容 */
  xmlSourceContent: string;
  /** 设备信息 */
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    resolution: { width: number; height: number };
  };
  /** 应用包名 */
  packageName: string;
  /** 当前页面信息 */
  pageInfo: {
    appName: string;
    pageName: string;
  };
}

// 节点详细信息
export interface XmlNodeDetails {
  /** 节点的原始XML属性 */
  attributes: Record<string, string>;
  /** 节点文本内容 */
  text?: string;
  /** 内容描述 */
  contentDesc?: string;
  /** 资源ID */
  resourceId?: string;
  /** CSS类名 */
  className?: string;
  /** 边界坐标 */
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  /** 可交互状态 */
  interactionStates: {
    clickable: boolean;
    scrollable: boolean;
    enabled: boolean;
    focused: boolean;
    selected: boolean;
    checkable: boolean;
    checked: boolean;
  };
  /** 父子关系信息 */
  relationships: {
    parent?: XmlNodeSummary;
    children: XmlNodeSummary[];
    siblings: XmlNodeSummary[];
  };
}

// 节点摘要信息（用于关系引用）
export interface XmlNodeSummary {
  nodeIndex: number;
  className: string;
  text?: string;
  contentDesc?: string;
  bounds: { left: number; top: number; right: number; bottom: number };
}

// 智能分析结果（从现有代码继承）
export interface SmartAnalysisResult {
  confidence: number;
  elementType: string;
  userDescription: string;
  actionSuggestion: string;
  businessContext?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

// 增强的UI元素信息（完整版本）
export interface EnhancedUIElement {
  // 基础UI元素信息
  id: string;
  text?: string;
  element_type?: string;
  resource_id?: string;
  content_desc?: string;
  
  // XML上下文信息
  xmlContext: XmlContextInfo;
  
  // 节点路径信息
  nodePath: XmlNodePath;
  
  // 节点详细信息
  nodeDetails: XmlNodeDetails;
  
  // 智能分析结果
  smartAnalysis?: SmartAnalysisResult;
  smartDescription?: string;
  
  // 生成时间戳
  generatedAt: number;
}

// 步骤卡片增强参数
export interface EnhancedStepParameters {
  // 原有参数保持不变
  [key: string]: any;
  
  // 新增：增强元素信息
  enhancedElement?: EnhancedUIElement;
  
  // 快速访问的关键信息
  elementSummary: {
    displayName: string;
    elementType: string;
    position: { x: number; y: number; width: number; height: number };
    xmlSource: string;
    confidence: number;
  };
}

// XML检查器所需的数据结构
export interface XmlInspectorData {
  xmlContent: string;
  targetNodeIndex: number;
  targetElement: EnhancedUIElement;
  highlightPath: string;
}

// 导出所有接口和类型