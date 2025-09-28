import React, { useMemo, useState } from 'react';
import { Table, Tag, Button, Space, Select, App, Popconfirm } from 'antd';
import type { ImportSessionList } from '../types';
import { EnhancedSessionImportButton } from './enhanced-import/EnhancedSessionImportButton';
import { getDistinctIndustries, revertImportSessionToFailed, updateImportSessionIndustry } from '../../services/contactNumberService';

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
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<{ id: number; value?: string | null } | null>(null);
  const [indOptions, setIndOptions] = useState<string[]>([]);

  const ensureIndustryOptions = async () => {
    if (indOptions.length === 0) {
      const list = await getDistinctIndustries().catch(() => []);
      setIndOptions(list);
    }
  };

  const handleSaveIndustry = async (sessionId: number, industry?: string | null) => {
    try {
      await updateImportSessionIndustry(sessionId, industry);
      setEditing(null);
      message.success('已更新分类');
      await onRefresh?.();
    } catch (e: any) {
      message.error(`更新分类失败: ${e?.message || e}`);
    }
  };

  const handleRevert = async (sessionId: number) => {
    try {
      const affected = await revertImportSessionToFailed(sessionId, '用户手动回滚');
      message.success(`已回滚为失败，恢复号码 ${affected} 个为未导入`);
      await onRefresh?.();
    } catch (e: any) {
      message.error(`回滚失败: ${e?.message || e}`);
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
        { title: '分类', width: 180, render: (_: any, r: any) => {
          const fromServer = (r.industry ?? '').trim();
          const label = fromServer || industryLabels?.[r.batch_id] || '';
          const isEditing = editing?.id === r.id;
          if (isEditing) {
            return (
              <Space size={4}>
                <Select
                  size="small"
                  style={{ minWidth: 120 }}
                  showSearch
                  placeholder="选择或输入分类"
                  mode="tags"
                  value={editing?.value ? [editing.value] : []}
                  onDropdownVisibleChange={(open) => { if (open) ensureIndustryOptions(); }}
                  onChange={(vals) => {
                    const arr = Array.isArray(vals) ? vals : [];
                    const last = arr.length ? String(arr[arr.length - 1]).trim() : '';
                    setEditing({ id: r.id, value: last || undefined });
                  }}
                  options={[...indOptions.map(i => ({ label: i, value: i }))]}
                  // 允许自由输入
                  onSearch={(val) => { /* no-op: keep typed */ }}
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  // Antd Select 不支持直接 free text 提交，这里使用 tag 模式较重；简化为 options+保留原值
                />
                <Space size={4}>
                  <Button size="small" type="primary" onClick={() => handleSaveIndustry(r.id, editing?.value || undefined)}>保存</Button>
                  <Button size="small" onClick={() => setEditing(null)}>取消</Button>
                </Space>
              </Space>
            );
          }
          return (
            <Space size={4}>
              {label ? <Tag>{label}</Tag> : <Tag color="default">—</Tag>}
              <Button size="small" type="link" onClick={() => setEditing({ id: r.id, value: label })}>编辑</Button>
            </Space>
          );
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
        { title: '操作', width: 320, render: (_: any, r: any) => (
          <Space size={8}>
            <Button size="small" onClick={() => onViewBatchNumbers?.(r.batch_id)}>查看</Button>
            <EnhancedSessionImportButton 
              sessionRow={r} 
              onRefresh={onRefresh}
            />
            {r.status === 'success' && (
              <Popconfirm
                title="将该会话标记为失败并回滚号码？"
                description="相关号码将恢复为未导入，可重新分配/导入。此操作不可逆。"
                okText="确认回滚"
                cancelText="取消"
                onConfirm={() => handleRevert(r.id)}
              >
                <Button size="small" danger>标记失败并回滚</Button>
              </Popconfirm>
            )}
          </Space>
        ) },
      ]}
    />
  );
};

export default SessionsTable;
