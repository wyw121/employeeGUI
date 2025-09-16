/**
 * 现代化ADB诊断仪表板
 * 基于最佳实践的仪表板式布局设计
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Statistic,
  List,
  Avatar,
  Space,
  Badge,
  Collapse,
  Typography,
  Progress,
  Alert,
  Tag,
  Tooltip
} from 'antd';
import {
  ReloadOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  ClearOutlined,
  BugOutlined,
  MonitorOutlined
} from '@ant-design/icons';
import { useAdbDiagnostic } from '../../hooks/useAdbDiagnostic';
import { useDeviceMonitor } from '../../hooks/useDeviceMonitor';
import { useLogManager } from '../../hooks/useLogManager';
import { DiagnosticStatus } from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ModernAdbDashboardProps {
  className?: string;
}

/**
 * 状态概览组件 - 顶部状态条
 */
const StatusOverview: React.FC<{
  systemStatus: 'normal' | 'warning' | 'error';
  deviceCount: number;
  adbServerStatus: 'running' | 'stopped' | 'unknown';
  lastDiagnosticTime?: Date;
  onRefresh: () => void;
}> = ({ systemStatus, deviceCount, adbServerStatus, lastDiagnosticTime, onRefresh }) => {
  
  const getStatusConfig = () => {
    switch (systemStatus) {
      case 'normal':
        return { 
          text: '正常', 
          color: '#52c41a', 
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
        };
      case 'warning':
        return { 
          text: '警告', 
          color: '#faad14', 
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} /> 
        };
      case 'error':
        return { 
          text: '异常', 
          color: '#ff4d4f', 
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 
        };
      default:
        return { 
          text: '未知', 
          color: '#d9d9d9', 
          icon: <ReloadOutlined style={{ color: '#d9d9d9' }} /> 
        };
    }
  };

  const statusConfig = getStatusConfig();
  
  const getAdbServerStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '已停止';
      default: return '未知';
    }
  };

  return (
    <Card className="status-overview-card" style={{ marginBottom: 24 }}>
      <Row gutter={16} align="middle">
        <Col span={4}>
          <Statistic
            title="系统状态"
            value={statusConfig.text}
            prefix={statusConfig.icon}
            valueStyle={{ color: statusConfig.color, fontSize: '18px', fontWeight: 'bold' }}
          />
        </Col>
        <Col span={3}>
          <Statistic
            title="连接设备"
            value={deviceCount}
            suffix="台"
            prefix={<MobileOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: deviceCount > 0 ? '#52c41a' : '#ff4d4f' }}
          />
        </Col>
        <Col span={3}>
          <Statistic
            title="ADB服务"
            value={getAdbServerStatusText(adbServerStatus)}
            prefix={<MonitorOutlined style={{ color: adbServerStatus === 'running' ? '#52c41a' : '#ff4d4f' }} />}
            valueStyle={{ color: adbServerStatus === 'running' ? '#52c41a' : '#ff4d4f' }}
          />
        </Col>
        <Col span={5}>
          <Statistic
            title="最近诊断"
            value={lastDiagnosticTime ? `${Math.floor((Date.now() - lastDiagnosticTime.getTime()) / 60000)}分钟前` : '未执行'}
            prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
          />
        </Col>
        <Col span={4}>
          <Button 
            type="primary" 
            size="large" 
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            style={{ width: '100%' }}
          >
            刷新状态
          </Button>
        </Col>
        <Col span={5}>
          <Space>
            <Button icon={<DownloadOutlined />} size="large">
              导出报告
            </Button>
            <Button icon={<SettingOutlined />} size="large">
              设置
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

/**
 * 主操作区组件
 */
const ActionZone: React.FC<{
  isRunning: boolean;
  onStartDiagnostic: () => void;
  onQuickCheck: () => void;
}> = ({ isRunning, onStartDiagnostic, onQuickCheck }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={12}>
        <Card 
          className="action-card" 
          hoverable
          style={{ 
            minHeight: 120,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none'
          }}
        >
          <Row align="middle" style={{ height: 88 }}>
            <Col span={4}>
              <div style={{ fontSize: 32, textAlign: 'center' }}>🔍</div>
            </Col>
            <Col span={14}>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                完整系统诊断
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0' }}>
                检查ADB工具、服务器、设备连接状态
              </Paragraph>
            </Col>
            <Col span={6}>
              <Button 
                type="primary" 
                size="large"
                loading={isRunning}
                onClick={onStartDiagnostic}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white'
                }}
                block
              >
                {isRunning ? '诊断中...' : '开始诊断'}
              </Button>
            </Col>
          </Row>
        </Card>
      </Col>
      <Col span={12}>
        <Card 
          className="action-card" 
          hoverable
          style={{ 
            minHeight: 120,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none'
          }}
        >
          <Row align="middle" style={{ height: 88 }}>
            <Col span={4}>
              <div style={{ fontSize: 32, textAlign: 'center' }}>⚡</div>
            </Col>
            <Col span={14}>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                快速健康检查
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0' }}>
                基础连接验证和设备扫描
              </Paragraph>
            </Col>
            <Col span={6}>
              <Button 
                size="large"
                disabled={isRunning}
                onClick={onQuickCheck}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white'
                }}
                block
              >
                快速检查
              </Button>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

/**
 * 实时信息区组件
 */
const LiveInfoZone: React.FC<{
  devices: any[];
  terminalOutput: Array<{ command: string; output: string; timestamp: Date }>;
  onRefreshDevices: () => void;
  onClearTerminal: () => void;
}> = ({ devices, terminalOutput, onRefreshDevices, onClearTerminal }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {/* 设备管理面板 */}
      <Col span={10}>
        <Card 
          title={
            <Space>
              <MobileOutlined style={{ color: '#1890ff' }} />
              <span>设备管理</span>
              <Badge count={devices.length} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          }
          extra={
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={onRefreshDevices}
            >
              刷新
            </Button>
          }
          style={{ height: 400 }}
        >
          {devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              <MobileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <div>暂无连接的设备</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                请启动模拟器或连接Android设备
              </div>
            </div>
          ) : (
            <List
              dataSource={devices}
              renderItem={(device, index) => (
                <List.Item
                  actions={[
                    <Tooltip key="detail" title="查看详情">
                      <Button size="small" type="text" icon={<BugOutlined />} />
                    </Tooltip>,
                    <Tooltip key="action" title="设备操作">
                      <Button size="small" type="text" icon={<SettingOutlined />} />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={device.type === 'emulator' ? <MonitorOutlined /> : <MobileOutlined />}
                        style={{ 
                          backgroundColor: device.status === 'device' ? '#52c41a' : '#ff4d4f' 
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Text strong>{device.id}</Text>
                        <Tag 
                          color={device.status === 'device' ? 'green' : 'red'}
                          style={{ margin: 0 }}
                        >
                          {device.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{device.model || 'Unknown Model'}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {device.type} • 最后连接: {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : '未知'}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      {/* 命令执行终端 */}
      <Col span={14}>
        <Card
          title={
            <Space>
              <BugOutlined style={{ color: '#52c41a' }} />
              <span>命令执行终端</span>
              <Badge count={terminalOutput.length} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          }
          extra={
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={onClearTerminal}
            >
              清空
            </Button>
          }
          style={{ height: 400 }}
        >
          <div 
            className="terminal"
            style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '12px',
              height: 320,
              overflow: 'auto',
              border: '1px solid #333'
            }}
          >
            {terminalOutput.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', marginTop: '100px' }}>
                <BugOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>终端就绪，等待命令执行...</div>
              </div>
            ) : (
              terminalOutput.map((line, index) => (
                <div key={`terminal-${index}-${line.timestamp.getTime()}`} className="terminal-line" style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#569cd6', marginBottom: '2px' }}>
                    <span style={{ color: '#4ec9b0' }}>$ </span>
                    <span>{line.command}</span>
                    <span style={{ color: '#666', fontSize: '10px', marginLeft: '12px' }}>
                      {line.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', marginLeft: '12px', color: '#d4d4d4' }}>
                    {line.output}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );
};

/**
 * 现代化ADB诊断仪表板主组件
 */
export const ModernAdbDashboard: React.FC<ModernAdbDashboardProps> = ({ className }) => {
  const { 
    isRunning, 
    diagnosticResults, 
    progress,
    runFullDiagnostic, 
    runQuickCheck,
    autoFixIssues 
  } = useAdbDiagnostic();
  const { devices, refreshDevices } = useDeviceMonitor();
  const { adbCommandLogs, clearLogs } = useLogManager();

  const [systemStatus, setSystemStatus] = useState<'normal' | 'warning' | 'error'>('normal');
  const [adbServerStatus, setAdbServerStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [lastDiagnosticTime, setLastDiagnosticTime] = useState<Date>();

  // 将ADB命令日志转换为终端输出格式
  const terminalOutput = adbCommandLogs.map(cmd => ({
    command: `adb ${cmd.args.join(' ')}`,
    output: cmd.output || cmd.error || '',
    timestamp: new Date(cmd.timestamp)
  }));

  // 监听诊断结果更新系统状态
  useEffect(() => {
    if (diagnosticResults.length > 0) {
      const hasError = diagnosticResults.some(r => r.status === DiagnosticStatus.ERROR);
      const hasWarning = diagnosticResults.some(r => r.status === DiagnosticStatus.WARNING);
      
      if (hasError) setSystemStatus('error');
      else if (hasWarning) setSystemStatus('warning');
      else setSystemStatus('normal');
      
      setLastDiagnosticTime(new Date());
    }
  }, [diagnosticResults]);

  // 处理完整诊断
  const handleFullDiagnostic = async () => {
    await runFullDiagnostic();
  };

  // 处理快速检查
  const handleQuickCheck = async () => {
    await runQuickCheck();
  };

  // 刷新状态
  const handleRefreshStatus = async () => {
    await refreshDevices();
    setAdbServerStatus('running'); // 这里可以添加真实的服务器状态检查
  };

  // 清空终端
  const handleClearTerminal = async () => {
    await clearLogs();
  };

  return (
    <div className={`modern-adb-dashboard ${className || ''}`}>
      {/* 状态概览条 */}
      <StatusOverview
        systemStatus={systemStatus}
        deviceCount={devices.length}
        adbServerStatus={adbServerStatus}
        lastDiagnosticTime={lastDiagnosticTime}
        onRefresh={handleRefreshStatus}
      />

      {/* 主操作区域 */}
      <ActionZone
        isRunning={isRunning}
        onStartDiagnostic={handleFullDiagnostic}
        onQuickCheck={handleQuickCheck}
      />

      {/* 实时信息区域 */}
      <LiveInfoZone
        devices={devices}
        terminalOutput={terminalOutput}
        onRefreshDevices={refreshDevices}
        onClearTerminal={handleClearTerminal}
      />

      {/* 诊断结果区域 */}
      {diagnosticResults.length > 0 && (
        <Card
          title={
            <Space>
              <BugOutlined style={{ color: '#1890ff' }} />
              <span>诊断结果</span>
              <Badge count={diagnosticResults.length} style={{ backgroundColor: '#52c41a' }} />
              {isRunning && <Progress size="small" percent={progress} style={{ width: 100 }} />}
            </Space>
          }
          extra={
            <Space>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => {/* 导出报告逻辑 */}}
              >
                导出报告
              </Button>
              {diagnosticResults.some(r => r.canAutoFix) && (
                <Button 
                  type="primary" 
                  icon={<BugOutlined />}
                  onClick={autoFixIssues}
                >
                  自动修复
                </Button>
              )}
            </Space>
          }
        >
          <Collapse>
            {diagnosticResults.map(result => (
              <Panel
                key={result.id}
                header={
                  <Row align="middle" style={{ width: '100%' }}>
                    <Col flex="none" style={{ marginRight: 12 }}>
                      {result.status === DiagnosticStatus.SUCCESS && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      {result.status === DiagnosticStatus.WARNING && <ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                      {result.status === DiagnosticStatus.ERROR && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    </Col>
                    <Col flex="auto">
                      <Space>
                        <Text strong>{result.name}</Text>
                        <Text type="secondary">{result.message}</Text>
                        {result.canAutoFix && <Tag color="green">可修复</Tag>}
                      </Space>
                    </Col>
                    <Col flex="none">
                      {result.duration && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {result.duration}ms
                        </Text>
                      )}
                    </Col>
                  </Row>
                }
              >
                {/* 在这里显示详细的命令回显信息 */}
                {result.details && (
                  <div>
                    {result.details.commandsExecuted && (
                      <div style={{ marginBottom: 16 }}>
                        <Text strong>执行的命令:</Text>
                        <div style={{
                          backgroundColor: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: 8,
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 11,
                          marginTop: 4
                        }}>
                          {result.details.commandsExecuted.map((cmd: string, index: number) => (
                            <div key={`cmd-${index}-${cmd.substring(0, 10)}`}>
                              <div style={{ color: '#569cd6' }}>$ {cmd}</div>
                              <div style={{ marginLeft: 12, whiteSpace: 'pre-wrap' }}>
                                {result.details.commandResults?.[index] || ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.suggestion && (
                      <Alert
                        type="info"
                        message="建议"
                        description={result.suggestion}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                )}
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}
    </div>
  );
};

export default ModernAdbDashboard;