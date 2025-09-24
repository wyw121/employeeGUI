import type { XmlSnapshot, SelfContainedStepParameters, ElementLocator } from '../../types/selfContainedScript';
import { createXmlSnapshot } from '../../types/selfContainedScript';

// 将 UI 选择的 element（增强或基础）提取为 ElementLocator
export function buildElementLocatorFromElement(element: any): ElementLocator | undefined {
  if (!element) return undefined;
  const b = element.bounds;
  const selectedBounds = b && typeof b === 'object' &&
    typeof b.left === 'number' && typeof b.top === 'number' &&
    typeof b.right === 'number' && typeof b.bottom === 'number'
    ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
    : undefined;

  const xpath: string | undefined = element.xpath || element.element_path || undefined;
  const resourceId: string | undefined = element.resource_id || undefined;
  const text: string | undefined = element.text || element.element_text || undefined;
  const contentDesc: string | undefined = element.content_desc || undefined;
  const className: string | undefined = element.class_name || undefined;
  const confidence: number = (element.smartAnalysis?.confidence) ?? 0.8;
  // 规范化 bounds 字符串，便于下游 Grid 侧预选
  const boundsString = selectedBounds
    ? `[${selectedBounds.left},${selectedBounds.top}][${selectedBounds.right},${selectedBounds.bottom}]`
    : undefined;

  const locator: ElementLocator = {
    selectedBounds: selectedBounds || { left: 0, top: 0, right: 0, bottom: 0 },
    elementPath: xpath || '',
    confidence,
    additionalInfo: {
      xpath,
      resourceId,
      text,
      contentDesc,
      className,
      bounds: boundsString,
    },
  };
  return locator;
}

// 从来源信息创建 xmlSnapshot（更偏底层的通用方法）
export function buildXmlSnapshotFromSources(
  xmlContent: string,
  deviceInfo?: Partial<XmlSnapshot['deviceInfo']>,
  pageInfo?: Partial<XmlSnapshot['pageInfo']>
): XmlSnapshot {
  const di = {
    deviceId: deviceInfo?.deviceId || 'unknown',
    deviceName: deviceInfo?.deviceName || 'unknown',
    appPackage: deviceInfo?.appPackage || 'com.xingin.xhs',
    activityName: deviceInfo?.activityName || 'unknown',
  } as XmlSnapshot['deviceInfo'];

  const pi = {
    pageTitle: pageInfo?.pageTitle || '未知页面',
    pageType: pageInfo?.pageType || 'unknown',
    elementCount: pageInfo?.elementCount || 0,
    appVersion: pageInfo?.appVersion,
  } as XmlSnapshot['pageInfo'];

  return createXmlSnapshot(xmlContent, di, pi);
}

// 基于 element（含 xmlContent 或通过外层传入）构建 xmlSnapshot
export function buildXmlSnapshotFromElement(
  element: any,
  fallbacks?: {
    xmlContent?: string;
    deviceInfo?: Partial<XmlSnapshot['deviceInfo']>;
    pageInfo?: Partial<XmlSnapshot['pageInfo']>;
  }
): XmlSnapshot | undefined {
  const xmlContent: string | undefined = (element as any).xmlContent || fallbacks?.xmlContent;
  if (!xmlContent) return undefined;
  return buildXmlSnapshotFromSources(xmlContent, fallbacks?.deviceInfo, fallbacks?.pageInfo);
}

// 将旧格式参数迁移为自包含参数
export function migrateParamsToSelfContained(
  oldParams: any,
  context?: { xmlContent?: string; deviceInfo?: Partial<XmlSnapshot['deviceInfo']>; pageInfo?: Partial<XmlSnapshot['pageInfo']> }
): SelfContainedStepParameters {
  const p = { ...oldParams };
  const out: SelfContainedStepParameters = { ...p };

  // 如果已有 xmlSnapshot 则直接返回
  if (out.xmlSnapshot) return out;

  // 选择 XML 内容来源优先级：参数自带 xmlContent -> 外部 context
  const xmlContent = p.xmlContent || context?.xmlContent || '';
  if (xmlContent) {
    out.xmlSnapshot = buildXmlSnapshotFromSources(xmlContent, context?.deviceInfo || { deviceId: p.deviceId, deviceName: p.deviceName }, context?.pageInfo);
  }

  // 构建 elementLocator（基于现有指纹）
  const maybeLocator = buildElementLocatorFromElement(p);
  if (maybeLocator) out.elementLocator = maybeLocator;

  return out;
}
