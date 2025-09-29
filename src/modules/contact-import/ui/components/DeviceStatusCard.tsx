/**
 * 示例：设备状态卡片组件
 * 演示如何使用统一的ContactImportProvider
 */
import React from 'react';
import { Card, Button, Tag, Space } from 'antd';
import { useContactImportContext } from '../providers';

export const DeviceStatusCard: React.FC = () => {
  // 从Provider获取所有需要的状态和操作
  const { 
    devices, 
    selectedDevice, 
    selectDevice,
    refreshDevices,
    validateDevice,
    getDeviceStatusText 
  } = useContactImportContext();

  const onlineDevices = devices.filter(device => device.isOnline);

  return (
    <Card 
      title="设备状态" 
      extra={
        <Button 
          type="primary" 
          onClick={() => refreshDevices()}
          loading={devices.length === 0}
        >
          刷新设备
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <strong>在线设备: {onlineDevices.length} / {devices.length}</strong>
        </div>
        
        {devices.map(device => (
          <div key={device.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{device.name || device.id}</span>
            <Space>
              <Tag color={device.isOnline ? 'green' : 'red'}>
                {getDeviceStatusText(device)}
              </Tag>
              <Button 
                size="small"
                type={selectedDevice?.id === device.id ? 'primary' : 'default'}
                onClick={() => selectDevice(device.id)}
                disabled={!device.isOnline}
              >
                {selectedDevice?.id === device.id ? '已选择' : '选择'}
              </Button>
              <Button 
                size="small"
                onClick={() => validateDevice(device.id)}
              >
                验证
              </Button>
            </Space>
          </div>
        ))}
        
        {devices.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999' }}>
            暂无设备
          </div>
        )}
      </Space>
    </Card>
  );
};