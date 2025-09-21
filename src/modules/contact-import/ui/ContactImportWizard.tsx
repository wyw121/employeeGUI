/**
 * 联系人导入向导组件
 * 展示如何使用新的模块化架构
 */

import { CheckCircleOutlined, FileTextOutlined, InboxOutlined, MobileOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Progress, Select, Space, Steps, Table, Typography, Upload } from 'antd';
import React, { useCallback, useState } from 'react';
import { useContactImport, useImportStats } from '../hooks/useUnifiedContactImport';
import { ImportStrategyFactory } from '../strategies/ImportStrategies';
import { Device, ImportPhase, ImportStrategyType } from '../types';

const { Step } = Steps;
const { Dragger } = Upload;
const { Option } = Select;
const { Title, Text } = Typography;

interface ContactImportWizardProps {
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

export const ContactImportWizard: React.FC<ContactImportWizardProps> = ({
  onComplete,
  onCancel
}) => {
  // 使用自定义Hook
  const {
    isImporting,
    progress,
    currentPhase,
    error,
    result,
    contacts,
    // ✅ devices 现在通过 detectDevices() 方法获取
    parseContacts,
    detectDevices,
    importContacts,
    cancelImport,
    clearError,
    reset,
    setStrategy
  } = useContactImport({
    configuration: {
      strategy: ImportStrategyType.BALANCED,
      batchSize: 50,
      skipInvalidContacts: true
    },
    onProgress: (progressData) => {
      console.log('导入进度:', progressData);
    },
    onComplete: (importResult) => {
      console.log('导入完成:', importResult);
      onComplete?.(importResult);
    },
    onError: (err) => {
      console.error('导入错误:', err);
    }
  });

  // 本地状态
  const [currentStep, setCurrentStep] = useState(0);
  const [fileContent, setFileContent] = useState<string>('');
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  // ✅ 检测到的设备列表，用于UI显示和用户选择
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<ImportStrategyType>(ImportStrategyType.BALANCED);

  // 统计信息
  const { stats } = useImportStats();

  // 步骤定义
  const steps = [
    {
      title: '选择文件',
      description: '上传VCF联系人文件',
      icon: <FileTextOutlined />
    },
    {
      title: '检测设备',
      description: '检测可用的Android设备',
      icon: <MobileOutlined />
    },
    {
      title: '配置导入',
      description: '选择导入策略和设备',
      icon: <InboxOutlined />
    },
    {
      title: '执行导入',
      description: '导入联系人到设备',
      icon: <CheckCircleOutlined />
    }
  ];

  // 获取阶段描述
  const getPhaseDescription = (phase: ImportPhase): string => {
    const phaseMap = {
      [ImportPhase.INITIALIZING]: '正在初始化...',
      [ImportPhase.PARSING]: '正在解析联系人文件...',
      [ImportPhase.VALIDATING]: '正在验证联系人数据...',
      [ImportPhase.DISTRIBUTING]: '正在分配联系人到设备...',
      [ImportPhase.CONVERTING]: '正在转换文件格式...',
      [ImportPhase.IMPORTING]: '正在导入联系人...',
      [ImportPhase.VERIFYING]: '正在验证导入结果...',
      [ImportPhase.COMPLETED]: '导入完成'
    };
    return phaseMap[phase] || '未知阶段';
  };

  // 文件上传处理
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const content = await readFileAsText(file);
      setFileContent(content);
      
      // 解析联系人
      await parseContacts(content);
      
      setCurrentStep(1);
    } catch (err) {
      console.error('文件上传失败:', err);
    }
    return false; // 阻止自动上传
  }, [parseContacts]);

  // 检测设备
  const handleDetectDevices = useCallback(async () => {
    try {
      const detected = await detectDevices();
      setAvailableDevices(detected); // ✅ 将检测结果存储到本地状态
      setCurrentStep(2);
    } catch (err) {
      console.error('设备检测失败:', err);
    }
  }, [detectDevices]);

  // 开始导入
  const handleStartImport = useCallback(async () => {
    if (!fileContent || selectedDevices.length === 0) {
      return;
    }

    try {
      setCurrentStep(3);
      await importContacts(fileContent, selectedDevices);
    } catch (err) {
      console.error('导入失败:', err);
    }
  }, [fileContent, selectedDevices, importContacts]);

  // 重新开始
  const handleRestart = useCallback(() => {
    reset();
    setCurrentStep(0);
    setFileContent('');
    setSelectedDevices([]);
    setAvailableDevices([]); // ✅ 同时清理检测到的设备
  }, [reset]);

  // 联系人表格列定义
  const contactColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '公司',
      dataIndex: 'organization',
      key: 'organization',
    }
  ];

  // 设备表格列定义
  const deviceColumns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '设备ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ 
          color: status === 'connected' ? 'green' : 
                status === 'unauthorized' ? 'orange' : 'red' 
        }}>
          {status === 'connected' ? '已连接' : 
           status === 'unauthorized' ? '未授权' : 
           status === 'offline' ? '离线' : '未知'}
        </span>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>联系人导入向导</Title>
      
      <Steps current={currentStep} style={{ marginBottom: '24px' }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={step.description}
            icon={step.icon}
          />
        ))}
      </Steps>

      {error && (
        <Alert
          type="error"
          message="操作失败"
          description={error.message}
          closable
          onClose={clearError}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 步骤 1: 文件上传 */}
      {currentStep === 0 && (
        <Card title="上传联系人文件">
          <Dragger
            accept=".vcf,.vcard"
            beforeUpload={handleFileUpload}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽VCF文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个VCF文件上传，文件大小限制为10MB
            </p>
          </Dragger>

          {contacts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>已解析 {contacts.length} 个联系人</Text>
              <Table
                dataSource={contacts.slice(0, 5)}
                columns={contactColumns}
                pagination={false}
                size="small"
                style={{ marginTop: '8px' }}
              />
              {contacts.length > 5 && (
                <Text type="secondary">仅显示前5个联系人...</Text>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 步骤 2: 设备检测 */}
      {currentStep === 1 && (
        <Card title="检测Android设备">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              onClick={handleDetectDevices}
              loading={isImporting}
            >
              检测设备
            </Button>

            {availableDevices.length > 0 && (
              <div>
                <Text strong>检测到 {availableDevices.length} 台设备</Text>
                <Table
                  dataSource={availableDevices}
                  columns={deviceColumns}
                  pagination={false}
                  size="small"
                  style={{ marginTop: '8px' }}
                  rowSelection={{
                    selectedRowKeys: selectedDevices.map(d => d.id),
                    onChange: (selectedRowKeys) => {
                      const selected = availableDevices.filter(d =>
                        selectedRowKeys.includes(d.id)
                      );
                      setSelectedDevices(selected);
                    }
                  }}
                />
              </div>
            )}

            {availableDevices.length > 0 && selectedDevices.length > 0 && (
              <Button type="primary" onClick={() => setCurrentStep(2)}>
                下一步
              </Button>
            )}
          </Space>
        </Card>
      )}

      {/* 步骤 3: 配置导入 */}
      {currentStep === 2 && (
        <Card title="配置导入策略">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>选择导入策略:</Text>
              <Select
                style={{ width: '300px', marginLeft: '8px' }}
                value={selectedStrategy}
                onChange={(value) => {
                  setSelectedStrategy(value);
                  setStrategy(value);
                }}
              >
                {ImportStrategyFactory.getAvailableStrategies().map(strategy => (
                  <Option key={strategy.type} value={strategy.type}>
                    {strategy.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>导入摘要:</Text>
              <ul>
                <li>联系人总数: {contacts.length}</li>
                <li>目标设备: {selectedDevices.length} 台</li>
                <li>导入策略: {ImportStrategyFactory.create(selectedStrategy).getName()}</li>
              </ul>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={handleStartImport}
              disabled={isImporting}
            >
              开始导入
            </Button>
          </Space>
        </Card>
      )}

      {/* 步骤 4: 导入进度 */}
      {currentStep === 3 && (
        <Card title="导入进度">
          <Space direction="vertical" style={{ width: '100%' }}>
            {isImporting && (
              <div>
                <Text strong>{getPhaseDescription(currentPhase)}</Text>
                {currentPhase === ImportPhase.IMPORTING && (
                  <Alert
                    type="info"
                    message="多品牌智能导入"
                    description="正在自动尝试不同品牌的导入方式，确保最佳兼容性"
                    showIcon
                    style={{ marginTop: '8px', marginBottom: '8px' }}
                  />
                )}
                {progress && (
                  <div style={{ marginTop: '8px' }}>
                    <Progress
                      percent={progress.percentage}
                      status={progress.status === 'failed' ? 'exception' : 'active'}
                    />
                    <div style={{ marginTop: '8px' }}>
                      <Text>
                        已处理: {progress.processedContacts} / {progress.totalContacts}
                      </Text>
                      {progress.currentDevice && (
                        <Text style={{ marginLeft: '16px' }}>
                          当前设备: {progress.currentDevice}
                        </Text>
                      )}
                      {currentPhase === ImportPhase.IMPORTING && (
                        <Text style={{ marginLeft: '16px', color: '#1890ff' }}>
                          🔄 智能品牌适配中...
                        </Text>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  danger
                  onClick={cancelImport}
                  style={{ marginTop: '16px' }}
                >
                  取消导入
                </Button>
              </div>
            )}

            {result && (
              <div>
                <Alert
                  type={result.success ? 'success' : 'error'}
                  message={result.success ? '导入完成' : '导入失败'}
                  description={result.message}
                  style={{ marginBottom: '16px' }}
                />

                <div>
                  <Title level={4}>导入统计</Title>
                  <ul>
                    <li>总计联系人: {result.totalContacts}</li>
                    <li>成功导入: {result.importedContacts} ({Math.round((result.importedContacts / result.totalContacts) * 100)}%)</li>
                    <li>导入失败: {result.failedContacts} ({Math.round((result.failedContacts / result.totalContacts) * 100)}%)</li>
                    <li>跳过联系人: {result.skippedContacts} ({Math.round((result.skippedContacts / result.totalContacts) * 100)}%)</li>
                    <li>重复联系人: {result.duplicateContacts} ({Math.round((result.duplicateContacts / result.totalContacts) * 100)}%)</li>
                    <li>总耗时: {Math.round(result.duration / 1000)}秒</li>
                  </ul>
                </div>

                <Space>
                  <Button type="primary" onClick={handleRestart}>
                    重新导入
                  </Button>
                  <Button onClick={onCancel}>
                    关闭
                  </Button>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

// 辅助函数：读取文件为文本
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = (e) => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file, 'UTF-8');
  });
}

