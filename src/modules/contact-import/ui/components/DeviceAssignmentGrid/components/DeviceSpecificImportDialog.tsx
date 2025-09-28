import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Steps, Button, Space, App, Spin, Switch, Input, Form, Alert } from 'antd';
import { ImportResultDisplay } from '../../../../import-strategies/ui/ImportResultDisplay';
import { ImportStrategyExecutor } from '../../../../import-strategies/services/ImportStrategyExecutor';
import type { ImportStrategy, ImportResult } from '../../../../import-strategies/types';
import { getRecommendedStrategies } from '../../../../import-strategies/strategies';
import { useAdb } from '../../../../../../application/hooks/useAdb';
import { EnhancedStrategyConfigurator } from './strategy-configurator';

interface DeviceSpecificImportDialogProps {
  /** 是否显示对话框 */
  visible: boolean;
  /** VCF文件路径 */
  vcfFilePath: string;
  /** 目标设备ID */
  targetDeviceId: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 导入成功回调 */
  onSuccess?: (result: ImportResult) => void;
  /** 设备上下文信息，用于策略推荐 */
  deviceContext?: {
    deviceName?: string;
    manufacturer?: string;
    model?: string;
    androidVersion?: string;
  };
}

const { Step } = Steps;

/**
 * 设备专用导入策略对话框
 * 
 * 专为设备卡片场景设计的导入对话框，支持明确指定目标设备ID
 * 解决了原始ImportStrategyDialog依赖全局selectedDevice的问题
 * 
 * 特性:
 * - ✅ 支持明确的设备ID指定，不依赖全局设备选择
 * - ✅ 基于设备上下文自动推荐最适策略
 * - ✅ 完整的导入流程：策略选择 → 执行 → 结果展示
 * - ✅ 模块化设计，文件大小控制在450行以内
 * - ✅ TypeScript类型安全
 */
const DeviceSpecificImportDialogContent: React.FC<DeviceSpecificImportDialogProps> = ({
  visible,
  vcfFilePath,
  targetDeviceId,
  onClose,
  onSuccess,
  deviceContext
}) => {
  const { message } = App.useApp();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<ImportStrategy | undefined>();
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const [isImporting, setIsImporting] = useState(false);
  const [enableVerification, setEnableVerification] = useState(true);
  const [verificationPhones, setVerificationPhones] = useState<string>('');
  const [form] = Form.useForm();

  const { devices } = useAdb();

  // 获取目标设备信息
  const targetDevice = useMemo(() => {
    return devices.find(device => device.id === targetDeviceId);
  }, [devices, targetDeviceId]);

  // 设备信息用于策略推荐
  const deviceInfoForStrategy = useMemo(() => {
    return {
      manufacturer: deviceContext?.manufacturer || targetDevice?.product || targetDevice?.properties?.brand || 'Unknown',
      model: deviceContext?.model || targetDevice?.model || 'Unknown',
      androidVersion: deviceContext?.androidVersion
    };
  }, [deviceContext, targetDevice]);

  // 重置状态并自动推荐策略
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setSelectedStrategy(undefined);
      setImportResult(undefined);
      setIsImporting(false);
      setVerificationPhones('');
      
      // 自动推荐策略
      const recommended = getRecommendedStrategies(deviceInfoForStrategy);
      if (recommended.length > 0) {
        setSelectedStrategy(recommended[0]);
      }
    }
  }, [visible, deviceInfoForStrategy]);

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
    if (!selectedStrategy || !targetDeviceId) {
      message.error('请选择导入策略，设备信息缺失');
      return;
    }

    if (!targetDevice) {
      message.error(`找不到设备: ${targetDeviceId}`);
      return;
    }

    setIsImporting(true);
    
    try {
      const executor = ImportStrategyExecutor.getInstance();
      
      // 解析验证号码
      const verificationNumbers = enableVerification && verificationPhones.trim()
        ? verificationPhones.split(/[,，\s]+/).filter(phone => phone.length > 0)
        : [];

      const selection = {
        strategy: selectedStrategy,
        enableVerification,
        verificationNumbers
      };

      console.log(`🚀 开始导入到设备 ${targetDeviceId} (${deviceContext?.deviceName || targetDevice.getDisplayName()})`);
      console.log('📋 导入配置:', selection);

      // 执行导入
      const result = await executor.executeImport({
        selectedStrategy: selectedStrategy,
        vcfFilePath,
        deviceId: targetDeviceId,
        enableVerification,
        verificationPhones: verificationNumbers
      });
      
      setImportResult(result);
      setCurrentStep(2);

      if (result.success) {
        message.success(`导入到设备 ${deviceContext?.deviceName || targetDevice.getDisplayName()} 完成！`);
        onSuccess?.(result);
      } else {
        message.error('导入失败');
      }

      // 清理临时文件
      await executor.cleanup(targetDeviceId);

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ minHeight: '300px', padding: '20px 0' }}>
            <EnhancedStrategyConfigurator
              deviceInfo={deviceInfoForStrategy}
              selectedStrategy={selectedStrategy}
              onStrategyChange={setSelectedStrategy}
              deviceContext={{
                deviceName: deviceContext?.deviceName || targetDevice?.getDisplayName() || targetDeviceId
              }}
            />
          </div>
        );

      case 1:
        return (
          <div style={{ minHeight: '300px', padding: '20px 0' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message={`即将导入到设备: ${deviceContext?.deviceName || targetDevice?.getDisplayName() || targetDeviceId}`}
                description={`策略: ${selectedStrategy?.vCardVersion} - ${selectedStrategy?.triggerMethod}`}
                type="warning"
                showIcon
              />

              <Form form={form} layout="vertical">
                <Form.Item label="验证设置">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Switch
                      checked={enableVerification}
                      onChange={setEnableVerification}
                      checkedChildren="启用验证"
                      unCheckedChildren="跳过验证"
                    />
                    {enableVerification && (
                      <Input.TextArea
                        placeholder="输入要验证的手机号码，用逗号分隔..."
                        value={verificationPhones}
                        onChange={(e) => setVerificationPhones(e.target.value)}
                        rows={3}
                      />
                    )}
                  </Space>
                </Form.Item>
              </Form>
            </Space>
          </div>
        );

      case 2:
        return (
          <div style={{ minHeight: '300px' }}>
            {importResult && (
              <ImportResultDisplay
                result={importResult}
                onRetry={handleRetry}
                onClose={onClose}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 0: return '选择导入策略';
      case 1: return '配置导入参数';
      case 2: return '导入结果';
      default: return '';
    }
  };

  const getFooterButtons = () => {
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
        return isImporting ? [
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button key="importing" type="primary" loading>
            导入中...
          </Button>
        ] : [
          <Button key="back" onClick={handlePrev}>
            上一步
          </Button>,
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button 
            key="start" 
            type="primary" 
            onClick={handleStartImport}
          >
            开始导入
          </Button>
        ];

      case 2:
        return [
          <Button key="close" type="primary" onClick={onClose}>
            关闭
          </Button>
        ];

      default:
        return [];
    }
  };

  return (
    <Modal
      title="设备联系人导入"
      open={visible}
      onCancel={onClose}
      width={700}
      footer={getFooterButtons()}
      maskClosable={false}
      destroyOnHidden={true}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title={getStepTitle(0)} />
        <Step title={getStepTitle(1)} />
        <Step title={getStepTitle(2)} />
      </Steps>

      {isImporting && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 10 }}>正在导入联系人...</div>
        </div>
      )}

      {!isImporting && renderStepContent()}
    </Modal>
  );
};

/**
 * 设备特定导入对话框包装器
 * 
 * 提供App组件context，解决静态消息API的context警告
 */
export const DeviceSpecificImportDialog: React.FC<DeviceSpecificImportDialogProps> = (props) => {
  return (
    <App>
      <DeviceSpecificImportDialogContent {...props} />
    </App>
  );
};