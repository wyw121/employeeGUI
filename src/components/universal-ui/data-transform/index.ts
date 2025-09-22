/**
 * 数据转换模块统一导出
 */

export { VisualToUIElementConverter } from './VisualToUIElementConverter';
export { ElementContextCreator } from './ElementContextCreator';

export type {
  ElementContext,
  ConversionOptions,
  ConversionResult
} from './types';

// 便捷的导出别名
import { VisualToUIElementConverter } from './VisualToUIElementConverter';
import { ElementContextCreator } from './ElementContextCreator';

export const convertVisualToUIElement = VisualToUIElementConverter.convertSimple;
export const createElementContext = ElementContextCreator.createSimpleContext;