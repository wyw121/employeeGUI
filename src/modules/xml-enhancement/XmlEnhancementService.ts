/**
 * XML增强服务
 * 
 * 负责在XML解析过程中增强元素信息，特别是子节点的有意义内容提取
 */

import { ChildNodeExtractor, type ChildNodeInfo, type XmlElementLike } from '../child-node-extractor';

export interface XmlEnhancementOptions {
  enableChildTextExtraction?: boolean;
  enableDescendantTextCollection?: boolean;
  maxDescendantDepth?: number;
}

export class XmlEnhancementService {
  private options: Required<XmlEnhancementOptions>;
  
  constructor(options: XmlEnhancementOptions = {}) {
    this.options = {
      enableChildTextExtraction: true,
      enableDescendantTextCollection: true,
      maxDescendantDepth: 3,
      ...options,
    };
  }
  
  /**
   * 增强XML元素，添加子节点信息
   */
  enhanceElement(element: any, xmlContext?: string): any {
    if (!element) return element;
    
    const enhanced = { ...element };
    
    // 如果有完整的XML上下文，尝试解析子节点
    if (xmlContext && this.options.enableChildTextExtraction) {
      const childInfo = this.extractChildInfoFromXmlContext(element, xmlContext);
      if (childInfo) {
        Object.assign(enhanced, childInfo);
        
        // 智能合并：如果父节点缺失关键信息，使用子节点信息补充
        enhanced._enhanced_by_children = true;
        enhanced._original_text = element.text;
        enhanced._original_content_desc = element.content_desc;
      }
    }
    
    return enhanced;
  }
  
  /**
   * 从XML上下文中提取子节点信息
   */
  private extractChildInfoFromXmlContext(element: any, xmlContext: string): ChildNodeInfo | null {
    try {
      // 根据元素的bounds或其他特征，在XML中找到对应的节点和子节点
      const bounds = element.bounds;
      if (!bounds) return null;
      
      // 简化实现：在XML中搜索包含相同bounds的节点
      const boundsPattern = this.buildBoundsPattern(bounds);
      const lines = xmlContext.split('\n');
      
      let targetLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(boundsPattern)) {
          targetLineIndex = i;
          break;
        }
      }
      
      if (targetLineIndex === -1) return null;
      
      // 寻找该节点的子节点
      const childNodes = this.findChildNodesInXml(lines, targetLineIndex);
      if (childNodes.length === 0) return null;
      
      // 提取子节点信息
      const childInfo: ChildNodeInfo = {};
      
      // 第一个子节点信息
      if (childNodes.length > 0) {
        const firstChild = this.parseXmlNodeLine(childNodes[0]);
        if (firstChild.text) childInfo.first_child_text = firstChild.text;
        if (firstChild.content_desc) childInfo.first_child_content_desc = firstChild.content_desc;
        if (firstChild.resource_id) childInfo.first_child_resource_id = firstChild.resource_id;
      }
      
      // 收集所有后代文本
      const descendantTexts: string[] = [];
      for (const childLine of childNodes) {
        const childElement = this.parseXmlNodeLine(childLine);
        if (childElement.text && this.isValidText(childElement.text)) {
          descendantTexts.push(childElement.text);
        }
      }
      if (descendantTexts.length > 0) {
        childInfo.descendant_texts = descendantTexts;
      }
      
      return Object.keys(childInfo).length > 0 ? childInfo : null;
      
    } catch (error) {
      console.warn('提取子节点信息时出错:', error);
      return null;
    }
  }
  
  /**
   * 构建bounds匹配模式
   */
  private buildBoundsPattern(bounds: any): string {
    if (typeof bounds === 'string') {
      return bounds;
    }
    if (bounds && typeof bounds === 'object') {
      return `[${bounds.left},${bounds.top}][${bounds.right},${bounds.bottom}]`;
    }
    return '';
  }
  
  /**
   * 在XML行中找到指定节点的子节点
   */
  private findChildNodesInXml(lines: string[], parentLineIndex: number): string[] {
    const childNodes: string[] = [];
    const parentLine = lines[parentLineIndex];
    
    // 计算父节点的缩进层级
    const parentIndent = parentLine.search(/\S/);
    const expectedChildIndent = parentIndent + 2; // XML通常每层缩进2个空格
    
    // 向下查找子节点
    for (let i = parentLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const currentIndent = line.search(/\S/);
      
      // 如果缩进级别回到父级或更少，说明子节点结束了
      if (currentIndent <= parentIndent) break;
      
      // 如果是直接子节点（缩进刚好比父级多一层）
      if (currentIndent === expectedChildIndent && line.includes('<node')) {
        childNodes.push(line);
        
        // 限制子节点数量避免过度处理
        if (childNodes.length >= 10) break;
      }
    }
    
    return childNodes;
  }
  
  /**
   * 解析XML节点行，提取属性
   */
  private parseXmlNodeLine(line: string): XmlElementLike {
    const element: XmlElementLike = {};
    
    const textMatch = line.match(/text="([^"]*)"/);
    if (textMatch) element.text = textMatch[1];
    
    const contentDescMatch = line.match(/content-desc="([^"]*)"/);
    if (contentDescMatch) element.content_desc = contentDescMatch[1];
    
    const resourceIdMatch = line.match(/resource-id="([^"]*)"/);
    if (resourceIdMatch) element.resource_id = resourceIdMatch[1];
    
    const classMatch = line.match(/class="([^"]*)"/);
    if (classMatch) element.class_name = classMatch[1];
    
    return element;
  }
  
  /**
   * 判断文本是否有意义
   */
  private isValidText(text: string): boolean {
    if (!text) return false;
    
    const cleaned = text.trim();
    if (cleaned.length === 0) return false;
    if (cleaned.length === 1 && !cleaned.match(/[\u4e00-\u9fa5]/)) return false;
    if (cleaned.match(/^\d+$/)) return false;
    if (cleaned.match(/^[.,;:!?()[\]{}"'-]+$/)) return false;
    
    return true;
  }
  
  /**
   * 批量增强多个元素
   */
  enhanceElements(elements: any[], xmlContext?: string): any[] {
    return elements.map(element => this.enhanceElement(element, xmlContext));
  }
}