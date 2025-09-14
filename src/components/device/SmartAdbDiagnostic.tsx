import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Steps,
  Button,
  Progress,
  Alert,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
  List,
  notification
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
  UsbOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import { AdbDiagnosticService, DiagnosticResult, SystemInfo } from '../../services/AdbDiagnosticService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface DiagnosticStepProps {
  step: DiagnosticResult;
}

const DiagnosticStepComponent: React.FC<DiagnosticStepProps> = ({ step }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      default:
        return <SyncOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'success': return '#52c41a';
      case 'warning': return '#faad14';
      case 'error': return '#ff4d4f';
      case 'running': return '#1890ff';
      default: return '#d9d9d9';
    }
  };

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 8,
        borderLeft: `4px solid ${getStatusColor()}`,
        backgroundColor: step.status === 'running' ? '#f6ffed' : undefined
      }}
    >
      <Row align="middle" gutter={16}>
        <Col flex="none">
          {getStatusIcon()}
        </Col>
        <Col flex="auto">
          <div>
            <Text strong>{step.name}</Text>
            <br />
            <Text type={step.status === 'error' ? 'danger' : undefined}>
              {step.message}
            </Text>
          </div>
        </Col>
        {step.canAutoFix && (
          <Col flex="none">
            <Badge status="processing" text="可自动修复" />
          </Col>
        )}
      </Row>
      
      {(step.details || step.suggestion) && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
          {step.details && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              详情: {step.details}
            </Text>
          )}
          {step.suggestion && (
            <Text type="warning" style={{ fontSize: '12px', display: 'block' }}>
              建议: {step.suggestion}
            </Text>
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * 专业级ADB诊断组件
 * 为客户和朋友提供友好的自助诊断界面
 */
export const SmartAdbDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [progress, setProgress] = useState(0);

  const diagnosticService = AdbDiagnosticService.getInstance();

  // 获取系统信息
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await diagnosticService.getSystemInfo();
        setSystemInfo(info);
      } catch (error) {
        console.error('获取系统信息失败:', error);
      }
    };
    
    loadSystemInfo();
  }, []);

  // 运行诊断的回调函数
  const handleProgressUpdate = useCallback((step: number, total: number, result: DiagnosticResult) => {
    setCurrentStep(step);
    setProgress(Math.round((step / total) * 100));
    
    // 更新结果列表
    setDiagnosticResults(prev => {
      const newResults = [...prev];
      const existingIndex = newResults.findIndex(r => r.id === result.id);
      
      if (existingIndex >= 0) {
        newResults[existingIndex] = result;
      } else {
        newResults.push(result);
      }
      
      return newResults;
    });
  }, []);

  // 开始完整诊断
  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setDiagnosticResults([]);
    setCurrentStep(0);
    setProgress(0);

    try {
      const results = await diagnosticService.runFullDiagnostic(handleProgressUpdate);
      
      // 检查诊断结果并显示通知
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      if (errorCount === 0 && warningCount === 0) {
        notification.success({
          message: '诊断完成',
          description: '所有检查都通过了！您的ADB环境配置正常。',
          duration: 4
        });
      } else if (errorCount === 0) {
        notification.warning({
          message: '诊断完成',
          description: `发现 ${warningCount} 个警告，但基本功能正常。`,
          duration: 4
        });
      } else {
        notification.error({
          message: '诊断完成',
          description: `发现 ${errorCount} 个错误和 ${warningCount} 个警告，请查看建议。`,
          duration: 4
        });
      }
      
    } catch (error) {
      notification.error({
        message: '诊断失败',
        description: error instanceof Error ? error.message : '诊断过程中发生未知错误',
        duration: 4
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 一键快速修复
  const runQuickFix = async () => {
    setIsRunning(true);
    
    try {
      const result = await diagnosticService.quickFix();
      
      if (result.status === 'success') {
        notification.success({
          message: '快速修复完成',
          description: result.message,
          duration: 3
        });
        
        // 修复后重新运行诊断
        setTimeout(() => {
          runFullDiagnostic();
        }, 1000);
      } else {
        notification.error({
          message: '快速修复失败',
          description: result.details || result.message,
          duration: 4
        });
      }
    } catch (error) {
      notification.error({
        message: '快速修复失败',
        description: error instanceof Error ? error.message : '修复过程中发生错误',
        duration: 4
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getOverallStatus = () => {
    if (diagnosticResults.length === 0) return 'info';
    
    const hasError = diagnosticResults.some(r => r.status === 'error');
    const hasWarning = diagnosticResults.some(r => r.status === 'warning');
    
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    return 'success';
  };

  const getStatusMessage = () => {
    const errorCount = diagnosticResults.filter(r => r.status === 'error').length;
    const warningCount = diagnosticResults.filter(r => r.status === 'warning').length;
    const successCount = diagnosticResults.filter(r => r.status === 'success').length;
    
    if (errorCount > 0) {
      return `发现 ${errorCount} 个错误需要处理`;
    }
    if (warningCount > 0) {
      return `有 ${warningCount} 个警告，但基本功能正常`;
    }
    if (successCount > 0) {
      return '所有检查都通过，系统运行正常！';
    }
    return '点击开始诊断来检查您的ADB环境';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 标题和介绍 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <SafetyCertificateOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          ADB环境诊断工具
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '16px' }}>
          智能检测您的Android调试桥接环境，自动识别并解决常见连接问题
        </Paragraph>
      </div>

      {/* 系统信息概览 */}
      {systemInfo && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="ADB版本"
                value={systemInfo.adbVersion || '未检测到'}
                prefix={<ToolOutlined />}
                valueStyle={{ color: systemInfo.adbVersion ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="设备数量"
                value={systemInfo.deviceCount}
                prefix={<MobileOutlined />}
                valueStyle={{ color: systemInfo.deviceCount > 0 ? '#3f8600' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="操作系统"
                value={systemInfo.osInfo}
                prefix={<DesktopOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="工具路径"
                value={systemInfo.platformPath}
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要操作按钮 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>完整诊断</Title>
              <Paragraph type="secondary">
                运行完整的5步诊断流程，检查ADB工具、服务器、设备连接、模拟器和设备健康状态
              </Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                loading={isRunning}
                onClick={runFullDiagnostic}
                block
              >
                开始诊断
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>一键修复</Title>
              <Paragraph type="secondary">
                自动执行常见的修复操作：重启ADB服务器、清理进程、连接模拟器
              </Paragraph>
              <Button
                size="large"
                icon={<ToolOutlined />}
                loading={isRunning}
                onClick={runQuickFix}
                block
              >
                快速修复
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 诊断进度 */}
      {isRunning && (
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>诊断进度</Title>
          <Progress 
            percent={progress} 
            status={progress === 100 ? 'success' : 'active'}
            strokeColor={{
              from: '#108ee9',
              to: '#87d068',
            }}
          />
          <Text type="secondary">
            正在进行第 {currentStep} 步检查...
          </Text>
        </Card>
      )}

      {/* 诊断结果 */}
      {diagnosticResults.length > 0 && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Title level={4}>诊断结果</Title>
            <Alert
              type={getOverallStatus()}
              message={getStatusMessage()}
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>

          <List
            dataSource={diagnosticResults}
            renderItem={(result) => (
              <List.Item style={{ padding: 0, border: 'none' }}>
                <DiagnosticStepComponent step={result} />
              </List.Item>
            )}
          />

          {/* 可自动修复的问题提示 */}
          {diagnosticResults.some(r => r.canAutoFix && r.status === 'error') && (
            <Alert
              type="info"
              message="发现可自动修复的问题"
              description="点击上方的一键修复按钮，系统将尝试自动解决标记的问题。"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {/* 使用提示 */}
      <Card style={{ marginTop: 24, backgroundColor: '#fafafa' }}>
        <Title level={5}>使用提示</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <Text strong><UsbOutlined /> USB连接设备</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                1. 启用开发者选项<br />
                2. 开启USB调试<br />
                3. 信任计算机
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <Text strong><WifiOutlined /> 无线ADB连接</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                1. 先用USB连接一次<br />
                2. 执行 adb tcpip 5555<br />
                3. 使用IP地址连接
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <Text strong><DesktopOutlined /> 模拟器连接</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                1. 启动雷电模拟器<br />
                2. 等待完全启动<br />
                3. 使用诊断工具连接
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SmartAdbDiagnostic;