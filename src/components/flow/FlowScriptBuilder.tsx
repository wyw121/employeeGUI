import React from 'react';
import { Typography, Row, Col } from 'antd';
import { useFlowBuilder, TemplateSelector, FlowConstructionCard, FlowDetailsPanel, SaveFlowModal, SavedFlowsPanel } from '../flow-builder';

const { Title, Paragraph } = Typography;

const FlowScriptBuilder: React.FC = () => {
  const flow = useFlowBuilder();
  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>🎯 流程化脚本构建器</Title>
          <Paragraph type="secondary">选择应用模板，按步骤构建自动化流程，支持条件判断和智能导航</Paragraph>
        </div>
        <Row gutter={24}>
          <Col span={16}>
            <TemplateSelector flow={flow} />
            <FlowConstructionCard flow={flow} />
          </Col>
          <Col span={8}>
            <FlowDetailsPanel flow={flow} />
            <SavedFlowsPanel />
          </Col>
        </Row>
        <SaveFlowModal flow={flow} />
      </div>
    </div>
  );
};

export default FlowScriptBuilder;

