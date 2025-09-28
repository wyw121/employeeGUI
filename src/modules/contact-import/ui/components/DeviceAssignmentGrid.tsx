import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, InputNumber, Select, Button, Space, Typography, Tooltip, Tag, Row, Col, Badge, Checkbox, message } from 'antd';
import { MobileOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAdb } from '../../../../application/hooks/useAdb';
import styles from './DeviceAssignmentGrid.module.css';
import { getBindings, subscribe } from '../services/deviceBatchBinding';

const { Text } = Typography;

export interface DeviceAssignmentRow {
  deviceId: string;
  deviceName?: string;
  industry?: string; // 行业选择
  idStart?: number;  // ID 区间开始
  idEnd?: number;    // ID 区间结束
  contactCount?: number; // 设备内已有联系人数量
}

export interface DeviceAssignmentGridProps {
  value?: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>;
  onChange?: (value: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => void;
  industries?: string[];
  conflictingDeviceIds?: string[];
  conflictPeersByDevice?: Record<string, Array<{ peerId: string; start: number; end: number }>>;
  onJumpToDevice?: (deviceId: string) => void;
  // 回调：生成 VCF / 导入 到设备（由上层实现，以保持模块化）
  onGenerateVcf?: (deviceId: string, params: { start?: number; end?: number; industry?: string }) => Promise<void> | void;
  onImportToDevice?: (deviceId: string, params: { start?: number; end?: number; industry?: string; scriptKey?: string }) => Promise<void> | void;
  importScripts?: Array<{ key: string; label: string }>;
  onOpenSessions?: (opts: { deviceId: string; status?: 'pending' | 'success' | 'failed' | 'all' }) => void;
}

const DEFAULT_INDUSTRIES = ['不限', '电商', '教育', '医疗', '金融', '本地生活', '其他'];

// 简单的机型图标渲染（可扩展为按 manufacturer/model 加载图片）
function PhoneVisual({ manufacturer, model }: { manufacturer?: string; model?: string }) {
  return (
    <div className={styles.phoneVisualWrap}>
      <div
        className={styles.phoneVisualIcon}
        aria-label={(manufacturer || model) ? `${manufacturer ?? ''} ${model ?? ''}` : 'mobile'}
      >
        <MobileOutlined style={{ fontSize: 24, color: '#1677ff' }} />
      </div>
    </div>
  );
}

export const DeviceAssignmentGrid: React.FC<DeviceAssignmentGridProps> = ({
  value,
  onChange,
  industries = DEFAULT_INDUSTRIES,
  conflictingDeviceIds = [],
  conflictPeersByDevice = {},
  onGenerateVcf,
  onImportToDevice,
  importScripts,
  onOpenSessions,
}) => {
  const { devices, refreshDevices, getDeviceContactCount, getDeviceInfo } = useAdb();

  const [rowState, setRowState] = useState<Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>>(value || {});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, { manufacturer?: string; model?: string }>>({});
  // 每台设备的“数量”输入，默认 100；会根据起/止自动同步
  const [assignCount, setAssignCount] = useState<Record<string, number>>({});
  // 选择设备（批量分配）
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkCount, setBulkCount] = useState<number>(100);
  // 每卡片动作 Loading 状态
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});
  const [importingIds, setImportingIds] = useState<Record<string, boolean>>({});
  // 每台设备的导入脚本选择
  const [scriptByDevice, setScriptByDevice] = useState<Record<string, string>>({});
  const SCRIPT_OPTIONS = useMemo(() => (
    importScripts && importScripts.length > 0
      ? importScripts
      : [
          { key: 'auto', label: '自动识别' },
          { key: 'multi_brand', label: '通用（多品牌）' },
          { key: 'huawei_enhanced', label: '华为增强' },
          { key: 'oppo', label: 'OPPO（预留）' },
          { key: 'vivo', label: 'vivo（预留）' },
          { key: 'xiaomi', label: '小米（预留）' },
          { key: 'honor', label: '荣耀（预留）' },
          { key: 'samsung', label: '三星（预留）' },
        ]
  ), [importScripts]);

  useEffect(() => { if (value) setRowState(value); }, [value]);

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

  const updateRow = (deviceId: string, patch: Partial<Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => {
    setRowState(prev => {
      const next = { ...prev, [deviceId]: { ...prev[deviceId], ...patch } };
      onChange?.(next);
      return next;
    });
  };

  const refreshCount = async (deviceId: string) => {
    setLoadingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      const c = await getDeviceContactCount(deviceId);
      setCounts(prev => ({ ...prev, [deviceId]: c }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const refreshAllCounts = async () => {
    const list = devices || [];
    const concurrency = 3;
    const queue = [...list.map(d => d.id)];
    const run = async () => {
      while (queue.length) {
        const id = queue.shift();
        if (!id) break;
        await refreshCount(id);
      }
    };
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => run());
    await Promise.all(workers);
  };

  // 拉取设备元信息（制造商/型号）用于展示图标提示
  useEffect(() => {
    let canceled = false;
    (async () => {
      const list = devices || [];
      const results: Record<string, { manufacturer?: string; model?: string }> = {};
      for (const d of list) {
        try {
          const info = await getDeviceInfo(d.id).catch(() => null);
          if (info && !canceled) {
            results[d.id] = { manufacturer: (info as any)?.manufacturer, model: (info as any)?.model };
          }
        } catch {}
      }
      if (!canceled) setMeta(results);
    })();
    return () => { canceled = true; };
  }, [devices]);

  // 初次装载或设备变化时轻量刷新联系人数量
  useEffect(() => {
    if ((devices || []).length === 0) return;
    const timer = setTimeout(() => { refreshAllCounts(); }, 200);
    return () => clearTimeout(timer);
  }, [devices]);

  // 订阅设备-批次绑定变化，以便刷新 UI（显示“待导入/已导入”计数）
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => forceRender(v => v + 1));
    return () => { unsub && unsub(); };
  }, []);

  // 自动分配 100 区间：基于当前所有设备的 idEnd 最大值
  const autoAssignRange = useCallback((deviceId: string, count: number) => {
    const n = Math.max(1, Math.floor(count || 0));
    const all = Object.values(rowState);
    const maxEnd = all.reduce((m, r) => (typeof r.idEnd === 'number' ? Math.max(m, r.idEnd!) : m), -1);
    const start = Math.max(0, maxEnd + 1);
    const end = start + (n - 1);
    updateRow(deviceId, { idStart: start, idEnd: end });
  }, [rowState]);

  // 批量选择/全选/清空
  const allIds = useMemo(() => (devices || []).map(d => d.id), [devices]);
  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => !!v).map(([id]) => id), [selected]);
  const allSelected = allIds.length > 0 && allIds.every(id => !!selected[id]);
  const toggleSelectAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const id of allIds) next[id] = checked;
    setSelected(next);
  };
  const clearSelection = () => setSelected({});

  // 批量分配：按当前最大尾部连续分配，避免冲突
  const bulkAssign = () => {
    const ids = selectedIds;
    if (ids.length === 0) {
      message.warning('请先选择需要分配的设备');
      return;
    }
    const n = Math.max(1, Math.floor(bulkCount || 0));
    let maxEnd = -1;
    for (const r of Object.values(rowState)) {
      if (typeof r?.idEnd === 'number') maxEnd = Math.max(maxEnd, r.idEnd!);
    }
    setRowState(prev => {
      const next = { ...prev } as typeof prev;
      for (const id of ids) {
        const start = Math.max(0, maxEnd + 1);
        const end = start + (n - 1);
        next[id] = { ...next[id], idStart: start, idEnd: end };
        maxEnd = end;
      }
      onChange?.(next);
      return next;
    });
    message.success(`已为 ${ids.length} 台设备分配区间（每台 ${n} 个）`);
  };

  // -------- 点击卡片即选择/取消选择（避免在交互控件上误触） --------
  const isInteractiveClick = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    // 任意具有这些选择器的祖先/自身视为交互控件
    return !!el.closest('input, button, select, textarea, [role="spinbutton"], .ant-select, .ant-input-number, .ant-btn, [data-no-card-toggle]');
  };
  const toggleSelected = (deviceId: string, next?: boolean) => {
    setSelected(prev => ({ ...prev, [deviceId]: typeof next === 'boolean' ? next : !prev[deviceId] }));
  };
  const handleCardClick = (e: React.MouseEvent, deviceId: string) => {
    const target = e.target as HTMLElement | null;
    if (isInteractiveClick(target)) return; // 忽略在控件上的点击
    toggleSelected(deviceId);
  };

  // -------- 卡片动作：生成 VCF / 导入 --------
  const handleGenerateVcf = async (row: DeviceAssignmentRow) => {
    const { deviceId } = row;
    setGeneratingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      if (typeof onGenerateVcf === 'function') {
        await onGenerateVcf(deviceId, { start: row.idStart, end: row.idEnd, industry: row.industry });
      } else {
        message.info('未接入 onGenerateVcf 回调');
      }
    } finally {
      setGeneratingIds(prev => ({ ...prev, [deviceId]: false }));
    }
  };
  const handleImportToDevice = async (row: DeviceAssignmentRow) => {
    const { deviceId } = row;
    setImportingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      if (typeof onImportToDevice === 'function') {
        await onImportToDevice(deviceId, { start: row.idStart, end: row.idEnd, industry: row.industry, scriptKey: scriptByDevice[deviceId] || 'auto' });
      } else {
        message.info('未接入 onImportToDevice 回调');
      }
    } finally {
      setImportingIds(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  // 当用户手动修改起/止时，自动同步数量（end-start+1）
  useEffect(() => {
    const next: Record<string, number> = { ...assignCount };
    for (const [did, r] of Object.entries(rowState)) {
      if (typeof r?.idStart === 'number' && typeof r?.idEnd === 'number' && r.idEnd >= r.idStart) {
        next[did] = r.idEnd - r.idStart + 1;
      } else if (next[did] == null) {
        next[did] = 100;
      }
    }
    setAssignCount(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowState]);

  return (
    <div>
      <Space className={styles.toolbar} wrap>
        <Button onClick={() => refreshDevices?.()}>刷新设备列表</Button>
        <Button icon={<ReloadOutlined />} onClick={refreshAllCounts}>刷新所有联系人数量</Button>
        <Checkbox
          checked={allSelected}
          indeterminate={!allSelected && selectedIds.length > 0}
          onChange={(e) => toggleSelectAll(e.target.checked)}
        >全选</Checkbox>
        <Button onClick={clearSelection}>清空选择</Button>
        <Text type="secondary">已选 {selectedIds.length} 台</Text>
        <InputNumber size="small" min={1} style={{ width: 100 }} value={bulkCount} onChange={(v) => setBulkCount(typeof v === 'number' ? v : bulkCount)} />
        <Button type="primary" onClick={bulkAssign}>分配所选</Button>
      </Space>
      <Row gutter={[12, 12]}>
        {data.map((row) => {
          const isConflict = conflictingDeviceIds.includes(row.deviceId);
          const peers = conflictPeersByDevice[row.deviceId] || [];
          const hasSelfError = typeof row.idStart === 'number' && typeof row.idEnd === 'number' && (row.idStart > row.idEnd);
          const statusError = isConflict || hasSelfError;
          const metaInfo = meta[row.deviceId] || {};
          return (
            <Col key={row.deviceId} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <Card
                data-device-card={row.deviceId}
                hoverable
                size="small"
                style={{
                  height: '100%',
                  borderColor: statusError ? '#ff4d4f' : (selected[row.deviceId] ? '#1677ff' : undefined),
                  cursor: 'pointer',
                }}
                onClick={(e) => handleCardClick(e, row.deviceId)}
                title={
                  <Space>
                    <Checkbox
                      checked={!!selected[row.deviceId]}
                      onChange={(e) => toggleSelected(row.deviceId, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Badge status={statusError ? 'error' : 'processing'} />
                    <Text strong>{row.deviceName}</Text>
                    {isConflict && <Tag color="red">冲突</Tag>}
                  </Space>
                }
              >
                <PhoneVisual manufacturer={metaInfo.manufacturer} model={metaInfo.model} />
                <div className={styles.deviceIdText}>
                  <Text type="secondary">{row.deviceId}</Text>
                </div>
                {/* 已导入行业（占位：待接入历史数据统计）*/}
                <div style={{ marginBottom: 8 }}>
                  <Space size={[4, 4]} wrap>
                    {row.industry ? <Tag color="blue">{row.industry}</Tag> : <Tag>未选择行业</Tag>}
                    {/* TODO: 历史行业标签：需要后端 import_sessions 记录 industry 字段后统计 */}
                  </Space>
                </div>
                {/* 行业选择 + ID 区间 + 自动 100 分配 */}
                <Space direction="vertical" className={styles.assignRow}>
                  <Select
                    style={{ width: '100%' }}
                    value={row.industry ?? industries[0]}
                    options={industries.map(i => ({ label: i, value: i }))}
                    onChange={(v) => updateRow(row.deviceId, { industry: v })}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                    <InputNumber
                      size="small"
                      style={{ width: 110 }}
                      status={hasSelfError ? 'error' : undefined}
                      min={0}
                      value={row.idStart}
                      placeholder="起"
                      onChange={(v) => updateRow(row.deviceId, { idStart: typeof v === 'number' ? v : undefined })}
                    />
                    <Text type="secondary">~</Text>
                    <InputNumber
                      size="small"
                      style={{ width: 110 }}
                      status={hasSelfError ? 'error' : undefined}
                      min={0}
                      value={row.idEnd}
                      placeholder="止"
                      onChange={(v) => updateRow(row.deviceId, { idEnd: typeof v === 'number' ? v : undefined })}
                    />
                  </div>
                  <div className={styles.autoBtnRow}>
                    <InputNumber
                      size="small"
                      min={1}
                      style={{ width: 100 }}
                      value={assignCount[row.deviceId] ?? 100}
                      onChange={(v) => setAssignCount(prev => ({ ...prev, [row.deviceId]: typeof v === 'number' ? v : (prev[row.deviceId] ?? 100) }))}
                    />
                    <Tooltip title="按照数量自动分配区间（基于当前最大已用区间尾部）">
                      <Button onClick={() => autoAssignRange(row.deviceId, assignCount[row.deviceId] ?? 100)}>分配</Button>
                    </Tooltip>
                  </div>
                </Space>
                {/* 联系人数（总数；按行业细分待接入）*/}
                <div className={styles.contactsRow}>
                  <Space>
                    <Text>已有联系人：</Text>
                    <Text strong>{typeof row.contactCount === 'number' ? row.contactCount : '-'}</Text>
                  </Space>
                  <Tooltip title="刷新该设备联系人数量">
                    <Button size="small" loading={!!loadingIds[row.deviceId]} icon={<ReloadOutlined />} onClick={() => refreshCount(row.deviceId)} />
                  </Tooltip>
                </div>
                {/* 生成 VCF / 选择脚本 / 导入（自适应换行） */}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Button size="small" onClick={() => handleGenerateVcf(row)} loading={!!generatingIds[row.deviceId]}>
                    生成VCF
                  </Button>
                  <Select
                    size="small"
                    style={{ minWidth: 140, maxWidth: '100%', flex: '1 1 140px' }}
                    value={scriptByDevice[row.deviceId] || 'auto'}
                    options={SCRIPT_OPTIONS.map(s => ({ value: s.key, label: s.label }))}
                    onChange={(v) => setScriptByDevice(prev => ({ ...prev, [row.deviceId]: v }))}
                    placeholder="选择导入脚本"
                  />
                  <Button size="small" type="primary" onClick={() => handleImportToDevice(row)} loading={!!importingIds[row.deviceId]} style={{ flex: '0 0 auto' }}>
                    导入
                  </Button>
                </div>
                {/* 绑定状态：待导入 / 已导入 批次数 */}
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const b = getBindings(row.deviceId);
                    const pending = b.pending.length;
                    const imported = b.imported.length;
                    return (
                      <>
                        <Tag
                          color={pending > 0 ? 'gold' : undefined}
                          data-no-card-toggle
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); onOpenSessions?.({ deviceId: row.deviceId, status: 'pending' }); }}
                        >
                          待导入: <Text strong>{pending}</Text>
                        </Tag>
                        <Tag
                          color={imported > 0 ? 'green' : undefined}
                          data-no-card-toggle
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); onOpenSessions?.({ deviceId: row.deviceId, status: 'success' }); }}
                        >
                          已导入: <Text strong>{imported}</Text>
                        </Tag>
                      </>
                    );
                  })()}
                </div>
                {/* 冲突提示/跳转 */}
                {peers.length > 0 && (
                  <div className={styles.conflictWarn}>
                    <Text type="danger">与 {peers.length} 台设备区间重叠</Text>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default DeviceAssignmentGrid;
