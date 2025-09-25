/**
 * enhanced-matching/analyzer/HierarchyAnalyzer.ts
 * XML节点层级分析器 - 智能分析XML结构中的父子关系
 */

import { NodeHierarchyAnalysis, FieldHierarchy, NodeLevel } from '../types';

/**
 * XML节点层级分析器
 * 解决父子节点字段混淆问题
 */
export class HierarchyAnalyzer {
  /**
   * 分析XML元素的层级结构
   * @param element 当前元素
   * @param xmlDocument XML文档
   */
  static analyzeNodeHierarchy(element: Element, xmlDocument: Document): NodeHierarchyAnalysis {
    const self = this.extractNodeAttributes(element);
    const parent = element.parentElement ? this.extractNodeAttributes(element.parentElement) : undefined;
    const children = Array.from(element.children).map(child => this.extractNodeAttributes(child));
    const descendants = this.extractAllDescendants(element);
    const siblings = this.extractSiblings(element);
    const depth = this.calculateDepth(element);
    const path = this.generateXPath(element);

    return {
      self,
      parent,
      children,
      descendants,
      siblings,
      depth,
      path
    };
  }

  /**
   * 智能分类字段层级
   * 解决"clickable=true"在父节点但"first_child_text"在子节点的混淆
   */
  static classifyFieldHierarchy(
    analysis: NodeHierarchyAnalysis,
    targetField: string,
    targetValue: string
  ): FieldHierarchy | null {
    // 检查当前节点
    if (analysis.self[targetField] === targetValue) {
      return {
        level: 'self',
        fieldName: targetField,
        displayName: `当前节点.${targetField}`,
        description: `当前元素的${targetField}属性`,
        depth: 0
      };
    }

    // 检查父节点
    if (analysis.parent?.[targetField] === targetValue) {
      return {
        level: 'parent',
        fieldName: targetField,
        displayName: `父节点.${targetField}`,
        description: `父元素的${targetField}属性`,
        depth: -1
      };
    }

    // 检查直接子节点
    const childIndex = analysis.children.findIndex(child => child[targetField] === targetValue);
    if (childIndex >= 0) {
      return {
        level: 'child',
        fieldName: targetField,
        displayName: `子节点[${childIndex}].${targetField}`,
        description: `第${childIndex + 1}个子元素的${targetField}属性`,
        depth: 1
      };
    }

    // 检查更深层的后代节点
    const descendantIndex = analysis.descendants.findIndex(desc => desc[targetField] === targetValue);
    if (descendantIndex >= 0) {
      return {
        level: 'descendant',
        fieldName: targetField,
        displayName: `后代节点[${descendantIndex}].${targetField}`,
        description: `后代元素的${targetField}属性`,
        depth: -1 // 任意深度
      };
    }

    // 检查兄弟节点
    const siblingIndex = analysis.siblings.findIndex(sibling => sibling[targetField] === targetValue);
    if (siblingIndex >= 0) {
      return {
        level: 'sibling',
        fieldName: targetField,
        displayName: `兄弟节点[${siblingIndex}].${targetField}`,
        description: `兄弟元素的${targetField}属性`,
        depth: 0
      };
    }

    return null;
  }

  /**
   * 智能检测文本字段的实际位置
   * 解决"first_child_text=关注"实际在孙子节点的问题
   */
  static findTextFieldLocation(
    analysis: NodeHierarchyAnalysis,
    targetText: string
  ): FieldHierarchy | null {
    // 优先检查直接子节点的text属性
    for (let i = 0; i < analysis.children.length; i++) {
      const child = analysis.children[i];
      if (child.text === targetText) {
        return {
          level: 'child',
          fieldName: 'text',
          displayName: `子节点[${i}].text`,
          description: `第${i + 1}个子元素的文本内容`,
          depth: 1
        };
      }
    }

    // 检查后代节点中的文本
    for (let i = 0; i < analysis.descendants.length; i++) {
      const descendant = analysis.descendants[i];
      if (descendant.text === targetText) {
        // 尝试计算具体深度
        const depth = this.estimateDescendantDepth(descendant, analysis);
        return {
          level: 'descendant',
          fieldName: 'text',
          displayName: `后代节点[${i}].text`,
          description: `后代元素的文本内容 (深度: ${depth})`,
          depth: depth
        };
      }
    }

    return null;
  }

  /**
   * 生成智能匹配字段组合
   * 避免混合不同层级的字段
   */
  static generateIntelligentFieldCombination(
    analysis: NodeHierarchyAnalysis,
    userPreferences?: {
      preferParentFields?: boolean;
      preferChildFields?: boolean;
      maxDepth?: number;
    }
  ): FieldHierarchy[] {
    const result: FieldHierarchy[] = [];
    const prefs = userPreferences || {};

    // 核心语义字段优先级
    const semanticFields = ['resource-id', 'content-desc', 'text', 'class'];
    const behaviorFields = ['clickable', 'enabled', 'selected'];

    // 当前节点的强语义字段
    semanticFields.forEach(field => {
      if (analysis.self[field]) {
        result.push({
          level: 'self',
          fieldName: field,
          displayName: `当前.${field}`,
          description: `当前节点的${field}属性`,
          depth: 0
        });
      }
    });

    // 如果当前节点语义信息不足，尝试父节点
    if (result.length < 2 && analysis.parent && prefs.preferParentFields !== false) {
      semanticFields.forEach(field => {
        if (analysis.parent![field]) {
          result.push({
            level: 'parent',
            fieldName: field,
            displayName: `父节点.${field}`,
            description: `父节点的${field}属性`,
            depth: -1
          });
        }
      });
    }

    // 如果需要子节点信息补充
    if (result.length < 2 && prefs.preferChildFields !== false) {
      analysis.children.forEach((child, index) => {
        semanticFields.forEach(field => {
          if (child[field] && result.length < 4) {
            result.push({
              level: 'child',
              fieldName: field,
              displayName: `子节点[${index}].${field}`,
              description: `第${index + 1}个子节点的${field}属性`,
              depth: 1
            });
          }
        });
      });
    }

    return result;
  }

  // === 私有辅助方法 ===

  private static extractNodeAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    // 提取所有XML属性
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attrs[attr.name] = attr.value;
    }

    // 添加文本内容（如果有）
    const textContent = element.textContent?.trim();
    if (textContent) {
      attrs.text = textContent;
    }

    return attrs;
  }

  private static extractAllDescendants(element: Element): Record<string, string>[] {
    const descendants: Record<string, string>[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT
    );

    let node = walker.nextNode();
    while (node) {
      if (node !== element && node instanceof Element) {
        descendants.push(this.extractNodeAttributes(node));
      }
      node = walker.nextNode();
    }

    return descendants;
  }

  private static extractSiblings(element: Element): Record<string, string>[] {
    if (!element.parentElement) return [];
    
    return Array.from(element.parentElement.children)
      .filter(sibling => sibling !== element)
      .map(sibling => this.extractNodeAttributes(sibling));
  }

  private static calculateDepth(element: Element): number {
    let depth = 0;
    let current = element.parentElement;
    while (current) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }

  private static generateXPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const xpathIndex = index > 1 ? `[${index}]` : '';
      parts.unshift(`${tagName}${xpathIndex}`);
      
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }

  private static estimateDescendantDepth(
    descendant: Record<string, string>,
    analysis: NodeHierarchyAnalysis
  ): number {
    // 简化实现：通过class属性估算深度
    // 实际应用中可以通过更复杂的启发式方法
    if (descendant.class?.includes('TextView')) return 2;
    if (descendant.class?.includes('Button')) return 1;
    return -1; // 未知深度
  }
}