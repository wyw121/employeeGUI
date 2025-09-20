/**
 * 可视化视图主页
 * 使用统一的 DDD 架构进行页面分析和元素管理
 */

import React, { useEffect } from 'react';
import { 
  Layout,
  Card,
  Space,
  Button,
  Typography,
  Badge
} from 'antd';
import { 
  EyeOutlined,
  ReloadOutlined,
  MobileOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { UnifiedViewContainer } from '../components/unified/UnifiedViewContainer';
import './VisualizationViewPage.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const VisualizationViewPage: React.FC = () => {
  // 设备管理状态
  const { devices, selectedDevice, refreshDevices } = useAdb();

  // 初始化时刷新设备
  useEffect(() => {
    refreshDevices();
  }, []);

  return (
    <div className="visualization-view-page">
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        {/* 顶部标题栏 */}
        <Header className="page-header">
          <div className="header-content">
            <div className="header-left">
              <div className="logo-section">
                <EyeOutlined className="logo-icon" />
                <Title level={4} className="page-title">可视化视图</Title>
              </div>
              
              {selectedDevice && (
                <div className="device-info">
                  <Space>
                    {selectedDevice.status === 'online' ? (
                      <MobileOutlined className="device-icon" />
                    ) : (
                      <MobileOutlined className="device-icon-disabled" />
                    )}
                    <Text className="device-name">{selectedDevice.name}</Text>
                    <Badge 
                      status={selectedDevice.status === 'online' ? 'processing' : 'error'}
                      text={selectedDevice.status === 'online' ? '在线' : '离线'}
                    />
                  </Space>
                </div>
              )}
            </div>

            <div className="header-right">
              <Space>
                <Button icon={<SettingOutlined />}>
                  设置
                </Button>
              </Space>
            </div>
          </div>
        </Header>

        {/* 主内容区 - 使用统一视图容器 */}
        <Content style={{ height: 'calc(100vh - 64px)', padding: '16px' }}>
          {selectedDevice ? (
            <UnifiedViewContainer 
              deviceId={selectedDevice.id}
              deviceName={selectedDevice.name}
            />
          ) : (
            <Card style={{ textAlign: 'center', marginTop: '20%' }}>
              <div>
                <MobileOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={3} style={{ color: '#999' }}>
                  请先连接设备
                </Title>
                <Text style={{ color: '#666' }}>
                  请在设备管理页面连接一个 Android 设备后再进行页面分析
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Button type="primary" icon={<ReloadOutlined />} onClick={refreshDevices}>
                    刷新设备列表
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default VisualizationViewPage;