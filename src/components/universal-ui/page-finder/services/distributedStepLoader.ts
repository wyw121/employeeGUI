import { message } from 'antd';
import UniversalUIAPI from '../../../../api/universalUIAPI';
import { buildSnapshotIfPossible } from '../../../../modules/self-contained/XmlSnapshotAutoBuilder';
import { parseXML } from '../../xml-parser';
import { PageFinderLoadContext } from './loadContext';
import { DistributedInspectorService } from '../../../../modules/distributed/DistributedInspectorService';

export interface DistributedStepLoaderDeps {
  findDistributedStepById: (stepId: string) => Promise<any>;
  distributedInspectorService?: DistributedInspectorService; // 允许注入，便于测试
}

export async function handleLoadFromDistributedStep(
  stepId: string,
  ctx: PageFinderLoadContext,
  deps: DistributedStepLoaderDeps
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
    console.log('🔄 尝试从分布式脚本加载XML快照:', stepId);
    const distributedStep = await deps.findDistributedStepById(stepId);
    if (!distributedStep || !distributedStep.xmlSnapshot) {
      console.warn('⚠️ 未找到分布式步骤或XML快照:', stepId);
      return false;
    }

    const distributedService = deps.distributedInspectorService || new DistributedInspectorService();
    const tempSession = await distributedService.openStepXmlContext(distributedStep);
    if (!tempSession || !tempSession.xmlContent) {
      console.warn('⚠️ 创建临时会话失败:', stepId);
      return false;
    }

    const xmlSnapshot = distributedStep.xmlSnapshot;
    console.log('✅ 从分布式脚本加载XML快照成功:', {
      stepId,
      hash: xmlSnapshot.xmlHash,
      deviceInfo: xmlSnapshot.deviceInfo,
      pageInfo: xmlSnapshot.pageInfo,
      timestamp: new Date(xmlSnapshot.timestamp).toLocaleString()
    });

    setCurrentXmlContent(xmlSnapshot.xmlContent);
    setCurrentXmlCacheId(`distributed_${stepId}_${xmlSnapshot.xmlHash}`);

    if (onXmlContentUpdated) {
      const deviceInfo = xmlSnapshot.deviceInfo || undefined;
      const pageInfo = { ...xmlSnapshot.pageInfo } as any;
      if (!pageInfo.appName) pageInfo.appName = '小红书';
      onXmlContentUpdated(xmlSnapshot.xmlContent, deviceInfo, pageInfo);
      const snap = buildSnapshotIfPossible(
        xmlSnapshot.xmlContent,
        xmlSnapshot.deviceInfo,
        xmlSnapshot.pageInfo as any
      );
      if (snap) emitSnapshotUpdated(snap);
    }

    if (xmlSnapshot.deviceInfo?.deviceId) {
      setSelectedDevice(xmlSnapshot.deviceInfo.deviceId);
    }

    const elements = await UniversalUIAPI.extractPageElements(xmlSnapshot.xmlContent);
    setUIElements(elements);

    try {
      const parseResult = parseXML(xmlSnapshot.xmlContent);
      setElements(parseResult.elements);
      setCategories(parseResult.categories);
      console.log('✅ 分布式XML快照解析完成:', {
        elementsCount: parseResult.elements.length,
        categoriesCount: parseResult.categories.length
      });
    } catch (parseError) {
      console.error('❌ 分布式XML快照解析失败:', parseError);
    }

    setViewMode('grid');
    message.success(`已从分布式脚本加载XML快照 (${elements.length} 个元素)`);
    return true;
  } catch (error) {
    console.error('❌ 从分布式脚本加载XML快照失败:', error);
    message.error('从分布式脚本加载XML快照失败');
    return false;
  }
}
