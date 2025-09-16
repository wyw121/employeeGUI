import React from 'react';
import { List, Card, Avatar, Tag } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { Device } from '../../domain/adb/entities/Device';

interface DeviceListProps {
  devices: Device[];
  selectedDevice?: string;
  onDeviceSelect?: (deviceId: string) => void;
  onConnect?: (device: Device) => void;
  onDisconnect?: (device: Device) => void;
  isLoading?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect,
  onConnect,
  onDisconnect,
  isLoading,
}) => {
  return (
    <List
      loading={isLoading}
      dataSource={devices}
      renderItem={(device) => (
        <List.Item
          onClick={() => onDeviceSelect?.(device.id)}
          style={{
            cursor: 'pointer',
            backgroundColor: selectedDevice === device.id ? '#f0f8ff' : 'transparent',
          }}
        >
          <Card style={{ width: '100%' }}>
            <Card.Meta
              avatar={<Avatar icon={<MobileOutlined />} />}
              title={device.getDisplayName()}
              description={
                <div>
                  <div>ID: {device.id}</div>
                  <div>
                    <Tag color={device.isOnline() ? 'green' : 'red'}>
                      {device.isOnline() ? 'online' : 'offline'}
                    </Tag>
                  </div>
                </div>
              }
            />
          </Card>
        </List.Item>
      )}
    />
  );
};