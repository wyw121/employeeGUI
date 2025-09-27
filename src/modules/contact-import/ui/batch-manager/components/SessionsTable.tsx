import React from 'react';
import { Table, Tag } from 'antd';
import type { ImportSessionList } from '../types';

interface Props {
  data?: ImportSessionList | null;
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRefresh?: () => void | Promise<void>;
  highlightId?: number;
}

const SessionsTable: React.FC<Props> = ({ data, loading, pagination, highlightId }) => {
  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={data?.items || []}
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
        { title: '设备', dataIndex: 'device_id' },
        { title: '状态', dataIndex: 'status', render: (s: string) => s === 'success' ? <Tag color="green">成功</Tag> : s === 'failed' ? <Tag color="red">失败</Tag> : <Tag>进行中</Tag> },
        { title: '导入/失败', render: (_: any, r: any) => `${r.imported_count}/${r.failed_count}` },
        { title: '开始', dataIndex: 'started_at', width: 160 },
        { title: '结束', dataIndex: 'finished_at', width: 160 },
        { title: '错误', dataIndex: 'error_message' },
      ]}
    />
  );
};

export default SessionsTable;
