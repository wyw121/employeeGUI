// 在现有的联系人管理页面中集成VCF导入功能的示例

import { ContactsOutlined, ImportOutlined } from '@ant-design/icons';
import { Card, Col, Row, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { ContactReader, VcfImporter } from '../components/contact';
import { Contact, VcfImportResult } from '../types';

const { Title } = Typography;

// 示例：集成VCF导入到联系人管理页面
export const ContactManagementPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const selectedDevice = '127.0.0.1:5555';

  // 处理通讯录文件解析完成
  const handleContactsParsed = (document: any) => {
    console.log('通讯录文档解析完成:', document);
    if (document.contacts) {
      setContacts(document.contacts);
    }
  };

  // 处理VCF导入完成
  const handleVcfImportComplete = (result: VcfImportResult) => {
    if (result.success) {
      console.log(`VCF导入成功！共导入 ${result.importedContacts} 个联系人`);
      // 可以在这里更新UI状态或刷新联系人列表
    } else {
      console.error(`VCF导入失败：${result.message}`);
    }
  };

  // 处理错误
  const handleError = (error: string) => {
    console.error('操作错误:', error);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <Title level={2} className="flex items-center">
            <ContactsOutlined className="mr-3" />
            联系人管理系统
          </Title>
        </div>

        <Row gutter={[24, 24]}>
          {/* 第一步：上传和解析通讯录文件 */}
          <Col span={24}>
            <Card
              title={
                <Space>
                  <ContactsOutlined />
                  步骤1：上传通讯录文件
                </Space>
              }
              className="shadow-sm"
            >
              <ContactReader
                onContactsParsed={handleContactsParsed}
                onContactsSelected={(selectedContacts) => {
                  setContacts(selectedContacts);
                }}
              />
            </Card>
          </Col>

          {/* 第二步：VCF导入到设备 */}
          {contacts.length > 0 && (
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <ImportOutlined />
                    步骤2：VCF导入到设备
                  </Space>
                }
                className="shadow-sm"
                extra={
                  <div className="text-sm text-gray-500">
                    已准备 {contacts.length} 个联系人
                  </div>
                }
              >
                <VcfImporter
                  selectedDevice={selectedDevice}
                  contacts={contacts}
                  onImportComplete={handleVcfImportComplete}
                  onError={handleError}
                />
              </Card>
            </Col>
          )}

          {/* 设备选择和状态显示 */}
          <Col span={24}>
            <Card title="设备设置" className="shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">当前设备</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {selectedDevice}
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">已解析联系人</div>
                  <div className="text-lg font-semibold text-green-600">
                    {contacts.length} 个
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">状态</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {contacts.length > 0 ? '准备就绪' : '等待数据'}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ContactManagementPage;

