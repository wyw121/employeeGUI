/**
 * ADB诊断布局对比演示页面
 * 展示旧布局vs新布局的差异
 */
import React, { useState } from 'react';
import { Layout, Card, Row, Col, Button, Space, Typography, Divider, Alert } from 'antd';
import { ThunderboltOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ModernAdbDiagnosticPage } from './ModernAdbDiagnosticPage';
import { ComprehensiveAdbPage } from './ComprehensiveAdbPage';

const { Content, Header } = Layout;
const { Title, Paragraph, Text } = Typography;

export const AdbLayoutComparisonPage: React.FC = () => {
  const [currentLayout, setCurrentLayout] = useState<'old' | 'new'>('new');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: 'white', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space>
              <Title level={3} style={{ margin: 0 }}>
                ADB诊断UI布局演示
              </Title>
              <Text type="secondary">对比旧版Tab布局与新版Dashboard布局</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type={currentLayout === 'old' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setCurrentLayout('old')}
              >
                原版Tab布局
              </Button>
              <Button 
                type={currentLayout === 'new' ? 'primary' : 'default'}
                icon={<ThunderboltOutlined />}
                onClick={() => setCurrentLayout('new')}
              >
                现代Dashboard布局
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {/* 布局说明卡片 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <AppstoreOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 16 }} />
                <Title level={4}>原版Tab布局</Title>
                <Paragraph type="secondary">
                  基于Ant Design Tabs组件的传统布局方式：
                  <br />• 功能分散在4个不同标签页
                  <br />• 需要切换查看不同信息
                  <br />• 无法同时监控多个状态
                  <br />• 缺少实时概览
                </Paragraph>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <ThunderboltOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>现代Dashboard布局</Title>
                <Paragraph type="secondary">
                  遵循DevOps工具最佳实践的仪表板设计：
                  <br />• 状态概览一目了然
                  <br />• 主操作区突出重点功能
                  <br />• 实时信息同屏显示
                  <br />• 专业诊断工具体验
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 设计原理说明 */}
        <Alert
          type="info"
          showIcon
          message="设计原理"
          description={
            currentLayout === 'new' 
              ? "新版Dashboard布局遵循'Everything at a Glance'原则，将关键信息集中展示，减少用户的认知负担。参考Jenkins、Grafana等专业工具的设计模式，提供层次化的信息架构。"
              : "原版Tab布局虽然结构清晰，但存在信息孤岛问题，用户需要频繁切换标签页才能获得完整的系统状态，不符合诊断工具的使用习惯。"
          }
          style={{ marginBottom: 24 }}
        />

        <Divider style={{ marginBottom: 24 }} />

        {/* 布局展示区域 */}
        <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden' }}>
          {currentLayout === 'new' ? (
            <ModernAdbDiagnosticPage />
          ) : (
            <div style={{ padding: 24 }}>
              <ComprehensiveAdbPage />
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default AdbLayoutComparisonPage;