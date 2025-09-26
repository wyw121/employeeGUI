import { useState, useCallback } from 'react';
import { message } from 'antd';
import { FlowTemplate, FlowStepTemplate, FlowBuilderStep, APP_TEMPLATES } from '../../universal-ui/script-builder/services/flowTemplates';
import { executeFlowSteps } from '../services/flowExecutionService';
import { persistFlow } from '../services/flowPersistence';

/**
 * useFlowBuilder
 * 核心状态与操作：模板选择、步骤增删、下一步推导、执行、保存
 */
export function useFlowBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [currentFlow, setCurrentFlow] = useState<FlowBuilderStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [availableNextSteps, setAvailableNextSteps] = useState<FlowStepTemplate[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [flowName, setFlowName] = useState('');

  const selectTemplate = useCallback((template: FlowTemplate) => {
    setSelectedTemplate(template);
    setCurrentFlow([]);
    setCurrentStepIndex(0);
    setAvailableNextSteps(template.steps.filter(step => step.type === 'app_open' || step.id.includes('open_app')));
    message.success(`已选择 ${template.name} 模板`);
  }, []);

  const addStep = useCallback((stepTemplate: FlowStepTemplate) => {
    setCurrentFlow(prev => {
      const newStep: FlowBuilderStep = {
        id: `${stepTemplate.id}_${Date.now()}`,
        templateId: stepTemplate.id,
        name: stepTemplate.name,
        description: stepTemplate.description,
        order: prev.length,
        parameters: stepTemplate.parameters || {},
        completed: false
      };
      const updated = [...prev, newStep];
      setCurrentStepIndex(updated.length - 1);
      if (stepTemplate.nextSteps && selectedTemplate) {
        const nextStepTemplates = selectedTemplate.steps.filter(step => stepTemplate.nextSteps?.includes(step.id));
        setAvailableNextSteps(nextStepTemplates);
      } else {
        setAvailableNextSteps([]);
      }
      message.success(`已添加步骤: ${stepTemplate.name}`);
      return updated;
    });
  }, [selectedTemplate]);

  const removeStep = useCallback((index: number) => {
    setCurrentFlow(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (index <= currentStepIndex && currentStepIndex > 0) {
        setCurrentStepIndex(currentStepIndex - 1);
      }
      if (updated.length > 0 && selectedTemplate) {
        const last = updated[updated.length - 1];
        const lastTemplate = selectedTemplate.steps.find(s => s.id === last.templateId);
        if (lastTemplate?.nextSteps) {
          const nextStepTemplates = selectedTemplate.steps.filter(step => lastTemplate.nextSteps?.includes(step.id));
            setAvailableNextSteps(nextStepTemplates);
        }
      }
      message.success('步骤已删除');
      return updated;
    });
  }, [currentStepIndex, selectedTemplate]);

  const executeFlow = useCallback(async () => {
    if (currentFlow.length === 0) {
      message.warning('请先添加流程步骤');
      return;
    }
    setIsExecuting(true);
    try {
      const result = await executeFlowSteps('emulator-5554', currentFlow);
      if (!result.success) throw new Error(result.error || '未知错误');
      console.log('流程执行结果:', result.raw);
      message.success('流程执行完成！查看执行监控了解详细情况');
    } catch (error) {
      console.error('流程执行失败:', error);
      message.error(`流程执行失败: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  }, [currentFlow]);

  const openSaveModal = useCallback(() => {
    if (currentFlow.length === 0) {
      message.warning('没有可保存的流程');
      return;
    }
    setShowSaveModal(true);
  }, [currentFlow]);

  const confirmSave = useCallback(() => {
    if (!flowName.trim()) {
      message.warning('请输入流程名称');
      return;
    }
    persistFlow(flowName, selectedTemplate, currentFlow);
    setShowSaveModal(false);
    setFlowName('');
    message.success(`流程 "${flowName}" 已保存`);
  }, [flowName, selectedTemplate, currentFlow]);

  return {
    // state
    selectedTemplate,
    currentFlow,
    currentStepIndex,
    availableNextSteps,
    isExecuting,
    showSaveModal,
    flowName,
    APP_TEMPLATES,

    // setters
    setFlowName,
    setShowSaveModal,

    // actions
    selectTemplate,
    addStep,
    removeStep,
    executeFlow,
    openSaveModal,
    confirmSave
  };
}

export type UseFlowBuilderReturn = ReturnType<typeof useFlowBuilder>;
