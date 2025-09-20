import React from 'react';
import { Card, Tag, Button, Space, List, Statistic, Row, Col, Alert, Typography } from 'antd';
import { 
  MobileOutlined, 
  WifiOutlined, 
  UsbOutlined, 
  DesktopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRealTimeDevices } from '../../application/hooks/useRealTimeDevices';
import type { TrackedDevice } from '../../infrastructure/RealTimeDeviceTracker';

const { Title, Text, Paragraph } = Typography;

/**
 * 实时ADB设备监控组件
 * 展示基于host:track-devices协议的事件驱动设备管理
 */
export const RealTimeDeviceMonitor: React.FC = () => {
  const {
    devices,
    onlineDevices,
    offlineDevices,
    usbDevices,
    emulatorDevices,
    deviceStats,
    startTracking,
    stopTracking,
    refreshDevices,
    isTracking,
    error,
    lastEvent,
  } = useRealTimeDevices();

  /**
   * 获取设备状态标签
   */
  const getDeviceStatusTag = (device: TrackedDevice) => {
    const statusConfig = {
      device: { color: 'success', text: '在线' },
      online: { color: 'success', text: '在线' },
      offline: { color: 'default', text: '离线' },
      unauthorized: { color: 'warning', text: '未授权' },
      no_permissions: { color: 'error', text: '无权限' },
    };

    const config = statusConfig[device.status as keyof typeof statusConfig] || 
                   { color: 'default', text: device.status };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 获取连接类型图标
   */
  const getConnectionIcon = (device: TrackedDevice) => {
    return device.connection_type === 'emulator' 
      ? <DesktopOutlined style={{ color: '#1890ff' }} />
      : <UsbOutlined style={{ color: '#52c41a' }} />;
  };

  /**
   * 格式化事件类型
   */
  const formatEventType = (eventType: any) => {
    if ('DeviceConnected' in eventType) {
      return `设备连接: ${eventType.DeviceConnected}`;
    } else if ('DeviceDisconnected' in eventType) {
      return `设备断开: ${eventType.DeviceDisconnected}`;
    } else if ('DevicesChanged' in eventType) {
      return '设备状态变化';
    } else if ('InitialList' in eventType) {
      return '初始设备列表';
    }
    return '未知事件';
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 标题和控制面板 */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <MobileOutlined /> 实时ADB设备监控
              </Title>
              <Paragraph style={{ margin: '8px 0 0 0' }} type="secondary">
                基于 <Text code>host:track-devices</Text> 协议的事件驱动设备管理，告别轮询！
              </Paragraph>
            </div>
            <Space>
              <Button
                type={isTracking ? "default" : "primary"}
                icon={isTracking ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isTracking ? stopTracking : startTracking}
                loading={false}
              >
                {isTracking ? '停止跟踪' : '启动跟踪'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={refreshDevices}
                disabled={!isTracking}
              >
                刷新
              </Button>
            </Space>
          </div>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert
            type="error"
            message="设备跟踪错误"
            description={error}
            showIcon
            closable
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 跟踪状态 */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isTracking ? '#52c41a' : '#d9d9d9',
                  animation: isTracking ? 'pulse 2s infinite' : 'none',
                }} />
                <Text strong>跟踪状态: {isTracking ? '运行中' : '已停止'}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">
                协议: <Text code>host:track-devices</Text>
              </Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">
                连接: ADB Server (127.0.0.1:5037)
              </Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">
                模式: 🚀 事件驱动 (非轮询)
              </Text>
            </Col>
          </Row>
        </Card>

        {/* 设备统计 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总设备数"
                value={deviceStats.total}
                valueStyle={{ color: '#1890ff' }}
                prefix={<MobileOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="在线设备"
                value={deviceStats.online}
                valueStyle={{ color: '#52c41a' }}
                prefix={<WifiOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="USB设备"
                value={deviceStats.usb}
                valueStyle={{ color: '#faad14' }}
                prefix={<UsbOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="模拟器"
                value={deviceStats.emulator}
                valueStyle={{ color: '#722ed1' }}
                prefix={<DesktopOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 设备列表 */}
          <Col span={16}>
            <Card 
              title={`设备列表 (${devices.length})`}
              extra={
                isTracking && (
                  <Tag color="processing" icon={<WifiOutlined />}>
                    实时监控中
                  </Tag>
                )
              }
            >
              {devices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <MobileOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>暂无设备连接</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    {isTracking ? '等待设备连接...' : '请启动设备跟踪'}
                  </div>
                </div>
              ) : (
                <List
                  dataSource={devices}
                  renderItem={(device) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={getConnectionIcon(device)}
                        title={
                          <Space>
                            <Text strong>{device.id}</Text>
                            {getDeviceStatusTag(device)}
                          </Space>
                        }
                        description={
                          <Space>
                            <Text type="secondary">连接方式:</Text>
                            <Tag>{device.connection_type}</Tag>
                            <Text type="secondary">状态:</Text>
                            <Text>{device.status}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          {/* 事件日志 */}
          <Col span={8}>
            <Card title="最近事件" size="small">
              {lastEvent ? (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>事件类型:</Text>
                    <br />
                    <Text>{formatEventType(lastEvent.event_type)}</Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>时间戳:</Text>
                    <br />
                    <Text>{new Date(lastEvent.timestamp * 1000).toLocaleString()}</Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>设备数量:</Text>
                    <br />
                    <Text>{lastEvent.devices.length} 个设备</Text>
                  </div>
                  {lastEvent.devices.map((device, index) => (
                    <Tag key={index} style={{ marginBottom: '4px' }}>
                      {device.id}: {device.status}
                    </Tag>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  <div>暂无事件</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    等待设备变化事件...
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 技术说明 */}
        <Card 
          style={{ marginTop: '16px' }} 
          title="🚀 技术优势" 
          size="small"
        >
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ padding: '12px', background: '#f6ffed', borderRadius: '6px' }}>
                <Text strong style={{ color: '#52c41a' }}>✅ 实时响应</Text>
                <br />
                <Text type="secondary">基于TCP长连接，设备状态变化即时通知</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '12px', background: '#fff7e6', borderRadius: '6px' }}>
                <Text strong style={{ color: '#faad14' }}>⚡ 零轮询</Text>
                <br />
                <Text type="secondary">使用host:track-devices协议，告别定时查询</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '12px', background: '#f0f5ff', borderRadius: '6px' }}>
                <Text strong style={{ color: '#1890ff' }}>🔧 资源节约</Text>
                <br />
                <Text type="secondary">减少ADB命令执行，降低系统开销</Text>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default RealTimeDeviceMonitor;