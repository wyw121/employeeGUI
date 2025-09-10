import { MobileOutlined, UserOutlined } from '@ant-design/icons';
import { Card, Col, Divider, message, Row, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { Contact } from '../../types';
import { VcfImporter } from './VcfImporter';

const { Title, Paragraph } = Typography;

export const VcfImportDemo: React.FC = () => {
  const [contacts] = useState<Contact[]>([
    {
      id: '1',
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com'
    },
    {
      id: '2',
      name: '李四',
      phone: '13900139000',
      email: 'lisi@example.com'
    },
    {
      id: '3',
      name: '王五',
      phone: '13700137000',
      email: 'wangwu@example.com'
    },
    {
      id: '4',
      name: '赵六',
      phone: '13600136000',
      email: 'zhaoliu@example.com'
    },
    {
      id: '5',
      name: '钱七',
      phone: '13500135000',
      email: 'qianqi@example.com'
    }
  ]);

  const [selectedDevice] = useState<string>('127.0.0.1:5555');

  const handleImportComplete = (result: any) => {
    if (result.success) {
      message.success(`VCF导入成功！共导入 ${result.importedContacts} 个联系人`);
    } else {
      message.error(`VCF导入失败：${result.message}`);
    }
  };

  const handleError = (error: string) => {
    message.error(error);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <Title level={2} className="flex items-center">
            <MobileOutlined className="mr-3" />
            VCF通讯录导入演示
          </Title>
          <Paragraph className="text-gray-600">
            演示如何使用VCF通讯录导入功能，将联系人批量导入到Android设备。
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {/* 功能介绍 */}
          <Col span={24}>
            <Card
              title={
                <Space>
                  <UserOutlined />
                  功能介绍
                </Space>
              }
              className="shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {contacts.length}
                  </div>
                  <div className="text-sm text-gray-600">演示联系人</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600 mb-2">
                    VCF格式
                  </div>
                  <div className="text-sm text-gray-600">标准格式支持</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-lg font-semibold text-orange-600 mb-2">
                    批量导入
                  </div>
                  <div className="text-sm text-gray-600">一键导入多个联系人</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600 mb-2">
                    设备同步
                  </div>
                  <div className="text-sm text-gray-600">直接导入设备通讯录</div>
                </div>
              </div>

              <Divider />

              <div className="space-y-3">
                <Title level={4}>使用说明：</Title>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>确保Android设备已连接并启用USB调试</li>
                  <li>确保Flow_Farm项目中的adb_xml_reader.exe已编译</li>
                  <li>点击"开始导入"按钮启动VCF导入对话框</li>
                  <li>选择目标设备，系统会自动生成VCF文件</li>
                  <li>执行导入，联系人将批量添加到设备通讯录</li>
                </ol>
              </div>
            </Card>
          </Col>

          {/* VCF导入组件 */}
          <Col span={24}>
            <VcfImporter
              selectedDevice={selectedDevice}
              contacts={contacts}
              onImportComplete={handleImportComplete}
              onError={handleError}
            />
          </Col>

          {/* 联系人列表预览 */}
          <Col span={24}>
            <Card title="联系人列表预览" className="shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.phone}</div>
                        {contact.email && (
                          <div className="text-xs text-gray-500">{contact.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* 技术说明 */}
          <Col span={24}>
            <Card title="技术说明" className="shadow-sm">
              <div className="space-y-4">
                <div>
                  <Title level={5}>依赖工具：</Title>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li><code>adb_xml_reader.exe</code> - 位于 Flow_Farm 项目的编译输出目录</li>
                    <li>ADB (Android Debug Bridge) - Android 开发工具包</li>
                    <li>Tauri 后端服务 - 处理文件操作和外部命令调用</li>
                  </ul>
                </div>

                <div>
                  <Title level={5}>VCF文件格式：</Title>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    姓名,电话,地址,职业,邮箱<br/>
                    张三,13800138000,,,zhangsan@example.com<br/>
                    李四,13900139000,,,lisi@example.com
                  </div>
                </div>

                <div>
                  <Title level={5}>命令示例：</Title>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    target\release\adb_xml_reader.exe --import-vcf contacts.txt --device "127.0.0.1:5555"
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
