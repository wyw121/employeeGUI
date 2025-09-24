/**
 * 父节点信息提取器
 * 
 * 用于解决 XML 元素中"子元素有意义文本但父容器才可点击"的问题
 * 例如：TextView 包含文本，但实际需要点击父级的 FrameLayout 或 LinearLayout
 */

export interface ParentNodeInfo {
  parent_class?: string;
  parent_text?: string;
  parent_content_desc?: string;
  parent_resource_id?: string;
  parent_bounds?: string;
  clickable_ancestor_class?: string;
  clickable_ancestor_resource_id?: string;
  clickable_ancestor_bounds?: string;
}

export interface XmlElementWithParent {
  text?: string;
  content_desc?: string;
  resource_id?: string;
  class_name?: string;
  bounds?: string;
  clickable?: boolean;
  parent?: XmlElementWithParent;
  attrs?: Record<string, string>;
}

export class ParentNodeExtractor {
  /**
   * 从XML元素中提取父节点的有意义信息
   */
  static extractParentNodeInfo(element: XmlElementWithParent): ParentNodeInfo {
    const info: ParentNodeInfo = {};
    
    if (!element.parent) {
      return info;
    }
    
    // 提取直接父节点的信息
    const parent = element.parent;
    if (parent) {
      if (parent.class_name) {
        info.parent_class = parent.class_name;
      }
      
      if (parent.text && this.isValidText(parent.text)) {
        info.parent_text = parent.text;
      }
      
      if (parent.content_desc && this.isValidContentDesc(parent.content_desc)) {
        info.parent_content_desc = parent.content_desc;
      }
      
      if (parent.resource_id) {
        info.parent_resource_id = parent.resource_id;
      }
      
      if (parent.bounds) {
        info.parent_bounds = parent.bounds;
      }
    }
    
    // 查找最近的可点击祖先节点
    const clickableAncestor = this.findClickableAncestor(element);
    if (clickableAncestor && clickableAncestor !== element) {
      if (clickableAncestor.class_name) {
        info.clickable_ancestor_class = clickableAncestor.class_name;
      }
      
      if (clickableAncestor.resource_id) {
        info.clickable_ancestor_resource_id = clickableAncestor.resource_id;
      }
      
      if (clickableAncestor.bounds) {
        info.clickable_ancestor_bounds = clickableAncestor.bounds;
      }
    }
    
    return info;
  }
  
  /**
   * 查找最近的可点击祖先节点
   */
  static findClickableAncestor(element: XmlElementWithParent): XmlElementWithParent | null {
    let current = element.parent;
    
    while (current) {
      // 检查是否显式标记为可点击
      if (current.clickable === true) {
        return current;
      }
      
      // 检查attrs中的clickable属性
      if (current.attrs?.['clickable'] === 'true') {
        return current;
      }
      
      // 检查是否是常见的可点击容器类型
      if (current.class_name && this.isLikelyClickableContainer(current.class_name)) {
        return current;
      }
      
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * 判断类名是否为可能的可点击容器
   */
  static isLikelyClickableContainer(className: string): boolean {
    const clickablePatterns = [
      /Button$/,
      /ImageButton$/,
      /ImageView$/,
      /FrameLayout$/,
      /LinearLayout$/,
      /RelativeLayout$/,
      /CardView$/,
      /MaterialCardView$/,
      /ConstraintLayout$/,
    ];
    
    return clickablePatterns.some(pattern => pattern.test(className));
  }
  
  /**
   * 检查文本是否有效（过滤空白、纯符号等）
   */
  static isValidText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return false;
    }
    
    // 过滤纯数字
    if (/^\d+$/.test(trimmed)) {
      return false;
    }
    
    // 过滤纯符号
    if (/^[^\w\u4e00-\u9fff]+$/.test(trimmed)) {
      return false;
    }
    
    // 过滤单字符（除中文外）
    if (trimmed.length === 1 && !/[\u4e00-\u9fff]/.test(trimmed)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 检查内容描述是否有效
   */
  static isValidContentDesc(contentDesc: string): boolean {
    if (!contentDesc || typeof contentDesc !== 'string') {
      return false;
    }
    
    const trimmed = contentDesc.trim();
    if (trimmed.length === 0) {
      return false;
    }
    
    // 过滤默认描述
    const defaultPatterns = [
      /^Image$/,
      /^Button$/,
      /^View$/,
      /^未标记$/,
    ];
    
    return !defaultPatterns.some(pattern => pattern.test(trimmed));
  }
  
  /**
   * 智能分析：判断是否需要使用父节点信息进行匹配
   */
  static shouldUseParentNodeMatching(element: XmlElementWithParent): {
    recommended: boolean;
    reason: string;
    confidence: number;
  } {
    // 如果当前元素本身就可点击，通常不需要父节点匹配
    if (element.clickable === true || element.attrs?.['clickable'] === 'true') {
      return {
        recommended: false,
        reason: '当前元素本身可点击',
        confidence: 0.9
      };
    }
    
    // 如果当前元素是文本类且有父容器，推荐使用父节点匹配
    if (element.class_name?.includes('TextView') && element.parent) {
      const clickableAncestor = this.findClickableAncestor(element);
      if (clickableAncestor) {
        return {
          recommended: true,
          reason: 'TextView通常需要点击父容器',
          confidence: 0.85
        };
      }
    }
    
    // 如果当前元素是图标类且有父容器
    if (element.class_name?.includes('ImageView') && element.parent) {
      const clickableAncestor = this.findClickableAncestor(element);
      if (clickableAncestor) {
        return {
          recommended: true,
          reason: 'ImageView通常需要点击父容器',
          confidence: 0.8
        };
      }
    }
    
    // 如果当前元素没有resource_id但父元素有
    if (!element.resource_id && element.parent?.resource_id) {
      return {
        recommended: true,
        reason: '父元素有更好的标识符',
        confidence: 0.75
      };
    }
    
    return {
      recommended: false,
      reason: '当前元素特征足够识别',
      confidence: 0.6
    };
  }
}

export default ParentNodeExtractor;