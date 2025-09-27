import React, { useMemo, useState } from 'react';
import { Modal, Table, Tag, Space, Button, Segmented, Tooltip, message } from 'antd';
import type { BatchExecuteResult } from '../services/batchExecutor';
import { exportAllResultCsv, exportCurrentViewCsv, exportFailsOnlyCsv, exportFailsByReasonCsv, exportViewDeviceIdsCsv, exportFailSummaryCsv } from '../services/exportService';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useReasonGroups } from '../hooks/useReasonGroups';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportSettingsButton from './export/ExportSettingsButton';
import ExportPreviewModal from './export/ExportPreviewModal';
import { FailReasonChips, ViewStatsBar } from './result';
import styles from './BatchResultModal.module.css';

interface Props {
  open: boolean;
  result: BatchExecuteResult | null;
  onClose: () => void;
  onRetryFailed?: () => void;
  assignmentSnapshot?: Record<string, { industry?: string; idStart?: number; idEnd?: number }>
}

const BatchResultModal: React.FC<Props> = ({ open, result, onClose, onRetryFailed, assignmentSnapshot }) => {
  const [view, setView] = useState<'all' | 'success' | 'fail'>('all');
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useLocalStorageState<boolean>(
    'contactImport.batchResult.showSummary',
    { defaultValue: true, validate: (v: unknown): v is boolean => typeof v === 'boolean' }
  );
  const [exportOptions, setExportOptions] = useExportOptions();
  const [openPreview, setOpenPreview] = useState(false);
    const columns = [ 
    { title: '设备ID', dataIndex: 'deviceId', key: 'deviceId' },
    {
      title: '结果', key: 'success', render: (_: any, r: any) => r.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>
    },
    {
      title: '消息', dataIndex: 'message', key: 'message',
      render: (_: any, r: any) => (
        <Tooltip title={r.message} placement="topLeft">
          <div style={{ maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.message ?? ''}
          </div>
        </Tooltip>
      )
    },
    { title: '导入数', key: 'importedContacts', render: (_: any, r: any) => r.importedContacts ?? '-' },
    { title: '总数', key: 'totalContacts', render: (_: any, r: any) => r.totalContacts ?? '-' },
  ];

  const failureCount = result?.deviceResults.filter(d => !d.success).length ?? 0;
  const successCountAll = result?.deviceResults.filter(d => d.success).length ?? 0;
  const totalAll = result?.deviceResults.length ?? 0;
  const failGroups = useReasonGroups(result);

  const viewData = useMemo(() => {
    let all = result?.deviceResults || [];
    if (view === 'success') all = all.filter(d => d.success);
    if (view === 'fail') all = all.filter(d => !d.success);
    if (reasonFilter) all = all.filter(d => (d.message || '').trim() === reasonFilter);
    return all;
  }, [result, view, reasonFilter]);

  const statsForView = useMemo(() => {
    const total = viewData.length;
    const success = viewData.filter(d => d.success).length;
    const fail = viewData.filter(d => !d.success).length;
    const pct = (n: number) => (total === 0 ? '0.0%' : `${((n / total) * 100).toFixed(1)}%`);
    return { total, success, fail, pctSuccess: pct(success), pctFail: pct(fail) };
  }, [viewData]);

  // failGroups 已通过 hook 计算

  const handleExportFailSummary = () => {
    if (!result) return;
    if (failureCount === 0) { message.info('没有失败记录可导出'); return; }
    exportFailSummaryCsv(result);
  };

  const handleExportCsv = () => {
    if (!result) return;
    exportAllResultCsv(result, assignmentSnapshot, exportOptions);
  };

  const handleExportCurrentView = () => {
    if (!result) return;
    exportCurrentViewCsv(viewData, assignmentSnapshot, view, exportOptions);
  };

  const handleExportFailsOnly = () => {
    if (!result) return;
    const fails = (result.deviceResults || []).filter(r => !r.success);
    if (fails.length === 0) { message.info('没有失败记录可导出'); return; }
    exportFailsOnlyCsv(result, assignmentSnapshot, exportOptions);
  };

  const handleCopyFailIds = async () => {
    if (!result) return;
    const ids = (result.deviceResults || []).filter(r => !r.success).map(r => r.deviceId);
    if (ids.length === 0) {
      message.info('没有失败设备ID');
      return;
    }
    await navigator.clipboard.writeText(ids.join('\n'));
    message.success('失败设备ID已复制到剪贴板');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      className={styles.modal}
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{`批次结果：成功 ${result?.successDevices ?? 0}/${result?.totalDevices ?? 0}`}</span>
          <Space>
            <Segmented
              value={view}
              onChange={(v) => setView(v as any)}
              options={[{ label: '全部', value: 'all' }, { label: '成功', value: 'success' }, { label: '失败', value: 'fail' }]}
            />
            <Button size="small" onClick={() => { setReasonFilter(null); setView('all'); }} disabled={view === 'all' && !reasonFilter}>重置筛选</Button>
            <Button size="small" onClick={() => setShowSummary(s => !s)}>{showSummary ? '隐藏摘要' : '显示摘要'}</Button>
          </Space>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button onClick={() => setOpenPreview(true)} disabled={!result || (viewData.length === 0)}>预览导出…</Button>
          <Button onClick={handleExportCsv} disabled={!result || (result?.deviceResults.length === 0)}>导出CSV</Button>
          <Button onClick={handleExportCurrentView} disabled={!result || (viewData.length === 0)}>导出当前视图</Button>
          <Button
            onClick={() => {
              if (!result) return;
              const rows = (viewData || []).map(v => ({ deviceId: v.deviceId }));
              if (rows.length === 0) { message.info('当前视图没有设备'); return; }
              exportViewDeviceIdsCsv(viewData);
            }}
            disabled={!result || (viewData.length === 0)}
          >
            导出当前视图设备ID
          </Button>
          <Button
            onClick={async () => {
              if (!result) return;
              const ids = (viewData || []).map(v => v.deviceId);
              if (ids.length === 0) { message.info('当前视图没有设备'); return; }
              await navigator.clipboard.writeText(ids.join('\n'));
              message.success(`当前视图设备ID已复制（${ids.length} 台）`);
            }}
            disabled={!result || (viewData.length === 0)}
          >
            复制当前视图设备ID
          </Button>
          <Button onClick={handleExportFailsOnly} disabled={!result || !failureCount}>导出失败CSV</Button>
          <Button
            onClick={() => {
              if (!result || !reasonFilter) return;
              const fails = (result.deviceResults || []).filter(r => !r.success && (r.message || '').trim() === reasonFilter);
              if (fails.length === 0) {
                message.info('当前原因没有失败记录可导出');
                return;
              }
              exportFailsByReasonCsv(result, reasonFilter, assignmentSnapshot, exportOptions);
            }}
            disabled={!result || !reasonFilter}
          >
            导出当前原因失败
          </Button>
          <Button onClick={handleExportFailSummary} disabled={!failureCount}>导出失败原因汇总</Button>
          <Button onClick={handleCopyFailIds} disabled={!failureCount}>复制失败设备ID</Button>
          <Button type="primary" disabled={!failureCount} onClick={onRetryFailed}>重试失败项（{failureCount}）</Button>
          <ExportSettingsButton options={exportOptions} onChange={setExportOptions} />
        </Space>
      }
    >
      <ExportPreviewModal
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        viewLabel={view}
        viewData={viewData}
        assignmentSnapshot={assignmentSnapshot}
        options={exportOptions}
      />
      {failureCount > 0 && showSummary && (
        <FailReasonChips
          groups={failGroups}
          reasonFilter={reasonFilter}
          onToggle={(reason) => {
            setView('fail');
            setReasonFilter(prev => (prev === reason ? null : reason));
          }}
          onClear={() => setReasonFilter(null)}
        />
      )}
      {/* 筛选摘要与统计条 */}
      {showSummary && (
        <ViewStatsBar
          view={view}
          reasonFilter={reasonFilter}
          successCountAll={successCountAll}
          totalAll={totalAll}
          statsForView={statsForView}
        />
      )}
      <Table
        rowKey={(r) => r.deviceId}
        size="small"
        columns={columns as any}
        dataSource={viewData}
        pagination={false}
        scroll={{ x: true, y: 360 }}
      />
    </Modal>
  );
};

export default BatchResultModal;
