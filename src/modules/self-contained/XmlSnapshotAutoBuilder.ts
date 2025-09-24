import type { XmlSnapshot } from '../../types/selfContainedScript';
import { createXmlSnapshot } from '../../types/selfContainedScript';

/**
 * 根据当前 XML 上下文尽最大可能构建 XmlSnapshot（带安全兜底）。
 * - 缺失 deviceInfo/pageInfo 时填充最小可用信息；
 * - xmlContent 为空则返回 undefined。
 */
export function buildSnapshotIfPossible(
  xmlContent?: string,
  deviceInfo?: Partial<XmlSnapshot['deviceInfo']>,
  pageInfo?: Partial<XmlSnapshot['pageInfo']>
): XmlSnapshot | undefined {
  if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
    return undefined;
  }

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
    appName: (pageInfo as any)?.appName || '小红书',
    appVersion: pageInfo?.appVersion,
  } as XmlSnapshot['pageInfo'];

  return createXmlSnapshot(xmlContent, di, pi);
}
