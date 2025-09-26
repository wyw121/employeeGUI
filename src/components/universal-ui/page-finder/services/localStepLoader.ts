import { message } from 'antd';
import UniversalUIAPI from '../../../../api/universalUIAPI';
import { buildSnapshotIfPossible } from '../../../../modules/self-contained/XmlSnapshotAutoBuilder';
import { parseXML } from '../../xml-parser';
import { PageFinderLoadContext } from './loadContext';
import { LocalStepRepository } from '../../../../infrastructure/inspector/LocalStepRepository';

export async function handleLoadFromLocalStep(
  stepId: string,
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
    const repo = new LocalStepRepository();
    const step = await repo.get(stepId);
    if (!step || !step.xmlSnapshot) {
      message.warning('未找到步骤的 XML 快照');
      return false;
    }

    const xml = step.xmlSnapshot;
    setCurrentXmlContent(xml);
    const xmlCacheId = `step_${stepId}`;
    setCurrentXmlCacheId(xmlCacheId);

    if (onXmlContentUpdated) {
      onXmlContentUpdated(xml, undefined, {
        appName: '小红书',
        pageTitle: '步骤快照'
      } as any);
      const snap = buildSnapshotIfPossible(
        xml,
        undefined,
        { pageTitle: '步骤快照' } as any
      );
      if (snap) emitSnapshotUpdated(snap);
    }

    const elements = await UniversalUIAPI.extractPageElements(xml);
    setUIElements(elements);
    if (xml) {
      try {
        const parseResult = parseXML(xml);
        setElements(parseResult.elements);
        setCategories(parseResult.categories);
        console.log('✅ 从步骤快照解析完成', { count: parseResult.elements.length });
      } catch (parseError) {
        console.error('❌ 步骤快照解析失败:', parseError);
      }
    }
    setViewMode('grid');
    message.success('已从步骤快照载入 XML');
    return true;
  } catch (e) {
    console.error('载入步骤快照失败', e);
    return false;
  }
}
