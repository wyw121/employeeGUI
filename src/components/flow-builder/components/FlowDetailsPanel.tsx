import React from 'react';
import { Card, List, Button, Tooltip, Typography } from 'antd';
import { DeleteOutlined, BranchesOutlined } from '@ant-design/icons';
import { UseFlowBuilderReturn } from '../hooks/useFlowBuilder';

const { Text } = Typography;

interface FlowDetailsPanelProps {
  flow: UseFlowBuilderReturn;
}

export const FlowDetailsPanel: React.FC<FlowDetailsPanelProps> = ({ flow }) => {
  const { currentFlow, currentStepIndex, removeStep, selectedTemplate } = flow;
  return (
    <Card 
      title="流程详情" 
      style={{ marginBottom: 16 }}
      headStyle={{ background: '#fff7e6' }}
    >
      {currentFlow.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
          <BranchesOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>
            <Text>请选择模板并开始构建流程</Text>
          </div>
        </div>
      ) : (
        <List
          dataSource={currentFlow}
          renderItem={(step, index) => (
            <List.Item
              key={step.id}
              actions={[
                <Tooltip key="delete" title="删除步骤">
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeStep(index)}
                    danger
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: index === currentStepIndex ? '#1890ff' : '#d9d9d9',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </div>
                }
                title={<Text strong style={{ fontSize: 13 }}>{step.name}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {step.description}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
