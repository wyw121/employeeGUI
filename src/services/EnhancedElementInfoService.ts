/**
 * 增强元素信息服务
 * 提供创建和管理增强UI元素的功能
 */

import type { VisualUIElement, EnhancedUIElement } from '../components/universal-ui/xml-parser/types';

export class EnhancedElementInfoService {
  /**
   * 创建增强元素
   */
  static createEnhancedElement(
    element: VisualUIElement, 
    additionalInfo?: Partial<EnhancedUIElement>
  ): EnhancedUIElement {
    return {
      ...element,
      ...additionalInfo,
      context: {
        surroundingElements: [],
        hierarchyPath: [],
        actionHints: [],
        ...additionalInfo?.context
      }
    };
  }

  /**
   * 从XML节点创建增强元素
   */
  static createFromXmlNode(
    node: Element,
    baseElement: VisualUIElement
  ): EnhancedUIElement {
    const enhanced = this.createEnhancedElement(baseElement, {
      resourceId: node.getAttribute('resource-id') || undefined,
      className: node.getAttribute('class') || undefined,
      package: node.getAttribute('package') || undefined,
      contentDesc: node.getAttribute('content-desc') || undefined,
      checkable: node.getAttribute('checkable') === 'true',
      checked: node.getAttribute('checked') === 'true',
      enabled: node.getAttribute('enabled') === 'true',
      focusable: node.getAttribute('focusable') === 'true',
      focused: node.getAttribute('focused') === 'true',
      scrollable: node.getAttribute('scrollable') === 'true',
      selected: node.getAttribute('selected') === 'true',
      bounds: node.getAttribute('bounds') || undefined,
    });

    // 生成XPath
    enhanced.xpath = this.generateXPath(node);
    
    return enhanced;
  }

  /**
   * 生成XPath
   */
  private static generateXPath(node: Element): string {
    if (node === node.ownerDocument?.documentElement) {
      return '/hierarchy';
    }

    let path = '';
    let current: Element | null = node;

    while (current && current !== current.ownerDocument?.documentElement) {
      const tagName = current.tagName.toLowerCase();
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(child => child.tagName.toLowerCase() === tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        path = `/${tagName}[${index}]` + path;
      } else {
        path = `/${tagName}` + path;
      }
      
      current = current.parentElement;
    }

    return '/hierarchy' + path;
  }

  /**
   * 添加上下文信息
   */
  static addContext(
    element: EnhancedUIElement,
    surroundingElements: VisualUIElement[],
    hierarchyPath: string[],
    actionHints: string[] = []
  ): EnhancedUIElement {
    return {
      ...element,
      context: {
        surroundingElements,
        hierarchyPath,
        actionHints: [
          ...element.context?.actionHints || [],
          ...actionHints
        ]
      }
    };
  }

  /**
   * 获取元素的详细描述
   */
  static getDetailedDescription(element: EnhancedUIElement): string {
    const parts: string[] = [];
    
    if (element.text) parts.push(`文本: "${element.text}"`);
    if (element.contentDesc) parts.push(`描述: "${element.contentDesc}"`);
    if (element.resourceId) parts.push(`ID: ${element.resourceId}`);
    if (element.className) parts.push(`类名: ${element.className}`);
    
    const states: string[] = [];
    if (element.enabled) states.push('可用');
    if (element.clickable) states.push('可点击');
    if (element.checkable) states.push('可选中');
    if (element.checked) states.push('已选中');
    if (element.selected) states.push('已选择');
    if (element.scrollable) states.push('可滚动');
    
    if (states.length > 0) {
      parts.push(`状态: ${states.join(', ')}`);
    }
    
    return parts.join(' | ');
  }
}