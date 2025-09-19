// 增强版可拖拽的步骤列表容器，支持循环逻辑

import React from 'react';
import { Card, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
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
  title = <span>智能步骤列表</span>
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

  return (
    <Card title={
      <div className="flex items-center space-x-2">
        <span>{title}</span>
        <span className="text-sm text-gray-500">
          ({steps.length} 个步骤, {loopConfigs.length} 个循环)
        </span>
      </div>
    }>
      {/* 🎨 增强的蓝色主题循环管理区域 */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 rounded-xl border-2 border-blue-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-full">
              <ReloadOutlined className="text-sm" />
            </div>
            <div className="text-base text-blue-800 font-bold">
              🔄 循环管理系统
            </div>
            <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full border border-blue-300">
              {loopConfigs.length} 个活动循环
            </div>
          </div>
          <Space size="small">
            {loopConfigs.length === 0 ? (
              <div className="text-xs text-gray-500 italic bg-gray-50 px-3 py-1 rounded">
                暂无循环，点击上方创建
              </div>
            ) : (
              loopConfigs.map(config => (
                <div 
                  key={config.loopId} 
                  className="text-xs px-3 py-1.5 bg-blue-200 text-blue-800 rounded-lg border border-blue-300 font-medium shadow-sm hover:bg-blue-300 transition-colors"
                >
                  🏷️ {config.name} ({config.iterations}次循环)
                </div>
              ))
            )}
          </Space>
        </div>
      </div>

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
      />
    </Card>
  );
};

export { EnhancedDraggableStepsContainer };
export default EnhancedDraggableStepsContainer;