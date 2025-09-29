import React, { useCallback, useMemo, useState } from 'react';
import { App } from 'antd';
import type { ImportSessionList } from '../types';
import { revertImportSessionToFailed, updateImportSessionIndustry, type ImportSessionEventDto } from '../../services/contactNumberService';
import { createSessionsTableColumns, type SessionTableColumn } from './table-columns';
import { ResizableTable, useColumnWidthPersistence } from './resizable-table';
import { normalizeIndustry, useIndustryOptions } from '../../shared/industryOptions';

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

const SessionsTable: React.FC<Props> = ({ 
  data, 
  loading, 
  industryLabels = {}, 
  pagination, 
  highlightId, 
  rowSelectionType = 'radio', 
  selectedRowKeys, 
  onSelectionChange, 
  onViewBatchNumbers, 
  onRefresh 
}) => {
  const { message } = App.useApp();
  const [selectedEventBySession, setSelectedEventBySession] = useState<Record<number, ImportSessionEventDto | null>>({});
  const { options: industryOptions, refresh: refreshIndustryOptions, include: includeIndustryOption } = useIndustryOptions();

  // 保存分类
  const handleChangeIndustry = useCallback(async (sessionId: number, next?: string | null) => {
    const normalized = normalizeIndustry(next);
    try {
      await updateImportSessionIndustry(sessionId, normalized);
      if (normalized) {
        includeIndustryOption(normalized);
      }
      message.success(normalized ? `已更新分类：${normalized}` : '已清除分类');
      await onRefresh?.();
    } catch (e: any) {
      message.error(`更新分类失败: ${e?.message || e}`);
    }
  }, [includeIndustryOption, message, onRefresh]);

  // 历史事件选择（仅前端展示覆盖，不写库）
  const handleSelectEventForSession = useCallback((sessionId: number, ev: ImportSessionEventDto | null) => {
    setSelectedEventBySession(prev => ({ ...prev, [sessionId]: ev }));
  }, []);

  // 回滚会话
  const handleRevertSession = useCallback(async (sessionId: number) => {
    try {
      const affected = await revertImportSessionToFailed(sessionId, '用户手动回滚');
      message.success(`已回滚为失败，恢复号码 ${affected} 个为未导入`);
      await onRefresh?.();
    } catch (e: any) {
      message.error(`回滚失败: ${e?.message || e}`);
    }
  }, [message, onRefresh]);

  // 列宽持久化 
  const [columnWidths, setColumnWidths] = useColumnWidthPersistence('sessions-table-widths', {
    started_at: 140,      // 开始时间
    latest_time: 180,     // 导入最新时间（下拉）
    batch_id: 120,        // 批次ID
    status: 100,          // 状态
    device_id: 160,       // 设备ID
    total_count: 100,     // 总数
    success_count: 100,   // 成功数
    failed_count: 100,    // 失败数
    industry: 120,        // 分类
    error_message: 200,   // 错误信息
  });

  // 创建表格列配置
  const columns = useMemo(() => {
    return createSessionsTableColumns({
      industryLabels,
      industryOptions,
      onChangeIndustry: handleChangeIndustry,
      onRequestIndustryOptions: refreshIndustryOptions,
      onRevertSession: handleRevertSession,
      onViewBatchNumbers,
      onRefresh,
      selectedEventBySession,
      onSelectEventForSession: handleSelectEventForSession,
    });
  }, [
    industryLabels,
    industryOptions,
    handleChangeIndustry,
    refreshIndustryOptions,
    handleRevertSession,
    onViewBatchNumbers,
    onRefresh,
    selectedEventBySession,
    handleSelectEventForSession,
  ]);

  return (
    <ResizableTable<SessionTableColumn>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={data?.items || []}
      columns={columns}
      defaultColumnWidths={columnWidths}
      onColumnWidthChange={setColumnWidths}
      resizable={true}
      minColumnWidth={80}
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
      rowClassName={(record: SessionTableColumn) => 
        record.id === highlightId ? 'ant-table-row-selected' : ''
      }
    />
  );
};

export default SessionsTable;
