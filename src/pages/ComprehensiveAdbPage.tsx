import React, { useState } from 'react';
import { Card, Tabs, Row, Col, Typography, Alert, Space } from 'antd';
import { useAdb } from '../application/hooks/useAdb';
import RealTimeDeviceMonitor from '../components/device/RealTimeDeviceMonitor';
import AdbPathTestPage from './AdbPathTestPage';
import AdbAuthorizationWizard from './AdbAuthorizationWizard';

const { Title, Paragraph } = Typography;

/**
 * 完整的 ADB 诊断模块页面
 * 集成所有 ADB 诊断功能的主页面
 */
export const ComprehensiveAdbPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { devices, isLoading } = useAdb();

  // 定义 Tab 项目
  const tabItems = [
    {
      key: 'dashboard',
      label: '系统仪表板',
      children: (
        <Card title="ADB系统状态">
          <p>系统已重构为统一的DDD架构</p>
          <p>设备数量: {devices.length}</p>
          <p>在线设备: {devices.filter(d => d.isOnline()).length}</p>
          <p>状态: {isLoading ? '加载中' : '正常'}</p>
        </Card>
      )
    },
    {
      key: 'auth-wizard',
      label: 'ADB 授权向导',
      children: (
        <AdbAuthorizationWizard />
      )
    },
    {
      key: 'realtime-monitor',
      label: '实时设备监控',
      children: (
        <div style={{ padding: '0', background: 'transparent' }}>
          <RealTimeDeviceMonitor />
        </div>
      )
    },
    {
      key: 'adb-path-test',
      label: 'ADB路径检测',
      children: (
        <div style={{ padding: '0', background: 'transparent' }}>
          <AdbPathTestPage />
        </div>
      )
    },
    {
      key: 'devices',
      label: '设备管理',
      children: (
        <Card title="设备列表">
          {devices.map(device => (
            <div key={device.id} style={{ marginBottom: 8 }}>
              {device.getDisplayName()} - {device.isOnline() ? '在线' : '离线'}
            </div>
          ))}
        </Card>
      )
    },
    {
      key: 'logs',
      label: '日志查看',
      children: (
        <Card title="系统日志">
          <p>统一日志系统 - 通过 useAdb() 接口访问</p>
        </Card>
      )
    },
    {
      key: 'status',
      label: '系统状态',
      children: <SystemStatusView />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* 页面标题和说明 */}
        <Col span={24}>
          <Card>
            <Title level={2}>ADB 诊断管理系统</Title>
            <Paragraph>
              集成化的 ADB 设备诊断、监控和管理平台。包含实时设备监控、ADB路径自动检测、
              设备连接管理、健康状态监控、日志查看、自动诊断修复等完整功能。
            </Paragraph>
            
            {/* 设备状态提示 */}
            {devices.length > 0 && (
              <Alert
                type="info"
                message={`当前有 ${devices.filter(d => d.isOnline()).length} 台设备在线`}
                description="设备状态实时更新，支持完整的ADB管理功能"
                showIcon
                closable
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>
        </Col>

        {/* 主要功能区域 */}
        <Col span={24}>
          <Card>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="large"
              destroyOnHidden={false}
              items={tabItems}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

/**
 * 系统状态概览组件
 * 显示整个 ADB 系统的运行状态
 */
const SystemStatusView: React.FC = () => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Alert
            type="success"
            message="模块集成状态"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>✅ 日志管理系统 - 已激活</div>
                <div>✅ 增强诊断服务 - 已激活</div>
                <div>✅ 设备监控模块 - 已激活</div>
                <div>✅ 通知管理系统 - 已激活</div>
                <div>✅ 统一仪表板 - 已激活</div>
                <div>✅ 自定义 Hooks - 已集成</div>
              </Space>
            }
            showIcon
          />
        </Col>

        <Col span={12}>
          <Card title="模块架构" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><strong>服务层</strong></div>
              <div>- AdbApplicationService (统一应用服务)</div>
              <div>- adbStore (状态管理)</div>
              
              <div style={{ marginTop: '16px' }}><strong>组件层</strong></div>
              <div>- 统一使用 useAdb() Hook</div>
              <div>- DeviceList (设备列表)</div>
              <div>- 各种业务组件</div>
              
              <div style={{ marginTop: '16px' }}><strong>Hooks层</strong></div>
              <div>- useAdb (统一ADB接口)</div>
              <div>- useLogManager (日志管理)</div>
              <div>- ✅ 设备监控已统一到 useAdb() 中</div>
              <div>- useNotification (通知管理)</div>
            </Space>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="设计原则" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><strong>高内聚低耦合</strong></div>
              <div>- 每个模块专注单一职责</div>
              <div>- 模块间通过定义良好的接口交互</div>
              <div>- 服务层与UI层分离</div>
              
              <div style={{ marginTop: '16px' }}><strong>可维护性</strong></div>
              <div>- TypeScript 类型安全</div>
              <div>- 统一的错误处理</div>
              <div>- 完整的日志记录</div>
              
              <div style={{ marginTop: '16px' }}><strong>可扩展性</strong></div>
              <div>- 插件化架构</div>
              <div>- 响应式设计</div>
              <div>- 模块化组件</div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ComprehensiveAdbPage;

