import React from 'react';
import { Button, Card, Space, Table, Typography } from 'antd';
import type { Device } from '../../types';
import styles from './StepDetectDevices.module.css';

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
      render: (status: string) => {
        const cls = status === 'connected' ? styles.statusConnected : status === 'unauthorized' ? styles.statusUnauthorized : styles.statusOffline;
        const text = status === 'connected' ? '已连接' : status === 'unauthorized' ? '未授权' : status === 'offline' ? '离线' : '未知';
        return <span className={cls}>{text}</span>;
      }
    }
  ];

  return (
    <Card title="检测Android设备">
      <Space direction="vertical" className={styles.wrap}>
        <Button type="primary" onClick={onDetect} loading={isBusy}>检测设备</Button>
        {availableDevices.length > 0 && (
          <div>
            <Text strong>检测到 {availableDevices.length} 台设备</Text>
            <Table
              dataSource={availableDevices}
              columns={deviceColumns}
              pagination={false}
              size="small"
              className={styles.table}
              scroll={{ x: true }}
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
