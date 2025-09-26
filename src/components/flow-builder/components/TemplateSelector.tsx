import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { UseFlowBuilderReturn } from '../hooks/useFlowBuilder';

const { Title, Text } = Typography;

interface TemplateSelectorProps {
  flow: UseFlowBuilderReturn;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ flow }) => {
  const { APP_TEMPLATES, selectedTemplate, selectTemplate } = flow;
  return (
    <Card title="1. 选择应用模板" style={{ marginBottom: 16 }} headStyle={{ background: '#f6ffed' }}>
      <Row gutter={16}>
        {APP_TEMPLATES.map(template => (
          <Col span={8} key={template.id}>
            <Card
              hoverable
              size="small"
              style={{
                border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: 8
              }}
              onClick={() => selectTemplate(template)}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {template.icon}
                </div>
                <Title level={5} style={{ margin: '8px 0 4px' }}>
                  {template.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {template.description}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};
