import React, { useState, useEffect } from 'react';
import { Modal, Steps, Button, Space, message, Spin, Switch, Input, Form } from 'antd';
import { ImportStrategySelector } from './ImportStrategySelector';
import { ImportResultDisplay } from './ImportResultDisplay';
import { ImportStrategyExecutor } from '../services/ImportStrategyExecutor';
import type { ImportStrategy, ImportResult, ImportStrategySelection } from '../types';
import { getRecommendedStrategies } from '../strategies';
import { useAdb } from '../../../../application/hooks/useAdb';

interface ImportStrategyDialogProps {
  visible: boolean;
  vcfFilePath: string;
  onClose: () => void;
  onSuccess?: (result: ImportResult) => void;
}

const { Step } = Steps;

export const ImportStrategyDialog: React.FC<ImportStrategyDialogProps> = ({
  visible,
  vcfFilePath,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<ImportStrategy | undefined>();
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const [isImporting, setIsImporting] = useState(false);
  const [enableVerification, setEnableVerification] = useState(true);
  const [verificationPhones, setVerificationPhones] = useState<string>('');
  const [form] = Form.useForm();

  const { selectedDevice } = useAdb();

  // 重置状态
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setSelectedStrategy(undefined);
      setImportResult(undefined);
      setIsImporting(false);
      setVerificationPhones('');
      
      // 自动推荐策略
      if (selectedDevice) {
        const recommended = getRecommendedStrategies({
          manufacturer: selectedDevice.product || selectedDevice.properties?.brand || 'Unknown',
          model: selectedDevice.model
        });
        if (recommended.length > 0) {
          setSelectedStrategy(recommended[0]);
        }
      }
    }
  }, [visible, selectedDevice]);

  const handleNext = () => {
    if (currentStep === 0 && !selectedStrategy) {
      message.error('请选择一个导入策略');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleStartImport = async () => {
    if (!selectedStrategy || !selectedDevice) {
      message.error('请选择导入策略和设备');
      return;
    }

    setIsImporting(true);
    
    try {
      const executor = ImportStrategyExecutor.getInstance();
      
      // 解析验证号码
      const phones = enableVerification && verificationPhones.trim() 
        ? verificationPhones.split(/[,，\s]+/).filter(phone => phone.trim())
        : undefined;

      const selection: ImportStrategySelection = {
        selectedStrategy,
        vcfFilePath,
        deviceId: selectedDevice.id,
        enableVerification,
        verificationPhones: phones
      };

      console.log('🚀 开始导入，策略配置:', selection);

      const result = await executor.executeImport(selection);
      
      setImportResult(result);
      setCurrentStep(2);

      if (result.success) {
        message.success('导入完成！');
        onSuccess?.(result);
      } else {
        message.error('导入失败');
      }

      // 清理临时文件
      await executor.cleanup(selectedDevice.id);

    } catch (error) {
      console.error('导入过程出错:', error);
      message.error('导入过程出错');
      
      setImportResult({
        success: false,
        importedCount: 0,
        failedCount: 1,
        strategy: selectedStrategy,
        errorMessage: error instanceof Error ? error.message : '未知错误'
      });
      setCurrentStep(2);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetry = () => {
    setCurrentStep(1);
    setImportResult(undefined);
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ minHeight: 400 }}>
            <ImportStrategySelector
              deviceInfo={{
                manufacturer: selectedDevice?.product || selectedDevice?.properties?.brand || 'Unknown',
                model: selectedDevice?.model
              }}
              selectedStrategy={selectedStrategy}
              onStrategyChange={setSelectedStrategy}
              showAllStrategies={true}
            />
          </div>
        );

      case 1:
        return (
          <div style={{ minHeight: 300 }}>
            <Form form={form} layout="vertical">
              <Form.Item>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <h4>确认导入配置</h4>
                    <p>VCF文件: <code>{vcfFilePath}</code></p>
                    <p>目标设备: <strong>{selectedDevice?.model} ({selectedDevice?.id})</strong></p>
                    <p>选择策略: <strong>{selectedStrategy?.name}</strong></p>
                  </div>

                  <Form.Item label="验证导入结果" extra="导入后查询联系人数据库验证结果">
                    <Switch 
                      checked={enableVerification}
                      onChange={setEnableVerification}
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  {enableVerification && (
                    <Form.Item 
                      label="验证号码" 
                      extra="输入要验证的手机号码，用逗号分隔（可选）"
                    >
                      <Input.TextArea
                        placeholder="例如: 13100000001, 13100000002, 13100000003"
                        rows={3}
                        value={verificationPhones}
                        onChange={e => setVerificationPhones(e.target.value)}
                      />
                    </Form.Item>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </div>
        );

      case 2:
        return (
          <div style={{ minHeight: 400 }}>
            {importResult ? (
              <ImportResultDisplay
                result={importResult}
                onRetry={handleRetry}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <p style={{ marginTop: 16 }}>导入结果加载中...</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (currentStep) {
      case 0:
        return '选择导入策略';
      case 1:
        return '确认导入配置';
      case 2:
        return '导入结果';
      default:
        return '联系人导入';
    }
  };

  const getModalFooter = () => {
    if (isImporting) {
      return [
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="importing" type="primary" loading>
          导入中...
        </Button>
      ];
    }

    switch (currentStep) {
      case 0:
        return [
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button 
            key="next" 
            type="primary" 
            onClick={handleNext}
            disabled={!selectedStrategy}
          >
            下一步
          </Button>
        ];

      case 1:
        return [
          <Button key="back" onClick={handlePrev}>
            上一步
          </Button>,
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            onClick={handleStartImport}
          >
            开始导入
          </Button>
        ];

      case 2:
        return [
          <Button key="close" type="primary" onClick={onClose}>
            完成
          </Button>
        ];

      default:
        return [];
    }
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={onClose}
      footer={getModalFooter()}
      width={800}
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <Steps current={currentStep} size="small">
          <Step title="选择策略" description="选择导入方式" />
          <Step title="确认配置" description="配置导入参数" />
          <Step title="导入结果" description="查看导入结果" />
        </Steps>
      </div>

      {getStepContent()}
    </Modal>
  );
};