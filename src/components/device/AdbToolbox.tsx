import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Badge,
  Alert
} from 'antd';
import {
  SafetyCertificateOutlined,
  MobileOutlined,
  ToolOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { SmartAdbDiagnostic } from './SmartAdbDiagnostic';
import { SmartDeviceManager } from './SmartDeviceManager';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * ADB工具箱 - 整合所有ADB相关功能
 * 为客户和朋友提供完整的设备管理解决方案
 */
export const AdbToolbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState('diagnostic');

  const tabItems = [
    {
      key: 'diagnostic',
      label: (
        <Space>
          <SafetyCertificateOutlined />
          环境诊断
          <Badge count="智能" style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
      children: <SmartAdbDiagnostic />
    },
    {
      key: 'devices',
      label: (
        <Space>
          <MobileOutlined />
          设备管理
        </Space>
      ),
      children: <SmartDeviceManager />
    },
    {
      key: 'tools',
      label: (
        <Space>
          <ToolOutlined />
          工具集合
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
          ADB工具箱
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: '16px' }}>
          专业的Android设备调试与管理工具集，为您提供完整的设备连接解决方案
        </Paragraph>
      </div>

      {/* 使用提示 */}
      <Alert
        message="使用建议"
        description="首次使用建议先运行环境诊断，确保ADB工具正常工作后再进行设备管理操作。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 主要功能选项卡 */}
      <Card style={{ minHeight: 'calc(100vh - 200px)' }}>
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