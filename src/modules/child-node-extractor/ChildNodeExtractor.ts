/**
 * 子节点信息提取器
 * 
 * 用于解决 XML 元素中"父容器可点击但子容器有意义文本"的问题
 * 例如：按钮的可点击区域是父 FrameLayout，但真正的文本在子 TextView 中
 */

export interface ChildNodeInfo {
  first_child_text?: string;
  first_child_content_desc?: string;
  first_child_resource_id?: string;
  descendant_texts?: string[];
}

export interface XmlElementLike {
  text?: string;
  content_desc?: string;
  resource_id?: string;
  class_name?: string;
  children?: XmlElementLike[];
}

export class ChildNodeExtractor {
  /**
   * 从XML元素中提取子节点的有意义信息
   */
  static extractChildNodeInfo(element: XmlElementLike): ChildNodeInfo {
    const info: ChildNodeInfo = {};
    
    if (!element.children || element.children.length === 0) {
      return info;
    }
    
    // 提取第一个子节点的信息
    const firstChild = element.children[0];
    if (firstChild) {
      if (firstChild.text && this.isValidText(firstChild.text)) {
        info.first_child_text = firstChild.text;
      }
      
      if (firstChild.content_desc && this.isValidContentDesc(firstChild.content_desc)) {
        info.first_child_content_desc = firstChild.content_desc;
      }
      
      if (firstChild.resource_id) {
        info.first_child_resource_id = firstChild.resource_id;
      }
    }
    
    // 收集所有后代节点的文本
    const descendantTexts = this.collectDescendantTexts(element);
    if (descendantTexts.length > 0) {
      info.descendant_texts = descendantTexts;
    }
    
    return info;
  }
  
  /**
   * 递归收集所有后代节点中的有意义文本
   */
  private static collectDescendantTexts(element: XmlElementLike): string[] {
    const texts: string[] = [];
    
    if (!element.children) return texts;
    
    for (const child of element.children) {
      // 收集当前子节点的文本
      if (child.text && this.isValidText(child.text)) {
        texts.push(child.text);
      }
      
      // 递归收集子节点的后代文本
      const childTexts = this.collectDescendantTexts(child);
      texts.push(...childTexts);
    }
    
    return texts;
  }
  
  /**
   * 判断文本是否有意义（过滤空白、数字、单字符等）
   */
  private static isValidText(text: string): boolean {
    if (!text) return false;
    
    const cleaned = text.trim();
    if (cleaned.length === 0) return false;
    if (cleaned.length === 1 && !cleaned.match(/[\u4e00-\u9fa5]/)) return false; // 单个非中文字符
    if (cleaned.match(/^\d+$/)) return false; // 纯数字
    if (cleaned.match(/^[.,;:!?()[\]{}"'-]+$/)) return false; // 纯标点符号
    
    return true;
  }
  
  /**
   * 判断内容描述是否有意义
   */
  private static isValidContentDesc(desc: string): boolean {
    if (!desc) return false;
    
    const cleaned = desc.trim();
    if (cleaned.length === 0) return false;
    if (cleaned === desc.replace(/\s+/g, '')) return false; // 无实际内容
    
    return true;
  }
  
  /**
   * 从XML字符串解析元素结构（简单版本）
   */
  static parseXmlElementFromString(xmlLine: string): XmlElementLike | null {
    // 这是一个简化的XML解析，主要用于行级匹配时的子节点信息提取
    // 实际使用中可能需要更完整的XML解析器
    
    const element: XmlElementLike = {};
    
    // 提取基本属性
    const textMatch = xmlLine.match(/text="([^"]*)"/);
    if (textMatch) element.text = textMatch[1];
    
    const contentDescMatch = xmlLine.match(/content-desc="([^"]*)"/);
    if (contentDescMatch) element.content_desc = contentDescMatch[1];
    
    const resourceIdMatch = xmlLine.match(/resource-id="([^"]*)"/);
    if (resourceIdMatch) element.resource_id = resourceIdMatch[1];
    
    const classMatch = xmlLine.match(/class="([^"]*)"/);
    if (classMatch) element.class_name = classMatch[1];
    
    return element;
  }
  
  /**
   * 智能合并父节点和子节点信息，生成增强的元素描述
   */
  static enhanceElementWithChildInfo(
    parentElement: any, 
    childInfo: ChildNodeInfo
  ): any {
    const enhanced = { ...parentElement };
    
    // 如果父节点没有文本，但子节点有，使用子节点文本
    if (!enhanced.text && childInfo.first_child_text) {
      enhanced.text = childInfo.first_child_text;
      enhanced._text_source = 'first_child';
    }
    
    // 如果父节点没有内容描述，但子节点有，使用子节点内容描述
    if (!enhanced.content_desc && childInfo.first_child_content_desc) {
      enhanced.content_desc = childInfo.first_child_content_desc;
      enhanced._content_desc_source = 'first_child';
    }
    
    // 添加子节点信息到增强字段
    if (childInfo.first_child_text) {
      enhanced.first_child_text = childInfo.first_child_text;
    }
    if (childInfo.first_child_content_desc) {
      enhanced.first_child_content_desc = childInfo.first_child_content_desc;
    }
    if (childInfo.first_child_resource_id) {
      enhanced.first_child_resource_id = childInfo.first_child_resource_id;
    }
    if (childInfo.descendant_texts && childInfo.descendant_texts.length > 0) {
      enhanced.descendant_texts = childInfo.descendant_texts;
    }
    
    return enhanced;
  }
}