/**
 * 小红书自动关注测试界面
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Select,
  Progress,
  Statistic,
  Alert,
  Divider,
  Space,
  Typography,
  Input,
  Row,
  Col,
  Timeline,
  Tag,
  Spin,
  notification
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  UserAddOutlined,
  PhoneOutlined,
  AppstoreOutlined,
  MenuOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { XiaohongshuAutoFollowScript, FollowStep, FollowStepResult, XIAOHONGSHU_UI_CONFIG } from './XiaohongshuScript';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface DeviceInfo {
  id: string;
  name: string;
  status: string;
}

interface ScriptStatus {
  isRunning: boolean;
  currentStep: FollowStep;
  followedCount: number;
  failedCount: number;
  totalSteps: number;
}

export const XiaohongshuScriptTest: React.FC = () => {
  // 设备相关状态
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [deviceLoading, setDeviceLoading] = useState(false);

  // 脚本相关状态
  const [script, setScript] = useState<XiaohongshuAutoFollowScript | null>(null);
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>({
    isRunning: false,
    currentStep: FollowStep.LAUNCH_APP,
    followedCount: 0,
    failedCount: 0,
    totalSteps: 0
  });

  // 测试配置
  const [maxFollowCount, setMaxFollowCount] = useState<number>(20);
  const [testResults, setTestResults] = useState<FollowStepResult[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // UI状态
  const [showConfig, setShowConfig] = useState(false);
  const statusInterval = useRef<NodeJS.Timeout | null>(null);

  // 加载设备列表
  const loadDevices = async () => {
    setDeviceLoading(true);
    try {
      // 这里应该调用实际的设备获取API
      const mockDevices: DeviceInfo[] = [
        { id: 'emulator-5554', name: '安卓模拟器 1', status: '在线' },
        { id: 'emulator-5556', name: '安卓模拟器 2', status: '在线' },
      ];
      setDevices(mockDevices);
      if (mockDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(mockDevices[0].id);
      }
    } catch (error) {
      notification.error({
        message: '设备加载失败',
        description: `无法获取设备列表: ${error}`
      });
    } finally {
      setDeviceLoading(false);
    }
  };

  // 初始化脚本实例
  const initializeScript = () => {
    if (selectedDevice) {
      const newScript = new XiaohongshuAutoFollowScript(selectedDevice, maxFollowCount);
      setScript(newScript);
      setTestResults([]);
      setCurrentStepIndex(0);
    }
  };

  // 开始测试
  const startTest = async () => {
    if (!script || !selectedDevice) {
      notification.warning({
        message: '测试准备不完整',
        description: '请选择设备并初始化脚本'
      });
      return;
    }

    try {
      setScriptStatus(prev => ({ ...prev, isRunning: true }));

      // 启动状态监控
      statusInterval.current = setInterval(() => {
        const status = script.getStatus();
        setScriptStatus(status);
      }, 1000);

      notification.info({
        message: '开始小红书关注测试',
        description: `目标设备: ${selectedDevice}，最大关注数: ${maxFollowCount}`
      });

      const result = await script.startFollowProcess();
      
      setTestResults(result.steps);
      setScriptStatus(prev => ({ 
        ...prev, 
        isRunning: false,
        followedCount: result.followedCount,
        failedCount: result.failedCount
      }));

      if (result.success) {
        notification.success({
          message: '关注测试完成',
          description: result.message
        });
      } else {
        notification.error({
          message: '关注测试失败',
          description: result.message
        });
      }

    } catch (error) {
      notification.error({
        message: '测试执行错误',
        description: `${error}`
      });
      setScriptStatus(prev => ({ ...prev, isRunning: false }));
    } finally {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }
    }
  };

  // 停止测试
  const stopTest = () => {
    if (script) {
      script.stop();
      setScriptStatus(prev => ({ ...prev, isRunning: false }));
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }
      notification.info({
        message: '测试已停止',
        description: '用户手动停止了关注测试'
      });
    }
  };

  // 重置测试
  const resetTest = () => {
    setTestResults([]);
    setCurrentStepIndex(0);
    setScriptStatus({
      isRunning: false,
      currentStep: FollowStep.LAUNCH_APP,
      followedCount: 0,
      failedCount: 0,
      totalSteps: 0
    });
    initializeScript();
  };

  // 获取步骤图标
  const getStepIcon = (step: FollowStep) => {
    switch (step) {
      case FollowStep.LAUNCH_APP:
        return <AppstoreOutlined style={{ color: '#1890ff' }} />;
      case FollowStep.CLICK_MENU:
        return <MenuOutlined style={{ color: '#52c41a' }} />;
      case FollowStep.CLICK_DISCOVER_FRIENDS:
        return <UserAddOutlined style={{ color: '#722ed1' }} />;
      case FollowStep.CLICK_CONTACTS:
        return <PhoneOutlined style={{ color: '#fa8c16' }} />;
      case FollowStep.FOLLOW_FRIENDS:
        return <HeartOutlined style={{ color: '#f5222d' }} />;
      default:
        return <PlayCircleOutlined />;
    }
  };

  // 获取步骤描述
  const getStepDescription = (step: FollowStep) => {
    switch (step) {
      case FollowStep.LAUNCH_APP:
        return '启动小红书应用';
      case FollowStep.CLICK_MENU:
        return '点击左上角菜单按钮';
      case FollowStep.CLICK_DISCOVER_FRIENDS:
        return '点击发现好友';
      case FollowStep.CLICK_CONTACTS:
        return '点击通讯录';
      case FollowStep.FOLLOW_FRIENDS:
        return '批量关注通讯录好友';
      case FollowStep.COMPLETED:
        return '关注流程完成';
      case FollowStep.ERROR:
        return '执行过程出错';
      default:
        return '未知步骤';
    }
  };

  // 计算进度
  const calculateProgress = () => {
    const totalSteps = 5; // 总共5个主要步骤
    const completedSteps = testResults.filter(r => r.success).length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  useEffect(() => {
    loadDevices();
    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      initializeScript();
    }
  }, [selectedDevice, maxFollowCount]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Card>
        <Title level={2}>
          <HeartOutlined style={{ color: '#f5222d', marginRight: '8px' }} />
          小红书自动关注脚本测试
        </Title>
        <Paragraph type="secondary">
          自动化测试小红书好友关注功能：打开小红书 → 点击菜单 → 发现好友 → 通讯录 → 批量关注
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* 左侧控制面板 */}
        <Col xs={24} lg={8}>
          <Card title="测试控制" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 设备选择 */}
              <div>
                <Text strong>选择设备:</Text>
                <Space style={{ width: '100%', marginTop: '8px' }}>
                  <Select
                    value={selectedDevice}
                    onChange={setSelectedDevice}
                    loading={deviceLoading}
                    style={{ flex: 1, minWidth: '200px' }}
                    placeholder="选择测试设备"
                  >
                    {devices.map(device => (
                      <Option key={device.id} value={device.id}>
                        {device.name} ({device.id})
                      </Option>
                    ))}
                  </Select>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={loadDevices}
                    loading={deviceLoading}
                  />
                </Space>
              </div>

              {/* 测试配置 */}
              <div>
                <Text strong>最大关注数量:</Text>
                <Input
                  type="number"
                  value={maxFollowCount}
                  onChange={(e) => setMaxFollowCount(Number(e.target.value))}
                  min={1}
                  max={100}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <Divider />

              {/* 控制按钮 */}
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={startTest}
                  loading={scriptStatus.isRunning}
                  disabled={!selectedDevice || !script}
                >
                  开始测试
                </Button>
                <Button
                  icon={<StopOutlined />}
                  onClick={stopTest}
                  disabled={!scriptStatus.isRunning}
                  danger
                >
                  停止测试
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={resetTest}
                  disabled={scriptStatus.isRunning}
                >
                  重置
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 统计卡片 */}
          <Card title="统计信息" size="small" style={{ marginTop: '16px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="成功关注"
                  value={scriptStatus.followedCount}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<UserAddOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="失败次数"
                  value={scriptStatus.failedCount}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
            <Divider />
            <Progress 
              percent={calculateProgress()} 
              status={scriptStatus.isRunning ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Card>
        </Col>

        {/* 右侧执行状态 */}
        <Col xs={24} lg={16}>
          <Card 
            title="执行状态" 
            size="small"
            extra={
              scriptStatus.isRunning && (
                <Tag color="processing" icon={<Spin size="small" />}>
                  执行中...
                </Tag>
              )
            }
          >
            {scriptStatus.isRunning && (
              <Alert
                message={`当前步骤: ${getStepDescription(scriptStatus.currentStep)}`}
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            <Timeline mode="left">
              {Object.values(FollowStep)
                .filter(step => step !== FollowStep.ERROR && step !== FollowStep.COMPLETED)
                .map((step, index) => {
                  const stepResult = testResults.find(r => r.step === step);
                  const isActive = scriptStatus.currentStep === step && scriptStatus.isRunning;
                  const isCompleted = !!stepResult;
                  
                  return (
                    <Timeline.Item
                      key={step}
                      dot={getStepIcon(step)}
                      color={
                        isActive ? 'blue' :
                        isCompleted ? (stepResult?.success ? 'green' : 'red') : 'gray'
                      }
                    >
                      <div>
                        <Text strong>{getStepDescription(step)}</Text>
                        {isActive && <Tag color="processing" style={{ marginLeft: '8px' }}>进行中</Tag>}
                        {stepResult && (
                          <div style={{ marginTop: '4px' }}>
                            <Text type={stepResult.success ? 'success' : 'danger'}>
                              {stepResult.message}
                            </Text>
                            {stepResult.coordinates && (
                              <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                                坐标: ({stepResult.coordinates.x}, {stepResult.coordinates.y})
                              </Text>
                            )}
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  );
                })}
            </Timeline>

            {testResults.length > 0 && !scriptStatus.isRunning && (
              <Alert
                message="测试完成"
                description={`共执行 ${testResults.length} 个步骤，成功关注 ${scriptStatus.followedCount} 个好友，失败 ${scriptStatus.failedCount} 次`}
                type={scriptStatus.followedCount > 0 ? 'success' : 'warning'}
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 配置信息卡片 */}
      <Card title="脚本配置信息" style={{ marginTop: '16px' }} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>应用包名:</Text>
            <br />
            <Text code>{XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME}</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong>点击延时:</Text>
            <br />
            <Text>{XIAOHONGSHU_UI_CONFIG.DELAYS.CLICK_DELAY}ms</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong>关注延时:</Text>
            <br />
            <Text>{XIAOHONGSHU_UI_CONFIG.DELAYS.FOLLOW_DELAY}ms</Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default XiaohongshuScriptTest;