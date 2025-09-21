/**
 * 通讯录导入工作流选择器组件
 */

import React, { useState } from 'react';
import { Modal, Space, Card, Button, Tag, Typography, Divider } from 'antd';
import { 
  ContactsOutlined, 
  FileExcelOutlined,
  PhoneOutlined,
  DeleteOutlined,
  TableOutlined
} from '@ant-design/icons';
import { CONTACT_AUTOMATION_TEMPLATES, generateContactImportWorkflowSteps } from '../templates/contactWorkflowTemplates';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';

const { Title, Text, Paragraph } = Typography;

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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('BASIC_IMPORT');

  const handleGenerateSteps = () => {
    // 直接使用默认值和选择的模板生成步骤，无需验证
    const template = CONTACT_AUTOMATION_TEMPLATES[selectedTemplate];
    if (!template) return;

    const steps = template.generateSteps({
      sourceFile: '', // 空值，后续在步骤中配置
      deviceId: deviceId || '', // 允许空值
      batchSize: 20 // 默认批次大小
    });

    onStepsGenerated(steps);
    onCancel();
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
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="generate" type="primary" onClick={handleGenerateSteps}>
          生成步骤
        </Button>
      ]}
    >
      <div className="space-y-4">
        {/* 简化的模板选择 */}
        <div>
          <Text strong className="block mb-3">选择导入模板</Text>
          <div className="space-y-2">
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
        </div>

        <Divider />

        {/* 预览将生成的步骤 */}
        <div className="bg-gray-50 p-4 rounded-md">
          <Title level={5}>将生成以下步骤：</Title>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileExcelOutlined className="text-blue-500" />
              <Text>1. 生成VCF文件 - 从源文件转换为标准格式</Text>
              <Tag color="green">可编辑</Tag>
            </div>
            <div className="flex items-center space-x-2">
              <PhoneOutlined className="text-green-500" />
              <Text>2. 导入联系人到设备 - 通过ADB推送并导入</Text>
              <Tag color="green">可编辑</Tag>
            </div>
            {selectedTemplate === 'SAFE_IMPORT' && (
              <div className="flex items-center space-x-2">
                <TableOutlined className="text-orange-500" />
                <Text>0. 备份现有联系人 - 安全防护措施</Text>
                <Tag color="green">可编辑</Tag>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <DeleteOutlined className="text-red-500" />
              <Text>3. 清理导入联系人 - 可选的清理步骤</Text>
              <Tag color="orange">默认禁用</Tag>
            </div>
          </div>
          <Paragraph className="text-sm text-gray-600 mt-3">
            💡 所有参数都可以在生成步骤后，在步骤卡片中进行编辑和配置
          </Paragraph>
        </div>
      </div>
    </Modal>
  );
};