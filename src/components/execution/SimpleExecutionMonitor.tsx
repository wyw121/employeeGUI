import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Progress,
  Steps,
  Tag,
  Modal,
  Badge,
  Timeline,
  Drawer,
  Switch,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BugOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

// 执行状态枚举
enum ExecutionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

// 步骤状态
interface StepStatus {
  id: string;
  name: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  logs: LogEntry[];
}

// 日志条目
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stepId?: string;
  data?: any;
}

// 执行统计
interface ExecutionStats {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  averageStepTime: number;
  successRate: number;
}

// 脚本信息
interface ScriptInfo {
  id: string;
  name: string;
  description: string;
  steps: any[];
  device?: string;
}

// 工具函数
const getStatusText = (status: ExecutionStatus): string => {
  const statusMap = {
    [ExecutionStatus.IDLE]: '待执行',
    [ExecutionStatus.RUNNING]: '执行中',
    [ExecutionStatus.PAUSED]: '已暂停',
    [ExecutionStatus.COMPLETED]: '已完成',
    [ExecutionStatus.FAILED]: '执行失败',
    [ExecutionStatus.STOPPED]: '已停止'
  };
  return statusMap[status] || '未知状态';
};

const getStatusColor = (status: ExecutionStatus): string => {
  const colorMap = {
    [ExecutionStatus.RUNNING]: '#1890ff',
    [ExecutionStatus.PAUSED]: '#faad14',
    [ExecutionStatus.COMPLETED]: '#52c41a',
    [ExecutionStatus.FAILED]: '#ff4d4f',
    [ExecutionStatus.STOPPED]: '#d9d9d9'
  };
  return colorMap[status] || '#d9d9d9';
};

const getLogLevelColor = (level: LogEntry['level']): string => {
  const colorMap = {
    error: '#ff4d4f',
    warn: '#faad14',
    info: '#1890ff',
    debug: '#52c41a'
  };
  return colorMap[level] || '#d9d9d9';
};

const getStepIcon = (status: string) => {
  const iconMap = {
    error: <ExclamationCircleOutlined />,
    finish: <CheckCircleOutlined />,
    process: <ClockCircleOutlined />
  };
  return iconMap[status as keyof typeof iconMap];
};

const getProgressStatus = (executionStatus: ExecutionStatus) => {
  if (executionStatus === ExecutionStatus.FAILED) return 'exception';
  if (executionStatus === ExecutionStatus.COMPLETED) return 'success';
  return 'active';
};

const getStepsStatus = (executionStatus: ExecutionStatus) => {
  if (executionStatus === ExecutionStatus.FAILED) return 'error';
  if (executionStatus === ExecutionStatus.COMPLETED) return 'finish';
  return 'process';
};

// 执行监控组件属性
interface ScriptExecutionMonitorProps {
  script?: ScriptInfo;
  onBack?: () => void;
}

const ScriptExecutionMonitor: React.FC<ScriptExecutionMonitorProps> = ({ script, onBack }) => {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>(ExecutionStatus.IDLE);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [stats, setStats] = useState<ExecutionStats>({
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: 0,
    totalDuration: 0,
    averageStepTime: 0,
    successRate: 0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [executionId, setExecutionId] = useState<string>('');

  // 初始化步骤状态
  useEffect(() => {
    if (script?.steps) {
      const initialSteps: StepStatus[] = script.steps.map((step, index) => ({
        id: `step_${index}`,
        name: step.name || `步骤 ${index + 1}`,
        status: 'wait',
        logs: []
      }));
      setStepStatuses(initialSteps);
      setStats(prev => ({ ...prev, totalSteps: script.steps.length }));
    }
  }, [script]);

  // 添加日志
  const addLog = (level: LogEntry['level'], message: string, stepId?: string, data?: any) => {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      stepId,
      data
    };
    
    setLogs(prev => [...prev, logEntry]);
    
    // 更新步骤日志
    if (stepId) {
      setStepStatuses(prev => prev.map(step => 
        step.id === stepId 
          ? { ...step, logs: [...step.logs, logEntry] }
          : step
      ));
    }
  };

  // 开始执行
  const startExecution = async () => {
    if (!script) return;

    try {
      setExecutionStatus(ExecutionStatus.RUNNING);
      setCurrentStepIndex(0);
      
      const execId = `exec_${Date.now()}`;
      setExecutionId(execId);
      
      addLog('info', `开始执行脚本: ${script.name}`);
      addLog('info', `执行ID: ${execId}`);
      addLog('info', `总步骤数: ${script.steps.length}`);

      // 调用后端执行脚本
      const result = await invoke('execute_script_with_monitoring', {
        script: {
          id: script.id,
          name: script.name,
          steps: script.steps
        },
        executionId: execId
      });

      addLog('info', '脚本执行启动成功', undefined, result);
      
    } catch (error) {
      console.error('启动执行失败:', error);
      addLog('error', `启动执行失败: ${error}`);
      setExecutionStatus(ExecutionStatus.FAILED);
    }
  };

  // 暂停执行
  const pauseExecution = async () => {
    try {
      setExecutionStatus(ExecutionStatus.PAUSED);
      addLog('warn', '暂停脚本执行');
      
      await invoke('pause_script_execution', { executionId });
    } catch (error) {
      console.error('暂停执行失败:', error);
      addLog('error', `暂停执行失败: ${error}`);
    }
  };

  // 恢复执行
  const resumeExecution = async () => {
    try {
      setExecutionStatus(ExecutionStatus.RUNNING);
      addLog('info', '恢复脚本执行');
      
      await invoke('resume_script_execution', { executionId });
    } catch (error) {
      console.error('恢复执行失败:', error);
      addLog('error', `恢复执行失败: ${error}`);
    }
  };

  // 停止执行
  const stopExecution = async () => {
    try {
      setExecutionStatus(ExecutionStatus.STOPPED);
      addLog('warn', '停止脚本执行');
      
      await invoke('stop_script_execution', { executionId });
    } catch (error) {
      console.error('停止执行失败:', error);
      addLog('error', `停止执行失败: ${error}`);
    }
  };

  // 重新执行
  const restartExecution = () => {
    // 重置状态
    setExecutionStatus(ExecutionStatus.IDLE);
    setCurrentStepIndex(-1);
    setLogs([]);
    setStepStatuses(prev => prev.map(step => ({
      ...step,
      status: 'wait',
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      error: undefined,
      logs: []
    })));
    
    // 重新开始
    setTimeout(() => startExecution(), 100);
  };

  // 计算进度
  const getProgress = () => {
    if (stepStatuses.length === 0) return 0;
    const completed = stepStatuses.filter(s => s.status === 'finish').length;
    return Math.round((completed / stepStatuses.length) * 100);
  };

  // 导出执行报告
  const exportReport = () => {
    const report = {
      script: script?.name,
      executionId,
      status: executionStatus,
      stats,
      steps: stepStatuses,
      logs: logs,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution_report_${executionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 渲染控制按钮
  const renderControlButtons = () => {
    const commonStyle = { width: '100%' };

    if (executionStatus === ExecutionStatus.IDLE) {
      return (
        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />}
          onClick={startExecution}
          disabled={!script}
          style={commonStyle}
        >
          开始执行
        </Button>
      );
    }

    if (executionStatus === ExecutionStatus.RUNNING) {
      return (
        <Space direction="vertical" style={commonStyle}>
          <Button 
            icon={<PauseCircleOutlined />}
            onClick={pauseExecution}
            style={commonStyle}
          >
            暂停执行
          </Button>
          <Button 
            danger
            icon={<StopOutlined />}
            onClick={stopExecution}
            style={commonStyle}
          >
            停止执行
          </Button>
        </Space>
      );
    }

    if (executionStatus === ExecutionStatus.PAUSED) {
      return (
        <Space direction="vertical" style={commonStyle}>
          <Button 
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={resumeExecution}
            style={commonStyle}
          >
            继续执行
          </Button>
          <Button 
            danger
            icon={<StopOutlined />}
            onClick={stopExecution}
            style={commonStyle}
          >
            停止执行
          </Button>
        </Space>
      );
    }

    return (
      <Button 
        type="primary"
        icon={<ReloadOutlined />}
        onClick={restartExecution}
        style={commonStyle}
      >
        重新执行
      </Button>
    );
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* 头部信息 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                📊 脚本执行监控
              </Title>
              <Text type="secondary">
                {script?.name || '未选择脚本'} | 执行ID: {executionId || '未开始'}
              </Text>
            </div>
            <Space>
              <Button onClick={onBack}>返回</Button>
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setShowSettings(true)}
              >
                设置
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={exportReport}
                disabled={executionStatus === ExecutionStatus.IDLE}
              >
                导出报告
              </Button>
            </Space>
          </div>
        </Card>

        <Row gutter={16}>
          {/* 左侧控制面板 */}
          <Col span={8}>
            {/* 执行控制 */}
            <Card title="执行控制" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Badge 
                  status={executionStatus === ExecutionStatus.RUNNING ? 'processing' : 'default'}
                  text={
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: getStatusColor(executionStatus) }}>
                      {getStatusText(executionStatus)}
                    </Text>
                  }
                />
              </div>
              
              <Space direction="vertical" style={{ width: '100%' }}>
                {renderControlButtons()}
              </Space>
            </Card>

            {/* 执行统计 */}
            <Card title="执行统计" style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {stats.totalSteps}
                    </div>
                    <Text type="secondary">总步骤</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {stats.completedSteps}
                    </div>
                    <Text type="secondary">已完成</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {stats.failedSteps}
                    </div>
                    <Text type="secondary">失败</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                      {Math.round(stats.successRate)}%
                    </div>
                    <Text type="secondary">成功率</Text>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 快捷操作 */}
            <Card title="快捷操作">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  icon={<EyeOutlined />}
                  onClick={() => setShowLogs(true)}
                  block
                >
                  查看详细日志
                </Button>
                <Button 
                  icon={<BugOutlined />}
                  disabled={logs.filter(l => l.level === 'error').length === 0}
                  block
                >
                  查看错误信息
                </Button>
                <Button 
                  icon={<ThunderboltOutlined />}
                  disabled={executionStatus === ExecutionStatus.IDLE}
                  block
                >
                  性能分析
                </Button>
              </Space>
            </Card>
          </Col>

          {/* 右侧执行详情 */}
          <Col span={16}>
            {/* 整体进度 */}
            <Card title="执行进度" style={{ marginBottom: 16 }}>
              <Progress 
                percent={getProgress()} 
                status={getProgressStatus(executionStatus)}
                strokeColor={getStatusColor(executionStatus)}
              />
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Text type="secondary">
                  当前步骤: {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} / {stepStatuses.length}
                </Text>
              </div>
            </Card>

            {/* 步骤详情 */}
            <Card title="执行步骤" style={{ marginBottom: 16 }}>
              <Steps 
                direction="vertical" 
                current={currentStepIndex}
                status={getStepsStatus(executionStatus)}
              >
                {stepStatuses.map((step) => (
                  <Step
                    key={step.id}
                    title={step.name}
                    description={
                      <div>
                        {step.duration && (
                          <Text type="secondary">
                            耗时: {step.duration}ms
                          </Text>
                        )}
                        {step.error && (
                          <div style={{ color: '#ff4d4f', marginTop: 4 }}>
                            错误: {step.error}
                          </div>
                        )}
                      </div>
                    }
                    status={step.status}
                    icon={getStepIcon(step.status)}
                  />
                ))}
              </Steps>
            </Card>

            {/* 实时日志 */}
            <Card 
              title="实时日志" 
              extra={
                <Space>
                  <Switch 
                    size="small"
                    checked={autoScroll}
                    onChange={setAutoScroll}
                  />
                  <Text type="secondary">自动滚动</Text>
                </Space>
              }
            >
              <div 
                style={{ 
                  height: 300, 
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4
                }}
              >
                {logs.slice(-50).map(log => (
                  <div 
                    key={log.id}
                    style={{ 
                      marginBottom: 4,
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}
                  >
                    <Text style={{ color: '#666' }}>
                      [{log.timestamp.toLocaleTimeString()}]
                    </Text>
                    {' '}
                    <Tag 
                      color={getLogLevelColor(log.level)}
                      style={{ margin: '0 4px' }}
                    >
                      {log.level.toUpperCase()}
                    </Tag>
                    <Text>{log.message}</Text>
                  </div>
                ))}
                {logs.length === 0 && (
                  <Text type="secondary">暂无日志</Text>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 设置对话框 */}
        <Modal
          title="执行设置"
          open={showSettings}
          onCancel={() => setShowSettings(false)}
          footer={[
            <Button key="cancel" onClick={() => setShowSettings(false)}>
              取消
            </Button>,
            <Button key="save" type="primary" onClick={() => setShowSettings(false)}>
              保存设置
            </Button>
          ]}
        >
          <div>
            <Paragraph>配置脚本执行的相关设置</Paragraph>
          </div>
        </Modal>

        {/* 详细日志抽屉 */}
        <Drawer
          title="详细执行日志"
          placement="right"
          width={600}
          open={showLogs}
          onClose={() => setShowLogs(false)}
        >
          <Timeline>
            {logs.map(log => {
              const getTimelineIcon = () => {
                if (log.level === 'error' || log.level === 'warn') {
                  return <ExclamationCircleOutlined />;
                }
                return <CheckCircleOutlined />;
              };

              return (
                <Timeline.Item
                  key={log.id}
                  color={getLogLevelColor(log.level)}
                  dot={getTimelineIcon()}
                >
                  <div>
                    <Text strong>{log.message}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {log.timestamp.toLocaleString()} | {log.level.toUpperCase()}
                      {log.stepId && ` | 步骤: ${log.stepId}`}
                    </Text>
                    {log.data && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Drawer>
      </div>
    </div>
  );
};

export default ScriptExecutionMonitor;