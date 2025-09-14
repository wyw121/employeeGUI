/**
 * ADB 诊断仪表板组件
 * 集成所有核心功能的统一界面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Progress,
  Statistic,
  Badge,
  notification
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  ExportOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useLogManager } from './hooks/useLogManager';
import {
  enhancedAdbDiagnosticService,
  DiagnosticResult,
  DiagnosticStatus,
  DiagnosticProgress
} from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';
import { LogCategory } from '../../services/adb-diagnostic/LogManager';

const { Title, Text, Paragraph } = Typography;

interface AdbDashboardProps {
  className?: string;
}

/**
 * 系统状态概览组件
 */
const SystemOverview: React.FC<{
  diagnosticResults: DiagnosticResult[];
  isRunning: boolean;
}> = ({ diagnosticResults, isRunning }) => {
  const getStatusCounts = () => {
    const counts = {
      success: 0,
      warning: 0,
      error: 0,
      total: diagnosticResults.length
    };

    diagnosticResults.forEach(result => {
      if (result.status === DiagnosticStatus.SUCCESS) counts.success++;
      else if (result.status === DiagnosticStatus.WARNING) counts.warning++;
      else if (result.status === DiagnosticStatus.ERROR) counts.error++;
    });

    return counts;
  };

  const counts = getStatusCounts();
  const overallStatus = getOverallStatus(counts);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="系统状态"
            value={getStatusText(isRunning, overallStatus)}
            prefix={getStatusIcon(isRunning, overallStatus)}
            valueStyle={{
              color: getStatusColor(isRunning, overallStatus)
            }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="检查项目"
            value={counts.total}
            suffix="项"
            prefix={<SafetyCertificateOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="成功/警告"
            value={`${counts.success}/${counts.warning}`}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="错误"
            value={counts.error}
            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: counts.error > 0 ? '#ff4d4f' : '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

// 辅助函数
const getOverallStatus = (counts: { error: number; warning: number }) => {
  if (counts.error > 0) return 'error';
  if (counts.warning > 0) return 'warning';
  return 'success';
};

const getStatusText = (isRunning: boolean, overallStatus: string) => {
  if (isRunning) return '诊断中...';
  if (overallStatus === 'success') return '正常';
  if (overallStatus === 'warning') return '警告';
  return '异常';
};

const getStatusIcon = (isRunning: boolean, overallStatus: string) => {
  if (isRunning) return <ReloadOutlined spin />;
  if (overallStatus === 'success') return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  if (overallStatus === 'warning') return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
  return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
};

const getStatusColor = (isRunning: boolean, overallStatus: string) => {
  if (isRunning) return '#1890ff';
  if (overallStatus === 'success') return '#52c41a';
  if (overallStatus === 'warning') return '#faad14';
  return '#ff4d4f';
};

const getBorderColor = (status: DiagnosticStatus) => {
  if (status === DiagnosticStatus.SUCCESS) return '#52c41a';
  if (status === DiagnosticStatus.WARNING) return '#faad14';
  return '#ff4d4f';
};

/**
 * 诊断结果组件
 */
const DiagnosticResults: React.FC<{
  results: DiagnosticResult[];
  onAutoFix: () => void;
}> = ({ results, onAutoFix }) => {
  const getStatusIcon = (status: DiagnosticStatus) => {
    switch (status) {
      case DiagnosticStatus.SUCCESS:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case DiagnosticStatus.WARNING:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case DiagnosticStatus.ERROR:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ReloadOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const fixableIssues = results.filter(r => r.canAutoFix);

  return (
    <Card 
      title="诊断结果" 
      extra={
        fixableIssues.length > 0 && (
          <Button 
            type="primary" 
            icon={<ToolOutlined />}
            onClick={onAutoFix}
          >
            自动修复 ({fixableIssues.length})
          </Button>
        )
      }
    >
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <BugOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div>
            <Text type="secondary">暂无诊断结果</Text>
            <br />
            <Text type="secondary">点击"开始诊断"运行系统检查</Text>
          </div>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {results.map((result) => (
            <Card 
              key={result.id} 
              size="small"
              style={{
                borderLeft: `4px solid ${getBorderColor(result.status)}`
              }}
            >
              <Row align="middle" gutter={16}>
                <Col flex="none">
                  {getStatusIcon(result.status)}
                </Col>
                <Col flex="auto">
                  <div>
                    <Text strong>{result.name}</Text>
                    {result.canAutoFix && (
                      <Badge 
                        count="可自动修复" 
                        style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                      />
                    )}
                    <br />
                    <Text>{result.message}</Text>
                    {result.suggestion && (
                      <>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          建议: {result.suggestion}
                        </Text>
                      </>
                    )}
                  </div>
                </Col>
                <Col flex="none">
                  {result.duration && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {result.duration}ms
                    </Text>
                  )}
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};

/**
 * 主要操作面板组件
 */
const ActionPanel: React.FC<{
  isRunning: boolean;
  onStartDiagnostic: () => void;
  onQuickCheck: () => void;
  onExportReport: () => void;
}> = ({ isRunning, onStartDiagnostic, onQuickCheck, onExportReport }) => {
  return (
    <Card title="操作面板">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              loading={isRunning}
              onClick={onStartDiagnostic}
              block
            >
              {isRunning ? '诊断中...' : '开始完整诊断'}
            </Button>
          </Col>
          <Col span={12}>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={onQuickCheck}
              disabled={isRunning}
              block
            >
              快速检查
            </Button>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Button
              icon={<ExportOutlined />}
              onClick={onExportReport}
              block
            >
              导出报告
            </Button>
          </Col>
          <Col span={12}>
            <Button
              icon={<SettingOutlined />}
              block
            >
              高级设置
            </Button>
          </Col>
        </Row>
      </Space>
    </Card>
  );
};

/**
 * ADB 诊断仪表板主组件
 */
export const AdbDashboard: React.FC<AdbDashboardProps> = ({ className }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  const { info, warn } = useLogManager();

  // 初始化时获取上次诊断结果
  useEffect(() => {
    const lastResults = enhancedAdbDiagnosticService.getLastDiagnosticResults();
    setDiagnosticResults(lastResults);
    
    info(LogCategory.USER_ACTION, 'AdbDashboard', 'ADB 诊断仪表板已加载');
  }, [info]);

  // 开始完整诊断
  const handleStartDiagnostic = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('');
    setDiagnosticResults([]);

    info(LogCategory.USER_ACTION, 'AdbDashboard', '用户启动完整诊断');

    try {
      const results = await enhancedAdbDiagnosticService.runFullDiagnostic(
        (progressInfo: DiagnosticProgress) => {
          setProgress(progressInfo.progress);
          setCurrentStep(progressInfo.currentResult.name);
          setDiagnosticResults(progressInfo.allResults);
        }
      );

      setDiagnosticResults(results);
      
      // 显示诊断完成通知
      const errorCount = results.filter(r => r.status === DiagnosticStatus.ERROR).length;
      const warningCount = results.filter(r => r.status === DiagnosticStatus.WARNING).length;
      
      if (errorCount === 0 && warningCount === 0) {
        notification.success({
          message: '诊断完成',
          description: '所有检查都通过了！您的 ADB 环境配置正常。',
          duration: 4
        });
      } else {
        notification.warning({
          message: '诊断完成',
          description: `发现 ${errorCount} 个错误和 ${warningCount} 个警告，请查看详细结果。`,
          duration: 6
        });
      }

      info(LogCategory.DIAGNOSTIC, 'AdbDashboard', '完整诊断完成', {
        totalChecks: results.length,
        errors: errorCount,
        warnings: warningCount
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '诊断过程出现未知错误';
      
      notification.error({
        message: '诊断失败',
        description: errorMessage,
        duration: 8
      });

      warn(LogCategory.DIAGNOSTIC, 'AdbDashboard', '诊断过程失败', { error: errorMessage });
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  // 快速检查
  const handleQuickCheck = async () => {
    info(LogCategory.USER_ACTION, 'AdbDashboard', '用户启动快速检查');

    try {
      const results = await enhancedAdbDiagnosticService.runQuickCheck();
      setDiagnosticResults(results);
      
      notification.info({
        message: '快速检查完成',
        description: `完成 ${results.length} 项关键检查`,
        duration: 3
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '快速检查失败';
      notification.error({
        message: '快速检查失败',
        description: errorMessage
      });
      
      warn(LogCategory.DIAGNOSTIC, 'AdbDashboard', '快速检查失败', { error: errorMessage });
    }
  };

  // 自动修复
  const handleAutoFix = async () => {
    info(LogCategory.USER_ACTION, 'AdbDashboard', '用户启动自动修复');

    try {
      const fixResults = await enhancedAdbDiagnosticService.autoFixIssues(diagnosticResults);
      const successCount = fixResults.filter(r => r.success).length;
      
      if (successCount > 0) {
        notification.success({
          message: '自动修复完成',
          description: `成功修复 ${successCount} 个问题`,
          duration: 4
        });
        
        // 重新运行快速检查验证修复结果
        setTimeout(() => {
          handleQuickCheck();
        }, 1000);
      } else {
        notification.warning({
          message: '自动修复完成',
          description: '未能修复任何问题，可能需要手动处理',
          duration: 6
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '自动修复失败';
      notification.error({
        message: '自动修复失败',
        description: errorMessage
      });
      
      error(LogCategory.DIAGNOSTIC, 'AdbDashboard', '自动修复失败', { error: errorMessage });
    }
  };

  // 导出报告
  const handleExportReport = async () => {
    info(LogCategory.USER_ACTION, 'AdbDashboard', '用户导出诊断报告');

    try {
      // 这里将集成日志导出功能
      notification.info({
        message: '导出功能',
        description: '报告导出功能即将实现...',
        duration: 3
      });
    } catch (exportError) {
      const errorMessage = exportError instanceof Error ? exportError.message : '导出过程出现错误';
      notification.error({
        message: '导出失败',
        description: errorMessage
      });
      warn(LogCategory.USER_ACTION, 'AdbDashboard', '报告导出失败', { error: errorMessage });
    }
  };

  return (
    <div className={className} style={{ padding: '24px', height: '100vh', overflow: 'auto' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          <MobileOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          ADB 诊断中心
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: '16px' }}>
          专业的 Android 设备调试环境诊断与管理平台
        </Paragraph>
      </div>

      {/* 系统状态概览 */}
      <div style={{ marginBottom: 24 }}>
        <SystemOverview 
          diagnosticResults={diagnosticResults}
          isRunning={isRunning}
        />
      </div>

      {/* 诊断进度 */}
      {isRunning && (
        <Card style={{ marginBottom: 24 }}>
          <Title level={4}>诊断进度</Title>
          <Progress 
            percent={Math.round(progress)} 
            status={progress === 100 ? 'success' : 'active'}
            strokeColor={{
              from: '#108ee9',
              to: '#87d068',
            }}
          />
          {currentStep && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              当前步骤: {currentStep}
            </Text>
          )}
        </Card>
      )}

      {/* 主要内容区域 */}
      <Row gutter={24}>
        <Col span={16}>
          <DiagnosticResults 
            results={diagnosticResults}
            onAutoFix={handleAutoFix}
          />
        </Col>
        <Col span={8}>
          <ActionPanel
            isRunning={isRunning}
            onStartDiagnostic={handleStartDiagnostic}
            onQuickCheck={handleQuickCheck}
            onExportReport={handleExportReport}
          />
        </Col>
      </Row>
    </div>
  );
};