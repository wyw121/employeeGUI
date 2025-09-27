import React, { useMemo, useState } from 'react';
import { Modal, Table, Typography, Space, Button, Checkbox, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export interface BatchPreviewItem {
  deviceId: string;
  industry?: string;
  numbers: Array<{ id: number; phone: string; name: string }>
}

export interface BatchPreviewModalProps {
  open: boolean;
  batches: BatchPreviewItem[];
  onCancel: () => void;
  onExecute: (selectedDeviceIds: string[], options: { markConsumed: boolean }) => Promise<void>;
}

export const BatchPreviewModal: React.FC<BatchPreviewModalProps> = ({ open, batches, onCancel, onExecute }) => {
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [markConsumed, setMarkConsumed] = useState<boolean>(true);
  const data = batches || [];

  const columns: ColumnsType<BatchPreviewItem> = useMemo(() => ([
    {
      title: '设备',
      dataIndex: 'deviceId',
      key: 'deviceId',
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      render: (v) => v || '-'
    },
    {
      title: '条数',
      key: 'count',
      render: (_: any, row) => row.numbers?.length || 0,
    },
    {
      title: '预览',
      key: 'preview',
      render: (_: any, row) => {
        const preview = (row.numbers || []).slice(0, 5).map(n => n.phone).join(', ');
        return <Text type="secondary">{preview || '-'}</Text>;
      }
    },
  ]), [batches]);

  const handleExecute = async () => {
    if (selectedKeys.length === 0) {
      message.warning('请至少选择一个设备批次');
      return;
    }
    await onExecute(selectedKeys as string[], { markConsumed });
  };

  return (
    <Modal
      title="VCF 批次详情"
      open={open}
      onCancel={onCancel}
      width={820}
      footer={(
        <Space>
          <Checkbox checked={markConsumed} onChange={e => setMarkConsumed(e.target.checked)}>导入后标记已使用</Checkbox>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleExecute}>开始导入</Button>
        </Space>
      )}
    >
      <Table
        rowKey={r => r.deviceId}
        dataSource={data}
        columns={columns}
        size="small"
        pagination={false}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
      />
    </Modal>
  );
};

export default BatchPreviewModal;
