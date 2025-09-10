import {
    CheckCircleOutlined,
    ContactsOutlined,
    FileTextOutlined,
    MobileOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Row,
    Space,
    Steps,
    Typography,
    message
} from 'antd';
import React, { useCallback, useState } from 'react';
import {
    ContactImportManager,
    ContactReader
} from '../components/contact';
import { Contact, ContactDocument, VcfImportResult } from '../types';

const { Title, Paragraph } = Typography;
const { Step } = Steps;

export const ContactImportPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [parsedContacts, setParsedContacts] = useState<Contact[]>([]);
  const [parsedDocument, setParsedDocument] = useState<ContactDocument | null>(null);
  const [importResults, setImportResults] = useState<VcfImportResult[]>([]);

  // 处理通讯录文档解析完成
  const handleContactsParsed = useCallback((document: any) => {
    setParsedDocument(document);
    // 需要通过其他方式获取联系人数据，因为ContactDocument类型不包含contacts
    // 这里需要调用额外的API来获取联系人列表
    message.success(`成功解析通讯录文档：${document.filename}`);
    // 暂时设置为下一步，实际需要获取联系人数据
    setCurrentStep(1);
  }, []);

  // 处理联系人选择完成
  const handleContactsSelected = useCallback((contacts: Contact[]) => {
    setParsedContacts(contacts);
    setCurrentStep(1);
    message.success(`已选择 ${contacts.length} 个联系人`);
  }, []);

  // 处理导入完成
  const handleImportComplete = useCallback((results: VcfImportResult[]) => {
    setImportResults(results);
    setCurrentStep(2);
    
    const totalImported = results.reduce((sum, result) => sum + result.importedContacts, 0);
    const successCount = results.filter(result => result.success).length;
    
    message.success(`导入完成！成功设备: ${successCount}/${results.length}，总导入联系人: ${totalImported}`);
  }, []);

  // 处理错误
  const handleError = useCallback((error: string) => {
    message.error(error);
  }, []);

  // 重新开始
  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setParsedContacts([]);
    setParsedDocument(null);
    setImportResults([]);
  }, []);

  // 渲染导入结果摘要
  const renderImportSummary = () => {
    if (importResults.length === 0) return null;

    const totalImported = importResults.reduce((sum, result) => sum + result.importedContacts, 0);
    const totalFailed = importResults.reduce((sum, result) => sum + result.failedContacts, 0);
    const successfulDevices = importResults.filter(result => result.success).length;

    return (
      <div>
        <Alert
          type="success"
          message="导入任务完成"
          description={`共处理 ${importResults.length} 台设备，成功 ${successfulDevices} 台，总导入联系人 ${totalImported} 个`}
          showIcon
          className="mb-6"
        />

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{importResults.length}</div>
              <div className="text-sm text-gray-600">处理设备</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-green-600">{successfulDevices}</div>
              <div className="text-sm text-gray-600">成功设备</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalImported}</div>
              <div className="text-sm text-gray-600">导入成功</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
              <div className="text-sm text-gray-600">导入失败</div>
            </Card>
          </Col>
        </Row>

        <Card title="详细结果" size="small">
          <div className="space-y-3">
            {importResults.map((result, resultIndex) => {
              const uniqueKey = `device-${result.importedContacts}-${result.totalContacts}-${resultIndex}`;
              return (
                <div key={uniqueKey} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">设备 {resultIndex + 1}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? '成功' : '失败'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  成功: {result.importedContacts} / 总计: {result.totalContacts}
                </div>
                <div className="text-sm text-gray-600">
                  {result.message}
                </div>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">查看详细信息</summary>
                    <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                      {result.details}
                    </pre>
                  </details>
                )}
              </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-6">
          <Button type="primary" onClick={handleRestart} size="large">
            重新开始导入
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="contact-import-page min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <Title level={2} className="flex items-center">
            <ContactsOutlined className="mr-3" />
            通讯录批量导入系统
          </Title>
          <Paragraph className="text-gray-600">
            上传通讯录文件，选择联系人和设备，自动平均分配并批量导入到多台设备
          </Paragraph>
        </div>

        {/* 进度步骤 */}
        <Card className="mb-6">
          <Steps current={currentStep} size="small">
            <Step
              title="上传解析"
              description="上传并解析通讯录文件"
              icon={<FileTextOutlined />}
            />
            <Step
              title="选择导入"
              description="选择联系人和设备进行导入"
              icon={<ContactsOutlined />}
            />
            <Step
              title="完成"
              description="查看导入结果"
              icon={<CheckCircleOutlined />}
            />
          </Steps>
        </Card>

        <Row gutter={24}>
          <Col span={24}>
            {/* 第一步：通讯录文件上传和解析 */}
            {currentStep === 0 && (
              <Card
                title={
                  <Space>
                    <FileTextOutlined />
                    步骤1：上传通讯录文件
                  </Space>
                }
                className="shadow-sm"
              >
                <Alert
                  type="info"
                  message="支持格式"
                  description="支持TXT、CSV等格式的通讯录文件，请确保文件包含姓名和电话信息"
                  showIcon
                  className="mb-4"
                />
                
                <ContactReader
                  onContactsParsed={handleContactsParsed}
                  onContactsSelected={handleContactsSelected}
                />
              </Card>
            )}

            {/* 第二步：联系人和设备选择，批量导入 */}
            {currentStep === 1 && (
              <Card
                title={
                  <Space>
                    <MobileOutlined />
                    步骤2：选择导入配置
                  </Space>
                }
                className="shadow-sm"
                extra={
                  <Space>
                    <span className="text-sm text-gray-500">
                      已解析 {parsedContacts.length} 个联系人
                    </span>
                    <Button type="link" onClick={() => setCurrentStep(0)}>
                      重新选择文件
                    </Button>
                  </Space>
                }
              >
                {parsedDocument && (
                  <Alert
                    type="success"
                    message={`文档信息: ${parsedDocument.filename}`}
                    description={`文档已解析，准备导入联系人`}
                    showIcon
                    className="mb-4"
                  />
                )}

                <ContactImportManager
                  contacts={parsedContacts}
                  onImportComplete={handleImportComplete}
                  onError={handleError}
                />
              </Card>
            )}

            {/* 第三步：导入结果 */}
            {currentStep === 2 && (
              <Card
                title={
                  <Space>
                    <CheckCircleOutlined />
                    步骤3：导入完成
                  </Space>
                }
                className="shadow-sm"
              >
                {renderImportSummary()}
              </Card>
            )}
          </Col>
        </Row>

        {/* 操作说明 */}
        <Card title="使用说明" className="mt-6" size="small">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <div className="font-medium">上传文件</div>
                <div className="text-gray-600">支持TXT、CSV格式的通讯录文件</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <div className="font-medium">选择联系人</div>
                <div className="text-gray-600">从解析结果中选择要导入的联系人</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="bg-orange-100 text-orange-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <div className="font-medium">选择设备</div>
                <div className="text-gray-600">选择要导入的目标Android设备</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <div className="font-medium">自动分配</div>
                <div className="text-gray-600">系统自动平均分配联系人到各设备</div>
              </div>
            </div>
          </div>

          <Divider />

          <div className="text-xs text-gray-500">
            <p><strong>注意事项：</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>请确保所有目标设备已连接并启用USB调试</li>
              <li>系统会自动将联系人平均分配到选定的设备中</li>
              <li>每个设备不会重复导入相同的联系人</li>
              <li>建议在导入前备份设备通讯录</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};
