import React, { useEffect, useRef, useState } from 'react';
import { Card, List, Tag } from 'antd';
import type { DeviceChangeEvent } from '../../infrastructure/RealTimeDeviceTracker';

interface Props {
  lastEvent: DeviceChangeEvent | null;
  max?: number;
}

export const DeviceEventStream: React.FC<Props> = ({ lastEvent, max = 50 }) => {
  const [events, setEvents] = useState<DeviceChangeEvent[]>([]);
  const ref = useRef<DeviceChangeEvent | null>(null);

  useEffect(() => {
    if (!lastEvent) return;
    if (ref.current === lastEvent) return;
    ref.current = lastEvent;
    setEvents(prev => {
      const next = [lastEvent, ...prev];
      return next.slice(0, max);
    });
  }, [lastEvent, max]);

  const renderType = (e: DeviceChangeEvent) => {
    const asText = (v: unknown) => typeof v === 'string' ? v : JSON.stringify(v);
    if ('DeviceConnected' in e) return <Tag color="green">连接 {asText((e as any).DeviceConnected)}</Tag>;
    if ('DeviceDisconnected' in e) return <Tag>断开 {asText((e as any).DeviceDisconnected)}</Tag>;
    if ('DevicesChanged' in e) return <Tag color="blue">状态变化</Tag>;
    if ('InitialList' in e) return <Tag color="gold">初始列表</Tag>;
    return <Tag>未知</Tag>;
  };

  return (
    <Card title="事件流 (最近)">
      <List
        size="small"
        dataSource={events}
        renderItem={(e, idx) => (
          <List.Item>
            {renderType(e)}
          </List.Item>
        )}
      />
    </Card>
  );
};

export default DeviceEventStream;
