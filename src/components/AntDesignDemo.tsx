import {
    BarChartOutlined,
    CheckCircleOutlined,
    DisconnectOutlined,
    MobileOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    SyncOutlined,
    TargetOutlined,
    ThunderboltOutlined,
    UserOutlined
} from '@ant-design/icons';
import {
    Alert,
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
    Table,
    Tag,
    theme,
    Typography
} from 'antd';
import React, { useState } from 'react';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// 模拟设备数据
const deviceData = [
  {
    key: '1',
    name: '雷电模拟器 1',
    id: '127.0.0.1:5555',
    status: 'online',
    platform: 'Android 7.1',
    tasks: 15,
    lastActive: '2分钟前'
  },
  {
    key: '2',
    name: '雷电模拟器 2',
    id: '127.0.0.1:5556',
    status: 'offline',
    platform: 'Android 9.0',
    tasks: 8,
    lastActive: '1小时前'
  }
];

const deviceColumns = [
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    render: (text: string, record: any) => (
      <Space>
        <Avatar icon={<MobileOutlined />} style={{ backgroundColor: record.status === 'online' ? '#52c41a' : '#ff4d4f' }} />
        <div>
          <div style={{ color: 'var(--text-primary)' }}>{text}</div>
          <Text type="secondary">{record.id}</Text>
        </div>
      </Space>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'online' ? 'success' : 'error'} icon={status === 'online' ? <CheckCircleOutlined /> : <DisconnectOutlined />}>
        {status === 'online' ? '在线' : '离线'}
      </Tag>
    ),
  },
  {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
  },
  {
    title: '任务数',
    dataIndex: 'tasks',
    key: 'tasks',
    render: (tasks: number) => (
      <Badge count={tasks} style={{ backgroundColor: '#722ed1' }} />
    ),
  },
  {
    title: '最后活跃',
    dataIndex: 'lastActive',
    key: 'lastActive',
  },
  {
    title: '操作',
    key: 'action',
    render: (_: any, record: any) => (
      <Space>
        <Button size="small" icon={<PlayCircleOutlined />} type="primary">
          启动
        </Button>
        <Button size="small" icon={<PauseCircleOutlined />}>
          停止
        </Button>
      </Space>
    ),
  },
];

export const AntDesignIntegrationDemo: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('dashboard');

  const menuItems = [
    {
      key: 'dashboard',
      icon: <BarChartOutlined />,
      label: '仪表板',
    },
    {
      key: 'devices',
      icon: <MobileOutlined />,
      label: '设备管理',
    },
    {
      key: 'adb-test',
      icon: <ThunderboltOutlined />,
      label: 'ADB测试',
    },
    {
      key: 'contacts',
      icon: <UserOutlined />,
      label: '通讯录管理',
    },
    {
      key: 'acquisition',
      icon: <TargetOutlined />,
      label: '精准获客',
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
            colorBgHeader: '#161b22',
            colorBgSider: '#161b22',
            colorBgBody: '#0d1117',
          },
          Menu: {
            colorBgContainer: '#161b22',
            colorItemBg: 'transparent',
            colorItemBgSelected: 'rgba(255, 107, 138, 0.1)',
            colorItemTextSelected: '#ff6b8a',
            colorItemBgHover: 'rgba(255, 255, 255, 0.05)',
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
          <Content style={{ margin: '24px', background: '#0d1117' }}>
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
                      prefix={<TargetOutlined />}
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
              <Card title="设备管理" extra={
                <Space>
                  <Button type="primary" icon={<SyncOutlined />}>
                    刷新设备
                  </Button>
                  <Button icon={<PlayCircleOutlined />}>
                    批量启动
                  </Button>
                </Space>
              }>
                <Alert
                  message="设备连接状态"
                  description="当前有 1 台设备在线，1 台设备离线。请检查ADB连接。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Table
                  dataSource={deviceData}
                  columns={deviceColumns}
                  pagination={false}
                  size="middle"
                />
              </Card>
            )}

            {['adb-test', 'contacts', 'acquisition'].includes(selectedKey) && (
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
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
