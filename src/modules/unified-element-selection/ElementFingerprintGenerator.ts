/**
 * 元素指纹生成器
 * 
 * 负责为UI元素生成唯一且稳定的标识，用于后续精确定位
 * 结合多种属性和上下文信息，确保指纹的唯一性和稳定性
 */

import type { UiNode } from '../../components/universal-ui/views/grid-view/types';
import type { ElementFingerprintConfig } from './types';

/**
 * 默认指纹配置
 */
const DEFAULT_FINGERPRINT_CONFIG: ElementFingerprintConfig = {
  weights: {
    resourceId: 10,    // resource-id 最高权重，最稳定
    text: 6,          // text 较高权重，但可能变化
    contentDesc: 6,   // content-desc 较高权重
    className: 4,     // class 中等权重
    bounds: 3,        // bounds 较低权重，易变
    xpath: 8,         // xpath 高权重，结构稳定
    parentContext: 5, // 父级上下文中等权重
    siblingIndex: 2,  // 兄弟索引最低权重，易变
  },
  algorithm: 'sha256',
  includeXmlHash: false, // 不包含XML哈希，避免页面变化影响
  includePath: true,     // 包含路径信息
};

/**
 * 元素指纹生成器类
 */
export class ElementFingerprintGenerator {
  private config: ElementFingerprintConfig;

  constructor(config: Partial<ElementFingerprintConfig> = {}) {
    this.config = { ...DEFAULT_FINGERPRINT_CONFIG, ...config };
  }

  /**
   * 生成元素指纹
   */
  generateFingerprint(node: UiNode, xmlContent?: string): string {
    const components = this.extractFingerprintComponents(node, xmlContent);
    const weightedComponents = this.applyWeights(components);
    return this.hashComponents(weightedComponents);
  }

  /**
   * 提取指纹组成要素
   */
  private extractFingerprintComponents(node: UiNode, xmlContent?: string): Record<string, string> {
    const components: Record<string, string> = {};
    const attrs = node.attrs || {};

    // 基础属性
    if (attrs['resource-id']) components.resourceId = attrs['resource-id'];
    if (attrs['text']) components.text = attrs['text'].trim();
    if (attrs['content-desc']) components.contentDesc = attrs['content-desc'].trim();
    if (attrs['class']) components.className = attrs['class'];
    if (attrs['bounds']) components.bounds = attrs['bounds'];

    // XPath（如果可计算）
    const xpath = this.calculateXPath(node);
    if (xpath) components.xpath = xpath;

    // 父级上下文
    const parentContext = this.extractParentContext(node);
    if (parentContext) components.parentContext = parentContext;

    // 兄弟节点索引
    const siblingIndex = this.calculateSiblingIndex(node);
    components.siblingIndex = siblingIndex.toString();

    // XML哈希（可选）
    if (this.config.includeXmlHash && xmlContent) {
      components.xmlHash = this.hashString(xmlContent.slice(0, 1000)); // 仅取前1000字符
    }

    // 完整路径（可选）
    if (this.config.includePath) {
      const path = this.calculateElementPath(node);
      if (path) components.elementPath = path;
    }

    return components;
  }

  /**
   * 应用权重到各组件
   */
  private applyWeights(components: Record<string, string>): string[] {
    const weightedParts: string[] = [];
    
    Object.entries(components).forEach(([key, value]) => {
      if (!value) return;
      
      const weight = (this.config.weights as any)[key] || 1;
      // 根据权重重复添加组件，权重越高影响越大
      for (let i = 0; i < weight; i++) {
        weightedParts.push(`${key}:${value}`);
      }
    });

    return weightedParts;
  }

  /**
   * 哈希组件生成最终指纹
   */
  private hashComponents(components: string[]): string {
    const content = components.sort().join('|'); // 排序确保稳定性
    return this.hashString(content).slice(0, 16); // 取前16位作为指纹
  }

  /**
   * 计算元素XPath
   */
  private calculateXPath(node: UiNode): string | null {
    try {
      const path: string[] = [];
      let current: UiNode | null = node;
      
      while (current && current.parent) {
        const parent = current.parent;
        const siblings = parent.children.filter(child => 
          child.attrs?.['class'] === current!.attrs?.['class']
        );
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${current.attrs?.['class'] || '*'}[${index}]`);
        } else {
          path.unshift(current.attrs?.['class'] || '*');
        }
        
        current = parent;
      }

      return path.length > 0 ? `//${path.join('/')}` : null;
    } catch {
      return null;
    }
  }

  /**
   * 提取父级上下文
   */
  private extractParentContext(node: UiNode): string | null {
    if (!node.parent) return null;
    
    const parentAttrs = node.parent.attrs || {};
    const contextParts: string[] = [];
    
    if (parentAttrs['resource-id']) contextParts.push(`id:${parentAttrs['resource-id']}`);
    if (parentAttrs['class']) contextParts.push(`class:${parentAttrs['class']}`);
    
    return contextParts.length > 0 ? contextParts.join(',') : null;
  }

  /**
   * 计算兄弟节点索引
   */
  private calculateSiblingIndex(node: UiNode): number {
    if (!node.parent) return 0;
    
    return node.parent.children.indexOf(node);
  }

  /**
   * 计算元素路径
   */
  private calculateElementPath(node: UiNode): string | null {
    try {
      const path: string[] = [];
      let current: UiNode | null = node;
      
      while (current) {
        const identifier = current.attrs?.['resource-id'] || 
                          current.attrs?.['text']?.slice(0, 20) || 
                          current.attrs?.['class']?.split('.').pop() ||
                          'node';
        
        path.unshift(identifier);
        current = current.parent;
        
        // 限制路径深度，避免过长
        if (path.length >= 8) break;
      }

      return path.join(' > ');
    } catch {
      return null;
    }
  }

  /**
   * 字符串哈希工具（浏览器兼容）
   */
  private hashString(content: string): string {
    if (this.config.algorithm === 'sha256' || this.config.algorithm === 'md5') {
      // 在浏览器环境中使用简单但有效的哈希算法
      return this.simpleHash(content);
    } else {
      // 简单哈希实现（custom）
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转为32位整数
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * 简单但有效的哈希算法（用于浏览器环境）
   */
  private simpleHash(content: string): string {
    let hash1 = 0x12345678;
    let hash2 = 0x87654321;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1; // 转为32位整数
      
      hash2 = ((hash2 << 3) + hash2) ^ char;
      hash2 = hash2 & hash2; // 转为32位整数
    }
    
    const result = (Math.abs(hash1) * 0x100000000 + Math.abs(hash2)).toString(16);
    return result.padStart(16, '0');
  }

  /**
   * 验证两个节点是否可能是同一元素
   */
  isSameElement(node1: UiNode, node2: UiNode, threshold: number = 0.8): boolean {
    const fingerprint1 = this.generateFingerprint(node1);
    const fingerprint2 = this.generateFingerprint(node2);
    
    if (fingerprint1 === fingerprint2) return true;
    
    // 计算组件相似度
    const components1 = this.extractFingerprintComponents(node1);
    const components2 = this.extractFingerprintComponents(node2);
    
    let matchCount = 0;
    let totalCount = 0;
    
    const allKeys = new Set([...Object.keys(components1), ...Object.keys(components2)]);
    
    for (const key of allKeys) {
      totalCount++;
      if (components1[key] === components2[key]) {
        matchCount++;
      }
    }
    
    return totalCount > 0 ? (matchCount / totalCount) >= threshold : false;
  }
}

/**
 * 默认导出单例
 */
export const elementFingerprintGenerator = new ElementFingerprintGenerator();