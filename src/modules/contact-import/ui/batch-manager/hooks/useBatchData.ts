import { useCallback, useEffect, useState } from 'react';
import {
  listVcfBatchRecords,
  listImportSessionRecords,
  listNumbersByVcfBatch,
  listContactNumbers,
  listNumbersWithoutVcfBatch,
  type VcfBatchList,
  type ImportSessionList,
  type ContactNumberList,
} from '../../services/contactNumberService';
import type { BatchFilterState } from '../types';

interface PageOptions { limit?: number; offset?: number }
interface UseBatchDataPaging {
  numbers?: PageOptions;
  sessions?: PageOptions;
}

export function useBatchData(filter: BatchFilterState, paging?: UseBatchDataPaging) {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<VcfBatchList | null>(null);
  const [sessions, setSessions] = useState<ImportSessionList | null>(null);
  const [numbers, setNumbers] = useState<ContactNumberList | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // 1) 批次列表（独立分页可后续扩展）
      const [b] = await Promise.all([
        listVcfBatchRecords({ limit: 50, offset: 0 }),
      ]);
      setBatches(b);

      // 2) 会话列表（按设备/批次过滤）
      const s = await listImportSessionRecords({
        deviceId: filter.deviceId,
        batchId: filter.batchId,
        limit: paging?.sessions?.limit ?? 50,
        offset: paging?.sessions?.offset ?? 0,
      });
      setSessions(s);

      // 3) 号码列表（根据筛选模式）
      let nums: ContactNumberList;
      if (filter.mode === 'by-batch' && filter.batchId) {
        nums = await listNumbersByVcfBatch(filter.batchId, filter.onlyUsed, {
          limit: paging?.numbers?.limit ?? 50,
          offset: paging?.numbers?.offset ?? 0,
        });
      } else if (filter.mode === 'no-batch') {
        nums = await listNumbersWithoutVcfBatch({
          limit: paging?.numbers?.limit ?? 50,
          offset: paging?.numbers?.offset ?? 0,
        });
      } else {
        nums = await listContactNumbers({
          limit: paging?.numbers?.limit ?? 50,
          offset: paging?.numbers?.offset ?? 0,
          search: filter.search,
        });
      }
      setNumbers(nums);
    } finally {
      setLoading(false);
    }
  }, [filter, paging?.numbers?.limit, paging?.numbers?.offset, paging?.sessions?.limit, paging?.sessions?.offset]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, batches, sessions, numbers, reload };
}
