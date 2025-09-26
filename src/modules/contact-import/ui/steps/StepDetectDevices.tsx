import React from 'react';
import { Button, Card, Space, Table, Typography } from 'antd';
import type { Device } from '../../types';

const { Text } = Typography;

interface StepDetectDevicesProps {
  isBusy: boolean;
  availableDevices: Device[];
  selectedDeviceIds: string[];
  onDetect: () => void;
  onSelect: (ids: string[]) => void;
  onNext: () => void;
}

export const StepDetectDevices: React.FC<StepDetectDevicesProps> = ({ isBusy, availableDevices, selectedDeviceIds, onDetect, onSelect, onNext }) => {
  const deviceColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '设备ID', dataIndex: 'id', key: 'id' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <span style={{ color: status === 'connected' ? 'green' : status === 'unauthorized' ? 'orange' : 'red' }}>
          {status === 'connected' ? '已连接' : status === 'unauthorized' ? '未授权' : status === 'offline' ? '离线' : '未知'}
        </span>
      )
    }
  ];

  return (
    <Card title="检测Android设备">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" onClick={onDetect} loading={isBusy}>检测设备</Button>
        {availableDevices.length > 0 && (
          <div>
            <Text strong>检测到 {availableDevices.length} 台设备</Text>
            <Table
              dataSource={availableDevices}
              columns={deviceColumns}
              pagination={false}
              size="small"
              style={{ marginTop: 8 }}
              rowSelection={{ selectedRowKeys: selectedDeviceIds, onChange: (keys) => onSelect(keys as string[]) }}
            />
          </div>
        )}
        {availableDevices.length > 0 && selectedDeviceIds.length > 0 && (
          <Button type="primary" onClick={onNext}>下一步</Button>
        )}
      </Space>
    </Card>
  );
};
