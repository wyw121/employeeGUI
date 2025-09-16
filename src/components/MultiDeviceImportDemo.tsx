import React, { useState } from 'react';
import { Button, Card, Select, Upload, message, Result, Typography, Alert, Collapse, Table, Tag } from 'antd';
import { InboxOutlined, AndroidOutlined, ExperimentOutlined, FireOutlined } from '@ant-design/icons';
import { AdbAPI } from '../api/ContactAPI';
import { VcfImportResult } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

interface MultiDeviceImportDemoProps {
  // 可选的props
}

interface ImportStrategy {
  name: string;
  success: boolean;
  executionTimeMs: number;
  errorMessage?: string;
}

interface TestResult {
  deviceBrand?: string;
  totalStrategies: number;
  successfulStrategy?: string;
  strategies: ImportStrategy[];
}

export const MultiDeviceImportDemo: React.FC<MultiDeviceImportDemoProps> = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<VcfImportResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // 获取ADB设备列表
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const deviceList = await AdbAPI.getAdbDevices();
      setDevices(deviceList);
      if (deviceList.length > 0) {
        setSelectedDevice(deviceList[0]);
      }
      message.success(`发现 ${deviceList.length} 个设备`);
    } catch (error) {
      message.error(`获取设备失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试多设备导入策略
  const testStrategies = async () => {
    if (!selectedDevice) {
      message.warning('请先选择设备');
      return;
    }

    try {
      setTesting(true);
      const result = await AdbAPI.testMultiDeviceImportStrategies(selectedDevice);
      
      // 解析测试结果
      parseTestResult(result);
      message.success('策略测试完成');
    } catch (error) {
      message.error(`策略测试失败: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  // 解析测试结果字符串
  const parseTestResult = (resultText: string) => {
    const lines = resultText.split('\n');
    const strategies: ImportStrategy[] = [];
    let totalStrategies = 0;
    let successfulStrategy: string | undefined;

    lines.forEach(line => {
      if (line.includes('总尝试策略数:')) {
        totalStrategies = parseInt(line.split(':')[1].trim());
      } else if (line.includes('成功策略:')) {
        successfulStrategy = line.split(':')[1].trim();
      } else if (line.match(/^[✅❌]/)) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const success = line.startsWith('✅');
          const name = parts[0].substring(2).trim();
          const timeMatch = parts[1].match(/(\d+)ms/);
          const executionTime = timeMatch ? parseInt(timeMatch[1]) : 0;
          
          strategies.push({
            name,
            success,
            executionTimeMs: executionTime,
            errorMessage: success ? undefined : parts[1].replace(/\d+ms/, '').trim()
          });
        }
      }
    });

    setTestResult({
      totalStrategies,
      successfulStrategy,
      strategies
    });
  };

  // 执行多设备导入
  const executeImport = async () => {
    if (!selectedDevice) {
      message.warning('请先选择设备');
      return;
    }

    if (!vcfFile) {
      message.warning('请先选择VCF文件');
      return;
    }

    try {
      setLoading(true);
      
      // 使用新的多设备导入API
      const result = await AdbAPI.importVcfContactsMultiDevice(
        selectedDevice,
        vcfFile.name
      );
      
      setImportResult(result);
      
      if (result.success) {
        message.success('多设备导入成功！');
      } else {
        message.error('多设备导入失败');
      }
    } catch (error) {
      message.error(`导入失败: ${error}`);
      setImportResult({
        success: false,
        totalContacts: 0,
        importedContacts: 0,
        failedContacts: 0,
        message: `系统错误: ${error}`,
        details: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const strategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>
          {success ? '✅ 成功' : '❌ 失败'}
        </Tag>
      )
    },
    {
      title: '执行时间',
      dataIndex: 'executionTimeMs',
      key: 'executionTimeMs',
      render: (time: number) => `${time}ms`
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (error?: string) => error ? <Text type="danger">{error}</Text> : '-'
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <FireOutlined style={{ color: '#ff6b35' }} /> 多设备兼容VCF导入系统
      </Title>
      
      <Alert
        message="全新多设备导入引擎"
        description="支持华为、小米、OPPO、vivo、三星等多品牌设备，自动尝试所有导入策略直到成功"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 设备选择区域 */}
      <Card title="📱 设备管理" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <Button 
            icon={<AndroidOutlined />} 
            onClick={fetchDevices} 
            loading={loading}
          >
            刷新设备列表
          </Button>
          
          <Select
            style={{ minWidth: '200px' }}
            placeholder="选择ADB设备"
            value={selectedDevice}
            onChange={setSelectedDevice}
            options={devices.map(device => ({ label: device, value: device }))}
          />
          
          <Button 
            icon={<ExperimentOutlined />}
            onClick={testStrategies}
            loading={testing}
            disabled={!selectedDevice}
          >
            测试导入策略
          </Button>
        </div>
        
        {devices.length > 0 && (
          <Text type="success">已发现 {devices.length} 个设备</Text>
        )}
      </Card>

      {/* 策略测试结果 */}
      {testResult && (
        <Card title="🧪 策略测试结果" style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text strong>总策略数: </Text>
            <Text>{testResult.totalStrategies}</Text>
            
            {testResult.successfulStrategy && (
              <>
                <Text strong style={{ marginLeft: '24px' }}>成功策略: </Text>
                <Tag color="success">{testResult.successfulStrategy}</Tag>
              </>
            )}
          </div>
          
          <Table
            columns={strategyColumns}
            dataSource={testResult.strategies}
            rowKey="name"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {/* VCF文件上传区域 */}
      <Card title="📁 VCF文件上传" style={{ marginBottom: '24px' }}>
        <Dragger
          accept=".vcf,.csv,.txt"
          beforeUpload={(file) => {
            setVcfFile(file);
            return false; // 防止自动上传
          }}
          onRemove={() => setVcfFile(null)}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽VCF文件到此区域</p>
          <p className="ant-upload-hint">
            支持 .vcf、.csv、.txt 格式的联系人文件
          </p>
        </Dragger>
        
        {vcfFile && (
          <Alert
            message={`已选择文件: ${vcfFile.name}`}
            type="success"
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>

      {/* 导入执行区域 */}
      <Card title="🚀 执行导入" style={{ marginBottom: '24px' }}>
        <Button
          type="primary"
          size="large"
          icon={<FireOutlined />}
          onClick={executeImport}
          loading={loading}
          disabled={!selectedDevice || !vcfFile}
          style={{ 
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            border: 'none',
            height: '48px',
            fontSize: '16px'
          }}
        >
          开始多设备兼容导入
        </Button>
        
        <Paragraph style={{ marginTop: '16px', marginBottom: 0 }}>
          <Text type="secondary">
            系统将自动检测设备品牌，按优先级尝试所有适用的导入策略
          </Text>
        </Paragraph>
      </Card>

      {/* 导入结果展示 */}
      {importResult && (
        <Card title="📊 导入结果" style={{ marginBottom: '24px' }}>
          <Result
            status={importResult.success ? 'success' : 'error'}
            title={importResult.success ? '导入成功！' : '导入失败'}
            subTitle={importResult.message}
            extra={
              <div style={{ textAlign: 'left' }}>
                <p><Text strong>总联系人数:</Text> {importResult.totalContacts}</p>
                <p><Text strong>导入成功:</Text> <Text type="success">{importResult.importedContacts}</Text></p>
                <p><Text strong>导入失败:</Text> <Text type="danger">{importResult.failedContacts}</Text></p>
                {importResult.duration && (
                  <p><Text strong>耗时:</Text> {importResult.duration}秒</p>
                )}
              </div>
            }
          />
          
          {importResult.details && (
            <Collapse>
              <Panel header="查看详细信息" key="details">
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '16px', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {importResult.details}
                </pre>
              </Panel>
            </Collapse>
          )}
        </Card>
      )}

      {/* 支持的设备品牌 */}
      <Card title="📱 支持的设备品牌" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { name: '华为/荣耀', color: 'red' },
            { name: '小米/红米', color: 'orange' },
            { name: 'OPPO/一加', color: 'green' },
            { name: 'vivo/iQOO', color: 'blue' },
            { name: '三星', color: 'purple' },
            { name: 'Google Pixel', color: 'cyan' },
            { name: '原生Android', color: 'gray' }
          ].map(brand => (
            <Tag key={brand.name} color={brand.color} style={{ marginBottom: '8px' }}>
              {brand.name}
            </Tag>
          ))}
        </div>
        
        <Alert
          message="如果您的设备品牌不在上述列表中，系统仍会尝试通用导入策略"
          type="info"
          style={{ marginTop: '16px' }}
        />
      </Card>
    </div>
  );
};

export default MultiDeviceImportDemo;