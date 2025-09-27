/**
 * Universal UI页面分析器API
 * 封装与Tauri后端的Universal UI分析功能交互
 */

import { invoke } from '@tauri-apps/api/core';
import invokeCompat from './core/tauriInvoke';

// 类型定义
export interface UIElement {
  id: string;
  element_type: string;
  text: string;
  bounds: ElementBounds;
  xpath: string;
  resource_id?: string;
  class_name?: string;
  is_clickable: boolean;  // 修正字段名，匹配Rust后端
  is_scrollable: boolean; // 修正字段名，匹配Rust后端
  is_enabled: boolean;    // 修正字段名，匹配Rust后端
  is_focused: boolean;    // 添加缺失的字段
  checkable: boolean;
  checked: boolean;
  selected: boolean;
  password: boolean;
  content_desc?: string;
  
  // 🆕 上下文关系信息 - 用于精准定位
  parent_element?: UIElementContext;           // 父元素信息
  sibling_elements?: UIElementContext[];       // 兄弟元素信息（同级）
  child_elements?: UIElementContext[];         // 子元素信息
  context_fingerprint?: ElementContextFingerprint; // 上下文指纹
  relative_position?: RelativePosition;        // 相对位置信息
}

// 元素上下文信息（简化版本，避免循环引用）
export interface UIElementContext {
  id: string;
  text: string;
  class_name?: string;
  resource_id?: string;
  is_clickable: boolean;
  bounds: ElementBounds;
  element_type: string;
}

// 元素上下文指纹 - 用于唯一识别元素的关键特征组合
export interface ElementContextFingerprint {
  // 锚点元素信息（用于定位的关键文本，如用户名）
  anchor_elements: {
    text: string;
    element_type: string;
    relative_direction: 'parent' | 'sibling' | 'child';
    distance: number; // 层级距离或位置距离
  }[];
  
  // 容器特征
  container_signature: {
    class_name?: string;
    resource_id?: string;
    child_count: number;
    container_bounds: ElementBounds;
  };
  
  // 兄弟元素特征模式（用于在动态列表中识别）
  sibling_pattern: {
    total_siblings: number;
    clickable_siblings: number;
    text_siblings: string[]; // 兄弟元素的文本内容
    position_in_siblings: number; // 在兄弟元素中的位置
  };
  
  // 生成时间戳
  generated_at: string;
  
  // 匹配权重配置
  matching_weights: {
    anchor_weight: number;    // 锚点匹配权重
    container_weight: number; // 容器匹配权重
    sibling_weight: number;   // 兄弟模式权重
    position_weight: number;  // 位置权重
  };
}

// 相对位置信息
export interface RelativePosition {
  relative_to_anchor: {
    anchor_text: string;
    direction: 'left' | 'right' | 'above' | 'below' | 'inside';
    distance_px: number;
    distance_percent: number;
  };
}

export interface ElementBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 智能导航相关类型定义
export interface SmartNavigationParams {
  navigation_type: string;
  target_button: string;
  click_action: string;
  app_name?: string;
  position_ratio?: {
    x_start: number;
    x_end: number;
    y_start: number;
    y_end: number;
  };
  custom_config?: any;
}

export interface UniversalClickResult {
  success: boolean;
  element_found: boolean;
  click_executed: boolean;
  execution_time_ms: number;
  mode: string;
  error_message?: string;
  found_element?: {
    text: string;
    position: string;
  };
}

export interface NavigationPresets {
  apps: string[];
  navigation_types: string[];
  common_buttons: string[];
}

/**
 * Universal UI页面分析API类
 */
export class UniversalUIAPI {
  
  /**
   * 分析Universal UI页面
   */
  static async analyzeUniversalUIPage(deviceId: string): Promise<string> {
    try {
      try {
        // 优先按后端约定使用 snake_case
        return await invokeCompat<string>('analyze_universal_ui_page', { deviceId }, { forceSnake: true });
      } catch (e) {
        const msg = String(e ?? '');
        // 若后端报缺少 camelCase key（deviceId），则改用 camelCase 再试一次
        if (msg.includes('missing required key deviceId') || msg.includes('invalid args `deviceId`')) {
          console.warn('[UniversalUIAPI] analyze_universal_ui_page: 检测到 camelCase 形参要求，回退 forceCamel 重试…', msg);
          return await invokeCompat<string>('analyze_universal_ui_page', { deviceId }, { forceCamel: true });
        }
        throw e;
      }
    } catch (error) {
      console.error('Failed to analyze universal UI page:', error);
      throw new Error(`Universal UI页面分析失败: ${error}`);
    }
  }

  /**
   * 提取页面元素 - 使用统一智能解析器，失败时使用前端解析
   */
  static async extractPageElements(xmlContent: string): Promise<UIElement[]> {
    try {
      // 优先使用后端统一解析器
      try {
        try {
          // 优先按后端约定使用 snake_case
          return await invokeCompat<UIElement[]>('extract_page_elements', { xmlContent }, { forceSnake: true });
        } catch (e) {
          const msg = String(e ?? '');
          // 若后端报缺少 camelCase key（xmlContent），则改用 camelCase 再试一次
          if (msg.includes('missing required key xmlContent') || msg.includes('invalid args `xmlContent`')) {
            console.warn('[UniversalUIAPI] extract_page_elements: 检测到 camelCase 形参要求，回退 forceCamel 重试…', msg);
            return await invokeCompat<UIElement[]>('extract_page_elements', { xmlContent }, { forceCamel: true });
          }
          throw e;
        }
      } catch (backendError) {
        console.warn('后端解析失败，使用前端上下文感知解析:', backendError);
        // 后端失败时使用前端上下文感知解析
        return this.parseXMLToElementsWithContext(xmlContent);
      }
    } catch (error) {
      console.error('Failed to extract page elements:', error);
      throw new Error(`提取页面元素失败: ${error}`);
    }
  }

  /**
   * 前端XML解析器 - 上下文感知版本，构建完整的DOM树关系
   */
  private static parseXMLToElementsWithContext(xmlContent: string): UIElement[] {
    const elements: UIElement[] = [];
    const elementMap = new Map<Element, UIElement>(); // XML节点到UIElement的映射
    
    try {
      // 轻量清洗：去除非XML头信息，提取第一个 '<' 到最后一个 '>' 之间的内容
      let content = xmlContent;
      if (content) {
        const firstLt = content.indexOf('<');
        const lastGt = content.lastIndexOf('>');
        if (firstLt > 0 && lastGt > firstLt) {
          content = content.slice(firstLt, lastGt + 1);
        }
      }
      // 创建DOM解析器
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // 检查解析错误
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML解析错误: ${parseError.textContent}`);
      }
      
      // 第一遍遍历：创建所有UIElement对象
      const firstPass = (node: Element, depth: number = 0) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'node') {
          const bounds = this.parseBounds(node.getAttribute('bounds') || '');
          const text = node.getAttribute('text') || '';
          const contentDesc = node.getAttribute('content-desc') || '';
          const resourceId = node.getAttribute('resource-id') || '';
          const className = node.getAttribute('class') || '';
          const clickable = node.getAttribute('clickable') === 'true';
          const scrollable = node.getAttribute('scrollable') === 'true';
          const enabled = node.getAttribute('enabled') !== 'false';
          const checkable = node.getAttribute('checkable') === 'true';
          const checked = node.getAttribute('checked') === 'true';
          const selected = node.getAttribute('selected') === 'true';
          const password = node.getAttribute('password') === 'true';
          
          // 🎯 保持基础过滤：保留所有有效的UI节点，让层级树视图负责显示控制
          const hasValidBounds = bounds.right > bounds.left && bounds.bottom > bounds.top;
          const hasMinimumSize = (bounds.right - bounds.left) >= 1 && (bounds.bottom - bounds.top) >= 1;
          
          if (hasValidBounds && hasMinimumSize) {
            const element: UIElement = {
              id: `element_${elements.length}`,
              element_type: className || 'unknown',
              text,
              bounds,
              xpath: this.generateXPath(node, depth),
              resource_id: resourceId,
              class_name: className,
              is_clickable: clickable,
              is_scrollable: scrollable,
              is_enabled: enabled,
              is_focused: false, // 添加缺失的字段
              checkable,
              checked,
              selected,
              password,
              content_desc: contentDesc,
            };
            
            elements.push(element);
            elementMap.set(node, element);
          }
        }
        
        // 递归处理子节点
        for (let i = 0; i < node.children.length; i++) {
          firstPass(node.children[i], depth + 1);
        }
      };

      // 第二遍遍历：构建上下文关系
      const secondPass = (node: Element) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'node') {
          const currentElement = elementMap.get(node);
          
          if (currentElement) {
            // 🔍 构建父元素上下文
            const parentNode = node.parentElement;
            if (parentNode && elementMap.has(parentNode)) {
              const parentElement = elementMap.get(parentNode)!;
              currentElement.parent_element = this.createElementContext(parentElement);
            }
            
            // 🔍 构建兄弟元素上下文
            const siblings: UIElementContext[] = [];
            if (node.parentElement) {
              for (let i = 0; i < node.parentElement.children.length; i++) {
                const siblingNode = node.parentElement.children[i];
                if (siblingNode !== node && elementMap.has(siblingNode)) {
                  const siblingElement = elementMap.get(siblingNode)!;
                  siblings.push(this.createElementContext(siblingElement));
                }
              }
            }
            currentElement.sibling_elements = siblings;
            
            // 🔍 构建子元素上下文
            const children: UIElementContext[] = [];
            for (let i = 0; i < node.children.length; i++) {
              const childNode = node.children[i];
              if (elementMap.has(childNode)) {
                const childElement = elementMap.get(childNode)!;
                children.push(this.createElementContext(childElement));
              }
            }
            currentElement.child_elements = children;
            
            // 🎯 生成上下文指纹
            currentElement.context_fingerprint = this.generateContextFingerprint(
              currentElement, 
              currentElement.parent_element,
              siblings,
              children
            );
            
            // 🎯 生成相对位置信息
            currentElement.relative_position = this.generateRelativePosition(
              currentElement,
              siblings
            );
          }
        }
        
        // 递归处理子节点
        for (let i = 0; i < node.children.length; i++) {
          secondPass(node.children[i]);
        }
      };
      
      // 从根节点开始遍历
      const rootNodes = xmlDoc.querySelectorAll('hierarchy > node');
      
      // 执行两遍遍历
      rootNodes.forEach(node => firstPass(node, 0));
      rootNodes.forEach(node => secondPass(node));
      
      console.log(`🎯 上下文感知解析完成，提取到 ${elements.length} 个UI元素，包含完整上下文关系`);
      return elements;
      
    } catch (error) {
      console.error('上下文感知XML解析失败:', error);
      throw new Error(`XML解析失败: ${error}`);
    }
  }

  /**
   * 🔧 创建元素上下文信息（避免循环引用）
   */
  private static createElementContext(element: UIElement): UIElementContext {
    return {
      id: element.id,
      text: element.text,
      class_name: element.class_name,
      resource_id: element.resource_id,
      is_clickable: element.is_clickable,
      bounds: element.bounds,
      element_type: element.element_type
    };
  }

  /**
   * 🎯 生成上下文指纹 - 用于精准识别元素的关键特征组合
   */
  private static generateContextFingerprint(
    element: UIElement,
    parent: UIElementContext | undefined,
    siblings: UIElementContext[],
    children: UIElementContext[]
  ): ElementContextFingerprint {
    // 🔍 寻找锚点元素（有文本的兄弟元素，通常是用户名等标识信息）
    const anchorElements = siblings
      .filter(sibling => sibling.text && sibling.text.trim().length > 0)
      .map(sibling => ({
        text: sibling.text,
        element_type: sibling.element_type,
        relative_direction: 'sibling' as const,
        distance: Math.abs(sibling.bounds.left - element.bounds.left) + 
                 Math.abs(sibling.bounds.top - element.bounds.top)
      }))
      .slice(0, 3); // 取前3个最相关的锚点

    // 🏠 容器特征
    const containerSignature = {
      class_name: parent?.class_name,
      resource_id: parent?.resource_id,
      child_count: siblings.length + 1, // 包括自己
      container_bounds: parent?.bounds || element.bounds
    };

    // 👥 兄弟元素特征模式
    const siblingPattern = {
      total_siblings: siblings.length,
      clickable_siblings: siblings.filter(s => s.is_clickable).length,
      text_siblings: siblings.map(s => s.text).filter(t => t),
      position_in_siblings: siblings.filter(s => 
        s.bounds.top < element.bounds.top || 
        (s.bounds.top === element.bounds.top && s.bounds.left < element.bounds.left)
      ).length
    };

    return {
      anchor_elements: anchorElements,
      container_signature: containerSignature,
      sibling_pattern: siblingPattern,
      generated_at: new Date().toISOString(),
      matching_weights: {
        anchor_weight: 0.4,    // 锚点匹配权重最高
        container_weight: 0.3, // 容器匹配权重
        sibling_weight: 0.2,   // 兄弟模式权重
        position_weight: 0.1   // 位置权重最低（因为会变化）
      }
    };
  }

  /**
   * 📍 生成相对位置信息
   */
  private static generateRelativePosition(
    element: UIElement,
    siblings: UIElementContext[]
  ): RelativePosition | undefined {
    // 寻找最近的有文本的兄弟元素作为锚点
    const textSiblings = siblings.filter(s => s.text && s.text.trim().length > 0);
    
    if (textSiblings.length === 0) return undefined;

    // 选择最近的文本兄弟作为锚点
    const closestAnchor = textSiblings.reduce((closest, current) => {
      const closestDistance = Math.abs(closest.bounds.left - element.bounds.left) + 
                            Math.abs(closest.bounds.top - element.bounds.top);
      const currentDistance = Math.abs(current.bounds.left - element.bounds.left) + 
                            Math.abs(current.bounds.top - element.bounds.top);
      return currentDistance < closestDistance ? current : closest;
    });

    // 计算相对方向
    let direction: 'left' | 'right' | 'above' | 'below' | 'inside' = 'right';
    if (element.bounds.right < closestAnchor.bounds.left) {
      direction = 'left';
    } else if (element.bounds.left > closestAnchor.bounds.right) {
      direction = 'right';
    } else if (element.bounds.bottom < closestAnchor.bounds.top) {
      direction = 'above';
    } else if (element.bounds.top > closestAnchor.bounds.bottom) {
      direction = 'below';
    } else {
      direction = 'inside';
    }

    const distancePx = Math.abs(element.bounds.left - closestAnchor.bounds.left) + 
                     Math.abs(element.bounds.top - closestAnchor.bounds.top);

    return {
      relative_to_anchor: {
        anchor_text: closestAnchor.text,
        direction,
        distance_px: distancePx,
        distance_percent: distancePx / 1080 * 100 // 基于屏幕宽度的百分比
      }
    };
  }

  /**
   * 解析bounds字符串为ElementBounds对象
   */
  private static parseBounds(boundsStr: string): ElementBounds {
    // bounds格式: [left,top][right,bottom]
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      return {
        left: parseInt(match[1]),
        top: parseInt(match[2]),
        right: parseInt(match[3]),
        bottom: parseInt(match[4]),
      };
    }
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  /**
   * 为节点生成简单的XPath
   */
  private static generateXPath(node: Element, depth: number): string {
    const className = node.getAttribute('class') || 'unknown';
    const resourceId = node.getAttribute('resource-id');
    
    if (resourceId) {
      return `//*[@resource-id='${resourceId}']`;
    }
    
    return `//*[@class='${className}'][${depth}]`;
  }

  /**
   * 🆕 基于上下文的精准定位算法 - 解决动态UI问题
   */

  /**
   * 🎯 基于上下文指纹的精准元素查找
   * 解决动态UI中相似元素难以区分的问题
   */
  static findElementByContextFingerprint(
    elements: UIElement[], 
    targetFingerprint: ElementContextFingerprint
  ): UIElement | null {
    if (!elements || elements.length === 0) return null;

    const candidates: { element: UIElement; score: number }[] = [];

    for (const element of elements) {
      if (!element.context_fingerprint) continue;

      const score = this.calculateContextMatchScore(
        element.context_fingerprint,
        targetFingerprint
      );

      if (score > 0.3) { // 最低匹配阈值
        candidates.push({ element, score });
      }
    }

    // 按匹配分数排序，返回最佳匹配
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
      console.log(`🎯 找到 ${candidates.length} 个候选元素，最佳匹配分数: ${candidates[0].score.toFixed(3)}`);
      return candidates[0].element;
    }

    return null;
  }

  /**
   * 🧮 计算上下文匹配分数
   */
  private static calculateContextMatchScore(
    current: ElementContextFingerprint,
    target: ElementContextFingerprint
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 1. 锚点匹配分数
    const anchorScore = this.calculateAnchorMatchScore(
      current.anchor_elements,
      target.anchor_elements
    );
    totalScore += anchorScore * target.matching_weights.anchor_weight;
    totalWeight += target.matching_weights.anchor_weight;

    // 2. 容器匹配分数
    const containerScore = this.calculateContainerMatchScore(
      current.container_signature,
      target.container_signature
    );
    totalScore += containerScore * target.matching_weights.container_weight;
    totalWeight += target.matching_weights.container_weight;

    // 3. 兄弟模式匹配分数
    const siblingScore = this.calculateSiblingPatternScore(
      current.sibling_pattern,
      target.sibling_pattern
    );
    totalScore += siblingScore * target.matching_weights.sibling_weight;
    totalWeight += target.matching_weights.sibling_weight;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * 🔍 计算锚点匹配分数
   */
  private static calculateAnchorMatchScore(
    currentAnchors: ElementContextFingerprint['anchor_elements'],
    targetAnchors: ElementContextFingerprint['anchor_elements']
  ): number {
    if (targetAnchors.length === 0) return 1; // 无锚点要求时返回满分
    if (currentAnchors.length === 0) return 0; // 当前无锚点时无法匹配

    let maxScore = 0;

    for (const targetAnchor of targetAnchors) {
      for (const currentAnchor of currentAnchors) {
        // 精确文本匹配
        if (currentAnchor.text === targetAnchor.text) {
          maxScore = Math.max(maxScore, 1.0);
        }
        // 部分匹配
        else if (currentAnchor.text.includes(targetAnchor.text) || 
                 targetAnchor.text.includes(currentAnchor.text)) {
          maxScore = Math.max(maxScore, 0.7);
        }
        // 相似性匹配（简单的字符串相似度）
        else {
          const similarity = this.calculateStringSimilarity(
            currentAnchor.text, 
            targetAnchor.text
          );
          if (similarity > 0.5) {
            maxScore = Math.max(maxScore, similarity * 0.6);
          }
        }
      }
    }

    return maxScore;
  }

  /**
   * 🏠 计算容器匹配分数
   */
  private static calculateContainerMatchScore(
    current: ElementContextFingerprint['container_signature'],
    target: ElementContextFingerprint['container_signature']
  ): number {
    let score = 0;
    let factors = 0;

    // 类名匹配
    if (current.class_name && target.class_name) {
      score += current.class_name === target.class_name ? 1 : 0;
      factors++;
    }

    // 资源ID匹配
    if (current.resource_id && target.resource_id) {
      score += current.resource_id === target.resource_id ? 1 : 0;
      factors++;
    }

    // 子元素数量相似度
    const childCountSimilarity = 1 - Math.abs(current.child_count - target.child_count) / 
                                 Math.max(current.child_count, target.child_count, 1);
    score += childCountSimilarity;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * 👥 计算兄弟模式匹配分数
   */
  private static calculateSiblingPatternScore(
    current: ElementContextFingerprint['sibling_pattern'],
    target: ElementContextFingerprint['sibling_pattern']
  ): number {
    let score = 0;
    let factors = 0;

    // 总兄弟数相似度
    const totalSimilarity = 1 - Math.abs(current.total_siblings - target.total_siblings) / 
                           Math.max(current.total_siblings, target.total_siblings, 1);
    score += totalSimilarity;
    factors++;

    // 可点击兄弟数相似度
    const clickableSimilarity = 1 - Math.abs(current.clickable_siblings - target.clickable_siblings) / 
                               Math.max(current.clickable_siblings, target.clickable_siblings, 1);
    score += clickableSimilarity;
    factors++;

    // 位置相似度
    const positionSimilarity = 1 - Math.abs(current.position_in_siblings - target.position_in_siblings) / 
                              Math.max(current.total_siblings, target.total_siblings, 1);
    score += positionSimilarity;
    factors++;

    // 文本兄弟匹配度
    const textMatchScore = this.calculateTextArraySimilarity(
      current.text_siblings,
      target.text_siblings
    );
    score += textMatchScore;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * 📝 计算字符串相似度
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 📊 计算文本数组相似度
   */
  private static calculateTextArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const matches = arr1.filter(text1 => 
      arr2.some(text2 => text1 === text2 || text1.includes(text2) || text2.includes(text1))
    ).length;

    return matches / Math.max(arr1.length, arr2.length);
  }

  /**
   * 📏 计算编辑距离（简化版本）
   */
  private static calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 🎯 智能元素查找 - 适配用户场景
   * 例如：findSmartElement(elements, '关注', '绯衣少年')
   * 会找到与"绯衣少年"在同一容器内的"关注"按钮
   */
  static findSmartElement(
    elements: UIElement[],
    targetText: string,
    anchorText?: string
  ): UIElement | null {
    // 如果没有锚点文本，退回到简单文本匹配
    if (!anchorText) {
      return elements.find(el => el.text === targetText || el.text?.includes(targetText)) || null;
    }

    // 寻找包含锚点文本的元素
    const anchorElements = elements.filter(el => 
      el.text === anchorText || el.text?.includes(anchorText)
    );

    if (anchorElements.length === 0) {
      console.warn(`🚫 未找到锚点元素: "${anchorText}"`);
      return null;
    }

    // 对每个锚点元素，寻找其兄弟元素中的目标
    for (const anchorElement of anchorElements) {
      if (anchorElement.sibling_elements) {
        const targetInSiblings = anchorElement.sibling_elements.find(sibling => 
          sibling.text === targetText || sibling.text?.includes(targetText)
        );
        
        if (targetInSiblings) {
          // 在原始elements数组中找到完整的元素对象
          const fullElement = elements.find(el => el.id === targetInSiblings.id);
          if (fullElement) {
            console.log(`🎯 通过锚点 "${anchorText}" 找到目标元素 "${targetText}"`);
            return fullElement;
          }
        }
      }

      // 也检查父容器的其他子元素
      if (anchorElement.parent_element) {
        const sameContainerElements = elements.filter(el => 
          el.parent_element?.id === anchorElement.parent_element!.id
        );
        
        const targetInContainer = sameContainerElements.find(el => 
          el.text === targetText || el.text?.includes(targetText)
        );
        
        if (targetInContainer) {
          console.log(`🎯 通过容器锚点 "${anchorText}" 找到目标元素 "${targetText}"`);
          return targetInContainer;
        }
      }
    }

    console.warn(`🚫 在锚点 "${anchorText}" 附近未找到目标元素 "${targetText}"`);
    return null;
  }

  /**
   * 去重元素
   */
  static async deduplicateElements(elements: UIElement[]): Promise<UIElement[]> {
    try {
      return await invoke<UIElement[]>('deduplicate_elements', { elements });
    } catch (error) {
      console.error('Failed to deduplicate elements:', error);
      throw new Error(`去重元素失败: ${error}`);
    }
  }

  /**
   * 获取元素的可读描述
   */
  static getElementDescription(element: UIElement): string {
    const parts: string[] = [];
    
    if (element.text.trim()) {
      parts.push(`文本: "${element.text}"`);
    }
    
    if (element.content_desc) {
      parts.push(`描述: "${element.content_desc}"`);
    }
    
    if (element.resource_id) {
      parts.push(`ID: ${element.resource_id}`);
    }
    
    parts.push(`类型: ${element.element_type}`);
    
    const states: string[] = [];
    if (element.is_clickable) states.push('可点击');
    if (element.is_scrollable) states.push('可滚动');
    if (element.is_enabled) states.push('启用');
    if (element.checkable) states.push('可选择');
    if (element.checked) states.push('已选择');
    
    if (states.length > 0) {
      parts.push(`状态: ${states.join(', ')}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * 计算元素中心点坐标
   */
  static getElementCenter(bounds: ElementBounds): { x: number; y: number } {
    return {
      x: Math.round((bounds.left + bounds.right) / 2),
      y: Math.round((bounds.top + bounds.bottom) / 2),
    };
  }

  /**
   * 过滤可交互的元素
   */
  static filterInteractiveElements(elements: UIElement[]): UIElement[] {
    return elements.filter(element => 
      element.is_clickable || 
      element.is_scrollable || 
      element.checkable ||
      element.element_type === 'EditText' ||
      element.element_type === 'Button'
    );
  }

  /**
   * 按类型分组元素
   */
  static groupElementsByType(elements: UIElement[]): Record<string, UIElement[]> {
    const grouped: Record<string, UIElement[]> = {};
    
    elements.forEach(element => {
      const type = element.element_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(element);
    });
    
    return grouped;
  }

  /**
   * 搜索包含指定文本的元素
   */
  static searchElementsByText(elements: UIElement[], searchText: string): UIElement[] {
    const lowerSearchText = searchText.toLowerCase();
    
    return elements.filter(element =>
      element.text.toLowerCase().includes(lowerSearchText) ||
      (element.content_desc && element.content_desc.toLowerCase().includes(lowerSearchText)) ||
      (element.resource_id && element.resource_id.toLowerCase().includes(lowerSearchText))
    );
  }
}

/**
 * Universal UI智能导航服务类
 * 提供智能导航和元素查找功能
 */
export class UniversalUIService {

  /**
   * 执行智能导航点击（统一入口）
   * 支持双模式：指定应用模式 vs 直接ADB模式
   */
  static async executeUIClick(
    deviceId: string,
    params: SmartNavigationParams
  ): Promise<UniversalClickResult> {
    try {
      return await invoke<UniversalClickResult>('execute_universal_ui_click', {
        deviceId: deviceId,
        params,
      });
    } catch (error) {
      console.error('Failed to execute UI click:', error);
      throw new Error(`智能导航执行失败: ${error}`);
    }
  }

  /**
   * 快速点击（简化接口）
   * 自动使用指定应用模式
   */
  static async quickClick(
    deviceId: string,
    appName: string,
    buttonText: string
  ): Promise<UniversalClickResult> {
    try {
      const params: SmartNavigationParams = {
        navigation_type: 'bottom',
        target_button: buttonText,
        click_action: 'single_tap',
        app_name: appName,
      };
      return await this.executeUIClick(deviceId, params);
    } catch (error) {
      console.error('Failed to execute quick click:', error);
      throw new Error(`快速点击执行失败: ${error}`);
    }
  }

  /**
   * 直接ADB点击（跳过应用检测）
   * 用于快速测试当前界面
   */
  static async directClick(
    deviceId: string,
    buttonText: string,
    positionHint?: string
  ): Promise<UniversalClickResult> {
    try {
      const params: SmartNavigationParams = {
        navigation_type: 'bottom',
        target_button: buttonText,
        click_action: 'single_tap',
        // 不指定 app_name，表示直接ADB模式
      };
      return await this.executeUIClick(deviceId, params);
    } catch (error) {
      console.error('Failed to execute direct click:', error);
      throw new Error(`直接点击执行失败: ${error}`);
    }
  }

  /**
   * 获取预设配置信息
   * 包含应用列表和导航类型定义
   */
  static async getNavigationPresets(): Promise<NavigationPresets> {
    try {
      // 暂时返回默认配置，后续可以通过后端命令获取
      return {
        apps: ['小红书', '微信', '抖音', '淘宝'],
        navigation_types: ['bottom', 'top', 'left', 'right'],
        common_buttons: ['我', '首页', '发现', '消息', '购物车', '个人中心']
      };
    } catch (error) {
      console.error('Failed to get navigation presets:', error);
      throw new Error(`获取导航预设失败: ${error}`);
    }
  }

  /**
   * 格式化执行结果信息
   */
  static formatResult(result: UniversalClickResult): {
    statusText: string;
    detailText: string;
    success: boolean;
  } {
    const { success, element_found, click_executed, execution_time_ms, mode, error_message } = result;

    let statusText = '';
    let detailText = '';

    if (success) {
      statusText = '✅ 执行成功';
      detailText = `模式: ${mode}, 执行时间: ${execution_time_ms}ms`;
    } else if (!element_found) {
      statusText = '❌ 未找到元素';
      detailText = error_message || '目标按钮未在指定区域找到';
    } else if (!click_executed) {
      statusText = '⚠️ 点击失败';
      detailText = error_message || '找到元素但点击操作失败';
    } else {
      statusText = '❌ 执行失败';
      detailText = error_message || '未知错误';
    }

    return { statusText, detailText, success };
  }
}

export default UniversalUIAPI;
