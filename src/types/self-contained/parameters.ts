import type { XmlSnapshot } from './xmlSnapshot';
import type { ElementLocator } from './elementLocator';

export interface SelfContainedStepParameters {
  text?: string;
  element_text?: string;
  element_type?: string;
  resource_id?: string;
  content_desc?: string;
  bounds?: any;
  boundsRect?: { left: number; top: number; right: number; bottom: number };
  xpath?: string;
  xmlSnapshot?: XmlSnapshot;
  elementLocator?: ElementLocator;
  smartDescription?: string;
  smartAnalysis?: any;
  isEnhanced?: boolean;
  // 废弃兼容
  xmlCacheId?: string;
  xmlContent?: string;
  xmlTimestamp?: number;
  deviceId?: string;
  deviceName?: string;
}

// 迁移工具（保持原逻辑不变）
export const migrateToSelfContainedParameters = (
  oldParams: any,
  currentXmlContent?: string,
  currentDeviceInfo?: Partial<XmlSnapshot['deviceInfo']>,
  currentPageInfo?: Partial<XmlSnapshot['pageInfo']>
): SelfContainedStepParameters => {
  const { createXmlSnapshot } = require('./xmlSnapshot') as typeof import('./xmlSnapshot');

  const newParams: SelfContainedStepParameters = { ...oldParams };
  if (oldParams.xmlContent || currentXmlContent) {
    const xmlContent = oldParams.xmlContent || currentXmlContent || '';
    if (xmlContent) {
      newParams.xmlSnapshot = createXmlSnapshot(
        xmlContent,
        {
          deviceId: oldParams.deviceId || currentDeviceInfo?.deviceId || 'unknown',
          deviceName: oldParams.deviceName || currentDeviceInfo?.deviceName || 'unknown',
          appPackage: currentDeviceInfo?.appPackage || 'com.xingin.xhs',
          activityName: currentDeviceInfo?.activityName || 'unknown',
        },
        {
          pageTitle: currentPageInfo?.pageTitle || '未知页面',
          pageType: currentPageInfo?.pageType || 'unknown',
          elementCount: currentPageInfo?.elementCount || 0,
          appVersion: currentPageInfo?.appVersion,
        }
      );

      if (oldParams.bounds) {
        let rect = oldParams.bounds as { left: number; top: number; right: number; bottom: number };
        if (typeof oldParams.bounds === 'string') {
          const s = (oldParams.bounds as string).trim().replace(/［/g, '[').replace(/］/g, ']');
          const bracket = s.match(/\[(\s*[-\d]+\s*),(\s*[-\d]+\s*)\]\[(\s*[-\d]+\s*),(\s*[-\d]+\s*)\]/);
          if (bracket) {
            const [_, l, t, r, b] = bracket as unknown as string[];
            rect = { left: parseInt(l), top: parseInt(t), right: parseInt(r), bottom: parseInt(b) } as any;
          } else {
            const parts = s.split(',').map((p) => p.trim());
            if (parts.length === 4) {
              rect = { left: parseInt(parts[0]), top: parseInt(parts[1]), right: parseInt(parts[2]), bottom: parseInt(parts[3]) } as any;
            }
          }
        }

        (newParams as any).boundsRect = rect;
        newParams.elementLocator = {
          selectedBounds: rect || oldParams.bounds,
          elementPath: oldParams.xpath || oldParams.element_path || '',
          confidence: oldParams.smartAnalysis?.confidence || 0.8,
          additionalInfo: {
            xpath: oldParams.xpath,
            resourceId: oldParams.resource_id,
            text: oldParams.text,
            contentDesc: oldParams.content_desc,
            className: oldParams.class_name,
            bounds: typeof oldParams.bounds === 'string'
              ? oldParams.bounds
              : rect
                ? `[${rect.left},${rect.top}][${rect.right},${rect.bottom}]`
                : undefined,
          },
        } as any;
      }
    }
  }
  return newParams;
};

export default SelfContainedStepParameters;
