import {
    AimOutlined,
    BarChartOutlined,
    CheckCircleOutlined,
    MobileOutlined,
    ThunderboltOutlined,
    UserOutlined
} from '@ant-design/icons';
import {
    Alert,
    Badge,
    Button,
    Card,
    ConfigProvider,
    Space,
    theme
} from 'antd';
import React from 'react';

interface ModernDashboardProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  balance: number;
}

/**
 * 集成Ant Design的现代化仪表板组件
 * 结合了Sindre风格的深色主题和Ant Design的专业组件
 */
export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  currentPage,
  onPageChange,
  balance
}) => {
  const navigation = [
    {
      key: 'devices',
      label: 'Device Management',
      description: '设备连接和管理',
      icon: <MobileOutlined />,
      color: '#1890ff'
    },
    {
      key: 'adb-test',
      label: 'ADB Testing',
      description: '雷电模拟器测试',
      icon: <ThunderboltOutlined />,
      color: '#faad14'
    },
    {
      key: 'contacts',
      label: 'Contact Automation',
      description: '通讯录自动化',
      icon: <UserOutlined />,
      color: '#722ed1'
    },
    {
      key: 'precise-acquisition',
      label: 'Precise Acquisition',
      description: '精准获客系统',
      icon: <AimOutlined />,
      color: '#52c41a'
    },
    {
      key: 'statistics',
      label: 'Statistics',
      description: '数据统计分析',
      icon: <BarChartOutlined />,
      color: '#eb2f96'
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#ff6b8a',
          colorBgContainer: '#161b22',
          colorBgElevated: '#21262d',
          borderRadius: 16,
          colorText: '#f0f6fc',
          colorTextSecondary: '#8b949e',
          colorBorder: '#30363d',
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.05)',
            colorBorder: 'rgba(255, 255, 255, 0.1)',
          },
          Button: {
            borderRadius: 12,
            controlHeight: 40,
            fontWeight: 600,
          }
        }
      }}
    >
      <div className="p-6 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        {/* 顶部欢迎区域 */}
        <Card
          className="mb-6"
          style={{
            background: 'linear-gradient(135deg, #ff6b8a 0%, #4ecdc4 50%, #a8e6cf 100%)',
            border: 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-2xl font-bold mb-1">
                🦄 Flow Farm Dashboard
              </h1>
              <p className="text-white/80 text-lg">
                Employee Automation Platform
              </p>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm mb-1">Account Balance</div>
              <div className="text-white text-3xl font-bold">
                ¥{balance.toLocaleString()}
              </div>
              <Badge
                count={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                offset={[10, 0]}
              >
                <span className="text-white/80 text-sm">System Operational</span>
              </Badge>
            </div>
          </div>
        </Card>

        {/* 功能导航卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {navigation.map((item) => (
            <Card
              key={item.key}
              hoverable
              className={`transition-all duration-300 ${
                currentPage === item.key ? 'ring-2 ring-pink-400' : ''
              }`}
              style={{
                background: currentPage === item.key
                  ? 'rgba(255, 107, 138, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: currentPage === item.key
                  ? '1px solid rgba(255, 107, 138, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => onPageChange(item.key)}
            >
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                  style={{
                    background: item.color,
                    color: 'white'
                  }}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                    {item.label}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                </div>
                {currentPage === item.key && (
                  <div className="w-3 h-3 rounded-full bg-pink-400 animate-pulse"></div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* 快速操作区域 */}
        <Card title="Quick Actions" className="mb-6">
          <Space size="large" wrap>
            <Button
              type="primary"
              size="large"
              icon={<MobileOutlined />}
              style={{
                background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                border: 'none'
              }}
            >
              Connect Device
            </Button>
            <Button
              size="large"
              icon={<ThunderboltOutlined />}
              style={{
                background: 'rgba(250, 173, 20, 0.1)',
                borderColor: '#faad14',
                color: '#faad14'
              }}
            >
              Test ADB
            </Button>
            <Button
              size="large"
              icon={<UserOutlined />}
              style={{
                background: 'rgba(114, 46, 209, 0.1)',
                borderColor: '#722ed1',
                color: '#722ed1'
              }}
            >
              Import Contacts
            </Button>
            <Button
              size="large"
              icon={<AimOutlined />}
              style={{
                background: 'rgba(82, 196, 26, 0.1)',
                borderColor: '#52c41a',
                color: '#52c41a'
              }}
            >
              Start Automation
            </Button>
          </Space>
        </Card>

        {/* 状态信息 */}
        <Alert
          message="All Systems Operational"
          description="Flow Farm automation platform is running smoothly. All connected devices are online and ready for tasks."
          type="success"
          showIcon
          style={{
            background: 'rgba(82, 196, 26, 0.1)',
            borderColor: 'rgba(82, 196, 26, 0.3)',
            color: 'var(--text-primary)'
          }}
        />
      </div>
    </ConfigProvider>
  );
};

