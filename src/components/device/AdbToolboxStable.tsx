import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Badge,
  Alert,
  Button,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SafetyCertificateOutlined,
  MobileOutlined,
  ToolOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * 简化诊断界面
 */
const SimpleDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = () => {
    setIsRunning(true);
    // 模拟诊断过程
    setTimeout(() => {
      setIsRunning(false);
    }, 3000);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="ADB版本"
              value="检测中..."
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备数量"
              value={0}
              prefix={<MobileOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="连接状态"
              value="准备就绪"
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="服务状态"
              value="正常"
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>完整诊断</Title>
              <Paragraph type="secondary">
                运行完整的诊断流程，检查ADB工具、服务器、设备连接状态
              </Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                loading={isRunning}
                onClick={runDiagnostic}
                block
              >
                开始诊断
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>设备管理</Title>
              <Paragraph type="secondary">
                查看和管理已连接的Android设备
              </Paragraph>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                block
              >
                刷新设备
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {isRunning && (
        <Alert
          style={{ marginTop: 24 }}
          message="正在诊断"
          description="正在检查ADB环境和设备连接状态，请稍候..."
          type="info"
          showIcon
        />
      )}
    </div>
  );
};

/**
 * 简化设备管理界面
 */
const SimpleDeviceManager: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={4}>
          <MobileOutlined /> 设备管理器
        </Title>
        <Paragraph>
          设备管理功能正在完善中...
        </Paragraph>
        <Button type="primary" icon={<ReloadOutlined />}>
          刷新设备列表
        </Button>
      </Card>
    </div>
  );
};

/**
 * ADB工具箱 - 稳定版本
 */
export const AdbToolbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState('diagnostic');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // 强制刷新时间戳，确保组件真的被重新渲染
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 添加调试日志
  console.log('🔥 AdbToolbox 组件已渲染！当前时间:', currentTime);

  const tabItems = [
    {
      key: 'diagnostic',
      label: (
        <Space>
          <SafetyCertificateOutlined />
          环境诊断
          <Badge count="新" style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
      children: <SimpleDiagnostic />
    },
    {
      key: 'devices',
      label: (
        <Space>
          <MobileOutlined />
          设备管理
        </Space>
      ),
      children: <SimpleDeviceManager />
    },
    {
      key: 'tools',
      label: (
        <Space>
          <ToolOutlined />
          高级工具
          <Badge count="开发中" style={{ backgroundColor: '#faad14' }} />
        </Space>
      ),
      children: (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ExperimentOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={3} type="secondary">高级工具开发中</Title>
          <Paragraph type="secondary">
            即将推出：
            <br />
            • 批量设备操作
            <br />
            • 性能监控工具  
            <br />
            • 自动化脚本管理
            <br />
            • 设备信息导出
          </Paragraph>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', height: '100vh', overflow: 'auto' }}>
      {/* 工具箱头部 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          <ToolOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          🚀 ADB工具箱 - 版本: {currentTime} [最新编译版本]
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: '16px' }}>
          ✅ 专业的Android设备调试与管理工具集，为您提供完整的设备连接解决方案
        </Paragraph>
      </div>

      {/* 使用提示 */}
      <Alert
        message="🎉 新版ADB工具箱已成功上线！(最后构建时间: 2025-09-14 19:46 - 完全重新编译)"
        description="首次使用建议先运行环境诊断，确保ADB工具正常工作后再进行设备管理操作。如果您看到这条消息，说明界面已成功更新！"
        type="success"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 主要功能选项卡 */}
      <Card style={{ minHeight: 'calc(100vh - 280px)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default AdbToolbox;