import React, { useCallback, useState } from 'react';
import { Form, Modal, message } from 'antd';
import { SmartActionType } from '../../../types/smartComponents';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';
import XmlCacheManager from '../../../services/XmlCacheManager';
import { XmlDataValidator } from '../../../modules/distributed-script-quality/XmlDataValidator';
import {
  XmlSnapshot,
  createXmlSnapshot,
  validateXmlSnapshot,
  migrateToSelfContainedParameters,
  ElementLocator,
} from '../../../types/selfContainedScript';
import { parseBoundsString, rectToBoundsString } from '../../../components/universal-ui/utils/bounds';

export interface SnapshotFixMode {
  enabled: boolean;
  forStepId?: string;
}

export interface UseStepFormDeps {
  steps: ExtendedSmartScriptStep[];
  setSteps: React.Dispatch<React.SetStateAction<ExtendedSmartScriptStep[]>>;
  // 设备/上下文
  devices: Array<{ id: string; name?: string } | any>;
  currentDeviceId: string;
  currentXmlContent: string;
  currentDeviceInfo: Partial<XmlSnapshot['deviceInfo']>;
  currentPageInfo: Partial<XmlSnapshot['pageInfo']>;
  // 工作流/页面分析相关联动
  setShowContactWorkflowSelector: (v: boolean) => void;
  setSnapshotFixMode: React.Dispatch<React.SetStateAction<SnapshotFixMode>>;
  setPendingAutoResave: (v: boolean) => void;
  setIsQuickAnalyzer: (v: boolean) => void;
  setEditingStepForParams: (step: ExtendedSmartScriptStep | null) => void;
  setShowPageAnalyzer: (v: boolean) => void;
  // 放行一次无XML保存
  allowSaveWithoutXmlOnce: boolean;
  setAllowSaveWithoutXmlOnce: (v: boolean) => void;
}

export function useStepForm(deps: UseStepFormDeps) {
  const {
    steps,
    setSteps,
    devices,
    currentDeviceId,
    currentXmlContent,
    currentDeviceInfo,
    currentPageInfo,
    setShowContactWorkflowSelector,
    setSnapshotFixMode,
    setPendingAutoResave,
    setIsQuickAnalyzer,
    setEditingStepForParams,
    setShowPageAnalyzer,
    allowSaveWithoutXmlOnce,
    setAllowSaveWithoutXmlOnce,
  } = deps;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<ExtendedSmartScriptStep | null>(null);
  const [form] = Form.useForm();

  const showAddModal = useCallback(() => {
    setEditingStep(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const showEditModal = useCallback((step: ExtendedSmartScriptStep) => {
    setEditingStep(step);
    form.setFieldsValue({
      step_type: step.step_type,
      name: step.name,
      description: step.description,
      ...(step.parameters || {}),
    });
    setIsModalVisible(true);
  }, [form]);

  const hideModal = useCallback(() => setIsModalVisible(false), []);

  const handleSaveStep = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const { step_type, name, description, ...parameters } = values;

      // 特殊处理：通讯录导入工作流 - 打开选择器
      if (step_type === SmartActionType.CONTACT_IMPORT_WORKFLOW) {
        setShowContactWorkflowSelector(true);
        setIsModalVisible(false);
        return;
      }

      const stepId = editingStep?.id || `step_${Date.now()}`;

      // 保存前 XML 质量校验（阻断式）
      if (parameters) {
        const existing: any = (parameters as any).xmlSnapshot;
        let effectiveXmlContent: string =
          existing?.xmlContent || (parameters as any).xmlContent || currentXmlContent || '';
        let effectiveDeviceInfo: any =
          existing?.deviceInfo || (parameters as any).deviceInfo ||
          (((parameters as any).deviceId || (parameters as any).deviceName)
            ? { deviceId: (parameters as any).deviceId, deviceName: (parameters as any).deviceName }
            : undefined) ||
          ((currentDeviceInfo?.deviceId || currentDeviceInfo?.deviceName)
            ? { deviceId: currentDeviceInfo.deviceId as string, deviceName: currentDeviceInfo.deviceName as string }
            : undefined);
        let effectivePageInfo: any =
          existing?.pageInfo || (parameters as any).pageInfo || ({
            appName: (currentPageInfo as any)?.appName || '小红书',
            pageTitle: currentPageInfo?.pageTitle || '未知页面',
          } as any);
        const effectiveTimestamp = existing?.timestamp || (parameters as any).xmlTimestamp || Date.now();

        let xmlSource: 'existing-snapshot' | 'form-xmlContent' | 'current-context' | 'xml-cache' | 'empty' = 'empty';
        if (existing?.xmlContent) xmlSource = 'existing-snapshot';
        else if ((parameters as any).xmlContent) xmlSource = 'form-xmlContent';
        else if (currentXmlContent) xmlSource = 'current-context';
        if (!effectiveXmlContent && (parameters as any).xmlCacheId) {
          try {
            const cm = XmlCacheManager.getInstance();
            const ce = cm.getCachedXml((parameters as any).xmlCacheId);
            if (ce?.xmlContent) {
              effectiveXmlContent = ce.xmlContent;
              effectiveDeviceInfo = effectiveDeviceInfo || {
                deviceId: ce.deviceId || 'unknown',
                deviceName: ce.deviceName || 'Unknown Device',
              };
              effectivePageInfo = effectivePageInfo || {
                appName: ce.pageInfo?.appPackage || '小红书',
                pageTitle: ce.pageInfo?.pageTitle || '未知页面',
              };
              xmlSource = 'xml-cache';
            }
          } catch (e) {
            console.warn('XML缓存兜底加载失败:', e);
          }
        }

        const xmlSnapshot = { xmlContent: effectiveXmlContent, deviceInfo: effectiveDeviceInfo, pageInfo: effectivePageInfo, timestamp: effectiveTimestamp };
        const validation = XmlDataValidator.validateXmlSnapshot(xmlSnapshot as any);

        if (!validation.isValid && validation.severity === 'critical') {
          const missingXml = !effectiveXmlContent || effectiveXmlContent.length < 100;
          const triggerAutoFix = () => {
            setSnapshotFixMode({ enabled: true, forStepId: stepId });
            setPendingAutoResave(true);
            setIsQuickAnalyzer(false);
            setEditingStepForParams(null);
            setShowPageAnalyzer(true);
            message.info('正在采集页面快照以修复当前步骤，请稍候…');
          };

          if (missingXml) {
            const hasLocatorOrMatching = Boolean(
              (parameters as any)?.elementLocator ||
              (parameters as any)?.matching ||
              (parameters as any)?.bounds ||
              (parameters as any)?.xpath
            );
            if (allowSaveWithoutXmlOnce && hasLocatorOrMatching) {
              message.warning('本次未包含页面快照，建议稍后在分析器中采集并回填');
              setAllowSaveWithoutXmlOnce(false);
            } else {
              triggerAutoFix();
              return; // 阻断保存
            }
          } else {
            const tips = validation.issues.map((i) => `• [${i.severity}] ${i.message}${i.suggestion ? `（建议：${i.suggestion}）` : ''}`).join('\n');
            Modal.confirm({
              title: '无法保存：XML 快照无效',
              width: 640,
              content: (
                <div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginBottom: 8 }}>{tips}</pre>
                  <div className="ant-alert ant-alert-info ant-alert-no-icon">
                    可选择一键重新采集当前页面快照并自动回填（推荐）
                  </div>
                </div>
              ),
              okText: '一键修复并重试保存',
              cancelText: '返回修改',
              onOk: triggerAutoFix,
            });
            return; // 阻断保存
          }
        }

        if (!validation.isValid && (validation.severity === 'major' || validation.severity === 'minor')) {
          const warnTips = validation.issues.map((i) => `• [${i.severity}] ${i.message}`).join('\n');
          message.warning({
            content: (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>XML 快照存在问题，建议修复后再保存</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{warnTips}</pre>
              </div>
            ),
            duration: 3,
          });
        }
      }

      // 写入双格式 bounds（若存在 elementLocator）
      if ((parameters as any)?.elementLocator?.selectedBounds) {
        const sb = (parameters as any).elementLocator.selectedBounds as { left: number; top: number; right: number; bottom: number };
        (parameters as any).boundsRect = sb;
        (parameters as any).bounds = `[${sb.left},${sb.top}][${sb.right},${sb.bottom}]`;
      }

      const newStep: ExtendedSmartScriptStep = {
        id: editingStep?.id || `step_${Date.now()}`,
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

      // 若参数缺少 xmlSnapshot，但存在 xmlCacheId，则尝试从缓存回填
      if (!newStep.parameters?.xmlSnapshot && (newStep.parameters as any)?.xmlCacheId) {
        try {
          const xmlCacheManager = XmlCacheManager.getInstance();
          const cacheEntry = xmlCacheManager.getCachedXml((newStep.parameters as any).xmlCacheId);
          if (cacheEntry?.xmlContent) {
            newStep.parameters = {
              ...newStep.parameters,
              xmlSnapshot: createXmlSnapshot(
                cacheEntry.xmlContent,
                {
                  deviceId: cacheEntry.deviceId || 'unknown',
                  deviceName: cacheEntry.deviceName || 'unknown',
                  appPackage: cacheEntry.pageInfo?.appPackage || 'com.xingin.xhs',
                  activityName: cacheEntry.pageInfo?.activityName || 'unknown',
                },
                {
                  pageTitle: cacheEntry.pageInfo?.pageTitle || '未知页面',
                  pageType: cacheEntry.pageInfo?.pageType || 'unknown',
                  elementCount: cacheEntry.pageInfo?.elementCount || 0,
                }
              ),
            } as any;
          }
        } catch (e) {
          console.warn('保存前回填XML快照失败（可忽略）:', e);
        }
      }

      // 自包含脚本：优先复用已存在的 xmlSnapshot，否则创建
      if (newStep.parameters) {
        try {
          let xmlSnapshot: XmlSnapshot | undefined = (newStep.parameters as any).xmlSnapshot as XmlSnapshot | undefined;
          if (!xmlSnapshot) {
            const xmlContent = (newStep.parameters as any).xmlContent || currentXmlContent;
            if (xmlContent) {
              xmlSnapshot = createXmlSnapshot(
                xmlContent,
                {
                  deviceId:
                    (newStep.parameters as any).deviceId ||
                    currentDeviceInfo.deviceId ||
                    currentDeviceId ||
                    'unknown',
                  deviceName:
                    (newStep.parameters as any).deviceName ||
                    currentDeviceInfo.deviceName ||
                    ((devices.find((d: any) => d.id === currentDeviceId)?.name) || 'unknown'),
                  appPackage: currentDeviceInfo.appPackage || 'com.xingin.xhs',
                  activityName: currentDeviceInfo.activityName || 'unknown',
                },
                {
                  pageTitle: currentPageInfo.pageTitle || '小红书页面',
                  pageType: currentPageInfo.pageType || 'unknown',
                  elementCount: currentPageInfo.elementCount || 0,
                  appVersion: (currentPageInfo as any).appVersion,
                }
              );
            }
          }

          if (xmlSnapshot) {
            const p: any = newStep.parameters;
            const elementLocator: ElementLocator | undefined = p.bounds
              ? {
                  selectedBounds:
                    typeof p.bounds === 'string'
                      ? parseBoundsString(p.bounds) || { left: 0, top: 0, right: 0, bottom: 0 }
                      : p.bounds,
                  elementPath: p.xpath || p.element_path || '',
                  confidence: p.smartAnalysis?.confidence || 0.8,
                  additionalInfo: {
                    xpath: p.xpath,
                    resourceId: p.resource_id,
                    text: p.text,
                    contentDesc: p.content_desc,
                    className: p.class_name,
                    bounds:
                      typeof p.bounds === 'string'
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
            );
            selfContainedParams.xmlSnapshot = xmlSnapshot;
            selfContainedParams.elementLocator = elementLocator;
            newStep.parameters = selfContainedParams;

            if (!validateXmlSnapshot(xmlSnapshot)) {
              message.warning('XML快照可能不完整，建议重新分析页面');
            }
          }
        } catch (error) {
          console.error('创建自包含XML快照失败:', error);
          message.warning('创建XML快照失败，步骤将以传统模式保存');
        }
      }

      // 关联 XML 源
      if ((parameters as any).xmlCacheId && (parameters as any).xmlCacheId !== 'unknown') {
        const xmlCacheManager = XmlCacheManager.getInstance();
        xmlCacheManager.linkStepToXml(stepId, (parameters as any).xmlCacheId, {
          elementPath: (parameters as any).element_path,
          selectionContext: {
            selectedBounds: (parameters as any).bounds,
            searchCriteria: (parameters as any).search_criteria || (parameters as any).target_value || '',
            confidence: (parameters as any).confidence || 0.8,
          },
        });
      }

      if (editingStep) {
        setSteps(prev => prev.map(s => (s.id === editingStep.id ? newStep : s)));
        message.success('步骤更新成功');
      } else {
        setSteps(prev => [...prev, newStep]);
        message.success(`步骤添加成功${(parameters as any).xmlCacheId ? '（已关联XML源）' : ''}`);
      }

      if (allowSaveWithoutXmlOnce) setAllowSaveWithoutXmlOnce(false);

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存步骤失败:', error);
    }
  }, [
    form,
    steps,
    devices,
    currentDeviceId,
    currentXmlContent,
    currentDeviceInfo,
    currentPageInfo,
    editingStep,
    setSteps,
    setShowContactWorkflowSelector,
    setSnapshotFixMode,
    setPendingAutoResave,
    setIsQuickAnalyzer,
    setEditingStepForParams,
    setShowPageAnalyzer,
    allowSaveWithoutXmlOnce,
    setAllowSaveWithoutXmlOnce,
  ]);

  return {
    isModalVisible,
    showAddModal,
    showEditModal,
    hideModal,
    editingStep,
    setEditingStep,
    form,
    handleSaveStep,
  } as const;
}
