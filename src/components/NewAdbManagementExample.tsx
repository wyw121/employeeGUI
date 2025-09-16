import React from 'react';
import { Card, Button, Typography, Space, Tag, Alert, List, Statistic, Row, Col } from 'antd';
import { 
  ReloadOutlined, 
  PlayCircleOutlined, 
  StopOutlined, 
  SettingOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { Device } from '../domain/adb';

const { Title, Text } = Typography;

/**
 * 新架构ADB管理组件示例
 * 展示如何使用统一的useAdb Hook
 */
export const NewAdbManagementExample: React.FC = () => {
  const {
    // 状态
    devices,
    selectedDevice,
    onlineDevices,
    connection,
    diagnosticSummary,
    
    // 计算属性
    deviceCount,
    onlineDeviceCount,
    isConnected,
    isReady,
    isHealthy,
    hasErrors,
    adbPath,
    
    // UI状态
    isLoading,
    isInitializing,
    lastError,
    
    // 操作方法
    refreshDevices,
    connectToEmulators,
    selectDevice,
    startAdbServer,
    restartAdbServer,
    runQuickDiagnostic,
    executeAutoFix,
    quickConnect,
    quickFix,
    clearError
  } = useAdb();

  const handleQuickStart = async () => {
    try {
      await quickConnect();
    } catch (error) {
      console.error('Quick start failed:', error);
    }
  };

  const handleQuickFix = async () => {
    try {
      const success = await quickFix();
      if (success) {
        console.log('Quick fix completed successfully');
      }
    } catch (error) {
      console.error('Quick fix failed:', error);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>🔄 重构后的ADB管理界面</Title>
      
      {/* 错误提示 */}
      {lastError && (
        <Alert
          type="error"
          message="操作失败"
          description={lastError.message}
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 整体状态卡片 */}
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>ADB连接状态</span>
            {isHealthy && <Tag color="green">健康</Tag>}
            {hasErrors && <Tag color="red">异常</Tag>}
          </Space>
        }
        style={{ marginBottom: 16 }}
        loading={isInitializing}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="连接状态"
              value={isConnected ? "已连接" : "未连接"}
              prefix={isConnected ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="设备总数"
              value={deviceCount}
              prefix={<MobileOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="在线设备"
              value={onlineDeviceCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="ADB路径"
              value={adbPath}
              prefix={<SettingOutlined />}
            />
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={handleQuickStart}
              loading={isLoading}
            >
              一键连接
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={refreshDevices}
              loading={isLoading}
            >
              刷新设备
            </Button>
            <Button 
              icon={<SettingOutlined />}
              onClick={restartAdbServer}
              loading={isLoading}
            >
              重启服务器
            </Button>
            <Button 
              icon={<CheckCircleOutlined />}
              onClick={runQuickDiagnostic}
              loading={isLoading}
            >
              快速诊断
            </Button>
            <Button 
              type="default"
              icon={<WarningOutlined />}
              onClick={handleQuickFix}
              loading={isLoading}
              disabled={!hasErrors}
            >
              一键修复
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        {/* 设备列表 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <MobileOutlined />
                <span>设备列表</span>
                <Tag color="blue">{deviceCount}</Tag>
              </Space>
            }
            style={{ height: 400 }}
          >
            {devices.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
                <MobileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>暂无连接的设备</div>
                <Button 
                  type="link" 
                  onClick={connectToEmulators}
                  loading={isLoading}
                >
                  尝试连接模拟器
                </Button>
              </div>
            ) : (
              <List
                dataSource={devices}
                renderItem={(device: Device) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedDevice?.id === device.id ? '#f0f8ff' : 'transparent'
                    }}
                    onClick={() => selectDevice(device.id)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{device.getDisplayName()}</span>
                          <Tag color={device.isOnline() ? 'green' : 'red'}>
                            {device.status}
                          </Tag>
                          {device.isEmulator() && <Tag color="blue">模拟器</Tag>}
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary">ID: {device.id}</Text>
                          {device.model && (
                            <div>
                              <Text type="secondary">型号: {device.model}</Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 诊断信息 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined />
                <span>诊断信息</span>
                {diagnosticSummary && (
                  <Tag color={diagnosticSummary.isHealthy() ? 'green' : 'orange'}>
                    健康度: {diagnosticSummary.getHealthPercentage()}%
                  </Tag>
                )}
              </Space>
            }
            style={{ height: 400 }}
          >
            {diagnosticSummary ? (
              <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Statistic
                      title="总检查项"
                      value={diagnosticSummary.totalChecks}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="错误"
                      value={diagnosticSummary.errorCount}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="警告"
                      value={diagnosticSummary.warningCount}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                </Row>

                {diagnosticSummary.autoFixableCount > 0 && (
                  <Alert
                    type="info"
                    message={`检测到 ${diagnosticSummary.autoFixableCount} 个可自动修复的问题`}
                    action={
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => executeAutoFix()}
                        loading={isLoading}
                      >
                        自动修复
                      </Button>
                    }
                    style={{ marginBottom: 16 }}
                  />
                )}

                {diagnosticSummary.isHealthy() && (
                  <Alert
                    type="success"
                    message="ADB环境运行正常"
                    description="所有检查项目都通过，可以正常使用ADB功能"
                    showIcon
                  />
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>暂无诊断信息</div>
                <Button 
                  type="link" 
                  onClick={runQuickDiagnostic}
                  loading={isLoading}
                >
                  运行诊断
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 选中设备详情 */}
      {selectedDevice && (
        <Card 
          title={
            <Space>
              <MobileOutlined />
              <span>设备详情</span>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>设备ID:</Text> {selectedDevice.id}
            </Col>
            <Col span={8}>
              <Text strong>设备名称:</Text> {selectedDevice.getDisplayName()}
            </Col>
            <Col span={8}>
              <Text strong>设备状态:</Text> 
              <Tag color={selectedDevice.isOnline() ? 'green' : 'red'}>
                {selectedDevice.status}
              </Tag>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Text strong>设备类型:</Text> 
              <Tag color="blue">{selectedDevice.type}</Tag>
            </Col>
            {selectedDevice.model && (
              <Col span={8}>
                <Text strong>设备型号:</Text> {selectedDevice.model}
              </Col>
            )}
            {selectedDevice.product && (
              <Col span={8}>
                <Text strong>产品名称:</Text> {selectedDevice.product}
              </Col>
            )}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default NewAdbManagementExample;

