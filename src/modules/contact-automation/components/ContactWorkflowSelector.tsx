/**
 * 通讯录导入工作流选择器组件
 */

import React, { useState } from 'react';
import { Modal, Space, Card, Button, Upload, Form, Select, Input, Tag, Typography, Divider } from 'antd';
import { 
  ContactsOutlined, 
  UploadOutlined, 
  FileExcelOutlined,
  PhoneOutlined,
  DeleteOutlined,
  TableOutlined
} from '@ant-design/icons';
import { CONTACT_AUTOMATION_TEMPLATES, generateContactImportWorkflowSteps } from '../templates/contactWorkflowTemplates';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ContactWorkflowSelectorProps {
  visible: boolean;
  onCancel: () => void;
  onStepsGenerated: (steps: ExtendedSmartScriptStep[]) => void;
  deviceId?: string;
}

export const ContactWorkflowSelector: React.FC<ContactWorkflowSelectorProps> = ({
  visible,
  onCancel,
  onStepsGenerated,
  deviceId
}) => {
  const [form] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('BASIC_IMPORT');
  const [sourceFile, setSourceFile] = useState<string>('');

  const handleGenerateSteps = () => {
    form.validateFields().then((values) => {
      const template = CONTACT_AUTOMATION_TEMPLATES[selectedTemplate];
      if (!template) return;

      const steps = template.generateSteps({
        sourceFile: sourceFile || values.source_file_path,
        deviceId: deviceId || values.device_id,
        batchSize: values.batch_size
      });

      onStepsGenerated(steps);
      onCancel();
      form.resetFields();
    });
  };

  const templateConfigs = Object.entries(CONTACT_AUTOMATION_TEMPLATES).map(([key, config]) => ({
    key,
    ...config
  }));

  return (
    <Modal
      title="配置通讯录导入工作流"
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="generate" type="primary" onClick={handleGenerateSteps}>
          生成步骤
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        {/* 模板选择 */}
        <Form.Item 
          label="选择导入模板" 
          name="template"
          initialValue="BASIC_IMPORT"
        >
          <div className="space-y-3">
            {templateConfigs.map((template) => (
              <Card
                key={template.key}
                size="small"
                className={`cursor-pointer transition-colors ${
                  selectedTemplate === template.key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedTemplate(template.key)}
              >
                <Space>
                  <span className="text-xl">{template.icon}</span>
                  <div>
                    <Text strong>{template.name}</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      {template.description}
                    </Text>
                  </div>
                  {selectedTemplate === template.key && (
                    <Tag color="blue">已选择</Tag>
                  )}
                </Space>
              </Card>
            ))}
          </div>
        </Form.Item>

        <Divider />

        {/* 文件配置 */}
        <Form.Item
          label="通讯录文件路径"
          name="source_file_path"
          rules={[{ required: true, message: '请输入或选择通讯录文件' }]}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input 
              placeholder="请输入文件路径或点击选择文件"
              value={sourceFile}
              onChange={(e) => setSourceFile(e.target.value)}
            />
            <Upload
              beforeUpload={(file) => {
                const filePath = (file as any).path || file.name;
                setSourceFile(filePath);
                form.setFieldsValue({ source_file_path: filePath });
                return false; // 阻止自动上传
              }}
              showUploadList={false}
              accept=".vcf,.csv,.xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Space.Compact>
        </Form.Item>

        {/* 设备选择 */}
        <Form.Item
          label="目标设备ID"
          name="device_id"
          initialValue={deviceId}
        >
          <Input placeholder="留空将在执行时选择当前设备" />
        </Form.Item>

        {/* 高级配置 */}
        {selectedTemplate === 'BATCH_IMPORT' && (
          <Form.Item
            label="批次大小"
            name="batch_size"
            initialValue={20}
          >
            <Select>
              <Option value={10}>10 (适合旧设备)</Option>
              <Option value={20}>20 (推荐)</Option>
              <Option value={50}>50 (高性能设备)</Option>
              <Option value={100}>100 (大批量)</Option>
            </Select>
          </Form.Item>
        )}

        {/* 预览将生成的步骤 */}
        <div className="bg-gray-50 p-4 rounded-md">
          <Title level={5}>将生成以下步骤：</Title>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileExcelOutlined className="text-blue-500" />
              <Text>1. 生成VCF文件 - 从源文件转换为标准格式</Text>
            </div>
            <div className="flex items-center space-x-2">
              <PhoneOutlined className="text-green-500" />
              <Text>2. 导入联系人到设备 - 通过ADB推送并导入</Text>
            </div>
            {selectedTemplate === 'SAFE_IMPORT' && (
              <div className="flex items-center space-x-2">
                <TableOutlined className="text-orange-500" />
                <Text>0. 备份现有联系人 - 安全防护措施</Text>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <DeleteOutlined className="text-red-500" />
              <Text>3. 清理导入联系人 - 可选的清理步骤</Text>
              <Tag color="orange">默认禁用</Tag>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};