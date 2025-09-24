/**
 * 增强元素重定位器
 * 
 * 负责根据CompleteElementContext精确重定位元素
 * 支持多种定位策略和容错机制，确保"修改参数"时能找到之前选择的元素
 */

import type { UiNode } from '../../components/universal-ui/views/grid-view/types';
import type { CompleteElementContext, ElementRelocationConfig } from './types';
import type { NodeLocator } from '../../domain/inspector/entities/NodeLocator';
import type { ElementLocator } from '../../types/selfContainedScript';
import { 
  findByXPathRoot,
  findAllByPredicateXPath,
  findNearestClickableAncestor,
  parseBounds 
} from '../../components/universal-ui/views/grid-view/utils';
import { elementFingerprintGenerator } from './ElementFingerprintGenerator';

/**
 * 默认重定位配置
 */
const DEFAULT_RELOCATION_CONFIG: ElementRelocationConfig = {
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

/**
 * 重定位结果
 */
export interface RelocationResult {
  node: UiNode | null;
  strategy: string;           // 成功的定位策略
  confidence: number;         // 定位置信度 (0-1)
  reasons: string[];          // 匹配原因/失败原因
}

/**
 * 增强元素重定位器类
 */
export class EnhancedElementRelocator {
  private config: ElementRelocationConfig;

  constructor(config: Partial<ElementRelocationConfig> = {}) {
    this.config = { 
      ...DEFAULT_RELOCATION_CONFIG,
      ...config,
      attributeMatching: {
        ...DEFAULT_RELOCATION_CONFIG.attributeMatching,
        ...config.attributeMatching,
      },
      tolerance: {
        ...DEFAULT_RELOCATION_CONFIG.tolerance,
        ...config.tolerance,
      },
    };
  }

  /**
   * 重定位元素
   */
  relocateElement(context: CompleteElementContext, rootNode: UiNode): RelocationResult {
    const { locator, node: originalNode } = context;
    
    // 按配置的策略顺序尝试重定位
    for (const strategy of this.config.strategies) {
      const result = this.tryStrategy(strategy, context, rootNode);
      if (result.node) {
        return {
          ...result,
          strategy,
        };
      }
    }

    // 所有策略都失败
    return {
      node: null,
      strategy: 'none',
      confidence: 0,
      reasons: ['All relocation strategies failed'],
    };
  }

  /**
   * 尝试特定策略
   */
  private tryStrategy(strategy: string, context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    switch (strategy) {
      case 'exact-xpath':
        return this.tryExactXPath(context, rootNode);
      
      case 'predicate-xpath':
        return this.tryPredicateXPath(context, rootNode);
      
      case 'attributes':
        return this.tryAttributeMatching(context, rootNode);
      
      case 'bounds':
        return this.tryBoundsMatching(context, rootNode);
      
      case 'fuzzy':
        return this.tryFuzzyMatching(context, rootNode);
      
      default:
        return {
          node: null,
          confidence: 0,
          reasons: [`Unknown strategy: ${strategy}`],
        };
    }
  }

  /**
   * 精确XPath定位
   */
  private tryExactXPath(context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    const { locator } = context;
    
    if (!locator.additionalInfo?.xpath) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No XPath available'],
      };
    }

    try {
      const xpath = locator.additionalInfo.xpath;
      const node = findByXPathRoot(rootNode, xpath);
      
      if (node) {
        return {
          node,
          confidence: 0.95,
          reasons: [`Found by exact XPath: ${xpath}`],
        };
      }
    } catch (error) {
      return {
        node: null,
        confidence: 0,
        reasons: [`XPath failed: ${error}`],
      };
    }

    return {
      node: null,
      confidence: 0,
      reasons: ['XPath did not match any node'],
    };
  }

  /**
   * 谓词XPath定位
   */
  private tryPredicateXPath(context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    const { locator } = context;
    
    // 构建谓词XPath
    const predicates: string[] = [];
    const attrs = locator.additionalInfo;
    
    if (attrs?.resourceId) {
      predicates.push(`@resource-id='${attrs.resourceId}'`);
    }
    if (attrs?.text) {
      predicates.push(`@text='${attrs.text}'`);
    }
    if (attrs?.className) {
      predicates.push(`@class='${attrs.className}'`);
    }

    if (predicates.length === 0) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No attributes for predicate XPath'],
      };
    }

    try {
      const xpath = `//*[${predicates.join(' and ')}]`;
      const nodes = findAllByPredicateXPath(rootNode, xpath);
      
      if (nodes.length === 1) {
        return {
          node: nodes[0],
          confidence: 0.9,
          reasons: [`Found by predicate XPath: ${xpath}`],
        };
      } else if (nodes.length > 1) {
        // 多个匹配，选择最相似的
        const best = this.selectBestMatch(context.node, nodes);
        return {
          node: best,
          confidence: 0.8,
          reasons: [`Found ${nodes.length} matches by predicate XPath, selected best match`],
        };
      }
    } catch (error) {
      return {
        node: null,
        confidence: 0,
        reasons: [`Predicate XPath failed: ${error}`],
      };
    }

    return {
      node: null,
      confidence: 0,
      reasons: ['Predicate XPath did not match any node'],
    };
  }

  /**
   * 属性匹配定位
   */
  private tryAttributeMatching(context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    const { locator } = context;
    const attrs = locator.additionalInfo;
    
    if (!attrs) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No attributes for matching'],
      };
    }

    const candidates = this.getAllNodes(rootNode);
    const matches: { node: UiNode; score: number; reasons: string[] }[] = [];

    for (const candidate of candidates) {
      const result = this.calculateAttributeMatchScore(attrs, candidate);
      if (result.score > 0) {
        matches.push({
          node: candidate,
          score: result.score,
          reasons: result.reasons,
        });
      }
    }

    if (matches.length === 0) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No nodes matched the attributes'],
      };
    }

    // 选择得分最高的
    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];
    
    return {
      node: best.node,
      confidence: Math.min(0.9, best.score / 100), // 将分数转换为0-0.9的置信度
      reasons: [`Attribute matching score: ${best.score}`, ...best.reasons],
    };
  }

  /**
   * Bounds匹配定位
   */
  private tryBoundsMatching(context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    const { locator } = context;
    
    if (!locator.selectedBounds) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No bounds information available'],
      };
    }

    // 将ElementLocator的bounds格式转换为字符串
    const boundsStr = `[${locator.selectedBounds.left},${locator.selectedBounds.top}][${locator.selectedBounds.right},${locator.selectedBounds.bottom}]`;
    const targetBounds = parseBounds(boundsStr);
    if (!targetBounds) {
      return {
        node: null,
        confidence: 0,
        reasons: ['Invalid bounds format'],
      };
    }

    const candidates = this.getAllNodes(rootNode);
    const matches: { node: UiNode; deviation: number }[] = [];

    for (const candidate of candidates) {
      const candidateBounds = parseBounds(candidate.attrs?.['bounds'] || '');
      if (!candidateBounds) continue;

      const deviation = this.calculateBoundsDeviation(targetBounds, candidateBounds);
      if (deviation <= this.config.tolerance.boundsDeviation) {
        matches.push({ node: candidate, deviation });
      }
    }

    if (matches.length === 0) {
      return {
        node: null,
        confidence: 0,
        reasons: [`No nodes within bounds deviation tolerance (${this.config.tolerance.boundsDeviation}px)`],
      };
    }

    // 选择偏差最小的
    matches.sort((a, b) => a.deviation - b.deviation);
    const best = matches[0];
    
    const confidence = Math.max(0.1, 1 - (best.deviation / this.config.tolerance.boundsDeviation));
    
    return {
      node: best.node,
      confidence,
      reasons: [`Bounds matching with ${best.deviation}px deviation`],
    };
  }

  /**
   * 模糊匹配定位
   */
  private tryFuzzyMatching(context: CompleteElementContext, rootNode: UiNode): Omit<RelocationResult, 'strategy'> {
    const candidates = this.getAllNodes(rootNode);
    const matches: { node: UiNode; similarity: number }[] = [];

    for (const candidate of candidates) {
      if (elementFingerprintGenerator.isSameElement(context.node, candidate, 0.6)) {
        const similarity = this.calculateOverallSimilarity(context.node, candidate);
        matches.push({ node: candidate, similarity });
      }
    }

    if (matches.length === 0) {
      return {
        node: null,
        confidence: 0,
        reasons: ['No similar nodes found'],
      };
    }

    // 选择相似度最高的
    matches.sort((a, b) => b.similarity - a.similarity);
    const best = matches[0];
    
    return {
      node: best.node,
      confidence: best.similarity,
      reasons: [`Fuzzy matching with ${(best.similarity * 100).toFixed(1)}% similarity`],
    };
  }

  /**
   * 获取所有节点
   */
  private getAllNodes(rootNode: UiNode): UiNode[] {
    const nodes: UiNode[] = [];
    const stack = [rootNode];
    
    while (stack.length > 0) {
      const node = stack.pop()!;
      nodes.push(node);
      stack.push(...node.children);
    }
    
    return nodes;
  }

  /**
   * 计算属性匹配分数
   */
  private calculateAttributeMatchScore(targetAttrs: ElementLocator['additionalInfo'], node: UiNode): { score: number; reasons: string[] } {
    if (!targetAttrs) return { score: 0, reasons: [] };
    
    let score = 0;
    const reasons: string[] = [];
    const nodeAttrs = node.attrs || {};

    // 精确匹配属性
    for (const attr of this.config.attributeMatching.exactMatch) {
      const targetValue = (targetAttrs as any)[this.mapAttributeName(attr)];
      const nodeValue = nodeAttrs[attr];
      
      if (targetValue && nodeValue === targetValue) {
        score += 30; // 精确匹配高分
        reasons.push(`Exact match: ${attr}=${targetValue}`);
      }
    }

    // 模糊匹配属性
    for (const attr of this.config.attributeMatching.fuzzyMatch) {
      const targetValue = (targetAttrs as any)[this.mapAttributeName(attr)];
      const nodeValue = nodeAttrs[attr];
      
      if (targetValue && nodeValue) {
        const similarity = this.calculateTextSimilarity(targetValue, nodeValue);
        if (similarity >= this.config.tolerance.textSimilarity) {
          const points = Math.round(similarity * 20); // 最高20分
          score += points;
          reasons.push(`Fuzzy match: ${attr} (${(similarity * 100).toFixed(1)}%)`);
        }
      }
    }

    return { score, reasons };
  }

  /**
   * 映射属性名称
   */
  private mapAttributeName(attr: string): keyof ElementLocator['additionalInfo'] {
    const mapping: Record<string, keyof ElementLocator['additionalInfo']> = {
      'resource-id': 'resourceId',
      'text': 'text',
      'content-desc': 'contentDesc',
      'class': 'className',
    };
    
    return mapping[attr] || attr as keyof ElementLocator['additionalInfo'];
  }

  /**
   * 计算文本相似度
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    let str1 = text1;
    let str2 = text2;
    
    if (this.config.attributeMatching.ignoreCase) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }

    // 部分匹配
    if (this.config.attributeMatching.allowPartialText) {
      if (str1.includes(str2) || str2.includes(str1)) {
        return 0.9; // 部分匹配给90%相似度
      }
    }

    // 精确匹配
    if (str1 === str2) return 1.0;

    // 简单编辑距离相似度
    return 1 - (this.calculateEditDistance(str1, str2) / Math.max(str1.length, str2.length));
  }

  /**
   * 计算编辑距离
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  /**
   * 计算Bounds偏差
   */
  private calculateBoundsDeviation(bounds1: any, bounds2: any): number {
    const dx1 = Math.abs(bounds1.x1 - bounds2.x1);
    const dy1 = Math.abs(bounds1.y1 - bounds2.y1);
    const dx2 = Math.abs(bounds1.x2 - bounds2.x2);
    const dy2 = Math.abs(bounds1.y2 - bounds2.y2);
    
    return Math.max(dx1, dy1, dx2, dy2);
  }

  /**
   * 计算整体相似度
   */
  private calculateOverallSimilarity(node1: UiNode, node2: UiNode): number {
    const attrs1 = node1.attrs || {};
    const attrs2 = node2.attrs || {};
    
    let totalWeight = 0;
    let matchWeight = 0;
    
    const comparisons = [
      { key: 'resource-id', weight: 10 },
      { key: 'text', weight: 6 },
      { key: 'content-desc', weight: 6 },
      { key: 'class', weight: 4 },
      { key: 'bounds', weight: 3 },
    ];

    for (const { key, weight } of comparisons) {
      totalWeight += weight;
      
      const val1 = attrs1[key];
      const val2 = attrs2[key];
      
      if (val1 && val2) {
        if (val1 === val2) {
          matchWeight += weight;
        } else if (key === 'text' || key === 'content-desc') {
          const similarity = this.calculateTextSimilarity(val1, val2);
          matchWeight += weight * similarity;
        }
      }
    }

    return totalWeight > 0 ? matchWeight / totalWeight : 0;
  }

  /**
   * 从多个候选中选择最佳匹配
   */
  private selectBestMatch(originalNode: UiNode, candidates: UiNode[]): UiNode {
    if (candidates.length === 1) return candidates[0];
    
    let bestNode = candidates[0];
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const similarity = this.calculateOverallSimilarity(originalNode, candidate);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestNode = candidate;
      }
    }
    
    return bestNode;
  }
}

/**
 * 默认导出单例
 */
export const enhancedElementRelocator = new EnhancedElementRelocator();