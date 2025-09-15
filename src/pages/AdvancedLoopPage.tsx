import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { LoopBuilder } from '../components';

const { Title, Paragraph } = Typography;

const AdvancedLoopPage: React.FC = () => {
  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            🔄 高级循环控制系统
          </Title>
          <Paragraph type="secondary">
            第6步优化：实现复杂循环控制，支持嵌套循环、条件判断和动态参数调整
          </Paragraph>
        </div>

        <Alert
          message="循环控制增强完成"
          description="本页面实现了脚本自动化的高级循环控制功能，这是我们6步优化计划的最后一步。现在您可以创建复杂的循环逻辑，包括嵌套循环、条件判断和动态参数调整。"
          type="success"
          style={{ marginBottom: 24 }}
          showIcon
        />

        <Card title="功能特点" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div>
              <Title level={5}>🔢 多种循环类型</Title>
              <Paragraph type="secondary">
                支持简单计数循环、时间限制循环、元素条件循环和动态参数循环
              </Paragraph>
            </div>
            <div>
              <Title level={5}>🎯 条件判断</Title>
              <Paragraph type="secondary">
                可设置复杂的跳出条件，包括元素出现/消失、时间超时等
              </Paragraph>
            </div>
            <div>
              <Title level={5}>🏗️ 嵌套循环</Title>
              <Paragraph type="secondary">
                支持多层嵌套循环，实现复杂的自动化逻辑
              </Paragraph>
            </div>
            <div>
              <Title level={5}>⚙️ 动态参数</Title>
              <Paragraph type="secondary">
                支持动态参数调整，根据循环次数自动计算参数值
              </Paragraph>
            </div>
          </div>
        </Card>

        <LoopBuilder />
      </div>
    </div>
  );
};

export default AdvancedLoopPage;