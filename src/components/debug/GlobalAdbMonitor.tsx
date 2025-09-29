/**
 * ADB全局状态监控面板
 * 用于验证GlobalAdbProvider是否正常工作
 */
import React from 'react';
import { Card, Space, Statistic, Tag, Button, Alert } from 'antd';
import { 
  MobileOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { useGlobalAdb } from '../../providers/GlobalAdbProvider';

export const GlobalAdbMonitor: React.FC = () => {
  const {
    devices,
    selectedDevice,
    onlineDevices,
    deviceCount,
    onlineDeviceCount,
    isConnected,
    isReady,
    isHealthy,
    isLoading,
    isInitializing,
    lastError,
    refreshDevices
  } = useGlobalAdb();

  return (
    <Card 
      title="🌐 ADB全局状态监控" 
      size="small"
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={refreshDevices}
          loading={isLoading}
          size="small"
        >
          刷新
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 状态指示器 */}
        <Space wrap>
          <Tag color={isConnected ? 'green' : 'red'}>
            {isConnected ? '已连接' : '未连接'}
          </Tag>
          <Tag color={isReady ? 'green' : 'orange'}>
            {isReady ? '就绪' : '准备中'}
          </Tag>
          <Tag color={isHealthy ? 'green' : 'red'}>
            {isHealthy ? '健康' : '异常'}
          </Tag>
          {isInitializing && <Tag color="blue">初始化中</Tag>}
          {isLoading && <Tag color="blue">加载中</Tag>}
        </Space>

        {/* 设备统计 */}
        <Space>
          <Statistic
            title="总设备数"
            value={deviceCount}
            prefix={<MobileOutlined />}
            valueStyle={{ fontSize: '16px' }}
          />
          <Statistic
            title="在线设备"
            value={onlineDeviceCount}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ fontSize: '16px', color: '#52c41a' }}
          />
          <Statistic
            title="离线设备"
            value={deviceCount - onlineDeviceCount}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ fontSize: '16px', color: '#ff4d4f' }}
          />
        </Space>

        {/* 当前选中设备 */}
        {selectedDevice && (
          <div>
            <strong>当前设备：</strong>
            <Tag color="blue">{selectedDevice.name || selectedDevice.id}</Tag>
            <Tag color={selectedDevice.isOnline() ? 'green' : 'red'}>
              {selectedDevice.isOnline() ? '在线' : '离线'}
            </Tag>
          </div>
        )}

        {/* 错误提示 */}
        {lastError && (
          <Alert
            message="ADB错误"
            description={lastError.message}
            type="error"
            showIcon
            closable
          />
        )}

        {/* 设备列表预览 */}
        <div>
          <strong>设备列表预览：</strong>
          <div style={{ marginTop: '8px' }}>
            {devices.length === 0 ? (
              <Tag>暂无设备</Tag>
            ) : (
              devices.map(device => (
                <Tag 
                  key={device.id}
                  color={device.isOnline() ? 'green' : 'default'}
                  style={{ marginBottom: '4px' }}
                >
                  {device.name || device.id}
                </Tag>
              ))
            )}
          </div>
        </div>

        {/* 调试信息 */}
        <details style={{ fontSize: '12px', color: '#666' }}>
          <summary>调试信息</summary>
          <pre style={{ marginTop: '8px', fontSize: '11px' }}>
            {JSON.stringify({
              deviceCount,
              onlineDeviceCount,
              isConnected,
              isReady,
              isHealthy,
              isLoading,
              isInitializing,
              hasError: !!lastError
            }, null, 2)}
          </pre>
        </details>
      </Space>
    </Card>
  );
};