import React from 'react';
import { List, Card, Avatar, Tag, Spin } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { DeviceInfo } from '../../store/deviceStore';

interface DeviceListProps {
  devices: DeviceInfo[];
  selectedDevice?: string;
  onDeviceSelect?: (deviceId: string) => void;
  loading?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spin size="large" tip="正在加载设备列表..." />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MobileOutlined className="text-4xl mb-4" />
        <p>暂无设备</p>
        <p className="text-sm">请检查设备连接或点击刷新按钮</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'device':
        return 'green';
      case 'offline':
        return 'red';
      case 'unauthorized':
        return 'orange';
      case 'connecting':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'device':
        return '已连接';
      case 'offline':
        return '离线';
      case 'unauthorized':
        return '未授权';
      case 'connecting':
        return '连接中';
      default:
        return status;
    }
  };

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
              title={device.name || device.id}
              description={
                <div>
                  <div>ID: {device.id}</div>
                  <div>
                    <Tag color={getStatusColor(device.status)}>
                      {getStatusText(device.status)}
                    </Tag>
                    {device.isEmulator && (
                      <Tag color="purple">模拟器</Tag>
                    )}
                  </div>
                  {device.model && (
                    <div className="text-xs text-gray-500 mt-1">
                      型号: {device.model}
                    </div>
                  )}
                </div>
              }
            />
          </Card>
        </List.Item>
      )}
    />
  );
};