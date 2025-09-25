import { useCallback, useRef } from "react";
import { message } from "antd";
import type { FormInstance } from "antd";
import type { ExtendedSmartScriptStep as LoopScriptStep } from "../../../types/loopScript";
import type { SmartScriptStep } from "../../../types/smartScript";
import { normalizeStep } from "../helpers";
import { testSmartStepGenerator, testVariousCases } from "../../../test/SmartStepGeneratorTest";

interface UseWorkflowIntegrationsDeps {
  form: FormInstance;
  steps: LoopScriptStep[];
  setSteps: React.Dispatch<React.SetStateAction<LoopScriptStep[]>>;
  setShowAppComponent: (v: boolean) => void;
  setShowNavigationModal: (v: boolean) => void;
  setShowContactWorkflowSelector: (v: boolean) => void;
  setExecutorConfig: React.Dispatch<React.SetStateAction<any>>;
  setIsScriptValid: (v: boolean) => void;
}

export function useWorkflowIntegrations({
  form,
  steps,
  setSteps,
  setShowAppComponent,
  setShowNavigationModal,
  setShowContactWorkflowSelector,
  setExecutorConfig,
  setIsScriptValid,
}: UseWorkflowIntegrationsDeps) {
  const handleTestElementMapping = useCallback(() => {
    message.info("元素名称映射测试功能暂未开放。");
  }, []);

  const handleTestSmartStepGenerator = useCallback(() => {
    testSmartStepGenerator();
    testVariousCases();
    message.success("已触发智能步骤生成器测试，结果请查看控制台。");
  }, []);

  const lastNavigationConfigRef = useRef<{ app_name?: string; navigation_type?: string } | null>(null);

  const handleNavigationModalClose = useCallback(
    (finalConfig?: { app_name?: string; navigation_type?: string }) => {
      setShowNavigationModal(false);

      const configToApply = finalConfig || lastNavigationConfigRef.current;
      if (configToApply) {
        const appName = configToApply.app_name || "智能导航";
        const navType = configToApply.navigation_type || "导航操作";

        form.setFieldValue("name", appName);
        form.setFieldValue("description", `导航栏选择 ${navType}`);

        message.success(`已自动填充步骤信息：${appName} - 导航栏选择 ${navType}`);
      }
    },
    [form, setShowNavigationModal]
  );

  const handleNavigationConfigChange = useCallback((config: { app_name?: string; navigation_type?: string }) => {
    lastNavigationConfigRef.current = config;
  }, []);

  const handleNavigationStepGenerated = useCallback((step: LoopScriptStep) => {
    form.setFieldsValue({
      name: (step.parameters as any)?.app_name || step.name,
      description: step.description,
    });
    setSteps((prev) => [...prev, normalizeStep(step, prev.length + 1)]);
    setShowNavigationModal(false);
    message.success(`已添加导航步骤: ${step.name}`);
  }, [form, setSteps, setShowNavigationModal]);

  const handleContactWorkflowStepsGenerated = useCallback((generatedSteps: LoopScriptStep[]) => {
    setSteps((prev) => {
      const base = prev.length;
      const normalized = generatedSteps.map((s, i) => normalizeStep(s, base + i + 1));
      return [...prev, ...normalized];
    });
    setShowContactWorkflowSelector(false);
    message.success(`通讯录导入步骤创建成功，共 ${generatedSteps.length} 个步骤`);
  }, [setSteps, setShowContactWorkflowSelector]);

  const handleQuickAppStepAdded = useCallback((step: SmartScriptStep) => {
    setSteps((prev) => [...prev, normalizeStep(step, prev.length + 1)]);
    setShowAppComponent(false);
  }, [setSteps, setShowAppComponent]);

  const handleQualityPanelScriptUpdate = useCallback((updatedScript: any) => {
    if (updatedScript?.steps) setSteps(updatedScript.steps);
    if (updatedScript?.config) setExecutorConfig((prev: any) => ({ ...prev, ...updatedScript.config }));
  }, [setSteps, setExecutorConfig]);

  const handleQualityValidationChange = useCallback((valid: boolean) => {
    setIsScriptValid(valid);
  }, [setIsScriptValid]);

  return {
    handleTestElementMapping,
    handleTestSmartStepGenerator,
    handleNavigationConfigChange,
    handleNavigationModalClose,
    handleNavigationStepGenerated,
    handleContactWorkflowStepsGenerated,
    handleQuickAppStepAdded,
    handleQualityPanelScriptUpdate,
    handleQualityValidationChange,
  } as const;
}

export default useWorkflowIntegrations;
