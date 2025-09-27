import React, { useEffect, useMemo, useState } from 'react';
import { Table, InputNumber, Select, Button, Space, Typography, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useAdb } from '../../../../application/hooks/useAdb';

const { Text } = Typography;

export interface DeviceAssignmentRow {
  deviceId: string;
  deviceName?: string;
  industry?: string; // 行业选择
  idStart?: number;  // ID 区间开始
  idEnd?: number;    // ID 区间结束
  contactCount?: number; // 设备内已有联系人数量
}

export interface DeviceAssignmentTableProps {
  value?: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>;
  onChange?: (value: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => void;
  industries?: string[];
}

const DEFAULT_INDUSTRIES = ['不限', '电商', '教育', '医疗', '金融', '本地生活', '其他'];

export const DeviceAssignmentTable: React.FC<DeviceAssignmentTableProps> = ({
  value,
  onChange,
  industries = DEFAULT_INDUSTRIES,
}) => {
  const { devices, refreshDevices, getDeviceContactCount } = useAdb();

  // 以设备ID为 key 的行状态（industry/idStart/idEnd）
  const [rowState, setRowState] = useState<Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>>(value || {});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (value) setRowState(value);
  }, [value]);

  // 设备数据源
  const data = useMemo<DeviceAssignmentRow[]>(() => {
    return (devices || []).map(d => ({
      deviceId: d.id,
      deviceName: d.name || d.id,
      industry: rowState[d.id]?.industry,
      idStart: rowState[d.id]?.idStart,
      idEnd: rowState[d.id]?.idEnd,
      contactCount: counts[d.id],
    }));
  }, [devices, rowState, counts]);

  // 单设备刷新联系人数量
  const refreshCount = async (deviceId: string) => {
    setLoadingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      const c = await getDeviceContactCount(deviceId);
      setCounts(prev => ({ ...prev, [deviceId]: c }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  // 批量刷新所有在线设备数量
  const refreshAllCounts = async () => {
    const list = devices || [];
    for (const d of list) {
      await refreshCount(d.id);
    }
  };

  const updateRow = (deviceId: string, patch: Partial<Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => {
    setRowState(prev => {
      const next = { ...prev, [deviceId]: { ...prev[deviceId], ...patch } };
      onChange?.(next);
      return next;
    });
  };

  const columns = [
    {
      title: '设备',
      dataIndex: 'deviceId',
      key: 'device',
      render: (_: any, row: DeviceAssignmentRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.deviceName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.deviceId}</Text>
        </Space>
      )
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 180,
      render: (_: any, row: DeviceAssignmentRow) => (
        <Select
          style={{ width: 160 }}
          value={row.industry ?? industries[0]}
          options={industries.map(i => ({ label: i, value: i }))}
          onChange={(v) => updateRow(row.deviceId, { industry: v })}
        />
      )
    },
    {
      title: 'ID 区间',
      dataIndex: 'range',
      key: 'range',
      width: 280,
      render: (_: any, row: DeviceAssignmentRow) => (
        <Space>
          <InputNumber min={0} value={row.idStart} placeholder="起" onChange={(v) => updateRow(row.deviceId, { idStart: typeof v === 'number' ? v : undefined })} />
          <span>~</span>
          <InputNumber min={0} value={row.idEnd} placeholder="止" onChange={(v) => updateRow(row.deviceId, { idEnd: typeof v === 'number' ? v : undefined })} />
        </Space>
      )
    },
    {
      title: '设备联系人数',
      dataIndex: 'contactCount',
      key: 'contactCount',
      width: 200,
      render: (val: any, row: DeviceAssignmentRow) => (
        <Space>
          <Text>{typeof row.contactCount === 'number' ? row.contactCount : '-'}</Text>
          <Tooltip title="刷新该设备联系人数量">
            <Button size="small" loading={!!loadingIds[row.deviceId]} icon={<ReloadOutlined />} onClick={() => refreshCount(row.deviceId)} />
          </Tooltip>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button onClick={() => refreshDevices?.()}>刷新设备列表</Button>
        <Button icon={<ReloadOutlined />} onClick={refreshAllCounts}>刷新所有联系人数量</Button>
      </Space>
      <Table
        rowKey={(r) => r.deviceId}
        columns={columns as any}
        dataSource={data}
        size="middle"
        pagination={false}
      />
    </div>
  );
};

export default DeviceAssignmentTable;
