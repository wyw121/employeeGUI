/**
 * 数据转换模块统一导出
 */

export { VisualToUIElementConverter } from './VisualToUIElementConverter';
export { ElementContextCreator } from './ElementContextCreator';
export { UIElementToVisualConverter } from './UIElementToVisualConverter';

export type {
  ElementContext,
  ConversionOptions,
  ConversionResult
} from './types';

// 便捷的导出别名
import { VisualToUIElementConverter } from './VisualToUIElementConverter';
import { ElementContextCreator } from './ElementContextCreator';
import { UIElementToVisualConverter } from './UIElementToVisualConverter';

export const convertVisualToUIElement = VisualToUIElementConverter.convertSimple;
export const createElementContext = ElementContextCreator.createSimpleContext;
export const createContextFromUIElement = ElementContextCreator.createContextFromUIElement;
export const convertUIToVisualElement = UIElementToVisualConverter.convertSimple;