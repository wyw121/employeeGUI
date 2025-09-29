import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Space, App } from 'antd';
import styles from '../DeviceAssignmentGrid.module.css';
import { useDeviceAssignmentState, type DeviceAssignmentRow } from './useDeviceAssignmentState';
import { Toolbar } from './Toolbar';
import { DeviceCard } from './DeviceCard';
import { getBindings, bindBatchToDevice } from '../../services/deviceBatchBinding';
import { processPendingSessionsForDevice, processLatestPendingSessionForDevice } from '../../services/sessionImportService';
import { VcfImportService } from '../../../../../services/VcfImportService';
import { buildVcfFromNumbers } from '../../../utils/vcf';
import { fetchUnclassifiedNumbers } from '../../services/unclassifiedService';
import { createVcfBatchWithNumbers, } from '../../../../vcf-sessions/services/vcfSessionService';
import { createImportSessionRecord, finishImportSessionRecord } from '../../services/contactNumberService';
import { allocateNumbersToDevice } from '../../services/contactNumberService';
import ServiceFactory from '../../../../../application/services/ServiceFactory';
import { useIndustryOptions } from '../../shared/industryOptions';

export interface DeviceAssignmentGridProps {
  value?: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>;
  onChange?: (value: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => void;
  industries?: string[];
  conflictingDeviceIds?: string[];
  conflictPeersByDevice?: Record<string, Array<{ peerId: string; start: number; end: number }>>;
  onJumpToDevice?: (deviceId: string) => void;
  onGenerateVcf?: (deviceId: string, params: { start?: number; end?: number; industry?: string }) => Promise<void> | void;
  onImportToDevice?: (deviceId: string, params: { start?: number; end?: number; industry?: string; scriptKey?: string }) => Promise<void> | void;
  importScripts?: Array<{ key: string; label: string }>;
  onOpenSessions?: (opts: { deviceId: string; status?: 'pending' | 'success' | 'failed' | 'all' }) => void;
}

const DEFAULT_INDUSTRIES = ['不限', '电商', '教育', '医疗', '金融', '本地生活', '其他'];

export const DeviceAssignmentGrid: React.FC<DeviceAssignmentGridProps> = (props) => {
  const { message } = App.useApp();
  const {
    devices, data,
    rowState, updateRow,
    counts, loadingIds, refreshCount, refreshAllCounts,
    meta,
    assignCount, setAssignCount,
    selected, setSelected, selectedIds, allSelected, toggleSelectAll, clearSelection,
    autoAssignRange,
  } = useDeviceAssignmentState(props.value, props.onChange);

  const [bulkCount, setBulkCount] = useState<number>(100);
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});
  const [importingIds, setImportingIds] = useState<Record<string, boolean>>({});
  const [allocatingIds, setAllocatingIds] = useState<Record<string, boolean>>({});
  const [scriptByDevice, setScriptByDevice] = useState<Record<string, string>>({});
  const baseIndustries = useMemo(
    () => (props.industries && props.industries.length > 0 ? props.industries : DEFAULT_INDUSTRIES),
    [props.industries]
  );
  const { options: industryOptions, include: includeIndustryOption, refresh: refreshIndustryOptions } = useIndustryOptions(baseIndustries);
  const SCRIPT_OPTIONS = useMemo(() => (
    props.importScripts && props.importScripts.length > 0
      ? props.importScripts
      : [
          { key: 'auto', label: '自动识别' },
          { key: 'multi_brand', label: '通用（多品牌）' },
          { key: 'huawei_enhanced', label: '华为增强' },
        ]
  ), [props.importScripts]);

  const bulkAssign = () => {
    const ids = selectedIds;
    if (ids.length === 0) { message.warning('请先选择需要分配的设备'); return; }
    const n = Math.max(1, Math.floor(bulkCount || 0));
    let maxEnd = -1;
    for (const r of Object.values(rowState)) { if (typeof r?.idEnd === 'number') maxEnd = Math.max(maxEnd, r.idEnd!); }
    const next = { ...rowState } as typeof rowState;
    for (const id of ids) {
      const start = Math.max(0, maxEnd + 1);
      const end = start + (n - 1);
      next[id] = { ...next[id], idStart: start, idEnd: end };
      maxEnd = end;
    }
    props.onChange?.(next);
    message.success(`已为 ${ids.length} 台设备分配区间（每台 ${n} 个）`);
  };

  const handleGenerateVcf = async (row: DeviceAssignmentRow) => {
    const { deviceId } = row;
    setGeneratingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      if (props.onGenerateVcf) await props.onGenerateVcf(deviceId, { start: row.idStart, end: row.idEnd, industry: row.industry });
      else message.info('未接入 onGenerateVcf 回调');
    } finally { setGeneratingIds(prev => ({ ...prev, [deviceId]: false })); }
  };

  const handleImportToDevice = async (row: DeviceAssignmentRow) => {
    const { deviceId } = row;
    setImportingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      const scriptKey = scriptByDevice[deviceId] || 'auto';
      const pending = getBindings(deviceId).pending.length;
      if (pending > 0) {
        // 先尝试仅导入“最新一条”pending 会话
        const latest = await processLatestPendingSessionForDevice(deviceId, { scriptKey });
        if (latest.total === 1) {
          const ok = latest.success === 1;
          if (ok) message.success(`已导入最新会话，批次 ${latest.details[0].batchId}`);
          else message.error(`最新会话导入失败：${latest.details[0].message || ''}`);
          props.onOpenSessions?.({ deviceId, status: 'all' });
          return;
        }
        // 回退：逐条导入所有 pending
        let lastProgress = 0;
        const summary = await processPendingSessionsForDevice(deviceId, {
          scriptKey,
          onProgress: ({ index, total }) => {
            const pct = Math.floor((index / total) * 100);
            if (pct - lastProgress >= 10 || index === total) { lastProgress = pct; message.loading({ content: `设备 ${deviceId} 导入中… ${index}/${total}` as any, key: `imp_${deviceId}`, duration: 0 }); }
          }
        });
        message.destroy(`imp_${deviceId}`);
        message.success(`导入完成：成功 ${summary.success}/${summary.total}，失败 ${summary.failed}`);
        props.onOpenSessions?.({ deviceId, status: 'all' });
      } else if (props.onImportToDevice) {
        // 若外部提供回调，走外部逻辑（可能包含生成VCF再导入）
        await props.onImportToDevice(deviceId, { start: row.idStart, end: row.idEnd, industry: row.industry, scriptKey });
      } else {
        // 无 pending 且无外部回调：自动生成“未分类100” 的 VCF 并导入（带设备端严格校验）
        const unclassified = await fetchUnclassifiedNumbers(100, true);
        if (!unclassified.length) { message.warning('没有可用的未分类号码'); return; }
        const vcfContent = buildVcfFromNumbers(unclassified as any);
        const tempPath = VcfImportService.generateTempVcfPath();
        await VcfImportService.writeVcfFile(tempPath, vcfContent);
        // 记录批次与会话
        const ids = unclassified.map(n => n.id).sort((a, b) => a - b);
        const batchId = `vcf_${deviceId}_${ids[0]}_${ids[ids.length - 1]}_${Date.now()}`;
        try { await createVcfBatchWithNumbers({ batchId, vcfFilePath: tempPath, sourceStartId: ids[0], sourceEndId: ids[ids.length - 1], numberIds: ids }); } catch {}
        let sessionId: number | null = null;
        try { sessionId = await createImportSessionRecord(batchId, deviceId); } catch {}
        const vcfService = ServiceFactory.getVcfImportApplicationService();
        // 导入前联系人数量
        let beforeCount: number | null = null;
        try {
          const metrics = ServiceFactory.getDeviceMetricsApplicationService();
          beforeCount = await metrics.getContactCount(deviceId);
        } catch {}
        const outcome = await vcfService.importToDevice(deviceId, tempPath, scriptKey);
        // 导入后联系人数量，严格校验
        let delta: number | undefined = undefined;
        let ok = !!outcome.success;
        let msg = outcome.message || '';
        if (beforeCount != null) {
          try {
            const metrics = ServiceFactory.getDeviceMetricsApplicationService();
            const after = await metrics.getContactCount(deviceId);
            delta = after - beforeCount;
            if (ok && (delta ?? 0) <= 0) {
              ok = false;
              msg = (msg ? `${msg}; ` : '') + `verification failed (delta=${delta})`;
            }
          } catch {}
        }
        try {
          if (sessionId != null) {
            const status = ok ? 'success' : 'failed';
            await finishImportSessionRecord(sessionId, status as any, outcome.importedCount ?? 0, outcome.failedCount ?? 0, ok ? undefined : msg);
          }
        } catch {}
        if (ok) {
          if (typeof delta === 'number') message.success(`导入成功：联系人 +${delta}`);
          else message.success('导入成功');
        } else {
          message.error(msg || '导入失败');
        }
      }
    } finally { setImportingIds(prev => ({ ...prev, [deviceId]: false })); }
  };

  const handleAllocateToDevice = async (row: DeviceAssignmentRow) => {
    const { deviceId } = row;
    setAllocatingIds(prev => ({ ...prev, [deviceId]: true }));
    try {
      const n = Math.max(1, Math.floor(assignCount[deviceId] ?? 100));
      const res = await allocateNumbersToDevice(deviceId, n, row.industry);
      if (!res || !res.batch_id || res.number_count <= 0) { message.warning('当前条件下无可分配号码，请调整行业或数量后重试'); return; }
      bindBatchToDevice(deviceId, res.batch_id);
      message.success(`已为设备 ${deviceId} 分配 ${res.number_count} 个号码（批次 ${res.batch_id}）`);
      props.onOpenSessions?.({ deviceId, status: 'pending' });
    } catch (e: any) { message.error(`分配失败：${e?.message || e}`); }
    finally { setAllocatingIds(prev => ({ ...prev, [deviceId]: false })); }
  };

  useEffect(() => {
    data.forEach((row) => {
      if (row.industry) {
        includeIndustryOption(row.industry);
      }
    });
  }, [data, includeIndustryOption]);

  return (
    <div>
      <Space className={styles.toolbar} wrap>
        <Toolbar
          allSelected={allSelected}
          selectedCount={selectedIds.length}
          onToggleAll={toggleSelectAll}
          onClear={clearSelection}
          bulkCount={bulkCount}
          setBulkCount={setBulkCount}
          onBulkAssign={bulkAssign}
          onRefreshDevices={undefined}
          onRefreshAllCounts={refreshAllCounts}
        />
      </Space>
      <Row gutter={[12, 12]}>
        {data.map((row) => {
          const isSelected = !!selected[row.deviceId];
          const bindings = getBindings(row.deviceId);
          return (
            <Col key={row.deviceId} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <DeviceCard
                row={row}
                industries={industryOptions}
                isSelected={isSelected}
                setSelected={(checked) => setSelected(prev => ({ ...prev, [row.deviceId]: checked }))}
                meta={meta[row.deviceId]}
                loadingCount={!!loadingIds[row.deviceId]}
                onRefreshCount={() => refreshCount(row.deviceId)}
                onUpdateRow={(patch) => updateRow(row.deviceId, patch)}
                assignCount={assignCount[row.deviceId] ?? 100}
                setAssignCount={(n) => setAssignCount(prev => ({ ...prev, [row.deviceId]: n }))}
                onAutoAssign={() => autoAssignRange(row.deviceId, assignCount[row.deviceId] ?? 100)}
                onAllocate={() => handleAllocateToDevice(row)}
                onGenerateVcf={() => handleGenerateVcf(row)}
                onImport={() => handleImportToDevice(row)}
                importing={!!importingIds[row.deviceId]}
                allocating={!!allocatingIds[row.deviceId]}
                generating={!!generatingIds[row.deviceId]}
                bindings={{ pending: bindings.pending.length, imported: bindings.imported.length }}
                onOpenSessions={(status) => props.onOpenSessions?.({ deviceId: row.deviceId, status })}
                onIncludeIndustryOption={includeIndustryOption}
                onRequestIndustries={refreshIndustryOptions}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
