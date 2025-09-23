import React from 'react';
import { Card, Tag, Typography } from 'antd';
import type { EventLogProps } from './types';

const { Text } = Typography;

function fmtEvent(event: any): string {
  const et = event?.event_type;
  if (!et) return '无';
  if ('DeviceConnected' in et) return `设备连接: ${et.DeviceConnected}`;
  if ('DeviceDisconnected' in et) return `设备断开: ${et.DeviceDisconnected}`;
  if ('DevicesChanged' in et) return '设备状态变化';
  if ('InitialList' in et) return '初始设备列表';
  return '未知事件';
}

export const DeviceEventLog: React.FC<EventLogProps> = ({ lastEvent }) => {
  return (
    <Card size="small" title="最近事件">
      {lastEvent ? (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>事件类型:</Text><br />
            <Text>{fmtEvent(lastEvent)}</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>时间戳:</Text><br />
            <Text>{new Date(lastEvent.timestamp * 1000).toLocaleString()}</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>设备数量:</Text><br />
            <Text>{lastEvent.devices.length}</Text>
          </div>
          <div>
            {lastEvent.devices.map((d, idx) => (
              <Tag key={idx} style={{ marginBottom: 4 }}>{d.id}: {d.status}</Tag>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: '#999' }}>暂无事件</div>
      )}
    </Card>
  );
};
