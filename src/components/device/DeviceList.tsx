import React from 'react';
import { List, Card, Avatar, Tag } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { DeviceInfo } from '../../store/deviceStore';

interface DeviceListProps {
  devices: DeviceInfo[];
  selectedDevice?: string;
  onDeviceSelect?: (deviceId: string) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect,
}) => {
  return (
    <List
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
              title={device.name}
              description={
                <div>
                  <div>ID: {device.id}</div>
                  <div>
                    <Tag color={device.status === 'device' ? 'green' : 'red'}>
                      {device.status}
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