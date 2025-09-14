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
import { useLogManager } from '../../hooks/useLogManager';
import {
  enhancedAdbDiagnosticService,
  DiagnosticResult,
  DiagnosticStatus,
  DiagnosticProgress
} from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';

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

  // 渲染详细信息
  const renderResultDetails = (result: DiagnosticResult) => {
    if (!result.details) return null;

    const details = result.details;
    
    return (
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '8px 12px', 
        borderRadius: '4px',
        marginTop: '8px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {/* 显示命令执行回显 */}
        {details.commandsExecuted && details.commandResults && (
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>💻 命令执行详情:</Text>
            <div style={{ 
              backgroundColor: '#1e1e1e', 
              color: '#d4d4d4', 
              padding: '8px', 
              borderRadius: '4px', 
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '11px',
              marginTop: '4px',
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #ddd'
            }}>
              {Array.isArray(details.commandResults) ? 
                details.commandResults.map((result: string, index: number) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#569cd6', marginBottom: '2px' }}>
                      $ {details.commandsExecuted[index] || 'command'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#d4d4d4' }}>
                      {result}
                    </div>
                    {index < details.commandResults.length - 1 && (
                      <div style={{ borderBottom: '1px solid #333', margin: '4px 0' }}></div>
                    )}
                  </div>
                )) : 
                <div style={{ whiteSpace: 'pre-wrap' }}>{details.fullOutput || details.commandResults}</div>
              }
            </div>
          </div>
        )}
        
        {/* ADB工具详细信息 */}
        {details.version && (
          <div>
            <Text strong>ADB版本: </Text>
            <Text code>{details.version}</Text>
          </div>
        )}
        
        {/* 显示完整版本输出 */}
        {details.fullVersionOutput && details.fullVersionOutput !== details.version && (
          <div style={{ marginTop: '4px' }}>
            <Text strong>详细版本: </Text>
            <div style={{ 
              backgroundColor: '#f0f0f0', 
              padding: '4px 8px', 
              borderRadius: '3px', 
              fontFamily: 'monospace',
              fontSize: '11px',
              marginTop: '2px',
              border: '1px solid #e8e8e8'
            }}>
              {details.fullVersionOutput}
            </div>
          </div>
        )}
        
        {details.path && (
          <div>
            <Text strong>工具位置: </Text>
            <Text code>{details.path}</Text>
          </div>
        )}
        {details.location && (
          <div>
            <Text type="secondary">{details.location}</Text>
          </div>
        )}
        
        {/* 设备列表 */}
        {details.devices && Array.isArray(details.devices) && (
          <div>
            <Text strong>发现设备: </Text>
            {details.devices.map((device: any, index: number) => (
              <div key={`device-${index}`} style={{ marginLeft: '16px' }}>
                <Text code>{device.id}</Text> - <Text>{device.status}</Text>
                {device.model && <Text type="secondary"> ({device.model})</Text>}
                {device.properties && (
                  <div style={{ marginLeft: '16px', fontSize: '11px', color: '#666' }}>
                    {device.properties.androidVersion && 
                      <div>📱 Android: {device.properties.androidVersion}</div>}
                    {device.properties.manufacturer && 
                      <div>🏭 制造商: {device.properties.manufacturer}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 错误排查信息 */}
        {details.expectedPath && (
          <div>
            <Text strong>预期路径: </Text>
            <Text code>{details.expectedPath}</Text>
          </div>
        )}
        {details.troubleshooting && (
          <div style={{ marginTop: '4px' }}>
            <Text type="warning">{details.troubleshooting}</Text>
          </div>
        )}
        
        {/* 错误详情 */}
        {details.error && (
          <div style={{ marginTop: '4px' }}>
            <Text strong>错误信息: </Text>
            <Text type="danger">{details.error}</Text>
          </div>
        )}
      </div>
    );
  };

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
                    {/* 详细信息展示 */}
                    {renderResultDetails(result)}
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
  const { addLogEntry } = useLogManager();

  // ADB服务器操作
  const handleRestartAdbServer = async () => {
    try {
      const { AdbService } = await import('../../services/adbService');
      const adbService = AdbService.getInstance();
      await adbService.restartServer();
      
      notification.success({
        message: 'ADB服务器已重启',
        description: 'ADB服务器重启成功，请重新连接设备'
      });
      
      await addLogEntry('INFO', 'USER_ACTION', 'ActionPanel', '用户手动重启ADB服务器');
    } catch (error) {
      notification.error({
        message: 'ADB服务器重启失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 查看ADB版本
  const handleCheckAdbVersion = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const version = await invoke<string>('get_adb_version');
      const adbPath = await invoke<string>('get_adb_path').catch(() => 'platform-tools/adb.exe');
      
      notification.info({
        message: 'ADB工具信息',
        description: (
          <div>
            <div>版本: {version}</div>
            <div>位置: {adbPath}</div>
          </div>
        ),
        duration: 8
      });
      
      await addLogEntry('INFO', 'USER_ACTION', 'ActionPanel', '用户查看ADB版本信息', JSON.stringify({ version, path: adbPath }));
    } catch (error) {
      console.error('获取ADB信息失败:', error);
      notification.error({
        message: '获取ADB信息失败',
        description: 'ADB工具可能未正确安装或配置'
      });
    }
  };

  // 端口连接测试
  const handleTestPortConnection = async () => {
    try {
      const { AdbService } = await import('../../services/adbService');
      const adbService = AdbService.getInstance();
      
      // 测试常见模拟器端口
      const ports = [5555, 5554, 21503];
      const results: string[] = [];
      
      for (const port of ports) {
        try {
          const connected = await adbService.connectToLdPlayer(port);
          results.push(`127.0.0.1:${port}: ${connected ? '✅ 连接成功' : '❌ 连接失败'}`);
        } catch {
          results.push(`127.0.0.1:${port}: ❌ 连接异常`);
        }
      }
      
      notification.info({
        message: '端口连接测试结果',
        description: (
          <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {results.map((result, index) => (
              <div key={`port-test-${index}`}>{result}</div>
            ))}
          </div>
        ),
        duration: 10
      });
      
      await addLogEntry('INFO', 'USER_ACTION', 'ActionPanel', '用户执行端口连接测试', JSON.stringify({ results }));
    } catch (error) {
      notification.error({
        message: '端口测试失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 设备列表刷新
  const handleRefreshDevices = async () => {
    try {
      const { AdbService } = await import('../../services/adbService');
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      notification.info({
        message: '设备扫描结果',
        description: devices.length > 0 
          ? `发现 ${devices.length} 个设备: ${devices.map(d => d.id).join(', ')}`
          : '未发现连接的设备',
        duration: 6
      });
      
      await addLogEntry('INFO', 'USER_ACTION', 'ActionPanel', '用户手动刷新设备列表', JSON.stringify({
        deviceCount: devices.length,
        devices: devices.map(d => ({ id: d.id, status: d.status }))
      }));
    } catch (error) {
      notification.error({
        message: '设备扫描失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  return (
    <Card title="操作面板">
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 主要诊断操作 */}
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

        {/* ADB工具测试 */}
        <div>
          <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
            ADB工具测试
          </Typography.Text>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Button
                icon={<BugOutlined />}
                onClick={handleCheckAdbVersion}
                disabled={isRunning}
                size="small"
                block
              >
                查看版本信息
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRestartAdbServer}
                disabled={isRunning}
                size="small"
                block
              >
                重启ADB服务
              </Button>
            </Col>
          </Row>
        </div>

        {/* 连接测试 */}
        <div>
          <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
            连接测试
          </Typography.Text>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Button
                icon={<MobileOutlined />}
                onClick={handleRefreshDevices}
                disabled={isRunning}
                size="small"
                block
              >
                扫描设备
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<SafetyCertificateOutlined />}
                onClick={handleTestPortConnection}
                disabled={isRunning}
                size="small"
                block
              >
                测试端口连接
              </Button>
            </Col>
          </Row>
        </div>

        {/* 报告和设置 */}
        <div>
          <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
            报告和设置
          </Typography.Text>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Button
                icon={<ExportOutlined />}
                onClick={onExportReport}
                size="small"
                block
              >
                导出报告
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<SettingOutlined />}
                size="small"
                block
              >
                高级设置
              </Button>
            </Col>
          </Row>
        </div>
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
  
  const { addLogEntry } = useLogManager();

  // 初始化时获取上次诊断结果
  useEffect(() => {
    const lastResults = enhancedAdbDiagnosticService.getLastDiagnosticResults();
    setDiagnosticResults(lastResults);
    
    addLogEntry('INFO', 'USER_ACTION', 'AdbDashboard', 'ADB 诊断仪表板已加载');
  }, [addLogEntry]);

  // 开始完整诊断
  const handleStartDiagnostic = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('');
    setDiagnosticResults([]);

    await addLogEntry('INFO', 'USER_ACTION', 'AdbDashboard', '用户启动完整诊断');

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

      await addLogEntry('INFO', 'DIAGNOSTIC', 'AdbDashboard', '完整诊断完成', JSON.stringify({
        totalChecks: results.length,
        errors: errorCount,
        warnings: warningCount
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '诊断过程出现未知错误';
      
      notification.error({
        message: '诊断失败',
        description: errorMessage,
        duration: 8
      });

      await addLogEntry('WARN', 'DIAGNOSTIC', 'AdbDashboard', '诊断过程失败', errorMessage);
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  // 快速检查
  const handleQuickCheck = async () => {
    await addLogEntry('INFO', 'USER_ACTION', 'AdbDashboard', '用户启动快速检查');

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
      
      await addLogEntry('WARN', 'DIAGNOSTIC', 'AdbDashboard', '快速检查失败', errorMessage);
    }
  };

  // 自动修复
  const handleAutoFix = async () => {
    await addLogEntry('INFO', 'USER_ACTION', 'AdbDashboard', '用户启动自动修复');

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
      
      await addLogEntry('ERROR', 'DIAGNOSTIC', 'AdbDashboard', '自动修复失败', errorMessage);
    }
  };

  // 导出报告
  const handleExportReport = async () => {
    await addLogEntry('INFO', 'USER_ACTION', 'AdbDashboard', '用户导出诊断报告');

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
      await addLogEntry('WARN', 'USER_ACTION', 'AdbDashboard', '报告导出失败', errorMessage);
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