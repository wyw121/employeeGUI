import React from 'react';
import { Card, Space, Tag, Typography, Checkbox } from 'antd';
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

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect, selected, selectable, checked, onCheckedChange }) => {
  const icon = device.connection_type === 'emulator' ? <DesktopOutlined /> : <UsbOutlined />;
  const borderStyle: React.CSSProperties | undefined =
    selected ? { borderColor: '#ff6b8a' } : (device.status === 'unauthorized' ? { borderColor: '#faad14' } : undefined);
  return (
    <Card size="small" hoverable onClick={() => onSelect?.(device.id)}
      style={borderStyle}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center">
          {selectable && (
            <Checkbox
              checked={!!checked}
              onChange={(e) => onCheckedChange?.(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
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
