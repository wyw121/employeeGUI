import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Alert, Typography, Space, Steps, message, Select } from 'antd';
import { 
  AndroidOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ContactAPI } from '../api/ContactAPI';
import { VcfImportResult } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

export const AppChooserTestPage: React.FC = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<VcfImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // 模拟联系人数据
  const testContacts = [
    {
      id: '1',
      name: '测试联系人1',
      phone: '13800138001',
      email: 'test1@example.com',
      address: '北京市朝阳区',
      occupation: '软件工程师'
    },
    {
      id: '2', 
      name: '测试联系人2',
      phone: '13800138002',
      email: 'test2@example.com',
      address: '上海市浦东新区',
      occupation: '产品经理'
    }
  ];

  // 获取设备列表
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const deviceList = await ContactAPI.getAdbDevices();
      setDevices(deviceList);
      if (deviceList.length > 0) {
        setSelectedDevice(deviceList[0]);
      }
    } catch (error) {
      message.error('获取设备列表失败: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  // 执行应用选择器自动化测试
  const runAppChooserTest = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    try {
      setLoading(true);
      setCurrentStep(0);
      setTestResult(null);

      // 步骤1: 生成测试VCF文件
      setCurrentStep(1);
      const vcfPath = await ContactAPI.generateVcfFile(testContacts, 'temp_contacts_test.vcf');
      
      // 步骤2: 执行带应用选择器自动化的导入
      setCurrentStep(2);
      message.info('🤖 正在执行应用选择器自动化，请观察设备屏幕...');
      
      const result = await ContactAPI.importVcfContactsWithIntentFallback(
        selectedDevice,
        vcfPath
      );

      setTestResult(result);
      setCurrentStep(3);

      if (result.success) {
        message.success('🎉 应用选择器自动化测试成功！');
      } else {
        message.error('❌ 应用选择器自动化测试失败: ' + result.message);
      }

    } catch (error) {
      message.error('测试执行失败: ' + String(error));
      setTestResult({
        success: false,
        totalContacts: 0,
        importedContacts: 0,
        failedContacts: 0,
        message: String(error),
        details: undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <AndroidOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
        Android应用选择器自动化测试
      </Title>

      <Alert
        message="功能说明"
        description="此页面用于测试VCF文件导入时的应用选择器自动化功能。系统会自动选择通讯录应用并点击'始终'按钮。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]}>
        {/* 设备选择区域 */}
        <Col span={24}>
          <Card title="设备选择" extra={
            <Button icon={<ReloadOutlined />} onClick={loadDevices} loading={loading}>
              刷新设备
            </Button>
          }>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>当前连接的设备:</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedDevice}
                onChange={setSelectedDevice}
                placeholder="选择要测试的设备"
                loading={loading}
              >
                {devices.map(device => (
                  <Select.Option key={device} value={device}>
                    {device}
                  </Select.Option>
                ))}
              </Select>
              {devices.length === 0 && !loading && (
                <Alert message="未检测到设备，请确保设备已连接并开启USB调试" type="warning" />
              )}
            </Space>
          </Card>
        </Col>

        {/* 测试步骤 */}
        <Col span={24}>
          <Card title="测试步骤">
            <Steps current={currentStep} direction="vertical">
              <Step
                title="准备测试"
                description="选择设备并准备测试数据"
                icon={currentStep > 0 ? <CheckCircleOutlined /> : undefined}
              />
              <Step
                title="生成VCF文件"
                description="创建包含测试联系人的VCF文件"
                icon={currentStep > 1 ? <CheckCircleOutlined /> : undefined}
              />
              <Step
                title="执行自动化导入"
                description="推送VCF文件到设备并自动处理应用选择器"
                icon={currentStep > 2 ? <CheckCircleOutlined /> : undefined}
              />
              <Step
                title="验证结果"
                description="检查导入结果和自动化效果"
                icon={currentStep > 3 ? <CheckCircleOutlined /> : undefined}
              />
            </Steps>
          </Card>
        </Col>

        {/* 测试控制 */}
        <Col span={24}>
          <Card title="测试控制">
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={runAppChooserTest}
                loading={loading}
                disabled={!selectedDevice}
              >
                开始应用选择器自动化测试
              </Button>
              <Text type="secondary">
                测试将使用 {testContacts.length} 个模拟联系人
              </Text>
            </Space>
          </Card>
        </Col>

        {/* 测试结果 */}
        {testResult && (
          <Col span={24}>
            <Card title="测试结果">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message={testResult.success ? "自动化测试成功" : "自动化测试失败"}
                  description={testResult.message}
                  type={testResult.success ? "success" : "error"}
                  showIcon
                />
                
                <Row gutter={16}>
                  <Col span={6}>
                    <Card size="small">
                      <Text type="secondary">总联系人数</Text>
                      <br />
                      <Title level={3} style={{ margin: 0 }}>
                        {testResult.totalContacts}
                      </Title>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Text type="secondary">成功导入</Text>
                      <br />
                      <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                        {testResult.importedContacts}
                      </Title>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Text type="secondary">导入失败</Text>
                      <br />
                      <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                        {testResult.failedContacts}
                      </Title>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Text type="secondary">耗时（秒）</Text>
                      <br />
                      <Title level={3} style={{ margin: 0 }}>
                        {testResult.duration || 'N/A'}
                      </Title>
                    </Card>
                  </Col>
                </Row>

                {testResult.details && (
                  <Card size="small" title="详细信息">
                    <Text code style={{ whiteSpace: 'pre-wrap' }}>
                      {testResult.details}
                    </Text>
                  </Card>
                )}
              </Space>
            </Card>
          </Col>
        )}

        {/* 使用说明 */}
        <Col span={24}>
          <Card title="使用说明">
            <Space direction="vertical">
              <Paragraph>
                <Text strong>测试前准备:</Text>
                <ul>
                  <li>确保Android设备已Root并连接到电脑</li>
                  <li>设备已开启USB调试模式</li>
                  <li>ADB命令可正常执行</li>
                </ul>
              </Paragraph>

              <Paragraph>
                <Text strong>测试过程:</Text>
                <ul>
                  <li>点击"开始测试"后，请观察设备屏幕</li>
                  <li>如果出现应用选择器对话框，系统会自动选择通讯录应用</li>
                  <li>系统会自动点击"始终"按钮以设置默认行为</li>
                  <li>后续导入将自动使用通讯录应用打开VCF文件</li>
                </ul>
              </Paragraph>

              <Paragraph>
                <Text strong>预期结果:</Text>
                <ul>
                  <li>✅ 应用选择器自动处理成功</li>
                  <li>✅ VCF文件成功导入到通讯录</li>
                  <li>✅ 下次导入不再出现选择器对话框</li>
                </ul>
              </Paragraph>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AppChooserTestPage;