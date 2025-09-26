/**
 * 联系人导入向导组件
 * 展示如何使用新的模块化架构
 */

import { CheckCircleOutlined, FileTextOutlined, MobileOutlined, InboxOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Alert, Space, Steps, Typography, message } from 'antd';
import React, { useCallback, useState } from 'react';
import { useContactImport, useImportStats } from '../hooks/useUnifiedContactImport';
import { ImportStrategyFactory } from '../strategies/ImportStrategies';
import { Device, ImportPhase, ImportStrategyType } from '../types';
import { StepUpload } from './steps/StepUpload';
import { StepSourceSelect } from './steps/StepSourceSelect';
import { StepDetectDevices } from './steps/StepDetectDevices';
import { StepConfigure } from './steps/StepConfigure';
import { StepProgress } from './steps/StepProgress';
import { PREVIEW_ROWS_COUNT, getPhaseDescription } from './constants';
import { dedupeDevices, ensureDevicesSelected, ensureFileContent, ValidationError } from './utils/validation';

const { Step } = Steps;
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
      title: '选择数据源',
      description: 'TXT 文件或文件夹写库',
      icon: <FolderOpenOutlined />
    },
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

  // 阶段描述由 constants 提供

  // 文件解析完成
  const handleFileParsed = useCallback(async (content: string) => {
    try {
      ensureFileContent(content);
      setFileContent(content);
      await parseContacts(content);
      setCurrentStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
    }
  }, [parseContacts]);

  // 检测设备
  const handleDetectDevices = useCallback(async () => {
    try {
      const detected = await detectDevices();
      setAvailableDevices(detected); // ✅ 将检测结果存储到本地状态
      setCurrentStep(3);
    } catch (err) {
      console.error('设备检测失败:', err);
    }
  }, [detectDevices]);

  // 开始导入
  const handleStartImport = useCallback(async () => {
    try {
      ensureFileContent(fileContent);
      const uniqDevices = dedupeDevices(selectedDevices);
      ensureDevicesSelected(uniqDevices);
      setSelectedDevices(uniqDevices);
      setCurrentStep(4);
      await importContacts(fileContent, uniqDevices);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
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

  // 预览前 5 行供上传步骤使用
  const previewRows = contacts.slice(0, PREVIEW_ROWS_COUNT);

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

      {currentStep === 0 && (
        <StepSourceSelect onCompleted={() => setCurrentStep(1)} />
      )}

      {currentStep === 1 && (
        <StepUpload contactsCount={contacts.length} previewRows={previewRows} onFileParsed={handleFileParsed} />
      )}

      {currentStep === 2 && (
        <StepDetectDevices
          isBusy={isImporting}
          availableDevices={availableDevices}
          selectedDeviceIds={selectedDevices.map(d => d.id)}
          onDetect={handleDetectDevices}
          onSelect={(ids) => setSelectedDevices(availableDevices.filter(d => ids.includes(d.id)))}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepConfigure
          selectedStrategy={selectedStrategy}
          contactsCount={contacts.length}
          selectedDevicesCount={selectedDevices.length}
          onChangeStrategy={(v) => { setSelectedStrategy(v); setStrategy(v); }}
          onStartImport={handleStartImport}
          disabled={isImporting}
        />
      )}

      {currentStep === 4 && (
        <StepProgress
          isImporting={isImporting}
          currentPhase={currentPhase}
          progress={progress}
          result={result}
          onCancel={cancelImport}
          onRestart={handleRestart}
          onClose={onCancel}
        />
      )}
    </div>
  );
};

// 文件读取工具已抽取至 ui/utils/file.ts

