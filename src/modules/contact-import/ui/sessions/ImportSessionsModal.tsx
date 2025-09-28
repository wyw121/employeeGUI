import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Tabs, Divider, Space, Button, App, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import FiltersBar from '../batch-manager/components/FiltersBar';
import SessionsTable from '../batch-manager/components/SessionsTable';
import NumbersTable from '../batch-manager/components/NumbersTable';
import SessionActionsBar from './SessionActionsBar';
import { useBatchData } from '../batch-manager/hooks/useBatchData';
import { useDebouncedValue } from '../batch-manager/hooks/useDebouncedValue';
import { useBatchIndustry } from '../batch-manager/hooks/useBatchIndustry';
import type { BatchFilterState } from '../batch-manager/types';

interface Props {
  open: boolean;
  onClose: () => void;
  deviceId?: string;
  batchId?: string;
  status?: 'all' | 'pending' | 'success' | 'failed';
}

const ImportSessionsModal: React.FC<Props> = ({ open, onClose, deviceId, batchId, status = 'all' }) => {
  const { message } = App.useApp();
  // 初始化筛选状态：优先使用传入的设备和批次
  const [filter, setFilter] = useState<BatchFilterState>(() => ({
    mode: batchId ? 'by-batch' : deviceId ? 'by-device' : 'all',
    deviceId,
    batchId,
  }));
  
  const debouncedSearch = useDebouncedValue(filter.search, 400);
  const effectiveFilter = { ...filter, search: debouncedSearch } as BatchFilterState;
  
  // 分页状态
  const [numbersPage, setNumbersPage] = useState({ page: 1, pageSize: 50 });
  const [sessionsPage, setSessionsPage] = useState({ page: 1, pageSize: 50 });
  const [lastSessionId, setLastSessionId] = useState<number | undefined>(undefined);
  // 会话行选择（支持多选批量重新导入）
  const [selectedSessionKeys, setSelectedSessionKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState<string>('sessions');
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(false);
  // NumbersTable 外部筛选（行业/状态）
  const [numbersFilters, setNumbersFilters] = useState<{ status?: string | null; industry?: string | null }>({});
  
  // 复用 BatchManagerDrawer 的数据逻辑
  const { loading, batches, sessions, numbers, reload } = useBatchData(
    { ...effectiveFilter, numbersStatus: numbersFilters.status ?? null, numbersIndustry: numbersFilters.industry ?? null },
    {
      numbers: { limit: numbersPage.pageSize, offset: (numbersPage.page - 1) * numbersPage.pageSize },
      sessions: { limit: sessionsPage.pageSize, offset: (sessionsPage.page - 1) * sessionsPage.pageSize },
    }
  );

  // 按当前会话列表批次预取“分类标签”（行业）
  const industryLabels = useBatchIndustry(sessions);
  
  // 当 props 变化时更新筛选状态
  useEffect(() => {
    if (!open) return;
    setFilter(prev => ({
      ...prev,
      mode: batchId ? 'by-batch' : deviceId ? 'by-device' : prev.mode,
      deviceId: deviceId || prev.deviceId,
      batchId: batchId || prev.batchId,
    }));
  }, [open, deviceId, batchId]);
  
  // 按状态过滤会话（前端过滤，因为后端接口不支持状态筛选）
  const filteredSessions = useMemo(() => {
    if (!sessions) return sessions;
    const list = sessions.items || [];
    const targetStatus = status === 'pending' ? 'pending' : status === 'success' ? 'success' : status === 'failed' ? 'failed' : null;
    const wantedIndustry = (effectiveFilter.industry ?? '').trim();

    const filtered = list.filter((s: any) => {
      const statusOk = targetStatus ? s.status === targetStatus : true;
      if (!statusOk) return false;
      if (showPendingOnly && s.status !== 'pending') return false;
      if (!wantedIndustry) return true; // 不限
      const ind = (s.industry ?? '').trim();
      return ind === wantedIndustry; // 仅保留匹配行业的会话
    });

    return { ...sessions, items: filtered, total: filtered.length };
  }, [sessions, status, effectiveFilter.industry, showPendingOnly]);

  // 批量“重新导入”选中的会话
  const onBulkReimportSelected = async () => {
    try {
      if (!filteredSessions?.items?.length) return message.warning('没有可操作的会话');
      const selected = (filteredSessions.items as any[]).filter(it => selectedSessionKeys.includes(it.id));
      if (!selected.length) return message.warning('请先在列表中勾选要重新导入的会话');
      // 仅允许有 device_id 与 batch_id 的行
      const rows = selected
        // 仅“未导入(pending)”才参与批量重新导入
        .filter(r => r.status === 'pending')
        .filter(r => r.device_id && r.batch_id)
        .map(r => ({ id: r.id as number, batch_id: r.batch_id as string, device_id: r.device_id as string }));
      if (!rows.length) return message.warning('所选会话需为“未导入”且包含设备与批次信息');
      const { reimportSelectedSessions } = await import('../services/sessionImportService');
      message.info(`开始批量导入 ${rows.length} 条会话...`);
      let failed = 0;
      let lastOk = true;
      const outcome = await reimportSelectedSessions(rows, {
        verifyMode: 'delta-strict',
        onProgress: ({ index, total, ok, delta }) => {
          lastOk = ok;
          if (ok) {
            if (typeof delta === 'number') {
              message.success(`第 ${index}/${total} 条导入校验通过（联系人 +${delta}）`);
            } else {
              message.success(`第 ${index}/${total} 条导入完成`);
            }
          } else {
            failed += 1;
            const tip = typeof delta === 'number' ? `（校验失败 delta=${delta}）` : '';
            message.error(`第 ${index}/${total} 条导入失败${tip}`);
          }
          if (index === total) {
            if (failed === 0 && lastOk) message.success('批量导入完成（全部通过校验）');
            else message.info(`批量导入完成：失败 ${failed}/${total}`);
          }
        },
      });
      setLastSessionId(outcome.lastCreatedSessionId);
      setSelectedSessionKeys([]);
      try { await reload(); } catch {}
    } catch (e: any) {
      message.error(`批量导入异常: ${e?.message ?? e}`);
    }
  };

  // 快捷：全选“本页未导入”
  const onSelectAllPendingThisPage = () => {
    const items: any[] = filteredSessions?.items || [];
    if (!items.length) return setSelectedSessionKeys([]);
    const start = (sessionsPage.page - 1) * sessionsPage.pageSize;
    const end = Math.min(start + sessionsPage.pageSize, items.length);
    const pageItems = items.slice(start, end);
    const keys = pageItems.filter(r => r.status === 'pending').map(r => r.id as React.Key);
    setSelectedSessionKeys(keys);
  };


  return (
    <Modal
      title="导入会话"
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <FiltersBar value={filter} onChange={setFilter} batches={batches} />
        
        <SessionActionsBar
          targetDeviceId={filter.deviceId}
          mode={filter.mode as any}
          batch={filter.batchId ? batches?.items.find(b => b.batch_id === filter.batchId) ?? null : null}
          numbers={numbers}
          onRefresh={reload}
          onActionDone={async (opts) => {
            if (opts?.lastSessionId) setLastSessionId(opts.lastSessionId);
            // 动作完成后仅立即刷新一次（不再开启自动轮询）
            await reload();
          }}
        />
        
        <Divider style={{ margin: '8px 0' }} />
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { 
              key: 'sessions', 
              label: (
                <Space>
                  <span>导入会话 ({filteredSessions?.total || 0})</span>
                  <Space size={6}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={showPendingOnly}
                        onChange={e => { setShowPendingOnly(e.target.checked); setSelectedSessionKeys([]); setSessionsPage({ page: 1, pageSize: sessionsPage.pageSize }); }}
                        style={{ verticalAlign: 'middle' }}
                      />
                      <span style={{ fontSize: 12, color: '#666' }}>只显示未导入</span>
                    </label>
                    <Tooltip title="批量操作仅对未导入(pending)的会话生效">
                      <QuestionCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </Space>
                  <Button size="small" onClick={onSelectAllPendingThisPage}>
                    全选本页未导入
                  </Button>
                  <Button size="small" type="primary" disabled={!selectedSessionKeys.length} onClick={onBulkReimportSelected}>
                    重新导入所选
                  </Button>
                </Space>
              ), 
              children: (
                <SessionsTable
                  data={filteredSessions}
                  loading={loading}
                  industryLabels={industryLabels}
                  highlightId={lastSessionId}
                  rowSelectionType="checkbox"
                  selectedRowKeys={selectedSessionKeys}
                  onSelectionChange={(keys) => setSelectedSessionKeys(keys)}
                  onViewBatchNumbers={(bid) => {
                    setFilter(prev => ({ ...prev, mode: 'by-batch', batchId: bid }));
                    setActiveTab('numbers');
                  }}
                  pagination={{
                    current: sessionsPage.page,
                    pageSize: sessionsPage.pageSize,
                    total: filteredSessions?.total || 0,
                    onChange: (page, pageSize) => setSessionsPage({ page, pageSize }),
                  }}
                  onRefresh={reload}
                />
              )
            },
            { 
              key: 'numbers', 
              label: `相关号码 (${numbers?.total || 0})`, 
              children: (
                <NumbersTable
                  data={numbers}
                  loading={loading}
                  pagination={{
                    current: numbersPage.page,
                    pageSize: numbersPage.pageSize,
                    total: numbers?.total || 0,
                    onChange: (page, pageSize) => setNumbersPage({ page, pageSize }),
                  }}
                  onRefresh={reload}
                  controlledFilters={{
                    status: numbersFilters.status ?? null,
                    industry: numbersFilters.industry ?? null,
                    onChange: setNumbersFilters,
                  }}
                />
              )
            },
          ]}
        />
      </Space>
    </Modal>
  );
};

export default ImportSessionsModal;
