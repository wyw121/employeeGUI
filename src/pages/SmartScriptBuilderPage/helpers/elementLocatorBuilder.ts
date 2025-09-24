import type { ElementLocator } from '../../../types/selfContainedScript';
import { parseBoundsString, rectToBoundsString } from '../../../components/universal-ui/utils/bounds';

type Rect = { left: number; top: number; right: number; bottom: number };

function toRect(input: string | Rect | undefined | null): Rect {
  if (!input) return { left: 0, top: 0, right: 0, bottom: 0 };
  if (typeof input === 'string') {
    return (
      parseBoundsString(input) || { left: 0, top: 0, right: 0, bottom: 0 }
    );
  }
  return input;
}

function toBoundsString(input: string | Rect | undefined | null): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  return rectToBoundsString(input);
}

/**
 * 从“旧参数/已存在步骤参数”构建定位器（要求存在 bounds）
 */
export function buildLocatorFromParamsLike(p: any): ElementLocator | undefined {
  if (!p || !p.bounds) return undefined;
  const selectedBounds = toRect(p.bounds);
  return {
    selectedBounds,
    elementPath: p.xpath || p.element_path || '',
    confidence: p.smartAnalysis?.confidence || 0.8,
    additionalInfo: {
      xpath: p.xpath,
      resourceId: p.resource_id,
      text: p.text || p.element_text,
      contentDesc: p.content_desc,
      className: p.class_name,
      bounds: toBoundsString(p.bounds),
    },
  };
}

/**
 * 从“元素对象（可视化/网格选中项）”构建定位器（要求存在 bounds）
 */
export function buildLocatorFromElementLike(element: any): ElementLocator | undefined {
  if (!element || !element.bounds) return undefined;
  const selectedBounds = toRect(element.bounds);
  return {
    selectedBounds,
    elementPath: element.xpath || element.element_path || '',
    confidence: element.smartAnalysis?.confidence || 0.8,
    additionalInfo: {
      xpath: element.xpath,
      resourceId: element.resource_id,
      text: element.text,
      contentDesc: element.content_desc,
      className: element.class_name,
      bounds: toBoundsString(element.bounds),
    },
  };
}

/**
 * 从“匹配条件 + 预览”构建定位器（需要至少有 xpath 或 bounds 之一）
 */
export function buildLocatorFromCriteriaLike(criteria: any): ElementLocator | undefined {
  const preview = criteria?.preview;
  const xpath: string | undefined = preview?.xpath;
  const bounds = preview?.bounds as string | Rect | undefined;
  if (!xpath && !bounds) return undefined;

  const selectedBounds = toRect(bounds);
  return {
    selectedBounds,
    elementPath: xpath || '',
    confidence: 0.8,
    additionalInfo: {
      xpath,
      resourceId: criteria?.values?.['resource-id'],
      text: criteria?.values?.['text'],
      contentDesc: criteria?.values?.['content-desc'],
      className: criteria?.values?.['class'],
      bounds: toBoundsString(bounds),
    },
  };
}
