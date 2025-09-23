import {
    AimOutlined,
    BarChartOutlined,
    EyeOutlined,
    FolderOutlined,
    MobileOutlined,
    SecurityScanOutlined,
    SyncOutlined,
    ThunderboltOutlined,
    UserOutlined,
    RobotOutlined
} from '@ant-design/icons';
import {
    App,
    Avatar,
    Badge,
    Button,
    Card,
    ConfigProvider,
    Divider,
    Layout,
    Menu,
    Progress,
    Space,
    Statistic,
    theme,
    Typography
} from 'antd';
import React, { useState } from 'react';
import InspectorPage from '../pages/InspectorPage';
import ContactManagementPage from '../pages/ContactManagementPage';
import PermissionTestPage from '../pages/PermissionTestPage';
import XiaohongshuFollowPage from '../pages/XiaohongshuFollowPage';
import { ComprehensiveAdbPage } from '../pages/ComprehensiveAdbPage'; // 新的ADB模块
import SmartScriptBuilderPage from '../pages/SmartScriptBuilderPage'; // 智能脚本构建器
import RealTimeDeviceMonitorPage from '../pages/device-monitor/RealTimeDeviceMonitorPage';
import SmartVcfImporter from './SmartVcfImporter';
import TemplateLibrary from './template/TemplateLibrary'; // 模板库

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export const AntDesignIntegrationDemo: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('dashboard'); // 默认选中仪表板
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [inspectorOpen, setInspectorOpen] = useState<{open: boolean; sessionId?: string; stepId?: string}>({ open: false });

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <BarChartOutlined />,
      label: '仪表板',
    },
    {
      key: 'devices',
      icon: <MobileOutlined />,
      label: '实时设备监控',
    },
    {
      key: 'adb-test',
      icon: <ThunderboltOutlined />,
      label: 'ADB诊断',
    },
    {
      key: 'contacts',
      icon: <UserOutlined />,
      label: '通讯录管理',
    },
    {
      key: 'xiaohongshu-follow',
      icon: <UserOutlined />,
      label: '小红书关注',
    },
    {
      key: 'smart-vcf',
      icon: <ThunderboltOutlined />,
      label: '智能VCF导入',
    },
    {
      key: 'permission-test',
      icon: <SecurityScanOutlined />,
      label: '权限测试',
    },
    {
      key: 'acquisition',
      icon: <AimOutlined />,
      label: '精准获客',
    },
    {
      key: 'smart-script-builder',
      icon: <RobotOutlined />,
      label: '智能脚本构建器',
    },
    {
      key: 'template-library',
      icon: <FolderOutlined />,
      label: '模板库',
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          // Sindre风格的主色调
          colorPrimary: '#ff6b8a',
          colorSuccess: '#43e97b',
          colorWarning: '#faad14',
          colorError: '#f5576c',
          colorInfo: '#4facfe',

          // 背景色调
          colorBgContainer: '#161b22',
          colorBgElevated: '#21262d',
          colorBgLayout: '#0d1117',

          // 文字色调
          colorText: '#f0f6fc',
          colorTextSecondary: '#8b949e',
          colorTextTertiary: '#6e7681',

          // 边框和分割
          colorBorder: '#30363d',
          colorSplit: '#21262d',

          // 圆角和间距
          borderRadius: 12,
          borderRadiusLG: 16,
        },
        components: {
          Layout: {
            headerBg: '#161b22',
            bodyBg: '#0d1117',
          },
          Menu: {
            colorBgContainer: '#161b22',
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(255, 107, 138, 0.1)',
            itemSelectedColor: '#ff6b8a',
            itemHoverBg: 'rgba(255, 255, 255, 0.05)',
          },
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.05)',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.1)',
          },
          Table: {
            colorBgContainer: 'rgba(255, 255, 255, 0.02)',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.1)',
          },
          Button: {
            controlHeight: 36,
            borderRadius: 10,
            fontWeight: 500,
          }
        }
      }}
    >
      <App>
        <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sider width={240} style={{ background: '#161b22' }}>
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'linear-gradient(135deg, #ff6b8a, #4ecdc4)' }}
              >
                🦄
              </div>
              <div>
                <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Flow Farm
                </Title>
                <Text type="secondary">Automation Platform</Text>
              </div>
            </div>
          </div>

          <Menu
            selectedKeys={[selectedKey]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ border: 'none' }}
          />
        </Sider>

        <Layout>
          {/* 顶部栏 */}
          <Header style={{
            background: '#161b22',
            borderBottom: '1px solid #30363d',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
              {menuItems.find(item => item.key === selectedKey)?.label || '仪表板'}
            </Title>

            <Space>
              <Button onClick={() => setInspectorOpen({ open: true })} type="primary">打开检查器</Button>
              <Badge count={5} style={{ backgroundColor: '#ff6b8a' }}>
                <Button icon={<SyncOutlined />} size="large">
                  刷新设备
                </Button>
              </Badge>
              <Avatar style={{ backgroundColor: '#722ed1' }}>
                U
              </Avatar>
            </Space>
          </Header>

          {/* 主内容区域 */}
          <Content style={{ 
            margin: '0', 
            padding: '0',
            background: '#0d1117',
            height: 'calc(100vh - 64px)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '24px',
              height: '100%',
              overflow: 'auto'
            }}>
            {inspectorOpen.open && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} onClick={() => setInspectorOpen({ open: false })}>
                <div style={{ width: '95vw', height: '90vh', margin: '4vh auto 0', background: '#111', borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                  <InspectorPage sessionId={inspectorOpen.sessionId} stepId={inspectorOpen.stepId} />
                </div>
              </div>
            )}
            {selectedKey === 'dashboard' && (
              <div className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <Statistic
                      title="在线设备"
                      value={2}
                      suffix="/ 5"
                      valueStyle={{ color: '#52c41a', fontSize: '2rem' }}
                      prefix={<MobileOutlined />}
                    />
                  </Card>
                  <Card>
                    <Statistic
                      title="今日任务"
                      value={23}
                      valueStyle={{ color: '#ff6b8a', fontSize: '2rem' }}
                      prefix={<AimOutlined />}
                    />
                  </Card>
                  <Card>
                    <Statistic
                      title="成功关注"
                      value={189}
                      valueStyle={{ color: '#722ed1', fontSize: '2rem' }}
                      prefix={<UserOutlined />}
                    />
                  </Card>
                  <Card>
                    <Statistic
                      title="账户余额"
                      value={1250}
                      prefix="¥"
                      valueStyle={{ color: '#faad14', fontSize: '2rem' }}
                    />
                  </Card>
                </div>

                {/* 进度显示 */}
                <Card title="任务进度" extra={<Button type="link">查看详情</Button>}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Text>小红书关注任务</Text>
                        <Text>15/20 完成</Text>
                      </div>
                      <Progress percent={75} strokeColor="#ff6b8a" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Text>通讯录导入</Text>
                        <Text>100/100 完成</Text>
                      </div>
                      <Progress percent={100} strokeColor="#52c41a" />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {selectedKey === 'devices' && (
              <RealTimeDeviceMonitorPage />
            )}

            {selectedKey === 'contacts' && (
              <ContactManagementPage />
            )}

            {selectedKey === 'xiaohongshu-follow' && (
              <XiaohongshuFollowPage />
            )}

            {selectedKey === 'smart-vcf' && (
              <SmartVcfImporter />
            )}

            {selectedKey === 'permission-test' && (
              <PermissionTestPage />
            )}

            {selectedKey === 'adb-test' && (
              <>
                {console.log('🎯 渲染 ADB 诊断模块页面，selectedKey:', selectedKey)}
                <ComprehensiveAdbPage />
              </>
            )}

            {selectedKey === 'acquisition' && (
              <Card title={`${menuItems.find(item => item.key === selectedKey)?.label} 功能`}>
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🚧</div>
                  <Title level={3} style={{ color: 'var(--text-secondary)' }}>
                    功能开发中
                  </Title>
                  <Text type="secondary">
                    这个功能正在开发中，敬请期待...
                  </Text>
                  <Divider />
                  <Button type="primary" size="large">
                    返回仪表板
                  </Button>
                </div>
              </Card>
            )}

            {selectedKey === 'smart-script-builder' && (
              <SmartScriptBuilderPage />
            )}

            {selectedKey === 'template-library' && (
              <TemplateLibrary />
            )}
            </div>
          </Content>
        </Layout>
      </Layout>
      </App>
    </ConfigProvider>
  );
};

