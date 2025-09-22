/**
 * XML解析模块统一导出
 */

export { XmlParser } from './XmlParser';
export { BoundsParser } from './BoundsParser';
export { ElementCategorizer } from './ElementCategorizer';
export { AppPageAnalyzer } from './AppPageAnalyzer';

export type {
  VisualUIElement,
  VisualElementCategory,
  RawXmlNode,
  ElementBounds,
  XmlParseResult,
  ElementCategorizerOptions,
  AppPageInfo
} from './types';

// 便捷的导出别名（在导入之后）
import { XmlParser } from './XmlParser';
import { BoundsParser } from './BoundsParser';
import { ElementCategorizer } from './ElementCategorizer';
import { AppPageAnalyzer } from './AppPageAnalyzer';

export const parseXML = XmlParser.parseXML;
export const parseBounds = BoundsParser.parseBounds;
export const categorizeElement = ElementCategorizer.categorizeElement;
export const getUserFriendlyName = ElementCategorizer.getUserFriendlyName;
export const getElementImportance = ElementCategorizer.getElementImportance;
export const analyzeAppAndPageInfo = AppPageAnalyzer.analyzeAppAndPageInfo;