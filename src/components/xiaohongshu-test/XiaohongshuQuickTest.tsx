/**
 * 小红书关注功能快速测试页面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  Progress,
  Statistic,
  Alert,
  Space,
  Typography,
  Input,
  Row,
  Col,
  Steps,
  Tag,
  Spin,
  notification,
  List,
  Divider
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  UserAddOutlined,
  HeartOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { createXiaohongshuAppManager, XiaohongshuAppManager } from './XiaohongshuAppManager';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

interface DeviceInfo {
  id: string;
  name: string;
  status: string;
}

interface TestStatus {
  isRunning: boolean;
  currentStep: number;
  followedCount: number;
  failedCount: number;
  skippedCount: number;
  steps: string[];
}

export const XiaohongshuQuickTest: React.FC = () => {
  // 设备相关状态
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [deviceLoading, setDeviceLoading] = useState(false);

  // 测试相关状态
  const [appManager, setAppManager] = useState<XiaohongshuAppManager | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    currentStep: 0,
    followedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    steps: []
  });

  // 配置参数
  const [maxFollowCount, setMaxFollowCount] = useState<number>(20);
  const [appInstalled, setAppInstalled] = useState<boolean>(false);
  const [appRunning, setAppRunning] = useState<boolean>(false);

  // 测试步骤定义
  const testSteps = [
    '启动小红书应用',
    '导航到个人中心菜单',
    '进入发现好友页面',
    '切换到通讯录选项卡',
    '执行批量关注操作'
  ];

  // 加载设备列表
  const loadDevices = async () => {
    setDeviceLoading(true);
    try {
      // 模拟设备数据，实际项目中应该调用真实的API
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

  // 检查应用状态
  const checkAppStatus = async () => {
    if (!appManager) return;

    try {
      const status = await appManager.checkAppStatus();
      setAppInstalled(status.isInstalled);
      setAppRunning(status.isRunning);

      if (!status.isInstalled) {
        notification.warning({
          message: '应用未安装',
          description: '请先安装小红书应用'
        });
      }
    } catch (error) {
      console.error('检查应用状态失败:', error);
    }
  };

  // 初始化应用管理器
  const initializeAppManager = () => {
    if (selectedDevice) {
      const manager = createXiaohongshuAppManager(selectedDevice);
      setAppManager(manager);
      setTestStatus({
        isRunning: false,
        currentStep: 0,
        followedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        steps: []
      });
    }
  };

  // 开始快速测试
  const startQuickTest = async () => {
    if (!appManager || !selectedDevice) {
      notification.warning({
        message: '测试准备不完整',
        description: '请选择设备并初始化应用管理器'
      });
      return;
    }

    setTestStatus(prev => ({ ...prev, isRunning: true, currentStep: 0, steps: [] }));

    try {
      notification.info({
        message: '开始小红书关注测试',
        description: `目标设备: ${selectedDevice}，最大关注数: ${maxFollowCount}`
      });

      const result = await appManager.executeFullFollowProcess(maxFollowCount);
      
      setTestStatus({
        isRunning: false,
        currentStep: testSteps.length,
        followedCount: result.followedCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        steps: result.steps
      });

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
      setTestStatus(prev => ({ ...prev, isRunning: false }));
    }
  };

  // 停止测试
  const stopTest = () => {
    setTestStatus(prev => ({ ...prev, isRunning: false }));
    notification.info({
      message: '测试已停止',
      description: '用户手动停止了关注测试'
    });
  };

  // 重置测试
  const resetTest = () => {
    setTestStatus({
      isRunning: false,
      currentStep: 0,
      followedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      steps: []
    });
    initializeAppManager();
  };

  // 计算进度
  const calculateProgress = () => {
    if (!testStatus.isRunning && testStatus.currentStep === 0) return 0;
    return Math.round((testStatus.currentStep / testSteps.length) * 100);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      initializeAppManager();
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (appManager) {
      checkAppStatus();
    }
  }, [appManager]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Card>
        <Title level={2}>
          <HeartOutlined style={{ color: '#f5222d', marginRight: '8px' }} />
          小红书关注功能快速测试
        </Title>
        <Paragraph type="secondary">
          一键执行完整的小红书好友关注流程，包括应用启动、页面导航和批量关注操作
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* 左侧控制面板 */}
        <Col xs={24} lg={10}>
          <Card title="测试控制台" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 设备选择 */}
              <div>
                <Text strong>测试设备:</Text>
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
                        <MobileOutlined style={{ marginRight: '8px' }} />
                        {device.name}
                      </Option>
                    ))}
                  </Select>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={loadDevices}
                    loading={deviceLoading}
                    title="刷新设备列表"
                  />
                </Space>
              </div>

              {/* 应用状态 */}
              <div>
                <Text strong>应用状态:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Space>
                    <Tag color={appInstalled ? 'success' : 'error'}>
                      {appInstalled ? '已安装' : '未安装'}
                    </Tag>
                    <Tag color={appRunning ? 'processing' : 'default'}>
                      {appRunning ? '运行中' : '未运行'}
                    </Tag>
                  </Space>
                </div>
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
                  suffix="个"
                />
              </div>

              <Divider />

              {/* 控制按钮 */}
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={startQuickTest}
                  loading={testStatus.isRunning}
                  disabled={!selectedDevice || !appManager}
                  size="large"
                >
                  开始测试
                </Button>
                <Button
                  icon={<StopOutlined />}
                  onClick={stopTest}
                  disabled={!testStatus.isRunning}
                  danger
                >
                  停止测试
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={resetTest}
                  disabled={testStatus.isRunning}
                >
                  重置
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 统计信息 */}
          <Card title="执行统计" size="small" style={{ marginTop: '16px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="成功关注"
                  value={testStatus.followedCount}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<UserAddOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="失败次数"
                  value={testStatus.failedCount}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="跳过次数"
                  value={testStatus.skippedCount}
                  valueStyle={{ color: '#d48806' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 右侧执行状态 */}
        <Col xs={24} lg={14}>
          <Card 
            title="执行进度" 
            size="small"
            extra={
              testStatus.isRunning && (
                <Tag color="processing" icon={<Spin size="small" />}>
                  执行中...
                </Tag>
              )
            }
          >
            {/* 进度条 */}
            <Progress 
              percent={calculateProgress()} 
              status={testStatus.isRunning ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              style={{ marginBottom: '16px' }}
            />

            {/* 当前状态 */}
            {testStatus.isRunning && (
              <Alert
                message={`当前步骤: ${testSteps[testStatus.currentStep] || '执行中...'}`}
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* 步骤进度 */}
            <Steps
              direction="vertical"
              size="small"
              current={testStatus.currentStep}
              items={testSteps.map((step, index) => ({
                title: step,
                status: testStatus.isRunning && index === testStatus.currentStep ? 'process' :
                       index < testStatus.currentStep ? 'finish' : 'wait',
                icon: index < testStatus.currentStep ? <CheckCircleOutlined /> :
                      testStatus.isRunning && index === testStatus.currentStep ? <Spin size="small" /> : undefined
              }))}
            />

            {/* 执行日志 */}
            {testStatus.steps.length > 0 && (
              <Card title="执行日志" size="small" style={{ marginTop: '16px' }}>
                <List
                  size="small"
                  dataSource={testStatus.steps}
                  renderItem={(item, index) => (
                    <List.Item>
                      <Text type={item.includes('失败') || item.includes('错误') ? 'danger' : 'secondary'}>
                        {index + 1}. {item}
                      </Text>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 完成状态 */}
            {!testStatus.isRunning && testStatus.currentStep > 0 && (
              <Alert
                message="测试完成"
                description={`执行了 ${testStatus.steps.length} 个步骤，成功关注 ${testStatus.followedCount} 个好友，失败 ${testStatus.failedCount} 次，跳过 ${testStatus.skippedCount} 次`}
                type={testStatus.followedCount > 0 ? 'success' : 'warning'}
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: '16px' }} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Title level={5}>测试前准备:</Title>
            <ul>
              <li>确保设备已连接并在线</li>
              <li>确保小红书应用已安装</li>
              <li>确保设备已登录小红书账号</li>
              <li>建议设置合理的关注数量(20以内)</li>
            </ul>
          </Col>
          <Col xs={24} md={12}>
            <Title level={5}>注意事项:</Title>
            <ul>
              <li>测试过程中请勿操作设备</li>
              <li>首次运行可能需要授权权限</li>
              <li>关注操作会有延时，请耐心等待</li>
              <li>如遇异常可点击停止按钮终止测试</li>
            </ul>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default XiaohongshuQuickTest;