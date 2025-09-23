import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Typography, Space } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { useRealTimeDevices } from '../../application/hooks/useRealTimeDevices';
import { useAdb } from '../../application/hooks/useAdb';
import { DeviceToolbar } from './DeviceToolbar';
import { DeviceFilters } from './DeviceFilters';
import { StatusIndicators } from './StatusIndicators';
import { DeviceList } from './DeviceList';
import { DeviceEventLog } from './DeviceEventLog';
import type { DeviceFiltersState } from './types';

const { Title, Text } = Typography;

export const RealTimeDeviceMonitorPage: React.FC = () => {
  const { devices, deviceStats, isTracking, startTracking, stopTracking, refreshDevices, lastEvent } = useRealTimeDevices();
  const { restartAdbServer, selectDevice } = useAdb();

  const [filters, setFilters] = useState<DeviceFiltersState>({ statuses: [], connections: [], keyword: '' });

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (filters.statuses.length && !filters.statuses.includes(d.status as any)) return false;
      if (filters.connections.length && !filters.connections.includes(d.connection_type as any)) return false;
      if (filters.keyword && !d.id.toLowerCase().includes(filters.keyword.toLowerCase())) return false;
      return true;
    });
  }, [devices, filters]);

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}><MobileOutlined /> 实时设备监控</Title>
          <Text type="secondary">仅保留实时监控入口，设备状态由 host:track-devices 事件驱动</Text>
          <DeviceToolbar
            isTracking={isTracking}
            onStart={startTracking}
            onStop={stopTracking}
            onRefresh={refreshDevices}
            onRestartAdb={restartAdbServer}
          />
          <DeviceFilters value={filters} onChange={setFilters} />
        </Space>
      </Card>

      <StatusIndicators total={deviceStats.total} online={deviceStats.online} usb={deviceStats.usb} emulator={deviceStats.emulator} />

      <Row gutter={12}>
        <Col span={16}>
          <Card title={`设备列表 (${filteredDevices.length})`}>
            <DeviceList devices={filteredDevices} onSelectDevice={(id) => selectDevice(id)} />
          </Card>
        </Col>
        <Col span={8}>
          <DeviceEventLog lastEvent={lastEvent} />
        </Col>
      </Row>
    </div>
  );
};

export default RealTimeDeviceMonitorPage;
