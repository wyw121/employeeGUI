import React from 'react';
import { Table, Tag, Button, Space, App } from 'antd';
import type { ImportSessionList } from '../types';
import { getVcfBatchRecord, createImportSessionRecord, finishImportSessionRecord } from '../../services/contactNumberService';
import ServiceFactory from '../../../../../application/services/ServiceFactory';

interface Props {
  data?: ImportSessionList | null;
  loading?: boolean;
  // 批次 -> 分类标签（行业）
  industryLabels?: Record<string, string>;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRefresh?: () => void | Promise<void>;
  highlightId?: number;
  // 行选择（默认单选radio）
  rowSelectionType?: 'checkbox' | 'radio';
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: any[]) => void;
  onViewBatchNumbers?: (batchId: string) => void;
}

const SessionsTable: React.FC<Props> = ({ data, loading, industryLabels, pagination, highlightId, rowSelectionType = 'radio', selectedRowKeys, onSelectionChange, onViewBatchNumbers, onRefresh }) => {
  const { message } = App.useApp();
  const handleImport = async (row: any) => {
    const batchId: string = row.batch_id;
    const deviceId: string = row.device_id;
    try {
      // 读取批次以获取 vcf_file_path
      const batch = await getVcfBatchRecord(batchId);
      if (!batch || !batch.vcf_file_path) {
        return message.warning('批次缺少 VCF 文件路径，无法导入');
      }
      const sessionId = await createImportSessionRecord(batchId, deviceId);
      message.info(`会话 #${sessionId} 已创建，开始导入...`);
      try { await onRefresh?.(); } catch {}
      const vcfService = ServiceFactory.getVcfImportApplicationService();
      const res = await vcfService.importToDevice(deviceId, batch.vcf_file_path);
      const status = res.success ? 'success' : 'failed';
      await finishImportSessionRecord(sessionId, status as any, res.importedCount ?? 0, res.failedCount ?? 0, res.success ? undefined : res.message);
      if (res.success) {
        message.success('导入成功');
      } else {
        message.error(res.message || '导入失败');
      }
      try { await onRefresh?.(); } catch {}
    } catch (e: any) {
      message.error(`导入异常: ${e?.message ?? e}`);
    }
  };
  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={data?.items || []}
      rowSelection={onSelectionChange ? {
        type: rowSelectionType,
        selectedRowKeys,
        onChange: onSelectionChange,
      } : undefined}
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        showTotal: (t) => `共 ${t} 条`,
      } : false}
      rowClassName={(record: any) => record.id === highlightId ? 'ant-table-row-selected' : ''}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '批次', dataIndex: 'batch_id' },
        { title: '分类', width: 100, render: (_: any, r: any) => {
          const fromServer = (r.industry ?? '').trim();
          const label = fromServer || industryLabels?.[r.batch_id];
          return label ? <Tag>{label}</Tag> : <Tag color="default">—</Tag>;
        } },
        { title: '设备', dataIndex: 'device_id' },
        { title: '状态', dataIndex: 'status', render: (s: string) => s === 'success' ? <Tag color="green">成功</Tag> : s === 'failed' ? <Tag color="red">失败</Tag> : <Tag>进行中</Tag> },
        { title: '导入/失败', render: (_: any, r: any) => `${r.imported_count}/${r.failed_count}` },
        // 可选：包含数量徽标（导入+失败）
        { title: '包含数量', width: 100, render: (_: any, r: any) => {
          const total = (r.imported_count || 0) + (r.failed_count || 0);
          return <Tag color="blue">{total}</Tag>;
        } },
        { title: '开始', dataIndex: 'started_at', width: 160 },
        { title: '结束', dataIndex: 'finished_at', width: 160 },
        { title: '错误', dataIndex: 'error_message' },
        { title: '操作', width: 220, render: (_: any, r: any) => (
          <Space size={8}>
            <Button size="small" onClick={() => onViewBatchNumbers?.(r.batch_id)}>查看</Button>
            <Button size="small" type="primary" onClick={() => handleImport(r)} disabled={!r?.batch_id || !r?.device_id}>导入</Button>
          </Space>
        ) },
      ]}
    />
  );
};

export default SessionsTable;
