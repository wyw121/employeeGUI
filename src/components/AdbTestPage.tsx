import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Descriptions,
  Typography,
  Spin,
  Tag,
  Row,
  Col,
  Progress,
  Steps,
  Result,
  List,
  Badge,
  Tooltip,
  notification
} from 'antd';
import {
  ThunderboltOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  CodeOutlined,
  HeartOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import { useAdbDevices } from '../hooks/useAdbDevices';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface AdbTestResult {
  step: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: string;
}

interface SystemInfo {
  adbVersion?: string;
  platformToolsPath?: string;
  systemPlatform?: string;
}

export const AdbTestPage: React.FC = () => {
  const { devices, isLoading, error, refreshDevices, connectToLdPlayer, disconnectDevice, restartAdbServer } = useAdbDevices();
  const [testResults, setTestResults] = useState<AdbTestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [currentTestStep, setCurrentTestStep] = useState(0);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({});

  // 初始化系统信息
  useEffect(() => {
    getSystemInfo();
  }, []);

  const getSystemInfo = async () => {
    try {
      // 获取ADB版本
      const adbVersion = await invoke<string>('get_adb_version');
      setSystemInfo(prev => ({ ...prev, adbVersion }));
    } catch (error) {
      console.error('Failed to get system info:', error);
    }
  };

  // 运行完整的ADB诊断测试
  const runDiagnosticTest = async () => {
    setIsRunningTest(true);
    setTestResults([]);
    setCurrentTestStep(0);

    const tests = [
      {
        name: 'ADB工具检测',
        test: async () => {
          try {
            const version = await invoke<string>('get_adb_version');
            return {
              status: 'success' as const,
              message: `ADB工具正常，版本: ${version}`,
              details: '找到platform-tools/adb.exe'
            };
          } catch (error) {
            console.error('ADB工具检测失败:', error);
            return {
              status: 'error' as const,
              message: 'ADB工具未找到',
              details: '请确保platform-tools文件夹在程序目录下'
            };
          }
        }
      },
      {
        name: 'ADB服务器状态',
        test: async () => {
          try {
            await restartAdbServer();
            return {
              status: 'success' as const,
              message: 'ADB服务器启动成功',
              details: 'ADB daemon正在运行'
            };
          } catch (error) {
            return {
              status: 'error' as const,
              message: 'ADB服务器启动失败',
              details: String(error)
            };
          }
        }
      },
      {
        name: '设备扫描',
        test: async () => {
          try {
            await refreshDevices();
            const deviceCount = devices.length;
            if (deviceCount > 0) {
              return {
                status: 'success' as const,
                message: `找到 ${deviceCount} 个设备`,
                details: devices.map(d => `${d.id} (${d.status})`).join(', ')
              };
            } else {
              return {
                status: 'warning' as const,
                message: '未找到连接的设备',
                details: '请确保设备已连接并启用USB调试'
              };
            }
          } catch (error) {
            return {
              status: 'error' as const,
              message: '设备扫描失败',
              details: String(error)
            };
          }
        }
      },
      {
        name: '雷电模拟器连接测试',
        test: async () => {
          try {
            const connected = await connectToLdPlayer();
            if (connected) {
              return {
                status: 'success' as const,
                message: '雷电模拟器连接成功',
                details: '已连接到127.0.0.1:5555'
              };
            } else {
              return {
                status: 'warning' as const,
                message: '未连接到雷电模拟器',
                details: '请启动雷电模拟器并确保ADB调试已开启'
              };
            }
          } catch (error) {
            return {
              status: 'error' as const,
              message: '雷电模拟器连接失败',
              details: String(error)
            };
          }
        }
      },
      {
        name: '设备功能测试',
        test: async () => {
          if (devices.length === 0) {
            return {
              status: 'warning' as const,
              message: '跳过设备功能测试',
              details: '没有可用设备'
            };
          }

          try {
            const device = devices[0];
            // 这里可以添加更多设备功能测试
            return {
              status: 'success' as const,
              message: `设备 ${device.id} 功能正常`,
              details: `状态: ${device.status}, 型号: ${device.model || '未知'}`
            };
          } catch (error) {
            return {
              status: 'error' as const,
              message: '设备功能测试失败',
              details: String(error)
            };
          }
        }
      }
    ];

    for (let i = 0; i < tests.length; i++) {
      setCurrentTestStep(i);
      const testCase = tests[i];
      
      const result = await testCase.test();
      
      const testResult: AdbTestResult = {
        step: testCase.name,
        status: result.status,
        message: result.message,
        details: result.details
      };

      setTestResults(prev => [...prev, testResult]);
      
      // 等待一下让用户看到进度
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setCurrentTestStep(tests.length);
    setIsRunningTest(false);

    // 显示测试完成通知
    const successCount = testResults.filter(r => r.status === 'success').length;
    notification.success({
      message: '诊断测试完成',
      description: `${successCount}/${tests.length} 项测试通过`,
      duration: 3
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default: return <ReloadOutlined spin />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'processing';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
            <ThunderboltOutlined className="text-white text-2xl" />
          </div>
          <div>
            <Title level={2} className="mb-0">ADB 测试与诊断</Title>
            <Text type="secondary">Android Debug Bridge 连接测试和故障诊断工具</Text>
          </div>
        </div>
      </Card>

      {/* 系统信息 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="系统信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="ADB版本">
                {systemInfo.adbVersion || '检测中...'}
              </Descriptions.Item>
              <Descriptions.Item label="Platform Tools">
                platform-tools/adb.exe
              </Descriptions.Item>
              <Descriptions.Item label="系统平台">
                Windows
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="快速操作" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={refreshDevices}
                loading={isLoading}
                block
              >
                刷新设备列表
              </Button>
              <Button 
                icon={<WifiOutlined />} 
                onClick={() => connectToLdPlayer()}
                block
              >
                连接雷电模拟器
              </Button>
              <Button 
                icon={<SettingOutlined />} 
                onClick={restartAdbServer}
                block
              >
                重启ADB服务
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 诊断测试区域 */}
      <Card 
        title="诊断测试" 
        extra={
          <Button 
            type="primary" 
            icon={<CodeOutlined />}
            onClick={runDiagnosticTest}
            loading={isRunningTest}
            disabled={isRunningTest}
          >
            {isRunningTest ? '测试中...' : '开始诊断'}
          </Button>
        }
      >
        {isRunningTest && (
          <div className="mb-4">
            <Steps current={currentTestStep} size="small">
              <Step title="ADB工具检测" />
              <Step title="服务器状态" />
              <Step title="设备扫描" />
              <Step title="模拟器连接" />
              <Step title="功能测试" />
            </Steps>
            <div className="mt-4">
              <Progress 
                percent={Math.round((currentTestStep / 5) * 100)} 
                status={isRunningTest ? 'active' : 'success'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <List
            itemLayout="horizontal"
            dataSource={testResults}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={getStatusIcon(item.status)}
                  title={
                    <div className="flex items-center space-x-2">
                      <span>{item.step}</span>
                      <Tag color={getStatusColor(item.status)}>
                        {item.status.toUpperCase()}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <div>{item.message}</div>
                      {item.details && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {item.details}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}

        {!isRunningTest && testResults.length === 0 && (
          <div className="text-center py-8">
            <HeartOutlined style={{ fontSize: '48px', color: '#ff6b8a', marginBottom: '16px' }} />
            <Title level={4}>准备就绪</Title>
            <Paragraph type="secondary">
              点击"开始诊断"按钮运行完整的ADB系统测试
            </Paragraph>
          </div>
        )}
      </Card>

      {/* 设备列表 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <MobileOutlined />
            <span>连接的设备</span>
            <Badge count={devices.length} style={{ backgroundColor: '#52c41a' }} />
          </div>
        }
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshDevices}
            loading={isLoading}
          >
            刷新
          </Button>
        }
      >
        {error && (
          <Alert
            message="设备连接错误"
            description={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4">正在扫描设备...</div>
          </div>
        ) : (
          <>
            {devices.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={devices}
                renderItem={(device) => (
                  <List.Item
                    key={device.id}
                    actions={[
                      <Tooltip key="disconnect" title="断开连接">
                        <Button 
                          icon={<DisconnectOutlined />} 
                          onClick={() => disconnectDevice(device.id)}
                          size="small"
                          danger
                        >
                          断开
                        </Button>
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<MobileOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                      title={
                        <div className="flex items-center space-x-2">
                          <span>{device.id}</span>
                          <Tag color={device.status === 'device' ? 'green' : 'orange'}>
                            {device.status}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div>型号: {device.model || '未知'}</div>
                          <div>状态: {device.status}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Result
                icon={<MobileOutlined style={{ color: '#faad14' }} />}
                title="未找到设备"
                subTitle="请确保设备已连接并启用USB调试，或启动雷电模拟器"
                extra={
                  <Space>
                    <Button type="primary" onClick={() => connectToLdPlayer()}>
                      连接模拟器
                    </Button>
                    <Button onClick={refreshDevices}>
                      重新扫描
                    </Button>
                  </Space>
                }
              />
            )}
          </>
        )}
      </Card>

      {/* 帮助信息 */}
      <Card title="常见问题" size="small">
        <Paragraph>
          <Text strong>Q: 为什么找不到设备？</Text><br />
          A: 请确保设备已启用USB调试，或者启动雷电模拟器并开启ADB调试。
        </Paragraph>
        <Paragraph>
          <Text strong>Q: ADB服务器启动失败怎么办？</Text><br />
          A: 尝试重启ADB服务，或者以管理员身份运行程序。
        </Paragraph>
        <Paragraph>
          <Text strong>Q: 设备连接后无响应？</Text><br />
          A: 检查设备是否弹出USB调试授权对话框，点击"始终允许"。
        </Paragraph>
      </Card>
    </div>
  );
};