// 循环控制和拖拽排序集成示例

import React, { useState, useCallback } from 'react';
import { Button, Space, Card, message, Modal, Form, Select, InputNumber } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';

// 导入循环控制模块
import { 
  LoopType, 
  LoopConfig,
  ExtendedSmartScriptStep,
  ExtendedStepActionType
} from '../types';
import { LoopStepCard } from './LoopStepCard';
import { useLoopControl } from '../hooks/useLoopControl';

// 导入拖拽排序模块（暂时注释，等安装依赖后启用）
// import { DragSortContainer, DragResult } from '../drag-sort';

export interface LoopControlIntegrationProps {
  /** 当前步骤列表 */
  steps: ExtendedSmartScriptStep[];
  /** 步骤更新回调 */
  onStepsChange: (steps: ExtendedSmartScriptStep[]) => void;
  /** 步骤执行器 */
  onExecuteStep?: (step: ExtendedSmartScriptStep, variables: Record<string, any>) => Promise<boolean>;
}

export const LoopControlIntegration: React.FC<LoopControlIntegrationProps> = ({
  steps,
  onStepsChange,
  onExecuteStep
}) => {
  const [createLoopModalVisible, setCreateLoopModalVisible] = useState(false);
  const [createLoopForm] = Form.useForm();

  // 使用循环控制Hook
  const {
    loops,
    executingLoops,
    createLoop,
    deleteLoop,
    updateLoopConfig,
    executeLoop,
    stopLoop,
    addStepToLoop,
    removeStepFromLoop,
    extractLoopsFromSteps,
    flattenLoopsToSteps,
    isLoopExecuting,
    getLoopExecutionState
  } = useLoopControl({
    stepExecutor: onExecuteStep
  });

  // 提取循环结构
  const mainSteps = extractLoopsFromSteps(steps);

  // 处理创建循环
  const handleCreateLoop = useCallback(async (values: any) => {
    const config: LoopConfig = {
      type: values.type,
      count: values.count,
      maxIterations: values.maxIterations || 100,
      intervalMs: values.intervalMs || 0,
      continueOnError: values.continueOnError || false
    };

    const result = createLoop(config, values.name);
    if (result) {
      // 添加循环开始和结束步骤到主步骤列表
      const newSteps = [
        ...steps,
        result.startStep,
        result.endStep
      ];
      onStepsChange(newSteps);
      setCreateLoopModalVisible(false);
      createLoopForm.resetFields();
    }
  }, [createLoop, steps, onStepsChange, createLoopForm]);

  // 处理循环配置更新
  const handleLoopConfigChange = useCallback((loopId: string, config: LoopConfig) => {
    updateLoopConfig(loopId, config);
    
    // 更新步骤列表中的配置
    const updatedSteps = steps.map(step => {
      if (step.loopId === loopId && step.step_type === ExtendedStepActionType.LOOP_START) {
        return {
          ...step,
          parameters: { ...step.parameters, config }
        };
      }
      return step;
    });
    
    onStepsChange(updatedSteps);
  }, [updateLoopConfig, steps, onStepsChange]);

  // 处理删除循环
  const handleDeleteLoop = useCallback((loopId: string) => {
    Modal.confirm({
      title: '确认删除循环',
      content: '删除循环将同时删除循环内的所有步骤，此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteLoop(loopId);
        
        // 从步骤列表中移除循环相关步骤
        const filteredSteps = steps.filter(step => 
          step.loopId !== loopId && step.parentLoopId !== loopId
        );
        
        onStepsChange(filteredSteps);
      }
    });
  }, [deleteLoop, steps, onStepsChange]);

  // 处理执行循环
  const handleExecuteLoop = useCallback(async (loopId: string) => {
    const result = await executeLoop(loopId);
    if (result) {
      console.log('循环执行结果:', result);
    }
  }, [executeLoop]);

  // 渲染循环内的步骤
  const renderLoopInnerSteps = useCallback((innerSteps: ExtendedSmartScriptStep[]) => {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {innerSteps.map((step, index) => (
          <Card
            key={step.id}
            size="small"
            title={`${index + 1}. ${step.name}`}
            style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e8f4fd'
            }}
          >
            <Space direction="vertical">
              <span>类型: {step.step_type}</span>
              {step.description && <span>描述: {step.description}</span>}
            </Space>
          </Card>
        ))}
      </Space>
    );
  }, []);

  return (
    <div className="loop-control-integration">
      {/* 工具栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setCreateLoopModalVisible(true)}
        >
          添加循环
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          disabled={loops.size === 0}
          onClick={() => {
            // 执行所有循环
            Array.from(loops.keys()).forEach(executeLoop);
          }}
        >
          执行所有循环
        </Button>
      </Space>

      {/* 循环显示区域 */}
      <div className="loops-container">
        {Array.from(loops.entries()).map(([loopId, loopData]) => {
          const isExecuting = isLoopExecuting(loopId);
          const executionState = getLoopExecutionState(loopId);
          
          return (
            <LoopStepCard
              key={loopId}
              startStep={loopData.startStep}
              endStep={loopData.endStep!}
              innerSteps={loopData.innerSteps}
              executing={isExecuting}
              currentIteration={executionState?.currentIteration}
              onConfigChange={(config) => handleLoopConfigChange(loopId, config)}
              onDelete={() => handleDeleteLoop(loopId)}
              renderInnerSteps={renderLoopInnerSteps}
            />
          );
        })}
      </div>

      {/* 创建循环对话框 */}
      <Modal
        title="创建循环"
        open={createLoopModalVisible}
        onOk={() => createLoopForm.submit()}
        onCancel={() => {
          setCreateLoopModalVisible(false);
          createLoopForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={createLoopForm}
          onFinish={handleCreateLoop}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="循环名称"
            rules={[{ required: true, message: '请输入循环名称' }]}
          >
            <input type="text" placeholder="输入循环名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="循环类型"
            rules={[{ required: true, message: '请选择循环类型' }]}
            initialValue={LoopType.FOR}
          >
            <Select>
              <Select.Option value={LoopType.FOR}>固定次数循环</Select.Option>
              <Select.Option value={LoopType.WHILE}>条件循环</Select.Option>
              <Select.Option value={LoopType.INFINITE}>无限循环</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="count"
            label="循环次数"
            dependencies={['type']}
            rules={[
              ({ getFieldValue }) => ({
                required: getFieldValue('type') === LoopType.FOR,
                message: '请输入循环次数'
              })
            ]}
          >
            <InputNumber min={1} max={1000} />
          </Form.Item>

          <Form.Item
            name="maxIterations"
            label="最大循环次数"
            initialValue={100}
          >
            <InputNumber min={1} max={10000} />
          </Form.Item>

          <Form.Item
            name="intervalMs"
            label="循环间隔(毫秒)"
            initialValue={0}
          >
            <InputNumber min={0} max={10000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoopControlIntegration;