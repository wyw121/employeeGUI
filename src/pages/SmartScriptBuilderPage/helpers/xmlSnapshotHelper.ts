import XmlCacheManager from '../../../services/XmlCacheManager';
import { createXmlSnapshot, type XmlSnapshot } from '../../../types/selfContainedScript';

type DeviceInfoLike = Partial<XmlSnapshot['deviceInfo']>;
type PageInfoLike = Partial<XmlSnapshot['pageInfo']>;

export interface BuildSnapshotOptions {
  currentXmlContent?: string;
  currentDeviceInfo?: DeviceInfoLike;
  currentPageInfo?: PageInfoLike;
  element?: any; // element may carry xmlContent or xmlCacheId
  fallbackDeviceId?: string;
  fallbackDeviceName?: string;
}

/**
 * 根据当前上下文/元素/缓存构建 XmlSnapshot：
 * 优先级：currentXmlContent → element.xmlContent → XmlCacheManager(xmlCacheId)
 * 设备与页面信息优先使用对应来源，否则回退到 current* 再到默认值。
 */
export function buildXmlSnapshotFromContext(opts: BuildSnapshotOptions): XmlSnapshot | undefined {
  const {
    currentXmlContent,
    currentDeviceInfo = {},
    currentPageInfo = {},
    element,
    fallbackDeviceId,
    fallbackDeviceName,
  } = opts || {};

  let xmlForSnapshot: string | undefined = currentXmlContent;
  let deviceInfoForSnapshot: DeviceInfoLike = { ...currentDeviceInfo };
  let pageInfoForSnapshot: PageInfoLike = { ...currentPageInfo };

  // 兜底1：元素对象自身携带 xmlContent
  if (!xmlForSnapshot && element?.xmlContent) {
    xmlForSnapshot = element.xmlContent as string;
  }

  // 兜底2：元素携带 xmlCacheId，从缓存读取
  if (!xmlForSnapshot && element?.xmlCacheId) {
    try {
      const cm = XmlCacheManager.getInstance();
      const ce = cm.getCachedXml(element.xmlCacheId);
      if (ce?.xmlContent) {
        xmlForSnapshot = ce.xmlContent;
        deviceInfoForSnapshot = {
          deviceId: ce.deviceId,
          deviceName: ce.deviceName,
          appPackage: ce.pageInfo?.appPackage || currentDeviceInfo.appPackage,
          activityName: ce.pageInfo?.activityName || currentDeviceInfo.activityName,
        };
        pageInfoForSnapshot = {
          pageTitle: ce.pageInfo?.pageTitle || currentPageInfo.pageTitle,
          pageType: ce.pageInfo?.pageType || currentPageInfo.pageType,
          elementCount: ce.pageInfo?.elementCount ?? currentPageInfo.elementCount,
          appVersion: (ce.pageInfo as any)?.appVersion || (currentPageInfo as any).appVersion,
        };
      }
    } catch (e) {
      console.warn('通过 xmlCacheId 回填快照失败:', e);
    }
  }

  if (!xmlForSnapshot) return undefined;

  // 设备与页面信息最终回退
  const deviceId = deviceInfoForSnapshot.deviceId || fallbackDeviceId || 'unknown';
  const deviceName = deviceInfoForSnapshot.deviceName || fallbackDeviceName || 'unknown';
  const appPackage = deviceInfoForSnapshot.appPackage || 'com.xingin.xhs';
  const activityName = deviceInfoForSnapshot.activityName || 'unknown';

  const pageTitle = pageInfoForSnapshot.pageTitle || '小红书页面';
  const pageType = pageInfoForSnapshot.pageType || 'unknown';
  const elementCount = pageInfoForSnapshot.elementCount || 0;
  const appVersion = pageInfoForSnapshot.appVersion;

  return createXmlSnapshot(
    xmlForSnapshot,
    { deviceId, deviceName, appPackage, activityName },
    { pageTitle, pageType, elementCount, appVersion }
  );
}

export default buildXmlSnapshotFromContext;
