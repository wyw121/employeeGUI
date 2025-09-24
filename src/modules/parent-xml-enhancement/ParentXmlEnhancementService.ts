/**
 * 父节点 XML 增强服务
 * 
 * 在完整的 XML 上下文中查找和增强父节点信息
 * 解决"子元素有文本但父容器才可点击"的匹配问题
 */

import { ParentNodeExtractor, type ParentNodeInfo, type XmlElementWithParent } from '../parent-node-extractor/ParentNodeExtractor';

export interface ElementLikeForParentEnhancement {
  resource_id?: string;
  text?: string;
  content_desc?: string;
  class_name?: string;
  bounds?: any;
  clickable?: boolean;
}

export interface ParentEnhancedElement extends ElementLikeForParentEnhancement {
  // 原始字段
  resource_id?: string;
  text?: string;
  content_desc?: string;
  class_name?: string;
  bounds?: any;
  
  // 🆕 父节点增强字段
  parent_class?: string;
  parent_text?: string;
  parent_content_desc?: string;
  parent_resource_id?: string;
  parent_bounds?: string;
  clickable_ancestor_class?: string;
  clickable_ancestor_resource_id?: string;
  clickable_ancestor_bounds?: string;
}

export class ParentXmlEnhancementService {
  /**
   * 使用完整的 XML 上下文增强元素的父节点信息
   */
  static enhanceElementWithParentInfo(
    element: ElementLikeForParentEnhancement,
    xmlContent: string
  ): ParentEnhancedElement | null {
    try {
      console.log('🔍 开始父节点XML增强...', { 
        elementBounds: element.bounds,
        xmlLength: xmlContent.length 
      });
      
      // 在 XML 中找到对应的元素节点
      const xmlElement = this.findElementInXml(element, xmlContent);
      if (!xmlElement) {
        console.warn('⚠️ 在XML中找不到对应元素，无法进行父节点增强');
        return null;
      }
      
      // 构建带父节点关系的元素对象
      const elementWithParent = this.buildElementWithParentHierarchy(xmlElement, xmlContent);
      
      // 提取父节点信息
      const parentInfo = ParentNodeExtractor.extractParentNodeInfo(elementWithParent);
      
      // 合并原始元素信息和父节点增强信息
      const enhanced: ParentEnhancedElement = {
        ...element,
        ...parentInfo
      };
      
      console.log('✅ 父节点增强成功:', {
        originalClass: element.class_name,
        parentClass: parentInfo.parent_class,
        clickableAncestor: parentInfo.clickable_ancestor_class,
        hasParentResourceId: !!parentInfo.parent_resource_id
      });
      
      return enhanced;
      
    } catch (error) {
      console.error('❌ 父节点XML增强失败:', error);
      return null;
    }
  }
  
  /**
   * 在 XML 中通过 bounds 坐标找到对应的元素
   */
  static findElementInXml(
    element: ElementLikeForParentEnhancement,
    xmlContent: string
  ): any | null {
    try {
      if (!element.bounds) {
        console.warn('元素没有bounds信息，无法在XML中定位');
        return null;
      }
      
      // 将bounds转换为标准格式进行搜索
      const boundsPattern = this.buildBoundsPattern(element.bounds);
      if (!boundsPattern) {
        console.warn('无法构建bounds搜索模式');
        return null;
      }
      
      // 在XML中搜索匹配的bounds
      const boundsRegex = new RegExp(`bounds="${boundsPattern.replace(/[\[\]]/g, '\\$&')}"`, 'i');
      const match = xmlContent.match(boundsRegex);
      
      if (!match) {
        console.warn('在XML中找不到匹配的bounds:', boundsPattern);
        return null;
      }
      
      // 提取完整的XML元素节点
      const xmlElement = this.extractXmlElementFromMatch(xmlContent, match.index!);
      return xmlElement;
      
    } catch (error) {
      console.error('XML元素查找失败:', error);
      return null;
    }
  }
  
  /**
   * 构建bounds搜索模式
   */
  static buildBoundsPattern(bounds: any): string | null {
    try {
      if (typeof bounds === 'string') {
        return bounds;
      }
      
      if (typeof bounds === 'object' && bounds !== null) {
        const { left, top, right, bottom } = bounds;
        if (typeof left === 'number' && typeof top === 'number' && 
            typeof right === 'number' && typeof bottom === 'number') {
          return `[${left},${top}][${right},${bottom}]`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('构建bounds模式失败:', error);
      return null;
    }
  }
  
  /**
   * 从XML匹配位置提取完整的元素节点信息
   */
  static extractXmlElementFromMatch(xmlContent: string, matchIndex: number): any | null {
    try {
      // 向前查找元素开始标签
      let startIndex = matchIndex;
      while (startIndex > 0 && xmlContent[startIndex] !== '<') {
        startIndex--;
      }
      
      // 向后查找元素结束标签
      let endIndex = matchIndex;
      let tagDepth = 0;
      let inTag = false;
      let tagName = '';
      
      // 首先提取标签名
      let tagNameMatch = xmlContent.slice(startIndex).match(/^<(\w+)/);
      if (tagNameMatch) {
        tagName = tagNameMatch[1];
      }
      
      // 查找匹配的结束标签
      for (let i = startIndex; i < xmlContent.length; i++) {
        if (xmlContent[i] === '<') {
          inTag = true;
          if (xmlContent[i + 1] === '/') {
            // 结束标签
            if (xmlContent.slice(i + 2, i + 2 + tagName.length) === tagName) {
              tagDepth--;
              if (tagDepth === 0) {
                endIndex = xmlContent.indexOf('>', i) + 1;
                break;
              }
            }
          } else if (xmlContent.slice(i + 1, i + 1 + tagName.length) === tagName) {
            // 开始标签
            tagDepth++;
          }
        }
      }
      
      if (endIndex <= startIndex) {
        // 尝试自闭合标签
        endIndex = xmlContent.indexOf('/>', matchIndex);
        if (endIndex > 0) {
          endIndex += 2;
        } else {
          endIndex = xmlContent.indexOf('>', matchIndex) + 1;
        }
      }
      
      const elementXml = xmlContent.slice(startIndex, endIndex);
      
      // 解析XML元素属性
      const element = this.parseXmlElementAttributes(elementXml);
      return element;
      
    } catch (error) {
      console.error('提取XML元素失败:', error);
      return null;
    }
  }
  
  /**
   * 解析XML元素的属性
   */
  static parseXmlElementAttributes(xmlElement: string): any {
    try {
      const attributes: any = {};
      
      // 提取属性
      const attrRegex = /(\w+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(xmlElement)) !== null) {
        const [, key, value] = match;
        attributes[key] = value;
      }
      
      // 转换为标准字段名
      const element = {
        resource_id: attributes['resource-id'],
        text: attributes['text'],
        content_desc: attributes['content-desc'],
        class_name: attributes['class'],
        bounds: attributes['bounds'],
        clickable: attributes['clickable'] === 'true',
        attrs: attributes
      };
      
      return element;
      
    } catch (error) {
      console.error('解析XML属性失败:', error);
      return {};
    }
  }
  
  /**
   * 构建包含父子关系的元素层次结构
   */
  static buildElementWithParentHierarchy(
    xmlElement: any,
    xmlContent: string
  ): XmlElementWithParent {
    try {
      const elementWithParent: XmlElementWithParent = {
        ...xmlElement
      };
      
      // 查找父元素
      const parent = this.findParentElementInXml(xmlElement, xmlContent);
      if (parent) {
        elementWithParent.parent = parent;
      }
      
      return elementWithParent;
      
    } catch (error) {
      console.error('构建元素层次结构失败:', error);
      return xmlElement;
    }
  }
  
  /**
   * 在XML中查找指定元素的父元素
   */
  static findParentElementInXml(
    element: any,
    xmlContent: string
  ): XmlElementWithParent | null {
    try {
      if (!element.bounds) {
        return null;
      }
      
      const elementBounds = this.parseBounds(element.bounds);
      if (!elementBounds) {
        return null;
      }
      
      // 查找所有可能的父容器（bounds包含当前元素的元素）
      const parentCandidates: Array<{ element: any; area: number }> = [];
      
      // 使用正则表达式查找所有bounds属性
      const boundsRegex = /bounds="(\[[\d,\[\]]+\])"/g;
      let match;
      
      while ((match = boundsRegex.exec(xmlContent)) !== null) {
        const bounds = match[1];
        const candidateBounds = this.parseBounds(bounds);
        
        if (candidateBounds && this.isContaining(candidateBounds, elementBounds)) {
          // 提取候选父元素的完整信息
          const candidateElement = this.extractXmlElementFromMatch(xmlContent, match.index);
          if (candidateElement && candidateElement.bounds !== element.bounds) {
            const area = (candidateBounds.right - candidateBounds.left) * 
                        (candidateBounds.bottom - candidateBounds.top);
            parentCandidates.push({ element: candidateElement, area });
          }
        }
      }
      
      // 选择面积最小的包含元素作为直接父元素
      if (parentCandidates.length > 0) {
        parentCandidates.sort((a, b) => a.area - b.area);
        const parentElement = parentCandidates[0].element;
        
        // 递归查找父元素的父元素
        const grandParent = this.findParentElementInXml(parentElement, xmlContent);
        return {
          ...parentElement,
          parent: grandParent
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('查找父元素失败:', error);
      return null;
    }
  }
  
  /**
   * 解析bounds字符串为坐标对象
   */
  static parseBounds(bounds: string): { left: number; top: number; right: number; bottom: number } | null {
    try {
      const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!match) {
        return null;
      }
      
      return {
        left: parseInt(match[1], 10),
        top: parseInt(match[2], 10),
        right: parseInt(match[3], 10),
        bottom: parseInt(match[4], 10)
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 判断一个bounds是否包含另一个bounds
   */
  static isContaining(
    container: { left: number; top: number; right: number; bottom: number },
    contained: { left: number; top: number; right: number; bottom: number }
  ): boolean {
    return container.left <= contained.left &&
           container.top <= contained.top &&
           container.right >= contained.right &&
           container.bottom >= contained.bottom &&
           !(container.left === contained.left && 
             container.top === contained.top &&
             container.right === contained.right &&
             container.bottom === contained.bottom);
  }
}

export default ParentXmlEnhancementService;