import type { DistributedStep } from "../../../domain/distributed-script";
import type { NodeLocator } from "../../../domain/inspector/entities/NodeLocator";
import { generateXmlHash, XmlSnapshot } from "../../../types/selfContainedScript";
import type { ExtendedSmartScriptStep as LoopScriptStep } from "../../../types/loopScript";

/**
 * 规范化步骤：为缺省字段提供安全的默认值，保持页面期望的形状
 */
export const normalizeStep = (
  step: Partial<LoopScriptStep>,
  order: number
): LoopScriptStep => ({
  id: step.id ?? `step_${Date.now()}`,
  step_type: step.step_type ?? "tap",
  name: step.name ?? `步骤_${order}`,
  description: step.description ?? "",
  parameters: step.parameters ?? {},
  enabled: step.enabled ?? true,
  order,
  find_condition: step.find_condition ?? null,
  verification: step.verification ?? null,
  retry_config: step.retry_config ?? null,
  fallback_actions: step.fallback_actions ?? [],
  pre_conditions: step.pre_conditions ?? [],
  post_conditions: step.post_conditions ?? [],
});

/**
 * 将页面步骤转换为分布式步骤（用于 DistributedStepLookupService 注册与跨模块联动）
 */
export const buildDistributedSteps = (steps: LoopScriptStep[]): DistributedStep[] =>
  steps
    .map((step) => {
      const params: Record<string, any> = step.parameters || {};
      const embedded: XmlSnapshot | undefined = params.xmlSnapshot;
      const xmlContent: string | undefined = embedded?.xmlContent || params.xmlContent;

      if (!xmlContent) {
        return null;
      }

      const xmlSnapshot = {
        xmlContent,
        xmlHash: embedded?.xmlHash || generateXmlHash(xmlContent),
        timestamp: embedded?.timestamp || Date.now(),
        deviceInfo:
          embedded?.deviceInfo ||
          params.deviceInfo ||
          (params.deviceId
            ? {
                deviceId: params.deviceId,
                deviceName: params.deviceName || "Unknown Device",
              }
            : undefined),
        pageInfo: embedded?.pageInfo || params.pageInfo,
      };

      const locator: NodeLocator =
        params.locator ||
        ({
          absoluteXPath: params.xpath || "",
          attributes: {
            resourceId: params.resource_id,
            text: params.text,
            contentDesc: params.content_desc,
            className: params.class_name,
          },
        } as NodeLocator);

      return {
        id: step.id,
        name: step.name || `步骤_${step.id}`,
        actionType: step.step_type || "click",
        params,
        locator,
        createdAt: Date.now(),
        xmlSnapshot,
        description: step.description,
        order: step.order,
      } as DistributedStep;
    })
    .filter((value): value is DistributedStep => Boolean(value));

export default {
  normalizeStep,
  buildDistributedSteps,
};
