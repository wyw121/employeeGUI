/**
 * ElementLocator 类型定义
 */

export interface ElementLocator {
  selectedBounds: { left: number; top: number; right: number; bottom: number };
  elementPath: string;
  confidence: number;
  additionalInfo?: {
    xpath?: string;
    resourceId?: string;
    text?: string;
    contentDesc?: string;
    className?: string;
    bounds?: string;
  };
}

export default ElementLocator;
