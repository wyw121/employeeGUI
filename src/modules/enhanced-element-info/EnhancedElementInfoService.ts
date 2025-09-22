/**
 * 增强元素信息服务
 * 负责从XML分析结果生成包含完整上下文的元素信息
 */

import { 
  EnhancedUIElement, 
  XmlContextInfo, 
  XmlNodeDetails, 
  XmlNodePath, 
  XmlNodeSummary,
  SmartAnalysisResult 
} from './types';
import { UIElement } from '../../api/universalUIAPI';

export class EnhancedElementInfoService {
  
  /**
   * 从基础UI元素创建增强元素信息
   */
  static createEnhancedElement(
    basicElement: UIElement,
    xmlContent: string,
    xmlCacheId: string,
    packageName: string = '',
    pageInfo: { appName: string; pageName: string } = { appName: '未知应用', pageName: '未知页面' },
    deviceInfo?: { deviceId: string; deviceName: string; resolution: { width: number; height: number } }
  ): EnhancedUIElement {
    
    // 创建XML上下文信息
    const xmlContext: XmlContextInfo = {
      xmlCacheId,
      timestamp: Date.now(),
      xmlSourceContent: xmlContent,
      packageName,
      pageInfo,
      deviceInfo
    };

    // 解析XML获取节点详情和路径信息
    const { nodeDetails, nodePath } = this.parseXmlNodeInfo(basicElement, xmlContent);

    // 创建增强元素
    const enhancedElement: EnhancedUIElement = {
      // 基础信息
      id: basicElement.id,
      text: basicElement.text,
      element_type: basicElement.element_type,
      resource_id: (basicElement as any).resource_id,
      content_desc: basicElement.content_desc,
      
      // 增强信息
      xmlContext,
      nodePath,
      nodeDetails,
      
      // 智能分析信息（如果存在）
      smartAnalysis: (basicElement as any).smartAnalysis,
      smartDescription: (basicElement as any).smartDescription,
      
      // 生成时间戳
      generatedAt: Date.now()
    };

    console.log('🎯 创建增强元素信息:', {
      elementId: enhancedElement.id,
      xmlCacheId: xmlContext.xmlCacheId,
      nodePath: nodePath.xpath,
      nodeIndex: nodePath.nodeIndex,
      hasSmartAnalysis: !!enhancedElement.smartAnalysis
    });

    return enhancedElement;
  }

  /**
   * 从XML内容中解析节点详情和路径信息
   */
  private static parseXmlNodeInfo(
    element: UIElement, 
    xmlContent: string
  ): { nodeDetails: XmlNodeDetails; nodePath: XmlNodePath } {
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const allNodes = xmlDoc.querySelectorAll('node');
      
      // 根据元素属性找到对应的XML节点
      const targetNode = this.findMatchingXmlNode(element, allNodes);
      
      if (!targetNode) {
        console.warn('⚠️ 未找到匹配的XML节点，使用默认信息');
        return this.createDefaultNodeInfo(element);
      }

      // 获取节点索引
      const nodeIndex = Array.from(allNodes).indexOf(targetNode);
      
      // 生成XPath
      const xpath = this.generateXPath(targetNode);
      
      // 创建节点路径信息
      const nodePath: XmlNodePath = {
        xpath,
        nodeIndex,
        depth: this.calculateNodeDepth(targetNode),
        parentPath: this.generateXPath(targetNode.parentElement)
      };

      // 创建节点详细信息
      const nodeDetails: XmlNodeDetails = {
        attributes: this.extractNodeAttributes(targetNode),
        text: targetNode.getAttribute('text') || undefined,
        contentDesc: targetNode.getAttribute('content-desc') || undefined,
        resourceId: targetNode.getAttribute('resource-id') || undefined,
        className: targetNode.getAttribute('class') || undefined,
        bounds: this.parseBounds(targetNode.getAttribute('bounds') || ''),
        interactionStates: {
          clickable: targetNode.getAttribute('clickable') === 'true',
          scrollable: targetNode.getAttribute('scrollable') === 'true',
          enabled: targetNode.getAttribute('enabled') === 'true',
          focused: targetNode.getAttribute('focused') === 'true',
          selected: targetNode.getAttribute('selected') === 'true',
          checkable: targetNode.getAttribute('checkable') === 'true',
          checked: targetNode.getAttribute('checked') === 'true'
        },
        relationships: this.buildNodeRelationships(targetNode, allNodes)
      };

      return { nodeDetails, nodePath };

    } catch (error) {
      console.error('❌ XML节点解析失败:', error);
      return this.createDefaultNodeInfo(element);
    }
  }

  /**
   * 在XML节点中找到匹配的元素
   */
  private static findMatchingXmlNode(element: UIElement, allNodes: NodeListOf<Element>): Element | null {
    const targetBounds = element.bounds;
    const targetText = element.text;
    const targetContentDesc = element.content_desc;
    const targetResourceId = (element as any).resource_id;

    // 尝试多种匹配策略
    for (const node of Array.from(allNodes)) {
      // 1. 精确边界匹配
      const nodeBounds = this.parseBounds(node.getAttribute('bounds') || '');
      if (this.boundsMatch(targetBounds, nodeBounds)) {
        // 进一步验证文本或描述
        const nodeText = node.getAttribute('text') || '';
        const nodeContentDesc = node.getAttribute('content-desc') || '';
        const nodeResourceId = node.getAttribute('resource-id') || '';

        if ((targetText && nodeText === targetText) ||
            (targetContentDesc && nodeContentDesc === targetContentDesc) ||
            (targetResourceId && nodeResourceId === targetResourceId) ||
            (!targetText && !targetContentDesc && !targetResourceId)) {
          return node;
        }
      }
    }

    // 2. 如果精确匹配失败，尝试模糊匹配
    for (const node of Array.from(allNodes)) {
      const nodeText = node.getAttribute('text') || '';
      const nodeContentDesc = node.getAttribute('content-desc') || '';
      
      if ((targetText && nodeText.includes(targetText)) ||
          (targetContentDesc && nodeContentDesc.includes(targetContentDesc))) {
        return node;
      }
    }

    return null;
  }

  /**
   * 检查边界是否匹配
   */
  private static boundsMatch(bounds1: any, bounds2: any): boolean {
    if (!bounds1 || !bounds2) return false;
    
    return bounds1.left === bounds2.left &&
           bounds1.top === bounds2.top &&
           bounds1.right === bounds2.right &&
           bounds1.bottom === bounds2.bottom;
  }

  /**
   * 解析边界字符串
   */
  private static parseBounds(bounds: string): { left: number; top: number; right: number; bottom: number } {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return { left: 0, top: 0, right: 0, bottom: 0 };
    
    const [, left, top, right, bottom] = match.map(Number);
    return { left, top, right, bottom };
  }

  /**
   * 生成XPath
   */
  private static generateXPath(node: Element | null): string {
    if (!node || node.nodeName.toLowerCase() !== 'node') return '';

    const parts: string[] = [];
    let currentNode = node as Element;
    
    while (currentNode && currentNode.nodeName.toLowerCase() === 'node') {
      const parent = currentNode.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.nodeName.toLowerCase() === 'node'
        );
        const index = siblings.indexOf(currentNode) + 1;
        parts.unshift(`node[${index}]`);
      } else {
        parts.unshift('node');
      }
      currentNode = parent as Element;
    }

    return '//' + parts.join('/');
  }

  /**
   * 计算节点深度
   */
  private static calculateNodeDepth(node: Element): number {
    let depth = 0;
    let currentNode = node.parentElement;
    
    while (currentNode) {
      if (currentNode.nodeName.toLowerCase() === 'node') {
        depth++;
      }
      currentNode = currentNode.parentElement;
    }
    
    return depth;
  }

  /**
   * 提取节点所有属性
   */
  private static extractNodeAttributes(node: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    for (const attr of Array.from(node.attributes)) {
      attributes[attr.name] = attr.value;
    }
    
    return attributes;
  }

  /**
   * 构建节点关系信息
   */
  private static buildNodeRelationships(
    targetNode: Element, 
    allNodes: NodeListOf<Element>
  ): XmlNodeDetails['relationships'] {
    
    const createNodeSummary = (node: Element): XmlNodeSummary => ({
      nodeIndex: Array.from(allNodes).indexOf(node),
      className: node.getAttribute('class') || '',
      text: node.getAttribute('text') || undefined,
      contentDesc: node.getAttribute('content-desc') || undefined,
      bounds: this.parseBounds(node.getAttribute('bounds') || '')
    });

    // 父节点
    const parent = targetNode.parentElement;
    const parentSummary = (parent && parent.nodeName.toLowerCase() === 'node') 
      ? createNodeSummary(parent) 
      : undefined;

    // 子节点
    const children = Array.from(targetNode.children)
      .filter(child => child.nodeName.toLowerCase() === 'node')
      .map(createNodeSummary);

    // 兄弟节点
    const siblings: XmlNodeSummary[] = [];
    if (parent) {
      const siblingNodes = Array.from(parent.children)
        .filter(child => child.nodeName.toLowerCase() === 'node' && child !== targetNode);
      siblings.push(...siblingNodes.map(createNodeSummary));
    }

    return {
      parent: parentSummary,
      children,
      siblings
    };
  }

  /**
   * 创建默认节点信息（当XML解析失败时）
   */
  private static createDefaultNodeInfo(element: UIElement): { nodeDetails: XmlNodeDetails; nodePath: XmlNodePath } {
    const nodeDetails: XmlNodeDetails = {
      attributes: {},
      text: element.text,
      contentDesc: element.content_desc,
      resourceId: (element as any).resource_id,
      className: element.element_type,
      bounds: element.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
      interactionStates: {
        clickable: element.is_clickable || false,
        scrollable: element.is_scrollable || false,
        enabled: element.is_enabled || true,
        focused: element.is_focused || false,
        selected: element.selected || false,
        checkable: element.checkable || false,
        checked: element.checked || false
      },
      relationships: {
        parent: undefined,
        children: [],
        siblings: []
      }
    };

    const nodePath: XmlNodePath = {
      xpath: '',
      nodeIndex: -1,
      depth: 0,
      parentPath: undefined
    };

    return { nodeDetails, nodePath };
  }

  /**
   * 创建元素摘要信息（用于快速访问）
   */
  static createElementSummary(enhancedElement: EnhancedUIElement) {
    return {
      displayName: enhancedElement.text || enhancedElement.content_desc || '未知元素',
      elementType: enhancedElement.element_type || 'Unknown',
      position: {
        x: enhancedElement.nodeDetails.bounds.left,
        y: enhancedElement.nodeDetails.bounds.top,
        width: enhancedElement.nodeDetails.bounds.right - enhancedElement.nodeDetails.bounds.left,
        height: enhancedElement.nodeDetails.bounds.bottom - enhancedElement.nodeDetails.bounds.top
      },
      xmlSource: enhancedElement.xmlContext.xmlCacheId,
      confidence: enhancedElement.smartAnalysis?.confidence || 0
    };
  }
}