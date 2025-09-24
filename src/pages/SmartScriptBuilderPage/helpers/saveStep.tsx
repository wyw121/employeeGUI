import type { FormInstance } from "antd";
import { Modal, message } from "antd";
import XmlCacheManager from "../../../services/XmlCacheManager";
import { XmlDataValidator } from "../../../modules/distributed-script-quality/XmlDataValidator";
import {
  XmlSnapshot,
  ElementLocator,
  SelfContainedStepParameters,
  createXmlSnapshot,
  validateXmlSnapshot,
  migrateToSelfContainedParameters,
} from "../../../types/selfContainedScript";
import { parseBoundsString, rectToBoundsString } from "../../../components/universal-ui/utils/bounds";
import buildXmlSnapshotFromContext from "./xmlSnapshotHelper";
import React from "react";
import { SmartActionType } from "../../../types/smartComponents";

export interface ExtendedSmartScriptStep {
  id: string;
  step_type: string;
  name?: string;
  description?: string;
  parameters?: Record<string, any> & {
    xmlSnapshot?: XmlSnapshot;
    elementLocator?: ElementLocator;
  };
  enabled?: boolean;
  order?: number;
  [key: string]: any;
}

type DeviceLite = { id: string; name?: string; status?: unknown };

type SnapshotFixMode = { enabled: boolean; forStepId?: string };

type Ctx = {
  form: FormInstance;
  getSteps: () => ExtendedSmartScriptStep[];
  setSteps: (updater: (prev: ExtendedSmartScriptStep[]) => ExtendedSmartScriptStep[]) => void;
  getEditingStep: () => ExtendedSmartScriptStep | null;
  setEditingStep: (s: ExtendedSmartScriptStep | null) => void;
  setIsModalVisible: (v: boolean) => void;
  getCurrentDeviceId: () => string;
  getDevices: () => DeviceLite[];
  getXmlContext: () => {
    currentXmlContent: string;
    currentDeviceInfo: Partial<XmlSnapshot["deviceInfo"]>;
    currentPageInfo: Partial<XmlSnapshot["pageInfo"]>;
  };
  getAllowSaveWithoutXmlOnce: () => boolean;
  setAllowSaveWithoutXmlOnce: (v: boolean) => void;
  getSnapshotFixMode: () => SnapshotFixMode;
  setSnapshotFixMode: (m: SnapshotFixMode) => void;
  getPendingAutoResave: () => boolean;
  setPendingAutoResave: (v: boolean) => void;
  setShowPageAnalyzer: (v: boolean) => void;
  setShowContactWorkflowSelector?: (v: boolean) => void;
};

export function createHandleSaveStep(ctx: Ctx) {
  return async function handleSaveStep() {
    const form = ctx.form;
    const steps = ctx.getSteps();
    const editingStep = ctx.getEditingStep();
    const { currentXmlContent, currentDeviceInfo, currentPageInfo } = ctx.getXmlContext();

    try {
      const values = await form.validateFields();
      console.log("🔍 表单验证后的所有值:", values);
      const { step_type, name, description, ...parameters } = values;
      console.log("🔍 解构后的 parameters:", parameters);

      // 特殊处理：通讯录导入工作流，直接打开工作流配置器并关闭当前对话框
      if (step_type === SmartActionType.CONTACT_IMPORT_WORKFLOW) {
        ctx.setShowContactWorkflowSelector?.(true);
        ctx.setIsModalVisible(false);
        return;
      }

      const stepId = editingStep?.id || `step_${Date.now()}`;

      // ✅ 保存前的XML质量校验（阻断式）
      if (parameters) {
        // 优先使用自包含 xmlSnapshot；否则从当前上下文或旧字段构造最小快照
        const existing: any = (parameters as any).xmlSnapshot;
        let effectiveXmlContent: string =
          existing?.xmlContent || (parameters as any).xmlContent || currentXmlContent || "";
        let effectiveDeviceInfo: any =
          existing?.deviceInfo ||
          (parameters as any).deviceInfo ||
          ((parameters as any).deviceId || (parameters as any).deviceName
            ? { deviceId: (parameters as any).deviceId, deviceName: (parameters as any).deviceName }
            : undefined) ||
          (currentDeviceInfo?.deviceId || currentDeviceInfo?.deviceName
            ? { deviceId: currentDeviceInfo.deviceId as string, deviceName: currentDeviceInfo.deviceName as string }
            : undefined);
        // 校验器仅要求存在 appName 字段，这里补齐最小信息
        let effectivePageInfo: any =
          existing?.pageInfo ||
          (parameters as any).pageInfo ||
          ({ appName: (currentPageInfo as any)?.appName || "小红书", pageTitle: currentPageInfo?.pageTitle || "未知页面" } as any);
        const effectiveTimestamp = existing?.timestamp || (parameters as any).xmlTimestamp || Date.now();

        // 兜底：如仍无 XML，则根据 xmlCacheId 从缓存加载一次
        let xmlSource: "existing-snapshot" | "form-xmlContent" | "current-context" | "xml-cache" | "empty" = "empty";
        if (existing?.xmlContent) xmlSource = "existing-snapshot";
        else if ((parameters as any).xmlContent) xmlSource = "form-xmlContent";
        else if (currentXmlContent) xmlSource = "current-context";
        if (!effectiveXmlContent && (parameters as any).xmlCacheId) {
          try {
            const cm = XmlCacheManager.getInstance();
            const ce = cm.getCachedXml((parameters as any).xmlCacheId);
            if (ce?.xmlContent) {
              effectiveXmlContent = ce.xmlContent;
              effectiveDeviceInfo = effectiveDeviceInfo || {
                deviceId: ce.deviceId || "unknown",
                deviceName: ce.deviceName || "Unknown Device",
              };
              effectivePageInfo = effectivePageInfo || {
                appName: ce.pageInfo?.appPackage || "小红书",
                pageTitle: ce.pageInfo?.pageTitle || "未知页面",
              };
              xmlSource = "xml-cache";
            }
          } catch (e) {
            console.warn("XML缓存兜底加载失败:", e);
          }
        }

        // 结构化日志便于排查
        console.log("🧩 XML预校验上下文:", {
          stepId,
          xmlSource,
          hasExistingSnapshot: !!existing,
          hasXmlCacheId: !!(parameters as any).xmlCacheId,
          effectiveXmlLength: effectiveXmlContent?.length || 0,
          hasDeviceInfo: !!effectiveDeviceInfo,
          hasPageInfo: !!effectivePageInfo,
          timestampProvided: !!effectiveTimestamp,
        });

        const xmlSnapshot = {
          xmlContent: effectiveXmlContent,
          deviceInfo: effectiveDeviceInfo,
          pageInfo: effectivePageInfo,
          timestamp: effectiveTimestamp,
        };

        const validation = XmlDataValidator.validateXmlSnapshot(xmlSnapshot as any);
        console.log("🧪 XML快照校验结果:", validation);

        if (!validation.isValid && validation.severity === "critical") {
          const missingXml = !effectiveXmlContent || effectiveXmlContent.length < 100;
          const tips = validation.issues
            .map((i) => `• [${i.severity}] ${i.message}${i.suggestion ? `（建议：${i.suggestion}）` : ""}`)
            .join("\n");

          const triggerAutoFix = () => {
            console.log("🛠️ 触发自动修复：打开快照采集器", { stepId, xmlSource, missingXml });
            ctx.setSnapshotFixMode({ enabled: true, forStepId: stepId });
            ctx.setPendingAutoResave(true);
            ctx.setShowPageAnalyzer(true);
            message.info("正在采集页面快照以修复当前步骤，请稍候…");
          };

          if (missingXml) {
            const hasLocatorOrMatching = Boolean(
              (parameters as any)?.elementLocator ||
                (parameters as any)?.matching ||
                (parameters as any)?.bounds ||
                (parameters as any)?.xpath
            );
            if (ctx.getAllowSaveWithoutXmlOnce() && hasLocatorOrMatching) {
              console.warn("⚠️ 缺少XML，但已启用一次性放行保存；建议随后通过‘页面分析’补采快照");
              message.warning("本次未包含页面快照，建议稍后在分析器中采集并回填");
              ctx.setAllowSaveWithoutXmlOnce(false);
              // 继续执行保存流程
            } else {
              triggerAutoFix();
              return; // 阻断保存
            }
          } else {
            Modal.confirm({
              title: "无法保存：XML 快照无效",
              width: 640,
              content: (
                <div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginBottom: 8 }}>{tips}</pre>
                </div>
              ),
              okText: "一键修复并重试保存",
              cancelText: "返回修改",
              onOk: triggerAutoFix,
            });
            return; // 阻断保存
          }
        }

        if (!validation.isValid && (validation.severity === "major" || validation.severity === "minor")) {
          const warnTips = validation.issues.map((i) => `• [${i.severity}] ${i.message}`).join("\n");
          message.warning({
            content: (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>XML 快照存在问题，建议修复后再保存</div>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{warnTips}</pre>
              </div>
            ),
            duration: 3,
          });
        }
      }

      // 写入双格式 bounds（若存在 elementLocator）
      if ((parameters as any)?.elementLocator?.selectedBounds) {
        const sb = (parameters as any).elementLocator.selectedBounds as {
          left: number;
          top: number;
          right: number;
          bottom: number;
        };
        (parameters as any).boundsRect = sb;
        (parameters as any).bounds = `[${sb.left},${sb.top}][${sb.right},${sb.bottom}]`;
      }

      const newStep: ExtendedSmartScriptStep = {
        id: stepId,
        step_type,
        name,
        description,
        parameters,
        enabled: true,
        order: editingStep?.order || steps.length + 1,
        find_condition: null,
        verification: null,
        retry_config: null,
        fallback_actions: [],
        pre_conditions: [],
        post_conditions: [],
      };

      // 若参数缺少 xmlSnapshot，但存在 xmlCacheId，则尝试从缓存回填为 xmlSnapshot（不再写入旧字段）
      if (!newStep.parameters?.xmlSnapshot && newStep.parameters?.xmlCacheId) {
        try {
          const xmlCacheManager = XmlCacheManager.getInstance();
          const cacheEntry = xmlCacheManager.getCachedXml(newStep.parameters.xmlCacheId);
          if (cacheEntry?.xmlContent) {
            newStep.parameters = {
              ...newStep.parameters,
              xmlSnapshot: createXmlSnapshot(
                cacheEntry.xmlContent,
                {
                  deviceId: cacheEntry.deviceId || "unknown",
                  deviceName: cacheEntry.deviceName || "unknown",
                  appPackage: cacheEntry.pageInfo?.appPackage || "com.xingin.xhs",
                  activityName: cacheEntry.pageInfo?.activityName || "unknown",
                },
                {
                  pageTitle: cacheEntry.pageInfo?.pageTitle || "未知页面",
                  pageType: cacheEntry.pageInfo?.pageType || "unknown",
                  elementCount: cacheEntry.pageInfo?.elementCount || 0,
                }
              ),
            } as any;
            console.log("🧩 已在保存前回填步骤XML快照(xmlSnapshot):", {
              stepId,
              cacheId: newStep.parameters?.xmlCacheId,
              bytes: cacheEntry.xmlContent.length,
            });
          }
        } catch (e) {
          console.warn("保存前回填XML快照失败（可忽略）:", e);
        }
      }

      // 自包含脚本：优先复用已存在的 xmlSnapshot，否则创建完整的XML快照
      if (newStep.parameters) {
        console.log("📸 创建自包含XML快照...");

        try {
          let xmlSnapshot: XmlSnapshot | undefined = (newStep.parameters as any).xmlSnapshot as XmlSnapshot | undefined;

          if (!xmlSnapshot) {
            const xmlContent = (newStep.parameters as any).xmlContent || currentXmlContent;
            if (xmlContent) {
              const pAny: any = newStep.parameters;
              const mergedDeviceInfo = {
                ...currentDeviceInfo,
                deviceId: pAny.deviceId || currentDeviceInfo.deviceId,
                deviceName: pAny.deviceName || currentDeviceInfo.deviceName,
              };
              const fallbackDeviceId = ctx.getCurrentDeviceId();
              const fallbackDeviceName = ctx.getDevices().find((d) => d.id === fallbackDeviceId)?.name || "unknown";

              xmlSnapshot = buildXmlSnapshotFromContext({
                currentXmlContent: xmlContent,
                currentDeviceInfo: mergedDeviceInfo,
                currentPageInfo,
                fallbackDeviceId,
                fallbackDeviceName,
              }) as XmlSnapshot | undefined;
            }
          }

          if (xmlSnapshot) {
            const p: any = newStep.parameters;
            const elementLocator: ElementLocator | undefined = p.bounds
              ? {
                  selectedBounds:
                    typeof p.bounds === "string"
                      ? parseBoundsString(p.bounds) || { left: 0, top: 0, right: 0, bottom: 0 }
                      : p.bounds,
                  elementPath: p.xpath || p.element_path || "",
                  confidence: p.smartAnalysis?.confidence || 0.8,
                  additionalInfo: {
                    xpath: p.xpath,
                    resourceId: p.resource_id,
                    text: p.text,
                    contentDesc: p.content_desc,
                    className: p.class_name,
                    bounds:
                      typeof p.bounds === "string"
                        ? p.bounds
                        : p.bounds
                        ? rectToBoundsString(p.bounds)
                        : undefined,
                  },
                }
              : (p.elementLocator as ElementLocator | undefined);

            const selfContainedParams = migrateToSelfContainedParameters(
              newStep.parameters,
              xmlSnapshot.xmlContent,
              xmlSnapshot.deviceInfo,
              xmlSnapshot.pageInfo
            ) as SelfContainedStepParameters as any;

            selfContainedParams.xmlSnapshot = xmlSnapshot;
            selfContainedParams.elementLocator = elementLocator;

            newStep.parameters = selfContainedParams;

            console.log("✅ 自包含XML快照创建/复用成功:", {
              stepId,
              xmlHash: xmlSnapshot.xmlHash,
              xmlSize: xmlSnapshot.xmlContent.length,
              deviceInfo: xmlSnapshot.deviceInfo,
              pageInfo: xmlSnapshot.pageInfo,
              hasElementLocator: !!elementLocator,
            });

            if (!validateXmlSnapshot(xmlSnapshot)) {
              console.warn("⚠️ XML快照完整性验证失败，但步骤仍会保存");
              message.warning("XML快照可能不完整，建议重新分析页面");
            }
          } else {
            console.warn("⚠️ 无可用XML内容创建/复用快照");
          }
        } catch (error) {
          console.error("创建自包含XML快照失败:", error);
          message.warning("创建XML快照失败，步骤将以传统模式保存");
        }
      }

      // 建立步骤与XML源的关联
      if ((parameters as any).xmlCacheId && (parameters as any).xmlCacheId !== "unknown") {
        const xmlCacheManager = XmlCacheManager.getInstance();
        xmlCacheManager.linkStepToXml(stepId, (parameters as any).xmlCacheId, {
          elementPath: (parameters as any).element_path,
          selectionContext: {
            selectedBounds: (parameters as any).bounds,
            searchCriteria: (parameters as any).search_criteria || (parameters as any).target_value || "",
            confidence: (parameters as any).confidence || 0.8,
          },
        });

        console.log(`🔗 步骤已关联XML源:`, {
          stepId,
          xmlCacheId: (parameters as any).xmlCacheId,
          hasElementPath: !!(parameters as any).element_path,
        });
      }

      if (editingStep) {
        ctx.setSteps((prev) => prev.map((s) => (s.id === editingStep.id ? newStep : s)));
        message.success("步骤更新成功");
      } else {
        ctx.setSteps((prev) => [...prev, newStep]);
        message.success(`步骤添加成功${(parameters as any).xmlCacheId ? "（已关联XML源）" : ""}`);
      }

      if (ctx.getAllowSaveWithoutXmlOnce()) ctx.setAllowSaveWithoutXmlOnce(false);

      ctx.setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("保存步骤失败:", error);
    }
  };
}
