// 增强版可拖拽的步骤列表容器，支持循环逻辑

import React from 'react';
import { Card, Button, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { DraggableStepsContainer } from './DraggableStepsContainer';
import type { ExtendedSmartScriptStep, LoopConfig } from '../types/loopScript';

export interface EnhancedDraggableStepsContainerProps {
  /** 扩展步骤列表 */
  steps: ExtendedSmartScriptStep[];
  /** 循环配置列表 */
  loopConfigs: LoopConfig[];
  /** 更新步骤列表回调 */
  onStepsChange: (steps: ExtendedSmartScriptStep[]) => void;
  /** 更新循环配置回调 */
  onLoopConfigsChange: (configs: LoopConfig[]) => void;
  /** 当前设备ID */
  currentDeviceId?: string;
  /** 设备列表 */
  devices: any[];
  /** 编辑步骤回调 */
  onEditStep: (step: ExtendedSmartScriptStep) => void;
  /** 删除步骤回调 */
  onDeleteStep: (stepId: string) => void;
  /** 删除循环回调 */
  onDeleteLoop: (loopId: string) => void;
  /** 切换步骤启用状态回调 */
  onToggleStep: (stepId: string) => void;
  /** 编辑元素名称回调 */
  onEditElementName?: (step: ExtendedSmartScriptStep) => void;
  /** 测试步骤组件 */
  StepTestButton?: React.ComponentType<any>;
  /** 容器标题 */
  title?: React.ReactNode;
  /** 打开智能页面分析器回调 */
  onOpenPageAnalyzer?: () => void;
  /** 创建循环回调 */
  onCreateLoop?: () => void;
  /** 创建通讯录导入工作流回调 */
  onCreateContactImport?: () => void;
  /** 添加步骤回调 */
  onAddStep?: () => void;
  /** 批量匹配操作回调 */
  onBatchMatch?: (stepId: string) => void;
}

const EnhancedDraggableStepsContainer: React.FC<EnhancedDraggableStepsContainerProps> = ({
  steps,
  loopConfigs,
  onStepsChange,
  onLoopConfigsChange,
  currentDeviceId,
  devices,
  onEditStep,
  onDeleteStep,
  onDeleteLoop,
  onToggleStep,
  onEditElementName,
  StepTestButton,
  title = <span>智能步骤列表</span>,
  onOpenPageAnalyzer,
  onCreateLoop,
  onCreateContactImport,
  onAddStep,
  onBatchMatch
}) => {
  
  // 暂时使用基础的DraggableStepsContainer，后续可以扩展
  const handleStepsChange = (newSteps: any[]) => {
    // 转换为ExtendedSmartScriptStep类型
    const extendedSteps: ExtendedSmartScriptStep[] = newSteps.map((step, index) => ({
      ...step,
      order: index + 1,
      // 确保有所有必需的扩展属性
      parent_loop_id: step.parent_loop_id,
    }));
    onStepsChange(extendedSteps);
  };

  // 查找循环配对步骤
  const findLoopPairStep = (currentStep: ExtendedSmartScriptStep, allSteps: ExtendedSmartScriptStep[]) => {
    // 如果当前步骤不是循环步骤，返回null
    if (currentStep.step_type !== 'loop_start' && currentStep.step_type !== 'loop_end') {
      return null;
    }

    // 根据循环ID查找配对步骤
    let targetStepType = currentStep.step_type === 'loop_start' ? 'loop_end' : 'loop_start';
    
    // 优先通过parameters中的loop_id匹配
    if (currentStep.parameters?.loop_id) {
      return allSteps.find(step => 
        step.step_type === targetStepType && 
        step.parameters?.loop_id === currentStep.parameters?.loop_id
      );
    }

    // 备用方案：通过loop_config中的loopId匹配
    if (currentStep.loop_config?.loopId) {
      return allSteps.find(step => 
        step.step_type === targetStepType && 
        step.loop_config?.loopId === currentStep.loop_config?.loopId
      );
    }

    // 最后备用方案：查找最近的配对步骤（基于位置的简单配对逻辑）
    const currentIndex = allSteps.findIndex(step => step.id === currentStep.id);
    if (currentIndex === -1) return null;

    if (currentStep.step_type === 'loop_start') {
      // 查找后续的loop_end
      for (let i = currentIndex + 1; i < allSteps.length; i++) {
        if (allSteps[i].step_type === 'loop_end') {
          return allSteps[i];
        }
      }
    } else {
      // 查找前面的loop_start
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (allSteps[i].step_type === 'loop_start') {
          return allSteps[i];
        }
      }
    }

    return null;
  };

  // 处理步骤参数更新
  const handleUpdateStepParameters = (stepId: string, parameters: any) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId 
        ? { ...step, parameters: { ...step.parameters, ...parameters } }
        : step
    );

    // 如果更新的是循环步骤的参数，需要同步更新配对步骤
    const currentStep = steps.find(step => step.id === stepId);
    if (currentStep && (currentStep.step_type === 'loop_start' || currentStep.step_type === 'loop_end')) {
      // 查找循环配对步骤
      const pairStep = findLoopPairStep(currentStep, updatedSteps);
      
      if (pairStep) {
        // 同步循环相关参数到配对步骤
        const loopRelatedParams = {
          loop_count: parameters.loop_count,
          is_infinite_loop: parameters.is_infinite_loop
        };

        // 再次更新配对步骤的参数
        const finalUpdatedSteps = updatedSteps.map(step => 
          step.id === pairStep.id
            ? { ...step, parameters: { ...step.parameters, ...loopRelatedParams } }
            : step
        );

        onStepsChange(finalUpdatedSteps);
        return;
      }
    }

    // 如果不是循环步骤或找不到配对步骤，正常更新
    onStepsChange(updatedSteps);
  };

  return (
    <Card title={
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-medium">📋 智能脚本步骤</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            {steps.length} 个步骤
          </span>
          {loopConfigs.length > 0 && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
              {loopConfigs.length} 个循环
            </span>
          )}
        </div>
        {onAddStep && (
          <Button 
            type="primary" 
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddStep}
          >
            添加智能步骤
          </Button>
        )}
      </div>
    }>
      {/* 使用基础的拖拽容器 */}
      <DraggableStepsContainer
        steps={steps}
        onStepsChange={handleStepsChange}
        currentDeviceId={currentDeviceId}
        devices={devices}
        onEditStep={onEditStep}
        onDeleteStep={onDeleteStep}
        onToggleStep={onToggleStep}
        onEditElementName={onEditElementName}
        StepTestButton={StepTestButton}
        title="步骤列表"
        onUpdateStepParameters={handleUpdateStepParameters}
        onOpenPageAnalyzer={onOpenPageAnalyzer}
        onCreateLoop={onCreateLoop}
        onCreateContactImport={onCreateContactImport}
        onBatchMatch={onBatchMatch}
      />
    </Card>
  );
};

export { EnhancedDraggableStepsContainer };
export default EnhancedDraggableStepsContainer;