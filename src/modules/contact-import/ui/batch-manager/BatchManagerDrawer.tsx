import React, { useState } from 'react';
import { Drawer, Tabs, Space, Divider } from 'antd';
import FiltersBar from './components/FiltersBar';
import NumbersTable from './components/NumbersTable';
import SessionsTable from './components/SessionsTable';
import ActionsBar from './components/ActionsBar';
import { useBatchData } from './hooks/useBatchData';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import type { BatchFilterState } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BatchManagerDrawer: React.FC<Props> = ({ open, onClose }) => {
  const [filter, setFilter] = useState<BatchFilterState>({ mode: 'all' });
  const debouncedSearch = useDebouncedValue(filter.search, 400);
  const effectiveFilter = { ...filter, search: debouncedSearch } as BatchFilterState;
  // 简单分页状态（后续可抽到 hook 内）
  const [numbersPage, setNumbersPage] = useState({ page: 1, pageSize: 50 });
  const [sessionsPage, setSessionsPage] = useState({ page: 1, pageSize: 50 });
  const [lastSessionId, setLastSessionId] = useState<number | undefined>(undefined);
  const { loading, batches, sessions, numbers, reload } = useBatchData(effectiveFilter, {
    numbers: { limit: numbersPage.pageSize, offset: (numbersPage.page - 1) * numbersPage.pageSize },
    sessions: { limit: sessionsPage.pageSize, offset: (sessionsPage.page - 1) * sessionsPage.pageSize },
  });

  return (
    <Drawer open={open} onClose={onClose} width={880} title="按批次/设备筛选号码池">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <FiltersBar value={filter} onChange={setFilter} batches={batches} />
        <ActionsBar
          mode={filter.mode as 'all' | 'by-batch' | 'no-batch'}
          batch={filter.batchId ? batches?.items.find(b => b.batch_id === filter.batchId) ?? null : null}
          numbers={numbers}
          onActionDone={async (opts) => {
            if (opts?.lastSessionId) setLastSessionId(opts.lastSessionId);
            await reload();
          }}
        />
        <Divider style={{ margin: '8px 0' }} />
        <Tabs
          items={[
            { key: 'numbers', label: '号码', children: (
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
              />
            ) },
            { key: 'sessions', label: '导入会话', children: (
              <SessionsTable
                data={sessions}
                loading={loading}
                highlightId={lastSessionId}
                pagination={{
                  current: sessionsPage.page,
                  pageSize: sessionsPage.pageSize,
                  total: sessions?.total || 0,
                  onChange: (page, pageSize) => setSessionsPage({ page, pageSize }),
                }}
                onRefresh={reload}
              />
            ) },
          ]}
        />
      </Space>
    </Drawer>
  );
};

export default BatchManagerDrawer;
