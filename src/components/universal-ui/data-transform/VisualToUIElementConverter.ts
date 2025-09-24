/**
 * 可视化元素到UI元素转换器
 * 负责将VisualUIElement转换为UIElement格式
 */

import { UIElement } from '../../../api/universalUIAPI';
import { VisualUIElement } from '../xml-parser/types';
import { ConversionOptions, ConversionResult } from './types';

export class VisualToUIElementConverter {
  
  /**
   * 将VisualUIElement转换为UIElement
   * @param visualElement 可视化元素
   * @param options 转换选项
   * @returns 转换结果
   */
  static convert(
    visualElement: VisualUIElement, 
    options: ConversionOptions = {}
  ): ConversionResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    // 安全地获取position数据，提供默认值
    const position = visualElement.position || { 
      x: 0, 
      y: 0, 
      width: 100, 
      height: 50 
    };
    
    // 验证边界有效性
    const hasValidBounds = this.validateBounds(position, warnings);
    
    // 生成XPath（如果需要）
    let xpath = '';
    if (options.generateXpath) {
      xpath = this.generateXPath(visualElement, options);
    }
    
    // 构建UIElement
    const uiElement: UIElement = {
      id: visualElement.id,
      text: visualElement.text || '',
      element_type: visualElement.type || 'Unknown',
      xpath: xpath,
      bounds: {
        left: position.x,
        top: position.y,
        right: position.x + position.width,
        bottom: position.y + position.height
      },
      is_clickable: visualElement.clickable || false,
      is_scrollable: this.inferScrollable(visualElement),
      is_enabled: true, // 默认启用
      is_focused: false, // 默认未聚焦
      checkable: this.inferCheckable(visualElement),
      checked: false, // 默认未选中
      selected: false, // 默认未选择
      password: this.inferPassword(visualElement),
      // 避免把友好描述（如“未知元素（可点击）”）写入 content_desc
      content_desc: ''
    };
    
    // 构建转换结果
    const result: ConversionResult = {
      uiElement,
      warnings,
      metadata: {
        conversionTime: Date.now() - startTime,
        originalId: visualElement.id,
        hasValidBounds
      }
    };
    
    // 添加上下文信息（如果需要）
    if (options.includeContext) {
      result.context = this.createElementContext(visualElement);
    }
    
    return result;
  }

  /**
   * 批量转换可视化元素
   * @param visualElements 可视化元素数组
   * @param options 转换选项
   * @returns 转换结果数组
   */
  static convertBatch(
    visualElements: VisualUIElement[], 
    options: ConversionOptions = {}
  ): ConversionResult[] {
    return visualElements.map(element => this.convert(element, options));
  }

  /**
   * 简单转换（兼容旧接口）
   * @param visualElement 可视化元素
   * @returns UIElement
   */
  static convertSimple(visualElement: VisualUIElement): UIElement {
    const result = this.convert(visualElement, { generateXpath: false });
    return result.uiElement;
  }

  /**
   * 验证边界有效性
   * @param position 位置信息
   * @param warnings 警告数组
   * @returns 是否有效
   */
  private static validateBounds(
    position: { x: number; y: number; width: number; height: number },
    warnings: string[]
  ): boolean {
    let isValid = true;
    
    if (position.width <= 0 || position.height <= 0) {
      warnings.push(`无效的元素尺寸: ${position.width}x${position.height}`);
      isValid = false;
    }
    
    if (position.x < 0 || position.y < 0) {
      warnings.push(`负坐标值: (${position.x}, ${position.y})`);
      // 不标记为无效，可能是有效的负坐标
    }
    
    return isValid;
  }

  /**
   * 生成XPath表达式
   * @param visualElement 可视化元素
   * @param options 选项
   * @returns XPath字符串
   */
  private static generateXPath(
    visualElement: VisualUIElement, 
    options: ConversionOptions
  ): string {
    // 简化的XPath生成逻辑
    const type = visualElement.type || 'Unknown';
    const className = type.split('.').pop() || 'View';
    
    let xpath = `//*[@class='${type}']`;
    
    // 如果有文本，添加文本匹配
    if (visualElement.text) {
      xpath += `[@text='${visualElement.text}']`;
    }
    
    // 如果有描述，添加描述匹配
    if (visualElement.description && !visualElement.text) {
      xpath += `[@content-desc='${visualElement.description}']`;
    }
    
    return xpath;
  }

  /**
   * 推断是否可滚动
   * @param visualElement 可视化元素
   * @returns 是否可滚动
   */
  private static inferScrollable(visualElement: VisualUIElement): boolean {
    const type = visualElement.type?.toLowerCase() || '';
    const scrollableTypes = ['scrollview', 'recyclerview', 'listview', 'viewpager'];
    
    return scrollableTypes.some(scrollType => type.includes(scrollType));
  }

  /**
   * 推断是否可勾选
   * @param visualElement 可视化元素
   * @returns 是否可勾选
   */
  private static inferCheckable(visualElement: VisualUIElement): boolean {
    const type = visualElement.type?.toLowerCase() || '';
    const checkableTypes = ['checkbox', 'radiobutton', 'switch', 'togglebutton'];
    
    return checkableTypes.some(checkType => type.includes(checkType));
  }

  /**
   * 推断是否为密码输入框
   * @param visualElement 可视化元素
   * @returns 是否为密码输入框
   */
  private static inferPassword(visualElement: VisualUIElement): boolean {
    const type = visualElement.type?.toLowerCase() || '';
    const text = visualElement.text?.toLowerCase() || '';
  // 不使用 description 作为密码推断依据，避免友好描述干扰
  const desc = '';
    
    const passwordKeywords = ['password', '密码', 'pwd'];
    
    return passwordKeywords.some(keyword => 
      type.includes(keyword) || text.includes(keyword) || desc.includes(keyword)
    );
  }

  /**
   * 创建元素上下文（简化版本）
   * @param visualElement 可视化元素
   * @returns 元素上下文
   */
  private static createElementContext(visualElement: VisualUIElement) {
    const position = visualElement.position || { x: 0, y: 0, width: 100, height: 50 };
    
    return {
      text: visualElement.text || '',
      contentDesc: visualElement.description || '',
      resourceId: '', // 需要从原始XML数据获取
      className: visualElement.type || '',
      bounds: `[${position.x},${position.y}][${position.x + position.width},${position.y + position.height}]`,
      clickable: visualElement.clickable || false,
      selected: false,
      enabled: true,
      focusable: visualElement.clickable || false,
      scrollable: this.inferScrollable(visualElement),
      checkable: this.inferCheckable(visualElement),
      checked: false,
      position: position,
      screenWidth: 1080, // 默认值，应该从外部传入
      screenHeight: 1920, // 默认值，应该从外部传入
      parentElements: [],
      siblingElements: [],
      childElements: []
    };
  }
}