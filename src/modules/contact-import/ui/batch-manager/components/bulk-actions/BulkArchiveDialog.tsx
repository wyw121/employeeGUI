import React, { useState } from 'react';
import { Modal, Table, Typography, Space, message, Alert } from 'antd';
import { InboxOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ContactNumberDto, markContactNumbersAsNotImported } from '../../../services/contactNumberService';

const { Text, Title } = Typography;

interface BulkArchiveDialogProps {
  open: boolean;
  selectedNumbers: ContactNumberDto[];
  onClose: () => void;
  onSuccess: () => void;
  onLoadingChange: (loading: boolean) => void;
}

/**
 * 批量归档确认对话框
 * 显示将要归档的号码详情，确认后执行归档操作
 */
export const BulkArchiveDialog: React.FC<BulkArchiveDialogProps> = ({
  open,
  selectedNumbers,
  onClose,
  onSuccess,
  onLoadingChange
}) => {
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    try {
      setArchiving(true);
      onLoadingChange(true);

      // 提取要归档的号码ID
      const numberIds = selectedNumbers.map(number => number.id);
      
      // 批量重置号码状态
      await markContactNumbersAsNotImported(numberIds);
      
      message.success(`成功归档 ${numberIds.length} 个号码`);
      onSuccess();
    } catch (error) {
      console.error('批量归档失败:', error);
      message.error('归档操作失败，请重试');
    } finally {
      setArchiving(false);
      onLoadingChange(false);
    }
  };

  const columns = [
    {
      title: '号码',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 150,
      render: (phone: string) => (
        <Text code style={{ fontSize: '12px' }}>{phone}</Text>
      )
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          imported: { text: '已导入', color: '#52c41a' },
          vcf_generated: { text: '已生成VCF', color: '#1890ff' },
          not_imported: { text: '未导入', color: '#d9d9d9' }
        };
        const config = statusMap[status as keyof typeof statusMap] || 
                      { text: status, color: '#d9d9d9' };
        
        return (
          <Text style={{ color: config.color, fontSize: '12px' }}>
            {config.text}
          </Text>
        );
      }
    },
    {
      title: '批次',
      dataIndex: 'used_batch',
      key: 'used_batch',
      width: 120,
      render: (batch: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {batch || '无'}
        </Text>
      )
    },
    {
      title: '导入设备',
      dataIndex: 'imported_device_id',
      key: 'imported_device_id',
      render: (deviceId: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {deviceId || '无'}
        </Text>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined style={{ color: '#ff7875' }} />
          <span>批量归档确认</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleArchive}
      confirmLoading={archiving}
      width={800}
      okText="确认归档"
      cancelText="取消"
      okButtonProps={{
        danger: true,
        disabled: selectedNumbers.length === 0
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="归档操作说明"
          description={
            <div>
              <p>此操作将：</p>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>将选中的 <strong>{selectedNumbers.length}</strong> 个号码重置为"未导入"状态</li>
                <li>清除关联的设备信息和批次信息</li>
                <li>使这些号码可以重新分配和导入</li>
              </ul>
              <Text type="warning">
                <ExclamationCircleOutlined /> 此操作不可撤销，请确认无误后继续
              </Text>
            </div>
          }
          type="warning"
          showIcon
        />

        <div>
          <Title level={5}>将要归档的号码 ({selectedNumbers.length} 个)</Title>
          <Table
            dataSource={selectedNumbers}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个号码`
            }}
            scroll={{ y: 300 }}
          />
        </div>
      </Space>
    </Modal>
  );
};