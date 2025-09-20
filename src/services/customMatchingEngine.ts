/**
 * 自定义匹配引擎 - 核心实现
 * 支持通配符、正则表达式、位置范围等多种匹配模式
 */

import {
  CustomMatchingRule,
  MatchingResult,
  MatchedElement,
  TextMatchRule,
  BoundsMatchRule,
  AttributeMatchRule,
  ElementBounds,
  ElementAttributes,
  PREDEFINED_RULES
} from '../types/customMatching';

/**
 * UI元素原始数据结构（从XML解析）
 */
interface RawUIElement {
  text: string;
  'resource-id': string;
  class: string;
  'content-desc': string;
  bounds: string; // "[left,top][right,bottom]" 格式
  clickable: string;
  enabled: string;
  focusable: string;
  focused: string;
  selected: string;
  scrollable: string;
  'long-clickable': string;
  checkable: string;
  checked: string;
  password: string;
  [key: string]: string;
}

export class CustomMatchingEngine {
  private static instance: CustomMatchingEngine;
  
  public static getInstance(): CustomMatchingEngine {
    if (!CustomMatchingEngine.instance) {
      CustomMatchingEngine.instance = new CustomMatchingEngine();
    }
    return CustomMatchingEngine.instance;
  }
  
  /**
   * 执行匹配规则，返回匹配结果
   */
  public async match(
    rule: CustomMatchingRule,
    elements: RawUIElement[]
  ): Promise<MatchingResult> {
    const startTime = Date.now();
    const normalizedElements = elements.map(this.normalizeElement);
    
    let matchedElements: MatchedElement[] = [];
    
    for (const element of normalizedElements) {
      if (this.isElementMatched(element, rule)) {
        matchedElements.push({
          ...element,
          confidence: this.calculateConfidence(element, rule),
          matchedConditions: this.getMatchedConditions(element, rule)
        });
        
        // 检查是否达到最大匹配数
        if (rule.options.maxMatches > 0 && matchedElements.length >= rule.options.maxMatches) {
          break;
        }
      }
    }
    
    // 应用排序
    matchedElements = this.sortMatches(matchedElements, rule.options.order);
    
    // 去重处理
    if (rule.options.deduplicate) {
      matchedElements = this.deduplicateMatches(matchedElements);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      elements: matchedElements,
      ruleId: rule.id,
      totalMatches: matchedElements.length,
      limitReached: rule.options.maxMatches > 0 && matchedElements.length >= rule.options.maxMatches,
      duration
    };
  }
  
  /**
   * 检查元素是否匹配规则
   */
  private isElementMatched(element: MatchedElement, rule: CustomMatchingRule): boolean {
    const { conditions } = rule;
    
    // 文本匹配
    if (conditions.text && !this.matchText(element.text, conditions.text)) {
      return false;
    }
    
    // 类名匹配
    if (conditions.className && !this.matchText(element.className, conditions.className)) {
      return false;
    }
    
    // 资源ID匹配
    if (conditions.resourceId && !this.matchText(element.resourceId, conditions.resourceId)) {
      return false;
    }
    
    // 内容描述匹配
    if (conditions.contentDesc && !this.matchText(element.contentDesc, conditions.contentDesc)) {
      return false;
    }
    
    // 位置匹配
    if (conditions.bounds && !this.matchBounds(element.bounds, conditions.bounds)) {
      return false;
    }
    
    // 属性匹配
    if (conditions.attributes && !this.matchAttributes(element.attributes, conditions.attributes)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 文本匹配逻辑
   */
  private matchText(text: string, rule: TextMatchRule): boolean {
    let targetText = rule.caseSensitive !== false ? text : text.toLowerCase();
    let ruleValue = rule.caseSensitive !== false ? rule.value : rule.value.toLowerCase();
    
    switch (rule.mode) {
      case 'exact':
        return targetText === ruleValue;
        
      case 'contains':
        return targetText.includes(ruleValue);
        
      case 'startsWith':
        return targetText.startsWith(ruleValue);
        
      case 'endsWith':
        return targetText.endsWith(ruleValue);
        
      case 'wildcard':
        return this.matchWildcard(targetText, ruleValue);
        
      case 'regex':
        try {
          const flags = rule.caseSensitive !== false ? 'g' : 'gi';
          const regex = new RegExp(ruleValue, flags);
          return regex.test(targetText);
        } catch {
          console.warn(`Invalid regex pattern: ${ruleValue}`);
          return false;
        }
        
      default:
        return targetText === ruleValue;
    }
  }
  
  /**
   * 通配符匹配实现
   */
  private matchWildcard(text: string, pattern: string): boolean {
    // 将通配符模式转换为正则表达式
    const regexPattern = pattern
      .replace(/[.+^${}()|[\\]\\\\]/g, '\\\\$&') // 转义正则表达式特殊字符
      .replace(/\\*/g, '.*') // * 替换为 .*
      .replace(/\\?/g, '.'); // ? 替换为 .
      
    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(text);
    } catch {
      console.warn(`Invalid wildcard pattern: ${pattern}`);
      return false;
    }
  }
  
  /**
   * 位置范围匹配
   */
  private matchBounds(bounds: ElementBounds, rule: BoundsMatchRule): boolean {
    // X坐标匹配
    if (rule.x) {
      if (!this.matchRange(bounds.centerX, rule.x)) {
        return false;
      }
    }
    
    // Y坐标匹配
    if (rule.y) {
      if (!this.matchRange(bounds.centerY, rule.y)) {
        return false;
      }
    }
    
    // 宽度匹配
    if (rule.width) {
      if (!this.matchRange(bounds.width, rule.width)) {
        return false;
      }
    }
    
    // 高度匹配
    if (rule.height) {
      if (!this.matchRange(bounds.height, rule.height)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 数值范围匹配
   */
  private matchRange(value: number, range: { min?: number; max?: number; exact?: number }): boolean {
    if (range.exact !== undefined) {
      return Math.abs(value - range.exact) < 1; // 允许1像素误差
    }
    
    if (range.min !== undefined && value < range.min) {
      return false;
    }
    
    if (range.max !== undefined && value > range.max) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 属性匹配
   */
  private matchAttributes(attributes: ElementAttributes, rule: AttributeMatchRule): boolean {
    const checks = [
      ['clickable', rule.clickable],
      ['enabled', rule.enabled],
      ['focusable', rule.focusable],
      ['selected', rule.selected],
      ['scrollable', rule.scrollable],
      ['longClickable', rule.longClickable]
    ] as const;
    
    for (const [attr, expected] of checks) {
      if (expected !== undefined && attributes[attr] !== expected) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 标准化元素数据
   */
  private normalizeElement(raw: RawUIElement): MatchedElement {
    const bounds = this.parseBounds(raw.bounds);
    
    return {
      id: this.generateElementId(raw),
      text: raw.text || '',
      className: raw.class || '',
      resourceId: raw['resource-id'] || '',
      contentDesc: raw['content-desc'] || '',
      bounds,
      attributes: {
        clickable: raw.clickable === 'true',
        enabled: raw.enabled === 'true',
        focusable: raw.focusable === 'true',
        focused: raw.focused === 'true',
        selected: raw.selected === 'true',
        scrollable: raw.scrollable === 'true',
        longClickable: raw['long-clickable'] === 'true',
        checkable: raw.checkable === 'true',
        checked: raw.checked === 'true',
        password: raw.password === 'true'
      },
      confidence: 0,
      matchedConditions: []
    };
  }
  
  /**
   * 解析bounds字符串 "[left,top][right,bottom]"
   */
  private parseBounds(boundsStr: string): ElementBounds {
    try {
      const match = boundsStr.match(/\\[(-?\\d+),(-?\\d+)\\]\\[(-?\\d+),(-?\\d+)\\]/);
      if (!match) {
        throw new Error('Invalid bounds format');
      }
      
      const [, left, top, right, bottom] = match.map(Number);
      const width = right - left;
      const height = bottom - top;
      
      return {
        left,
        top,
        right,
        bottom,
        width,
        height,
        centerX: left + width / 2,
        centerY: top + height / 2
      };
    } catch {
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0
      };
    }
  }
  
  /**
   * 生成元素唯一ID
   */
  private generateElementId(raw: RawUIElement): string {
    const key = `${raw.class}:${raw.text}:${raw.bounds}:${raw['resource-id']}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
  
  /**
   * 计算匹配置信度
   */
  private calculateConfidence(element: MatchedElement, rule: CustomMatchingRule): number {
    let score = 0;
    let maxScore = 0;
    
    // 文本匹配权重
    if (rule.conditions.text) {
      maxScore += 30;
      if (element.text) {
        if (rule.conditions.text.mode === 'exact') {
          score += 30;
        } else {
          score += 20;
        }
      }
    }
    
    // 类名匹配权重
    if (rule.conditions.className) {
      maxScore += 20;
      score += 20;
    }
    
    // 资源ID匹配权重
    if (rule.conditions.resourceId) {
      maxScore += 25;
      score += 25;
    }
    
    // 位置匹配权重
    if (rule.conditions.bounds) {
      maxScore += 15;
      score += 15;
    }
    
    // 属性匹配权重
    if (rule.conditions.attributes) {
      maxScore += 10;
      score += 10;
    }
    
    return maxScore > 0 ? score / maxScore : 1.0;
  }
  
  /**
   * 获取匹配的条件列表
   */
  private getMatchedConditions(element: MatchedElement, rule: CustomMatchingRule): string[] {
    const conditions: string[] = [];
    
    if (rule.conditions.text) {
      conditions.push(`text:${rule.conditions.text.mode}(${rule.conditions.text.value})`);
    }
    
    if (rule.conditions.className) {
      conditions.push(`class:${rule.conditions.className.value}`);
    }
    
    if (rule.conditions.resourceId) {
      conditions.push(`resource-id:${rule.conditions.resourceId.value}`);
    }
    
    if (rule.conditions.bounds) {
      const parts: string[] = [];
      if (rule.conditions.bounds.x) {
        parts.push(`x:${JSON.stringify(rule.conditions.bounds.x)}`);
      }
      if (rule.conditions.bounds.y) {
        parts.push(`y:${JSON.stringify(rule.conditions.bounds.y)}`);
      }
      conditions.push(`bounds:[${parts.join(',')}]`);
    }
    
    if (rule.conditions.attributes) {
      const attrs = Object.entries(rule.conditions.attributes)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}:${value}`);
      if (attrs.length > 0) {
        conditions.push(`attributes:[${attrs.join(',')}]`);
      }
    }
    
    return conditions;
  }
  
  /**
   * 排序匹配结果
   */
  private sortMatches(matches: MatchedElement[], order: string): MatchedElement[] {
    switch (order) {
      case 'position':
        return matches.sort((a, b) => {
          if (a.bounds.top !== b.bounds.top) {
            return a.bounds.top - b.bounds.top;
          }
          return a.bounds.left - b.bounds.left;
        });
        
      case 'size':
        return matches.sort((a, b) => {
          const areaA = a.bounds.width * a.bounds.height;
          const areaB = b.bounds.width * b.bounds.height;
          return areaB - areaA; // 大到小
        });
        
      case 'random':
        return matches.sort(() => Math.random() - 0.5);
        
      case 'document':
      default:
        return matches; // 保持原始顺序
    }
  }
  
  /**
   * 去重处理
   */
  private deduplicateMatches(matches: MatchedElement[]): MatchedElement[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = `${match.bounds.left},${match.bounds.top},${match.text}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * 创建预定义规则实例
   */
  public createPredefinedRule(type: keyof typeof PREDEFINED_RULES): CustomMatchingRule {
    const template = PREDEFINED_RULES[type];
    return {
      id: `predefined_${String(type).toLowerCase()}_${Date.now()}`,
      name: template.name,
      description: template.description,
      conditions: template.conditions,
      options: template.options,
      enabled: true
    };
  }
}

// 导出单例实例
export const customMatchingEngine = CustomMatchingEngine.getInstance();

// 导出类型和常量  
export type { 
  CustomMatchingRule,
  MatchingResult,
  MatchedElement,
  TextMatchRule,
  BoundsMatchRule,
  AttributeMatchRule,
  ElementBounds,
  ElementAttributes
};

export { PREDEFINED_RULES };

// 匹配模板定义
export const MATCHING_TEMPLATES = {
  xiaohongshu_follow: {
    name: '小红书关注按钮',
    description: '用于匹配小红书应用中的关注/已关注按钮',
    rules: [
      {
        id: 'follow_text',
        name: '关注按钮文本',
        textMatch: {
          value: '关注|已关注',
          matchType: 'regex' as const,
          caseSensitive: false
        },
        attributeMatch: {
          clickable: 'true',
          class: 'android.widget.TextView'
        }
      }
    ]
  },
  xiaohongshu_username: {
    name: '小红书用户名',
    description: '用于匹配小红书应用中的用户名文本',
    rules: [
      {
        id: 'username_text',
        name: '用户名文本',
        attributeMatch: {
          class: 'android.widget.TextView',
          clickable: 'false'
        },
        boundsMatch: {
          x: { min: 200, max: 500 },
          width: { min: 50, max: 300 }
        }
      }
    ]
  }
};