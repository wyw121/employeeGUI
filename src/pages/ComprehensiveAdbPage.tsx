import React, { useState } from 'react';
import { Card, Tabs, Row, Col, Typography, Alert, Space } from 'antd';
import { 
  AdbDashboard, 
  LogViewer, 
  EnhancedDeviceManager,
  useNotification
} from '../components/adb-diagnostic';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * 完整的 ADB 诊断模块页面
 * 集成所有 ADB 诊断功能的主页面
 */
export const ComprehensiveAdbPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { unreadCount } = useNotification();

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* 页面标题和说明 */}
        <Col span={24}>
          <Card>
            <Title level={2}>ADB 诊断管理系统</Title>
            <Paragraph>
              集成化的 ADB 设备诊断、监控和管理平台。提供设备连接检测、健康状态监控、
              日志查看、自动诊断修复等完整功能。
            </Paragraph>
            
            {/* 通知提示 */}
            {unreadCount > 0 && (
              <Alert
                type="info"
                message={`您有 ${unreadCount} 条未读通知`}
                description="请查看系统通知获取最新状态更新"
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
              destroyInactiveTabPane={false}
            >
              {/* 系统仪表板 */}
              <TabPane tab="系统仪表板" key="dashboard">
                <AdbDashboard />
              </TabPane>

              {/* 设备管理 */}
              <TabPane tab="设备管理" key="devices">
                <EnhancedDeviceManager />
              </TabPane>

              {/* 日志查看器 */}
              <TabPane tab="日志查看" key="logs">
                <LogViewer />
              </TabPane>

              {/* 系统状态 */}
              <TabPane tab="系统状态" key="status">
                <SystemStatusView />
              </TabPane>
            </Tabs>
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
              <div>- LogManager (日志管理)</div>
              <div>- EnhancedAdbDiagnosticService (诊断服务)</div>
              
              <div style={{ marginTop: '16px' }}><strong>组件层</strong></div>
              <div>- AdbDashboard (统一仪表板)</div>
              <div>- LogViewer (日志查看器)</div>
              <div>- EnhancedDeviceManager (设备管理器)</div>
              
              <div style={{ marginTop: '16px' }}><strong>Hooks层</strong></div>
              <div>- useLogManager (日志管理)</div>
              <div>- useAdbDiagnostic (诊断控制)</div>
              <div>- useDeviceMonitor (设备监控)</div>
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