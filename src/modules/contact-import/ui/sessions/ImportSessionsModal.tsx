import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Tabs, Divider, Space } from 'antd';
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
  // 会话行选择（单选）
  const [selectedSessionKeys, setSelectedSessionKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState<string>('sessions');
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
      if (!wantedIndustry) return true; // 不限
      const ind = (s.industry ?? '').trim();
      return ind === wantedIndustry; // 仅保留匹配行业的会话
    });

    return { ...sessions, items: filtered, total: filtered.length };
  }, [sessions, status, effectiveFilter.industry]);

  // 保持设备视图稳定：不在行选择时自动切换为按批次


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
              label: `导入会话 (${filteredSessions?.total || 0})`, 
              children: (
                <SessionsTable
                  data={filteredSessions}
                  loading={loading}
                  industryLabels={industryLabels}
                  highlightId={lastSessionId}
                  rowSelectionType="radio"
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
