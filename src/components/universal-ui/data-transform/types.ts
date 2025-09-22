/**
 * 数据转换模块类型定义
 */

import { UIElement } from '../../../api/universalUIAPI';
import { VisualUIElement } from '../xml-parser/types';

// 元素上下文信息
export interface ElementContext {
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  bounds: string;
  clickable: boolean;
  selected: boolean;
  enabled: boolean;
  focusable: boolean;
  scrollable: boolean;
  checkable: boolean;
  checked: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenWidth: number;
  screenHeight: number;
  parentElements: ElementContext[];
  siblingElements: ElementContext[];
  childElements: ElementContext[];
}

// 转换选项
export interface ConversionOptions {
  generateXpath?: boolean;
  includeContext?: boolean;
  validateBounds?: boolean;
  defaultScreenSize?: {
    width: number;
    height: number;
  };
}

// 转换结果
export interface ConversionResult {
  uiElement: UIElement;
  context?: ElementContext;
  warnings: string[];
  metadata: {
    conversionTime: number;
    originalId: string;
    hasValidBounds: boolean;
  };
}

// 通用转换结果
export interface GenericConversionResult<T> {
  success: boolean;
  visualElement?: VisualUIElement;
  uiElement?: UIElement;
  result?: T;
  error?: Error;
  metadata: {
    conversionType: string;
    timestamp: number;
    hasPosition: boolean;
    hasText: boolean;
  };
}