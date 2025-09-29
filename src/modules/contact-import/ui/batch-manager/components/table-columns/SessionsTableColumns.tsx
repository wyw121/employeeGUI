import type { ColumnsType } from 'antd/es/table';
import { Tag, Space, Button, Select, Popconfirm } from 'antd';
import React from 'react';
import { TimeFormatterCell, BatchIdCell, LatestImportTimeCell } from '../table-cells';
import { EnhancedSessionImportButton } from '../enhanced-import/EnhancedSessionImportButton';
import type { ImportSessionEventDto } from '../../../services/contactNumberService';

/**
 * 导入会话表格列配置
 * 优化后的列布局：时间优先，批次可调整宽度
 */

export interface SessionTableColumn {
  /** 表格行数据类型 */
  id: number;
  batch_id: string;
  industry?: string | null;
  device_id: string;
  status: string;
  imported_count?: number;
  failed_count?: number;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
}

export interface CreateSessionsTableColumnsOptions {
  /** 行业标签映射 */
  industryLabels?: Record<string, string>;
  /** 分类选项列表 */
  industryOptions?: string[];
  /** 更新分类 */
  onChangeIndustry?: (sessionId: number, industry?: string | null) => void | Promise<void>;
  /** 请求刷新分类选项 */
  onRequestIndustryOptions?: () => void | Promise<void>;
  /** 回滚会话回调 */
  onRevertSession?: (sessionId: number) => Promise<void>;
  /** 查看批次号码回调 */
  onViewBatchNumbers?: (batchId: string) => void;
  /** 刷新回调 */
  onRefresh?: () => void | Promise<void>;
  /** 覆盖显示：按会话选择的历史事件 */
  selectedEventBySession?: Record<number, ImportSessionEventDto | null>;
  /** 选择历史事件时触发（建议上层仅做展示覆盖，不写库） */
  onSelectEventForSession?: (sessionId: number, ev: ImportSessionEventDto | null) => void;
}

/**
 * 创建会话表格列配置
 * 时间字段优先，支持列宽调整
 */
export const createSessionsTableColumns = (options: CreateSessionsTableColumnsOptions): ColumnsType<SessionTableColumn> => {
  const {
    industryLabels = {},
    industryOptions = [],
    onChangeIndustry,
    onRequestIndustryOptions,
    onRevertSession,
    onViewBatchNumbers,
    onRefresh,
    selectedEventBySession,
    onSelectEventForSession,
  } = options;

  // 工具函数：根据指定字段判断是否需要更新单元格
  const shouldUpdateBy = (keys: (keyof SessionTableColumn)[]) => (
    record: SessionTableColumn,
    prevRecord: SessionTableColumn
  ) => keys.some((k) => record[k] !== prevRecord[k]);

  return [
    // ID列（最前面）
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      shouldCellUpdate: shouldUpdateBy(['id'])
    },

    // 开始时间（第二）
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 120,
      render: (datetime: string) => (
        <TimeFormatterCell datetime={datetime} />
      ),
      shouldCellUpdate: shouldUpdateBy(['started_at'])
    },

    // 导入时间（下拉可选历史事件时间，紧凑仅下拉）
    {
      title: '导入时间',
      dataIndex: 'finished_at',
      key: 'latest_time',
      width: 180,
      render: (_: any, record: SessionTableColumn) => (
        <LatestImportTimeCell 
          sessionId={record.id} 
          finishedAt={record.finished_at || undefined}
          onSelectEvent={(ev) => onSelectEventForSession?.(record.id, ev)}
          onlySelect
        />
      ),
      shouldCellUpdate: shouldUpdateBy(['finished_at'])
    },

    // 分类字段
    {
      title: '分类',
      key: 'industry',
      width: 180,
      render: (_, record: SessionTableColumn) => {
        const candidates = [record.industry, industryLabels[record.batch_id]];
        const current = candidates.find((item) => (item ?? '').trim().length > 0)?.trim() ?? '';

        return (
          <Select
            size="small"
            style={{ minWidth: 140 }}
            showSearch
            mode="tags"
            allowClear
            placeholder="选择或输入分类"
            value={current ? [current] : []}
            maxTagCount={1}
            options={industryOptions.map((label) => ({ label, value: label }))}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            onDropdownVisibleChange={(open) => {
              if (open) {
                onRequestIndustryOptions?.();
              }
            }}
            onChange={(vals) => {
              const arr = Array.isArray(vals) ? vals : [];
              const last = arr.length ? String(arr[arr.length - 1]).trim() : '';
              if (!last) {
                if (current) {
                  onChangeIndustry?.(record.id, undefined);
                }
                return;
              }
              if (last !== current) {
                onChangeIndustry?.(record.id, last);
              }
            }}
            onClear={() => {
              if (current) {
                onChangeIndustry?.(record.id, undefined);
              }
            }}
          />
        );
      }
    },

    // 设备
    {
      title: '设备',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 120,
      render: (_: any, record: SessionTableColumn) => {
        const override = selectedEventBySession?.[record.id] || null;
        const deviceId = override?.device_id || record.device_id;
        return (
          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {deviceId}
          </span>
        );
      },
    },

    // 状态
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (_: any, record: SessionTableColumn) => {
        const override = selectedEventBySession?.[record.id] || null;
        const status = (override?.status || record.status) as string;
        const statusMap = {
          success: <Tag color="green">成功</Tag>,
          failed: <Tag color="red">失败</Tag>
        };
        return statusMap[status as keyof typeof statusMap] || <Tag>进行中</Tag>;
      },
    },

    // 导入/失败数量
    {
      title: '导入/失败',
      key: 'import_stats',
      width: 100,
      render: (_, record: SessionTableColumn) => {
        const override = selectedEventBySession?.[record.id] || null;
        const imported = override?.imported_count ?? record.imported_count ?? 0;
        const failed = override?.failed_count ?? record.failed_count ?? 0;
        return (
          <span style={{ fontSize: '12px' }}>
            {imported}/{failed}
          </span>
        );
      },
    },

    // 包含数量
    {
      title: '总数',
      key: 'total_count',
      width: 80,
      render: (_, record: SessionTableColumn) => {
        const override = selectedEventBySession?.[record.id] || null;
        const imported = override?.imported_count ?? record.imported_count ?? 0;
        const failed = override?.failed_count ?? record.failed_count ?? 0;
        const total = imported + failed;
        return <Tag color="blue">{total}</Tag>;
      },
    },

    // 操作列
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_, record: SessionTableColumn) => (
        <Space size={8}>
          <Button 
            size="small" 
            onClick={() => onViewBatchNumbers?.(record.batch_id)}
          >
            查看
          </Button>
          <EnhancedSessionImportButton 
            sessionRow={record} 
            onRefresh={onRefresh}
          />
          {record.status === 'success' && (
            <Popconfirm
              title="将该会话标记为失败并回滚号码？"
              description="相关号码将恢复为未导入，可重新分配/导入。此操作不可逆。"
              okText="确认回滚"
              cancelText="取消"
              onConfirm={() => onRevertSession?.(record.id)}
            >
              <Button size="small" danger>回滚</Button>
            </Popconfirm>
          )}
        </Space>
      ),
      shouldCellUpdate: shouldUpdateBy(['status', 'imported_count', 'failed_count', 'error_message'])
    },

    // 批次字段 - 放到末尾
    {
      title: '批次',
      dataIndex: 'batch_id',
      key: 'batch_id',
      width: 150,
      render: (batchId: string) => (
        <BatchIdCell 
          batchId={batchId}
          abbreviateLength={12}
          maxWidth={140}
        />
      ),
      shouldCellUpdate: shouldUpdateBy(['batch_id'])
    },

    // 错误信息 - 放到最后
    {
      title: '错误',
      dataIndex: 'error_message',
      key: 'error_message',
      width: 200,
      ellipsis: {
        showTitle: true
      },
      render: (value: string, record: SessionTableColumn) => {
        const override = selectedEventBySession?.[record.id] || null;
        const msg = override?.error_message ?? value;
        return <span title={msg || ''}>{msg || ''}</span>;
      },
    }
  ];
};

/**
 * 默认列宽配置
 */
export const DEFAULT_COLUMN_WIDTHS = {
  started_at: 120,
  latest_time: 180,
  id: 80,
  batch_id: 150,
  industry: 180,
  device_id: 120,
  status: 80,
  import_stats: 100,
  total_count: 80,
  error_message: 200,
  actions: 280
};

/**
 * 最小列宽配置
 */
export const MIN_COLUMN_WIDTHS = {
  started_at: 100,
  latest_time: 140,
  id: 60,
  batch_id: 100,
  industry: 120,
  device_id: 100,
  status: 60,
  import_stats: 80,
  total_count: 60,
  error_message: 120,
  actions: 200
};