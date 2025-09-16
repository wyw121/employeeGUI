/**
 * 现代化ADB诊断页面
 * 使用仪表板式布局替代tab布局
 */
import React from 'react';
import { Layout, Typography, Space, Card } from 'antd';
import { useAdb } from '../application/hooks/useAdb';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

interface ModernAdbDiagnosticPageProps {
  className?: string;
}

export const ModernAdbDiagnosticPage: React.FC<ModernAdbDiagnosticPageProps> = ({ className }) => {
  const { devices, isLoading } = useAdb();
  
  return (
    <Layout className={`modern-adb-diagnostic-page ${className || ''}`}>
      <Header 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}
      >
        <Space>
          <div style={{ fontSize: 24 }}>🔧</div>
          <div>
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              ADB诊断中心
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              专业级Android调试工具诊断平台
            </Text>
          </div>
        </Space>
      </Header>

      <Content style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        <Card title="ADB 系统状态">
          <p>系统已重构为统一的DDD架构</p>
          <p>设备数量: {devices.length}</p>
          <p>在线设备: {devices.filter(d => d.isOnline()).length}</p>
          <p>状态: {isLoading ? '加载中' : '正常'}</p>
        </Card>
      </Content>
    </Layout>
  );
};

export default ModernAdbDiagnosticPage;

