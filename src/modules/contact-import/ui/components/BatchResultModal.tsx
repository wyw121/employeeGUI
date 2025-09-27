import React from 'react';
import { Modal, Table, Tag, Space, Button } from 'antd';
import type { BatchExecuteResult } from '../services/batchExecutor';

interface Props {
  open: boolean;
  result: BatchExecuteResult | null;
  onClose: () => void;
  onRetryFailed?: () => void;
}

const BatchResultModal: React.FC<Props> = ({ open, result, onClose, onRetryFailed }) => {
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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={720}
      title={`批次结果：成功 ${result?.successDevices ?? 0}/${result?.totalDevices ?? 0}`}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" disabled={!failureCount} onClick={onRetryFailed}>重试失败项（{failureCount}）</Button>
        </Space>
      }
    >
      <Table
        rowKey={(r) => r.deviceId}
        size="small"
        columns={columns as any}
        dataSource={result?.deviceResults || []}
        pagination={false}
      />
    </Modal>
  );
};

export default BatchResultModal;
