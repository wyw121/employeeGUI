import React from 'react';
import { Card, Space, Button, Steps, Typography, Row, Col, Tooltip } from 'antd';
import { PlayCircleOutlined, SaveOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { UseFlowBuilderReturn } from '../hooks/useFlowBuilder';

const { Title, Text } = Typography;
const { Step } = Steps;

interface FlowConstructionCardProps {
  flow: UseFlowBuilderReturn;
}

export const FlowConstructionCard: React.FC<FlowConstructionCardProps> = ({ flow }) => {
  const {
    selectedTemplate,
    currentFlow,
    currentStepIndex,
    availableNextSteps,
    isExecuting,
    addStep,
    executeFlow,
    openSaveModal
  } = flow;

  if (!selectedTemplate) return null;

  return (
    <Card 
      title="2. 构建流程步骤" 
      style={{ marginBottom: 16 }}
      headStyle={{ background: '#f0f9ff' }}
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={openSaveModal}
            disabled={currentFlow.length === 0}
          >
            保存流程
          </Button>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={executeFlow}
            loading={isExecuting}
            disabled={currentFlow.length === 0}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            执行流程
          </Button>
        </Space>
      }
    >
      {currentFlow.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>当前流程：</Title>
          <Steps
            current={currentStepIndex}
            size="small"
            direction="vertical"
            style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}
          >
            {currentFlow.map((step, index) => {
              let stepStatus: 'wait' | 'process' | 'finish' = 'wait';
              if (step.completed) stepStatus = 'finish';
              else if (index === currentStepIndex) stepStatus = 'process';
              return (
                <Step
                  key={step.id}
                  title={step.name}
                  description={step.description}
                  status={stepStatus}
                  icon={index < currentStepIndex ? <CheckCircleOutlined /> : undefined}
                />
              );
            })}
          </Steps>
        </div>
      )}

      {availableNextSteps.length > 0 && (
        <div>
          <Title level={5}>
            {currentFlow.length === 0 ? '选择第一步：' : '选择下一步：'}
          </Title>
          <Row gutter={[16, 16]}>
            {availableNextSteps.map(stepTemplate => (
              <Col span={12} key={stepTemplate.id}>
                <Card
                  hoverable
                  size="small"
                  style={{ height: '100%' }}
                  onClick={() => addStep(stepTemplate)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      background: '#e6f7ff', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <PlusOutlined style={{ color: '#1890ff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong>{stepTemplate.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {stepTemplate.description}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {currentFlow.length > 0 && availableNextSteps.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <div>
            <Text>流程构建完成！</Text>
            <br />
            <Text type="secondary">您可以保存这个流程或直接执行</Text>
          </div>
        </div>
      )}
    </Card>
  );
};
