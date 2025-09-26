import React, { useCallback } from 'react';
import { Card, Table, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { readFileAsText } from '../utils/file';

const { Dragger } = Upload;
const { Text } = Typography;

interface StepUploadProps {
  contactsCount: number;
  previewRows: Array<{ key?: string; name?: string; phone?: string; email?: string; organization?: string }>
  onFileParsed: (content: string) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({ contactsCount, previewRows, onFileParsed }) => {
  const handleFileUpload = useCallback(async (file: File) => {
    const content = await readFileAsText(file);
    onFileParsed(content);
    return false; // prevent auto upload
  }, [onFileParsed]);

  const contactColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '公司', dataIndex: 'organization', key: 'organization' },
  ];

  return (
    <Card title="上传联系人文件">
      <Dragger accept=".vcf,.vcard" beforeUpload={handleFileUpload} showUploadList={false}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽VCF文件到此区域上传</p>
        <p className="ant-upload-hint">支持单个VCF文件上传，文件大小限制为10MB</p>
      </Dragger>

      {contactsCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>已解析 {contactsCount} 个联系人</Text>
          <Table dataSource={previewRows} columns={contactColumns} pagination={false} size="small" style={{ marginTop: 8 }} />
          {contactsCount > 5 && <Text type="secondary">仅显示前5个联系人...</Text>}
        </div>
      )}
    </Card>
  );
};
