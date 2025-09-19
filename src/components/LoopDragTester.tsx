// 循环拖拽功能测试组件

import React, { useState } from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import { LoopDragIntegration } from '../modules/loop-drag-integration/LoopDragIntegration';
import type { ExtendedSmartScriptStep, LoopConfig } from '../modules/loop-control/types';

const { Title, Paragraph } = Typography;

// 模拟测试数据
const initialSteps: ExtendedSmartScriptStep[] = [
  {
    id: 'step-1',
    actionName: '点击登录按钮',
    actionType: 'click',
    actionData: { selector: '#login-btn' },
    executeOrder: 0
  },
  {
    id: 'step-2', 
    actionName: '输入用户名',
    actionType: 'type',
    actionData: { selector: '#username', text: 'testuser' },
    executeOrder: 1
  },
  {
    id: 'step-3',
    actionName: '输入密码',
    actionType: 'type', 
    actionData: { selector: '#password', text: '123456' },
    executeOrder: 2
  },
  {
    id: 'step-4',
    actionName: '等待页面加载',
    actionType: 'wait',
    actionData: { timeout: 3000 },
    executeOrder: 3
  },
  {
    id: 'step-5',
    actionName: '滚动到底部',
    actionType: 'scroll',
    actionData: { direction: 'down', distance: 500 },
    executeOrder: 4
  }
];

export const LoopDragTester: React.FC = () => {
  const [steps, setSteps] = useState<ExtendedSmartScriptStep[]>(initialSteps);
  const [loopConfigs, setLoopConfigs] = useState<Record<string, LoopConfig>>({});

  // 步骤更新处理
  const handleStepsChange = (newSteps: ExtendedSmartScriptStep[]) => {
    setSteps(newSteps);
    message.success(`步骤列表已更新，共 ${newSteps.length} 个步骤`);
  };

  // 循环配置更新处理
  const handleLoopConfigChange = (stepId: string, config: LoopConfig) => {
    setLoopConfigs(prev => ({
      ...prev,
      [stepId]: config
    }));
    message.info(`循环配置已更新: ${config.condition} (最大${config.maxIterations}次)`);
  };

  // 添加新步骤
  const addNewStep = () => {
    const newStep: ExtendedSmartScriptStep = {
      id: `step-${Date.now()}`,
      actionName: `新步骤 ${steps.length + 1}`,
      actionType: 'click',
      actionData: { selector: '#new-element' },
      executeOrder: steps.length
    };
    setSteps([...steps, newStep]);
  };

  // 清空所有步骤
  const clearAllSteps = () => {
    setSteps([]);
    setLoopConfigs({});
    message.info('已清空所有步骤');
  };

  // 导出步骤配置
  const exportConfig = () => {
    const config = {
      steps,
      loopConfigs,
      exportTime: new Date().toISOString()
    };
    console.log('导出配置:', config);
    navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
    message.success('配置已复制到剪贴板');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
          🔄 循环体拖拽功能测试
        </Title>
        <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          测试循环开始/结束步骤和拖拽排序功能
        </Paragraph>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 功能说明 */}
          <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
            <Title level={4}>✨ 功能演示说明</Title>
            <ul style={{ marginBottom: 0 }}>
              <li><strong>循环控制:</strong> 点击"添加循环"创建循环开始/结束步骤</li>
              <li><strong>拖拽排序:</strong> 拖拽步骤卡片可重新排列执行顺序</li>
              <li><strong>循环体:</strong> 拖拽步骤到循环体区域内，步骤将在循环中执行</li>
              <li><strong>智能验证:</strong> 循环开始/结束步骤不能拖入循环体</li>
              <li><strong>可视化反馈:</strong> 循环体内的步骤有蓝色边框标识</li>
            </ul>
          </Card>

          {/* 控制按钮 */}
          <Card size="small">
            <Space wrap>
              <Button type="primary" onClick={addNewStep}>
                + 添加新步骤
              </Button>
              <Button onClick={exportConfig}>
                📋 导出配置
              </Button>
              <Button danger onClick={clearAllSteps}>
                🗑️ 清空步骤
              </Button>
              <span style={{ color: '#666' }}>
                当前步骤数: <strong>{steps.length}</strong>
              </span>
              <span style={{ color: '#666' }}>
                循环数: <strong>{Object.keys(loopConfigs).length}</strong>
              </span>
            </Space>
          </Card>

          {/* 主要功能区域 */}
          <LoopDragIntegration
            steps={steps}
            onStepsChange={handleStepsChange}
            onLoopConfigChange={handleLoopConfigChange}
          />

          {/* 步骤详情 */}
          <Card>
            <Title level={4}>📋 当前步骤列表</Title>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <pre style={{ 
                fontSize: '12px', 
                backgroundColor: '#f5f5f5', 
                padding: '12px',
                borderRadius: '4px'
              }}>
                {JSON.stringify({ steps, loopConfigs }, null, 2)}
              </pre>
            </div>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default LoopDragTester;