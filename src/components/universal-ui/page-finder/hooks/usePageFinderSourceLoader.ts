import { useEffect, useCallback } from 'react';
import type { PageFinderLoadContext } from '../services/loadContext';
import { handleLoadFromDirectXmlContent } from '../services/directXmlLoader';
import { handleLoadFromDistributedStep } from '../services/distributedStepLoader';
import { handleLoadFromStepXmlCache } from '../services/stepXmlCacheLoader';
import { handleLoadFromLocalStep } from '../services/localStepLoader';
import { distributedStepLookupService } from '../../../../application/services/DistributedStepLookupService';

export interface LoadFromStepXmlArg {
  stepId: string;
  xmlCacheId?: string;
  xmlContent?: string;
  deviceId?: string;
  deviceName?: string;
}

export interface UsePageFinderSourceLoaderParams {
  visible: boolean;
  loadFromStepXml?: LoadFromStepXmlArg;
  ctx: PageFinderLoadContext;
}

export default function usePageFinderSourceLoader(params: UsePageFinderSourceLoaderParams) {
  const { visible, loadFromStepXml, ctx } = params;

  const findDistributedStepById = useCallback(async (stepId: string) => {
    return await distributedStepLookupService.findDistributedStepById(stepId);
  }, []);

  const tryLoad = useCallback(async () => {
    if (!visible || !loadFromStepXml?.stepId) return;

    const currentXmlLength = (ctx.currentXmlContent || '').length;
    const targetXmlLength = loadFromStepXml.xmlContent?.length || 0;
    if (currentXmlLength > 0 && currentXmlLength === targetXmlLength) {
      console.log('⏸️ 跳过重复的XML加载:', {
        stepId: loadFromStepXml.stepId,
        currentLength: currentXmlLength,
        targetLength: targetXmlLength
      });
      return;
    }

    console.log('🔄 从步骤XML源加载数据:', loadFromStepXml);
    let ok = false;

    if (loadFromStepXml.xmlContent) {
      ok = await handleLoadFromDirectXmlContent({
        stepId: loadFromStepXml.stepId,
        xmlContent: loadFromStepXml.xmlContent,
        deviceId: loadFromStepXml.deviceId,
        deviceName: loadFromStepXml.deviceName,
      }, ctx);
    }

    if (!ok) {
      ok = await handleLoadFromDistributedStep(loadFromStepXml.stepId, ctx, { findDistributedStepById });
    }

    if (!ok && loadFromStepXml.xmlCacheId) {
      ok = await handleLoadFromStepXmlCache(loadFromStepXml.xmlCacheId, ctx);
    }

    if (!ok) {
      await handleLoadFromLocalStep(loadFromStepXml.stepId, ctx);
    }
  }, [visible, loadFromStepXml?.stepId, loadFromStepXml?.xmlContent?.length, loadFromStepXml?.xmlCacheId, ctx, findDistributedStepById]);

  useEffect(() => { void tryLoad(); }, [tryLoad]);
}
