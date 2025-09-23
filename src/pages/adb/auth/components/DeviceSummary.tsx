import React, { useMemo } from 'react';
import { Space, Tag, Typography, List } from 'antd';
import { Device, DeviceStatus } from '../../../../domain/adb';

const { Text } = Typography;

export interface DeviceSummaryProps {
  devices: Device[];
  maxItems?: number;
}

export const DeviceSummary: React.FC<DeviceSummaryProps> = ({ devices, maxItems = 5 }) => {
  const summary = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === DeviceStatus.ONLINE || d.isOnline()).length;
    const unauthorized = devices.filter(d => d.status === DeviceStatus.UNAUTHORIZED).length;
    const offline = devices.filter(d => d.status === DeviceStatus.OFFLINE).length;
    const items = devices.slice(0, maxItems);
    return { total, online, unauthorized, offline, items };
  }, [devices, maxItems]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        设备统计：
        <Space size="small">
          <Tag>总数 {summary.total}</Tag>
          <Tag color="green">在线 {summary.online}</Tag>
          <Tag color="orange">未授权 {summary.unauthorized}</Tag>
          <Tag color="red">离线 {summary.offline}</Tag>
        </Space>
      </div>
      <List
        size="small"
        bordered
        dataSource={summary.items}
        renderItem={(d) => (
          <List.Item>
            <Space>
              <Text code>{d.id}</Text>
              <Text>{d.getDisplayName()}</Text>
              {d.status === DeviceStatus.ONLINE && <Tag color="green">online</Tag>}
              {d.status === DeviceStatus.UNAUTHORIZED && <Tag color="orange">unauthorized</Tag>}
              {d.status === DeviceStatus.OFFLINE && <Tag color="red">offline</Tag>}
              {d.status === DeviceStatus.UNKNOWN && <Tag>unknown</Tag>}
            </Space>
          </List.Item>
        )}
      />
    </Space>
  );
};

export default DeviceSummary;
