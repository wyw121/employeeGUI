import { message } from 'antd';
import UniversalUIAPI from '../../../../api/universalUIAPI';
import { buildSnapshotIfPossible } from '../../../../modules/self-contained/XmlSnapshotAutoBuilder';
import { parseXML } from '../../xml-parser';
import { PageFinderLoadContext } from './loadContext';
import XmlCacheManager from '../../../../services/XmlCacheManager';

export async function handleLoadFromStepXmlCache(
  xmlCacheId: string,
  ctx: PageFinderLoadContext
): Promise<boolean> {
  const {
    setCurrentXmlContent,
    setCurrentXmlCacheId,
    setSelectedDevice,
    setUIElements,
    setElements,
    setCategories,
    setViewMode,
    onXmlContentUpdated,
    emitSnapshotUpdated
  } = ctx;

  try {
    const xmlCacheManager = XmlCacheManager.getInstance();
    const cacheEntry = xmlCacheManager.getCachedXml(xmlCacheId);
    if (!cacheEntry) {
      console.warn('⚠️ 未找到XML缓存条目:', xmlCacheId);
      return false;
    }

    console.log('✅ 加载步骤关联的XML数据:', {
      xmlCacheId,
      deviceId: cacheEntry.deviceId,
      elementCount: cacheEntry.pageInfo.elementCount,
      timestamp: new Date(cacheEntry.timestamp).toLocaleString()
    });

    setCurrentXmlContent(cacheEntry.xmlContent);
    setCurrentXmlCacheId(xmlCacheId);
    if (onXmlContentUpdated) {
      const deviceInfo = {
        deviceId: cacheEntry.deviceId,
        deviceName: cacheEntry.deviceName,
        appPackage: cacheEntry.pageInfo?.appPackage || 'com.xingin.xhs',
        activityName: cacheEntry.pageInfo?.activityName || 'unknown'
      };
      const pageInfo = { ...cacheEntry.pageInfo } as any;
      if (!pageInfo.appName) pageInfo.appName = '小红书';
      onXmlContentUpdated(cacheEntry.xmlContent, deviceInfo, pageInfo);
      const snap = buildSnapshotIfPossible(
        cacheEntry.xmlContent,
        deviceInfo,
        pageInfo
      );
      if (snap) emitSnapshotUpdated(snap);
    }

    setSelectedDevice(cacheEntry.deviceId);
    const elements = await UniversalUIAPI.extractPageElements(cacheEntry.xmlContent);
    setUIElements(elements);

    try {
      const parseResult = parseXML(cacheEntry.xmlContent);
      setElements(parseResult.elements);
      setCategories(parseResult.categories);
      console.log('✅ 步骤XML解析完成:', {
        elementsCount: parseResult.elements.length,
        categoriesCount: parseResult.categories.length
      });
    } catch (parseError) {
      console.error('❌ 步骤XML解析失败:', parseError);
    }

    setViewMode('grid');
    message.success(`已加载步骤关联的页面数据 (${elements.length} 个元素)`);
    return true;
  } catch (error) {
    console.error('❌ 加载步骤XML数据失败:', error);
    message.error('加载步骤关联的页面数据失败');
    return false;
  }
}
