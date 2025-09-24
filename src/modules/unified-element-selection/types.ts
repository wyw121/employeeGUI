/**
 * 统一元素选择模块 - 类型定义
 * 
 * 目标：统一所有视图（可视化、节点树、屏幕预览、匹配结果）的元素选择处理，
 * 确保完整记录元素信息、XML快照、匹配预设、包含/排除条件
 */

import type { UiNode } from '../../components/universal-ui/views/grid-view/types';
import type { MatchCriteria } from '../../components/universal-ui/views/grid-view/panels/node-detail/types';
import type { XmlSnapshot, ElementLocator } from '../../types/selfContainedScript';

/**
 * 完整的元素选择上下文
 * 包含所有必要信息，用于后续精确重现和定位
 */
export interface CompleteElementContext {
  // === 基础元素信息 ===
  elementId: string; // 元素唯一标识（基于多重指纹生成）
  node: UiNode; // 完整的UI节点信息
  
  // === 定位信息 ===
  locator: ElementLocator; // 标准定位器（包含XPath、bounds、属性等）
  
  // === 匹配预设 ===
  matching: MatchCriteria; // 完整的匹配条件（策略+字段+值+包含+排除）
  
  // === XML上下文 ===
  xmlSnapshot: XmlSnapshot; // 完整的XML快照（用于重现场景）
  
  // === 选择来源 ===
  selectionSource: ElementSelectionSource; // 记录选择来源，便于调试和审计
  
  // === 时间戳 ===
  selectedAt: number; // 选择时间戳
  updatedAt: number; // 最后更新时间戳
}

/**
 * 元素选择来源枚举
 */
export type ElementSelectionSource = 
  | 'visual-view'        // 可视化视图选择
  | 'node-tree'          // 节点树选择  
  | 'screen-preview'     // 屏幕预览选择
  | 'match-results'      // 匹配结果选择
  | 'xpath-results'      // XPath测试结果选择
  | 'programmatic';      // 程序化选择（如定位器恢复）

/**
 * 元素选择事件
 */
export interface ElementSelectionEvent {
  context: CompleteElementContext;
  source: ElementSelectionSource;
  metadata?: {
    // 额外的选择元数据
    userAction?: 'click' | 'keyboard' | 'hover';
    viewMode?: 'visual' | 'tree' | 'list' | 'grid';
    searchQuery?: string; // 如果是通过搜索选择的
    matchIndex?: number; // 如果是匹配结果中的第几个
  };
}

/**
 * 元素选择监听器
 */
export type ElementSelectionListener = (event: ElementSelectionEvent) => void | Promise<void>;

/**
 * 元素指纹配置
 * 用于生成唯一且稳定的元素标识
 */
export interface ElementFingerprintConfig {
  // 指纹组成要素的权重
  weights: {
    resourceId: number;    // resource-id 权重
    text: number;          // text 权重  
    contentDesc: number;   // content-desc 权重
    className: number;     // class 权重
    bounds: number;        // bounds 权重
    xpath: number;         // xpath 权重
    parentContext: number; // 父级上下文权重
    siblingIndex: number;  // 兄弟节点索引权重
  };
  
  // 指纹算法选项
  algorithm: 'sha256' | 'md5' | 'custom';
  includeXmlHash: boolean; // 是否包含XML哈希
  includePath: boolean;    // 是否包含完整路径
}

/**
 * 元素重定位配置
 */
export interface ElementRelocationConfig {
  // 定位策略优先级
  strategies: Array<'exact-xpath' | 'predicate-xpath' | 'attributes' | 'bounds' | 'fuzzy'>;
  
  // 属性匹配配置
  attributeMatching: {
    exactMatch: string[];      // 需要精确匹配的属性
    fuzzyMatch: string[];      // 允许模糊匹配的属性  
    ignoreCase: boolean;       // 是否忽略大小写
    allowPartialText: boolean; // 是否允许部分文本匹配
  };
  
  // 容错配置
  tolerance: {
    boundsDeviation: number;   // bounds 偏差容忍度（像素）
    textSimilarity: number;    // 文本相似度阈值 (0-1)
    structureChange: boolean;  // 是否容忍结构变化
  };
}