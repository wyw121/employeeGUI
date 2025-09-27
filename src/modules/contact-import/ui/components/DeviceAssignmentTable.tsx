import React, { useEffect, useMemo, useState } from 'react';
import { Table, InputNumber, Select, Button, Space, Typography, Tooltip, Divider, Checkbox, Tag } from 'antd';
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
  conflictingDeviceIds?: string[];
  conflictPeersByDevice?: Record<string, Array<{ peerId: string; start: number; end: number }>>;
  onJumpToDevice?: (deviceId: string) => void;
}

const DEFAULT_INDUSTRIES = ['不限', '电商', '教育', '医疗', '金融', '本地生活', '其他'];

export const DeviceAssignmentTable: React.FC<DeviceAssignmentTableProps> = ({
  value,
  onChange,
  industries = DEFAULT_INDUSTRIES,
  conflictingDeviceIds = [],
  conflictPeersByDevice = {},
  onJumpToDevice,
}) => {
  const { devices, refreshDevices, getDeviceContactCount } = useAdb();

  // 以设备ID为 key 的行状态（industry/idStart/idEnd）
  const [rowState, setRowState] = useState<Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>>(value || {});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [bulkIndustry, setBulkIndustry] = useState<string | undefined>(undefined);
  const [bulkStart, setBulkStart] = useState<number | undefined>(undefined);
  const [bulkEnd, setBulkEnd] = useState<number | undefined>(undefined);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

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
    // 并发刷新，限制同时进行数量以避免ADB拥塞
    const concurrency = 3;
    const queue = [...list.map(d => d.id)];
    const workers: Promise<void>[] = [];
    const run = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) break;
        await refreshCount(id);
      }
    };
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push(run());
    }
    await Promise.all(workers);
  };

  const updateRow = (deviceId: string, patch: Partial<Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => {
    setRowState(prev => {
      const next = { ...prev, [deviceId]: { ...prev[deviceId], ...patch } };
      onChange?.(next);
      return next;
    });
  };

  // 挂载或设备列表变化时，自动刷新所有设备联系人数量（轻量并发）
  useEffect(() => {
    if ((devices || []).length === 0) return;
    // 避免频繁触发，简单节流：在设备变更后延迟刷新
    const handle = setTimeout(() => {
      refreshAllCounts();
    }, 200);
    return () => clearTimeout(handle);
  }, [devices]);

  // 批量设置逻辑
  const applyBulk = () => {
    const targetIds = applyToAll ? (devices || []).map(d => d.id) : selectedDeviceIds;
    if (!targetIds || targetIds.length === 0) return;
    setRowState(prev => {
      const next = { ...prev };
      for (const id of targetIds) {
        next[id] = {
          ...(next[id] || {}),
          ...(bulkIndustry !== undefined ? { industry: bulkIndustry } : {}),
          ...(typeof bulkStart === 'number' ? { idStart: bulkStart } : {}),
          ...(typeof bulkEnd === 'number' ? { idEnd: bulkEnd } : {}),
        };
      }
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
          <Space>
            <Text strong>{row.deviceName}</Text>
            {conflictingDeviceIds.includes(row.deviceId) && <Tag color="red">冲突</Tag>}
          </Space>
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
      render: (_: any, row: DeviceAssignmentRow) => {
        const peers = conflictPeersByDevice[row.deviceId] || [];
        const hasSelfError = typeof row.idStart === 'number' && typeof row.idEnd === 'number' && (row.idStart > row.idEnd);
        const hasConflict = peers.length > 0;
        const status = (hasSelfError || hasConflict) ? 'error' : undefined;
        const content = (
          <Space>
            <InputNumber
              status={status as any}
              min={0}
              value={row.idStart}
              placeholder="起"
              onChange={(v) => updateRow(row.deviceId, { idStart: typeof v === 'number' ? v : undefined })}
            />
            <span>~</span>
            <InputNumber
              status={status as any}
              min={0}
              value={row.idEnd}
              placeholder="止"
              onChange={(v) => updateRow(row.deviceId, { idEnd: typeof v === 'number' ? v : undefined })}
            />
          </Space>
        );
        if (!hasConflict) return content;
        return (
          <Tooltip
            title={
              <div>
                {peers.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>与设备 {p.peerId} [{p.start}-{p.end}] 重叠</span>
                    <Button type="link" size="small" onClick={() => onJumpToDevice?.(p.peerId)}>跳至</Button>
                  </div>
                ))}
                {peers.length > 5 && <div style={{ opacity: 0.7 }}>仅显示前5条</div>}
              </div>
            }
          >
            {content}
          </Tooltip>
        );
      }
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
      <Space wrap style={{ marginBottom: 8 }}>
        <Checkbox checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)}>对全部设备应用</Checkbox>
        <Select
          placeholder="批量设置行业"
          allowClear
          style={{ width: 160 }}
          value={bulkIndustry}
          options={industries.map(i => ({ label: i, value: i }))}
          onChange={setBulkIndustry}
        />
        <InputNumber placeholder="批量起始ID" min={0} value={bulkStart} onChange={v => setBulkStart(typeof v === 'number' ? v : undefined)} />
        <span>~</span>
        <InputNumber placeholder="批量结束ID" min={0} value={bulkEnd} onChange={v => setBulkEnd(typeof v === 'number' ? v : undefined)} />
        <Button type="primary" onClick={applyBulk}>应用批量设置</Button>
      </Space>
      <Divider style={{ margin: '8px 0' }} />
      <Table
        rowKey={(r) => r.deviceId}
        columns={columns as any}
        dataSource={data}
        size="middle"
        pagination={false}
        rowClassName={(record: DeviceAssignmentRow) => conflictingDeviceIds.includes(record.deviceId) ? 'bg-red-50' : ''}
        rowSelection={{
          selectedRowKeys: selectedDeviceIds,
          onChange: (keys) => setSelectedDeviceIds(keys as string[]),
        }}
      />
    </div>
  );
};

export default DeviceAssignmentTable;
