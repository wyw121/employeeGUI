import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Tabs, Divider, Space, Button, App } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import SelectedSessionsToolbar from './components/SelectedSessionsToolbar';
import FiltersBar from '../batch-manager/components/FiltersBar';
import SessionsTable from '../batch-manager/components/SessionsTable';
import NumbersTable from '../batch-manager/components/NumbersTable';
import SessionActionsBar from './SessionActionsBar';
import { useBatchData } from '../batch-manager/hooks/useBatchData';
import { useDebouncedValue } from '../batch-manager/hooks/useDebouncedValue';
import { useBatchIndustry } from '../batch-manager/hooks/useBatchIndustry';
import type { BatchFilterState } from '../batch-manager/types';
import { bulkDeleteImportSessions } from '../services/contactNumberService';

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
    onlyUsed: batchId ? true : undefined,
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
  const [bulkDeletionLoading, setBulkDeletionLoading] = useState<boolean>(false);
  
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
      deviceId: batchId ? undefined : (deviceId || prev.deviceId),
      batchId: batchId || prev.batchId,
      onlyUsed: batchId
        ? (prev.batchId !== batchId ? true : (prev.onlyUsed !== false ? prev.onlyUsed ?? true : false))
        : prev.onlyUsed,
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

  const onTogglePendingOnly = (next: boolean) => {
    setShowPendingOnly(next);
    setSelectedSessionKeys([]);
    setSessionsPage((prev) => ({ page: 1, pageSize: prev.pageSize }));
  };

  const performBulkDeletion = async (mode: 'delete' | 'archive') => {
    if (bulkDeletionLoading) return;
    const items: any[] = filteredSessions?.items || [];
    const normalizedKeys = selectedSessionKeys
      .map((key) => (typeof key === 'number' ? key : Number(key)))
      .filter((key) => Number.isFinite(key)) as number[];
    const selectedSet = new Set(normalizedKeys);
    const selectedRows = items.filter(row => selectedSet.has(Number(row.id)));
    if (!selectedRows.length) {
      message.warning('请先在列表中勾选要删除的会话');
      return;
    }

    const sessionIds = selectedRows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id)) as number[];
    if (!sessionIds.length) {
      message.warning('所选会话 ID 无效，无法删除');
      return;
    }

    setBulkDeletionLoading(true);
    try {
      const summary = await bulkDeleteImportSessions(sessionIds, { archiveNumbers: mode === 'archive' });
      const successCount = summary.succeeded.length;
      const failureCount = summary.failed.length;

      if (successCount > 0) {
        const actionLabel = mode === 'archive' ? '归档并删除' : '删除';
        const archiveInfo = mode === 'archive' && summary.archivedNumberCount > 0
          ? `，恢复号码 ${summary.archivedNumberCount} 个为未导入`
          : '';
        message.success(`已${actionLabel} ${successCount} 条会话${archiveInfo}`);
      }

      if (failureCount > 0) {
        message.warning(`共有 ${failureCount}/${summary.total} 条会话处理失败`);
        const [firstFailure] = summary.failed;
        if (firstFailure) {
          message.error(`会话 #${firstFailure.sessionId} 失败：${firstFailure.message}`);
        }
      }

      const succeededSet = new Set(summary.succeeded);
      setSelectedSessionKeys((prev) => prev.filter((key) => {
        const numericKey = typeof key === 'number' ? key : Number(key);
        if (!Number.isFinite(numericKey)) return true;
        return !succeededSet.has(numericKey);
      }));

      try {
        await reload();
      } catch (error: any) {
        console.error('[sessions] reload after bulk deletion failed', error);
      }
    } catch (error: any) {
      message.error(`批量删除失败：${error?.message ?? error}`);
    } finally {
      setBulkDeletionLoading(false);
    }
  };

  const openBulkDeleteConfirm = () => {
    const items: any[] = filteredSessions?.items || [];
    const normalizedKeys = selectedSessionKeys
      .map((key) => (typeof key === 'number' ? key : Number(key)))
      .filter((key) => Number.isFinite(key)) as number[];
    const selectedSet = new Set(normalizedKeys);
    const selectedRows = items.filter(row => selectedSet.has(Number(row.id)));
    if (!selectedRows.length) {
      message.warning('请先在列表中勾选要删除的会话');
      return;
    }

    const total = selectedRows.length;
    const statusTally = selectedRows.reduce((acc: Record<string, number>, row: any) => {
      const status = row.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const modalRef = Modal.confirm({
      title: `批量删除 ${total} 条会话`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          <p>将对所选会话执行删除操作：</p>
          <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
            {(Object.entries(statusTally) as Array<[string, number]>).map(([status, count]) => (
              <li key={status}>{status}：{count} 条</li>
            ))}
          </ul>
          <p style={{ marginBottom: 0 }}>请选择删除方式：</p>
          <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
            <li><strong>直接删除</strong>：仅移除会话记录，保留号码状态。</li>
            <li><strong>号码归档</strong>：恢复关联号码为未导入，释放批次。</li>
          </ul>
        </div>
      ),
      okButtonProps: { style: { display: 'none' } },
      cancelButtonProps: { style: { display: 'none' } },
      footer: () => (
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => modalRef.destroy()}>取消</Button>
          <Button danger onClick={() => { modalRef.destroy(); void performBulkDeletion('delete'); }}>直接删除</Button>
          <Button type="primary" onClick={() => { modalRef.destroy(); void performBulkDeletion('archive'); }}>号码归档后删除</Button>
        </Space>
      ),
    });
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
        <SelectedSessionsToolbar
          selectedCount={selectedSessionKeys.length}
          pendingOnly={showPendingOnly}
          onTogglePendingOnly={onTogglePendingOnly}
          onSelectAllPendingThisPage={onSelectAllPendingThisPage}
          onReimportSelected={onBulkReimportSelected}
          onDeleteSelected={openBulkDeleteConfirm}
          actionsDisabled={loading}
          deleteLoading={bulkDeletionLoading}
        />

        <Divider style={{ margin: '8px 0' }} />
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { 
              key: 'sessions', 
              label: `导入会话 (${filteredSessions?.total || 0})`, 
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
                    setFilter(prev => ({ ...prev, mode: 'by-batch', batchId: bid, onlyUsed: true }));
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
