import React from 'react';
import { Table } from 'antd';
import type { ContactNumberList } from '../types';

interface Props {
  data?: ContactNumberList | null;
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRefresh?: () => void | Promise<void>;
}

const NumbersTable: React.FC<Props> = ({ data, loading, pagination }) => {
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
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '号码', dataIndex: 'phone' },
        { title: '姓名', dataIndex: 'name', width: 160 },
        { title: '来源', dataIndex: 'source_file' },
        { title: '时间', dataIndex: 'created_at', width: 180 },
      ]}
    />
  );
};

export default NumbersTable;
