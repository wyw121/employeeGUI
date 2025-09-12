import React, { useState } from 'react';
import { Button, Card, Space, Typography, Alert, Spin, Steps } from 'antd';
import { ContactAPI } from '../api/ContactAPI';
import { VcfImportResult } from '../types';

const { Title, Text } = Typography;
const { Step } = Steps;

interface Props {
  deviceId: string;
  contactsFilePath: string;
}

export const VcfImportWithAppChooserExample: React.FC<Props> = ({
  deviceId,
  contactsFilePath,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VcfImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleImportWithIntentFallback = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      setCurrentStep(1);
      console.log('🚀 开始Intent + 回退方法VCF导入');

      const importResult = await ContactAPI.importVcfContactsWithIntentFallback(
        deviceId,
        contactsFilePath
      );

      setCurrentStep(2);
      setResult(importResult);
      
      if (importResult.success) {
        console.log('✅ VCF导入成功:', importResult);
        setCurrentStep(3);
      } else {
        console.error('❌ VCF导入失败:', importResult.message);
        setError(importResult.message);
      }
    } catch (err) {
      console.error('💥 VCF导入过程出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleTraditionalImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      setCurrentStep(1);
      console.log('🔄 使用传统方法VCF导入');

      const importResult = await ContactAPI.importVcfContacts(
        deviceId,
        contactsFilePath
      );

      setCurrentStep(2);
      setResult(importResult);
      
      if (importResult.success) {
        console.log('✅ 传统VCF导入成功:', importResult);
        setCurrentStep(3);
      } else {
        console.error('❌ 传统VCF导入失败:', importResult.message);
        setError(importResult.message);
      }
    } catch (err) {
      console.error('💥 传统VCF导入过程出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const importSteps = [
    {
      title: '准备导入',
      description: '初始化导入流程',
    },
    {
      title: '执行导入',
      description: '传输VCF文件并处理应用选择器',
    },
    {
      title: '验证结果',
      description: '检查导入是否成功',
    },
    {
      title: '完成',
      description: '导入流程结束',
    },
  ];

  return (
    <Card title="VCF导入 - 自动处理应用选择器" style={{ margin: '20px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="新功能：自动处理应用选择器"
          description={
            <div>
              <p>当VCF文件首次被打开时，Android会弹出应用选择器询问用哪个应用打开。</p>
              <p>新的Intent方法可以自动选择通讯录应用并点击"始终"按钮。</p>
              <p><strong>设备信息：</strong> {deviceId}</p>
              <p><strong>文件路径：</strong> {contactsFilePath}</p>
            </div>
          }
          type="info"
          showIcon
        />

        <Steps current={currentStep} size="small">
          {importSteps.map((step, index) => (
            <Step key={index} title={step.title} description={step.description} />
          ))}
        </Steps>

        <Space>
          <Button
            type="primary"
            onClick={handleImportWithIntentFallback}
            loading={loading}
            disabled={!deviceId || !contactsFilePath}
          >
            🚀 Intent方法导入（推荐）
          </Button>
          
          <Button
            onClick={handleTraditionalImport}
            loading={loading}
            disabled={!deviceId || !contactsFilePath}
          >
            🔄 传统方法导入
          </Button>
        </Space>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '10px' }}>
              <Text>正在处理VCF导入，请稍候...</Text>
            </div>
          </div>
        )}

        {error && (
          <Alert
            message="导入失败"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {result && (
          <Card
            title={result.success ? '✅ 导入成功' : '❌ 导入失败'}
            size="small"
            style={{
              backgroundColor: result.success ? '#f6ffed' : '#fff2f0',
              borderColor: result.success ? '#b7eb8f' : '#ffccc7',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>总联系人数: </Text>
                <Text>{result.total_contacts}</Text>
              </div>
              <div>
                <Text strong>已导入: </Text>
                <Text style={{ color: '#52c41a' }}>{result.imported_contacts}</Text>
              </div>
              <div>
                <Text strong>失败: </Text>
                <Text style={{ color: '#ff4d4f' }}>{result.failed_contacts}</Text>
              </div>
              <div>
                <Text strong>耗时: </Text>
                <Text>{result.duration}秒</Text>
              </div>
              <div>
                <Text strong>消息: </Text>
                <Text>{result.message}</Text>
              </div>
              {result.details && (
                <div>
                  <Text strong>详情: </Text>
                  <Text type="secondary">{result.details}</Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        <Card title="使用说明" size="small" style={{ marginTop: '20px' }}>
          <Space direction="vertical">
            <div>
              <Title level={5}>Intent方法的优势：</Title>
              <ul>
                <li>🎯 直接使用通讯录应用打开VCF文件</li>
                <li>🚀 自动处理应用选择器对话框</li>
                <li>✅ 自动选择"始终"选项，避免重复询问</li>
                <li>🔄 失败时自动回退到传统方法</li>
              </ul>
            </div>
            <div>
              <Title level={5}>解决的问题：</Title>
              <ul>
                <li>📱 首次打开VCF文件时的应用选择器</li>
                <li>🤝 避免手动选择通讯录应用</li>
                <li>⚡ 避免手动点击"始终"按钮</li>
                <li>🔧 利用Root权限自动化处理</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

export default VcfImportWithAppChooserExample;