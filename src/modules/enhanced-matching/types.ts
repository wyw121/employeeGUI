/**
 * enhanced-matching/types.ts
 * 增强匹配系统的类型定义
 */

/**
 * 节点层级类型
 */
export type NodeLevel = 'self' | 'parent' | 'child' | 'descendant' | 'ancestor' | 'sibling';

/**
 * 字段层级定义
 */
export interface FieldHierarchy {
  level: NodeLevel;
  fieldName: string;
  displayName: string;
  description: string;
  depth?: number; // 对于 child/descendant，指定深度（0=直接子节点，-1=任意深度）
}

/**
 * 增强匹配字段
 */
export interface EnhancedMatchField extends FieldHierarchy {
  value: string;
  confidence: number; // 匹配置信度 0-1
  isUserDefined?: boolean; // 是否为用户自定义
}

/**
 * XML节点层级分析结果
 */
export interface NodeHierarchyAnalysis {
  self: Record<string, string>; // 当前节点属性
  parent?: Record<string, string>; // 父节点属性
  children: Record<string, string>[]; // 子节点属性列表
  descendants: Record<string, string>[]; // 所有后代节点属性
  siblings: Record<string, string>[]; // 兄弟节点属性
  depth: number; // 在XML树中的深度
  path: string; // XPath路径
}

/**
 * 智能匹配条件生成结果
 */
export interface SmartMatchingConditions {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
  includes: Record<string, string[]>;
  excludes: Record<string, string[]>;
  hierarchy: EnhancedMatchField[]; // 层级字段详情
  confidence: number; // 整体置信度
  analysis: NodeHierarchyAnalysis; // 层级分析结果
}

/**
 * 匹配优化选项
 */
export interface MatchingOptimizationOptions {
  enableParentContext: boolean; // 启用父节点上下文
  enableChildContext: boolean; // 启用子节点上下文
  enableDescendantSearch: boolean; // 启用后代搜索
  maxDepth: number; // 最大搜索深度
  prioritizeSemanticFields: boolean; // 优先语义字段
  excludePositionalFields: boolean; // 排除位置字段
}