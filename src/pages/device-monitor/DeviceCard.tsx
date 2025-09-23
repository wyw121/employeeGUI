import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import { UsbOutlined, DesktopOutlined } from '@ant-design/icons';
import type { DeviceCardProps } from './types';

const { Text } = Typography;

const statusTag = (status: string) => {
  const map: Record<string, { color: string; text: string }> = {
    device: { color: 'green', text: '在线' },
    online: { color: 'green', text: '在线' },
    unauthorized: { color: 'gold', text: '未授权' },
    offline: { color: 'default', text: '离线' },
  };
  const cfg = map[status] || { color: 'default', text: status };
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
};

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect }) => {
  const icon = device.connection_type === 'emulator' ? <DesktopOutlined /> : <UsbOutlined />;
  return (
    <Card size="small" hoverable onClick={() => onSelect?.(device.id)}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          {icon}
          <Text strong>{device.id}</Text>
          {statusTag(device.status)}
        </Space>
        <Space size="small">
          <Text type="secondary">连接:</Text>
          <Tag>{device.connection_type}</Tag>
        </Space>
      </Space>
    </Card>
  );
};
