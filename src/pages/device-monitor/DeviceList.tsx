import React from 'react';
import { Empty, Row, Col } from 'antd';
import { DeviceCard } from './DeviceCard';
import type { DeviceListProps } from './types';

export const DeviceList: React.FC<DeviceListProps> = ({ devices, onSelectDevice, selectedId, selectable, selectedIds, onToggleSelect }) => {
  if (!devices || devices.length === 0) return <Empty description="暂无设备" />;
  return (
    <Row gutter={[12, 12]}>
      {devices.map((d) => (
        <Col key={d.id} xs={24} sm={12} md={8} lg={6}>
          <DeviceCard
            device={d}
            onSelect={onSelectDevice}
            selected={selectedId === d.id}
            selectable={selectable}
            checked={selectedIds?.includes(d.id)}
            onCheckedChange={(checked) => onToggleSelect?.(d.id, checked)}
          />
        </Col>
      ))}
    </Row>
  );
};
