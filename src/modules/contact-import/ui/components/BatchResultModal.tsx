import React, { useMemo, useState } from 'react';
import { Modal, Table, Tag, Space, Button, Segmented, Tooltip, message } from 'antd';
import type { BatchExecuteResult } from '../services/batchExecutor';
import { toCsv, downloadCsvWithBom } from '../../utils/csv';

interface Props {
  open: boolean;
  result: BatchExecuteResult | null;
  onClose: () => void;
  onRetryFailed?: () => void;
  assignmentSnapshot?: Record<string, { industry?: string; idStart?: number; idEnd?: number }>
}

const BatchResultModal: React.FC<Props> = ({ open, result, onClose, onRetryFailed, assignmentSnapshot }) => {
  const [view, setView] = useState<'all' | 'success' | 'fail'>('all');
  const columns = [
    { title: '设备ID', dataIndex: 'deviceId', key: 'deviceId' },
    {
      title: '结果', key: 'success', render: (_: any, r: any) => r.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>
    },
    { title: '消息', dataIndex: 'message', key: 'message' },
    { title: '导入数', key: 'importedContacts', render: (_: any, r: any) => r.importedContacts ?? '-' },
    { title: '总数', key: 'totalContacts', render: (_: any, r: any) => r.totalContacts ?? '-' },
  ];

  const failureCount = result?.deviceResults.filter(d => !d.success).length ?? 0;

  const viewData = useMemo(() => {
    const all = result?.deviceResults || [];
    if (view === 'success') return all.filter(d => d.success);
    if (view === 'fail') return all.filter(d => !d.success);
    return all;
  }, [result, view]);

  const failGroups = useMemo(() => {
    const items = (result?.deviceResults || []).filter(d => !d.success);
    const m = new Map<string, number>();
    for (const it of items) {
      const reason = (it.message || '未知错误').trim();
      m.set(reason, (m.get(reason) || 0) + 1);
    }
    return Array.from(m.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [result]);

  const handleExportFailSummary = () => {
    if (!result) return;
    if (failureCount === 0) {
      message.info('没有失败记录可导出');
      return;
    }
    const total = result.deviceResults.length || 1;
    const rows = failGroups.map(g => ({
      reason: g.reason,
      count: g.count,
      percent: ((g.count / total) * 100).toFixed(1) + '%',
    }));
    const csv = toCsv(rows, ['reason', 'count', 'percent']);
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `batch-fail-summary-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;
    downloadCsvWithBom(name, csv);
  };

  const buildCsvRows = (list: typeof result.deviceResults) => list.map(r => ({
      deviceId: r.deviceId,
      success: r.success ? 'success' : 'fail',
      message: r.message ?? '',
      importedContacts: r.importedContacts ?? '',
      totalContacts: r.totalContacts ?? '',
      ...(assignmentSnapshot ? {
        industry: assignmentSnapshot[r.deviceId]?.industry ?? '',
        idStart: assignmentSnapshot[r.deviceId]?.idStart ?? '',
        idEnd: assignmentSnapshot[r.deviceId]?.idEnd ?? '',
      } : {}),
    }));
  const baseHeaders = ['deviceId', 'success', 'message', 'importedContacts', 'totalContacts'] as const;
  const csvHeaders = assignmentSnapshot ? [...baseHeaders, 'industry', 'idStart', 'idEnd'] as const : baseHeaders;
  const handleExportCsv = () => {
    if (!result) return;
    const rows = buildCsvRows(result.deviceResults);
    const csv = toCsv(rows, csvHeaders as unknown as string[]);
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `batch-result-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;
  downloadCsvWithBom(name, csv);
  };

  const handleExportCurrentView = () => {
    if (!result) return;
    const rows = buildCsvRows(viewData);
    const csv = toCsv(rows, csvHeaders as unknown as string[]);
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `batch-result-${view}-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;
  downloadCsvWithBom(name, csv);
  };

  const handleExportFailsOnly = () => {
    if (!result) return;
    const fails = (result.deviceResults || []).filter(r => !r.success);
    if (fails.length === 0) {
      message.info('没有失败记录可导出');
      return;
    }
    const rows = buildCsvRows(fails);
    const csv = toCsv(rows, csvHeaders as unknown as string[]);
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `batch-result-fails-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;
  downloadCsvWithBom(name, csv);
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
      width={720}
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{`批次结果：成功 ${result?.successDevices ?? 0}/${result?.totalDevices ?? 0}`}</span>
          <Segmented
            value={view}
            onChange={(v) => setView(v as any)}
            options={[{ label: '全部', value: 'all' }, { label: '成功', value: 'success' }, { label: '失败', value: 'fail' }]}
          />
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button onClick={handleExportCsv} disabled={!result || (result?.deviceResults.length === 0)}>导出CSV</Button>
          <Button onClick={handleExportCurrentView} disabled={!result || (viewData.length === 0)}>导出当前视图</Button>
          <Button onClick={handleExportFailsOnly} disabled={!result || !failureCount}>导出失败CSV</Button>
          <Button onClick={handleExportFailSummary} disabled={!failureCount}>导出失败原因汇总</Button>
          <Button onClick={handleCopyFailIds} disabled={!failureCount}>复制失败设备ID</Button>
          <Button type="primary" disabled={!failureCount} onClick={onRetryFailed}>重试失败项（{failureCount}）</Button>
        </Space>
      }
    >
      {failureCount > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Space wrap size={4}>
            {failGroups.slice(0, 3).map(g => (
              <Tag color="red" key={g.reason}>{g.reason} ×{g.count}</Tag>
            ))}
            {failGroups.length > 3 && <span style={{ color: 'rgba(0,0,0,0.45)' }}>… 还有 {failGroups.length - 3} 种失败</span>}
          </Space>
        </div>
      )}
      <Table
        rowKey={(r) => r.deviceId}
        size="small"
        columns={columns as any}
        dataSource={viewData}
        pagination={false}
      />
    </Modal>
  );
};

export default BatchResultModal;
