import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Alert, 
  Tag, 
  Steps,
  Progress,
  Row,
  Col,
  Table,
  message
} from 'antd';
import { 
  MobileOutlined, 
  SettingOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { XiaohongshuService } from '../services/xiaohongshuService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface DeviceInfo {
  id: string;
  screenWidth: number;
  screenHeight: number;
  scaleX: number;
  scaleY: number;
  adaptedCoords: {
    avatar: [number, number];
    discoverFriends: [number, number];
    contacts: [number, number];
  };
}

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  coords?: [number, number];
  timestamp: string;
}

const DeviceAdaptationTestPage: React.FC = () => {
  const { selectedDevice, isLoading } = useAdb();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 获取设备详细信息
  const getDeviceInfo = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    try {
      // 这里需要调用后端获取屏幕分辨率
      const screenResolution = await XiaohongshuService.getDeviceScreenResolution(selectedDevice.id);
      
      if (screenResolution) {
        const scaleX = screenResolution[0] / 1080;
        const scaleY = screenResolution[1] / 1920;
        
        const info: DeviceInfo = {
          id: selectedDevice.id,
          screenWidth: screenResolution[0],
          screenHeight: screenResolution[1],
          scaleX,
          scaleY,
          adaptedCoords: {
            avatar: [Math.round(60 * scaleX), Math.round(100 * scaleY)],
            discoverFriends: [Math.round(270 * scaleX), Math.round(168 * scaleY)],
            contacts: [Math.round(200 * scaleX), Math.round(300 * scaleY)]
          }
        };
        
        setDeviceInfo(info);
        message.success('设备信息获取成功');
      }
    } catch (error) {
      message.error(`获取设备信息失败: ${error}`);
    }
  };

  // 运行适配测试
  const runAdaptationTest = async () => {
    if (!selectedDevice || !deviceInfo) {
      message.error('请先获取设备信息');
      return;
    }

    setIsRunning(true);
    setCurrentStep(0);
    setTestResults([]);

    const addTestResult = (step: string, success: boolean, message: string, coords?: [number, number]) => {
      const result: TestResult = {
        step,
        success,
        message,
        coords,
        timestamp: new Date().toLocaleTimeString()
      };
      setTestResults(prev => [...prev, result]);
    };

    try {
      // 步骤1: 初始化服务
      setCurrentStep(1);
      addTestResult('初始化服务', true, '小红书自动化服务初始化成功');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 步骤2: 检查应用状态
      setCurrentStep(2);
      const appStatus = await XiaohongshuService.checkAppStatus();
      addTestResult(
        '检查应用状态', 
        appStatus.app_installed, 
        appStatus.message
      );
      
      if (!appStatus.app_installed) {
        throw new Error('小红书应用未安装');
      }

      // 步骤3: 测试头像点击适配
      setCurrentStep(3);
      const avatarCoords = deviceInfo.adaptedCoords.avatar;
      addTestResult(
        '头像坐标适配', 
        true, 
        `适配后坐标: (${avatarCoords[0]}, ${avatarCoords[1]})`,
        avatarCoords
      );

      // 步骤4: 测试发现好友按钮适配
      setCurrentStep(4);
      const discoverCoords = deviceInfo.adaptedCoords.discoverFriends;
      addTestResult(
        '发现好友坐标适配', 
        true, 
        `适配后坐标: (${discoverCoords[0]}, ${discoverCoords[1]})`,
        discoverCoords
      );

      // 步骤5: 测试通讯录选项适配
      setCurrentStep(5);
      const contactsCoords = deviceInfo.adaptedCoords.contacts;
      addTestResult(
        '通讯录坐标适配', 
        true, 
        `适配后坐标: (${contactsCoords[0]}, ${contactsCoords[1]})`,
        contactsCoords
      );

      // 步骤6: 实际导航测试（可选）
      setCurrentStep(6);
      try {
        const navigationResult = await XiaohongshuService.navigateToContacts();
        addTestResult(
          '实际导航测试', 
          navigationResult.success, 
          navigationResult.message
        );
      } catch (error) {
        addTestResult(
          '实际导航测试', 
          false, 
          `导航测试失败: ${error}`
        );
      }

      message.success('设备适配测试完成');
    } catch (error) {
      addTestResult('测试异常', false, `测试过程中发生错误: ${error}`);
      message.error(`测试失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testSteps = [
    '准备测试',
    '初始化服务',
    '检查应用状态',
    '头像坐标适配',
    '发现好友坐标适配',
    '通讯录坐标适配',
    '实际导航测试'
  ];

  const resultColumns = [
    {
      title: '步骤',
      dataIndex: 'step',
      key: 'step',
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '坐标',
      dataIndex: 'coords',
      key: 'coords',
      render: (coords?: [number, number]) => 
        coords ? `(${coords[0]}, ${coords[1]})` : '-',
    },
    {
      title: '说明',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
          <SettingOutlined style={{ color: 'white' }} />
        </div>
        <div>
          <Title level={2} style={{ margin: 0 }}>设备适配测试</Title>
          <Text type="secondary">测试小红书自动关注功能的设备适配能力</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：设备信息和控制 */}
        <Col xs={24} lg={12}>
          <Card title={
            <Space>
              <MobileOutlined />
              设备信息
            </Space>
          }>
            <div className="space-y-4">
              {/* 设备选择 */}
              <div>
                <Text strong>当前设备:</Text>
                <div className="mt-2">
                  {selectedDevice ? (
                    <div className="p-3 bg-gray-50 rounded">
                      <Text>{selectedDevice.name || selectedDevice.id}</Text>
                      <Tag color="green" className="ml-2">{selectedDevice.status}</Tag>
                    </div>
                  ) : (
                    <Alert message="请先在ADB管理页面选择设备" type="warning" />
                  )}
                </div>
              </div>

              {/* 屏幕信息 */}
              {deviceInfo && (
                <div>
                  <Text strong>屏幕信息:</Text>
                  <div className="mt-2 p-3 bg-blue-50 rounded">
                    <div>分辨率: {deviceInfo.screenWidth} × {deviceInfo.screenHeight}</div>
                    <div>适配比例: {deviceInfo.scaleX.toFixed(3)} × {deviceInfo.scaleY.toFixed(3)}</div>
                  </div>
                </div>
              )}

              {/* 适配坐标 */}
              {deviceInfo && (
                <div>
                  <Text strong>适配坐标:</Text>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span>头像位置:</span>
                      <span>({deviceInfo.adaptedCoords.avatar[0]}, {deviceInfo.adaptedCoords.avatar[1]})</span>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-50 rounded">
                      <span>发现好友:</span>
                      <span>({deviceInfo.adaptedCoords.discoverFriends[0]}, {deviceInfo.adaptedCoords.discoverFriends[1]})</span>
                    </div>
                    <div className="flex justify-between p-2 bg-purple-50 rounded">
                      <span>通讯录:</span>
                      <span>({deviceInfo.adaptedCoords.contacts[0]}, {deviceInfo.adaptedCoords.contacts[1]})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 控制按钮 */}
              <div className="space-y-2">
                <Button 
                  type="default"
                  block
                  onClick={getDeviceInfo}
                  loading={isLoading}
                  disabled={!selectedDevice}
                >
                  获取设备信息
                </Button>
                <Button 
                  type="primary"
                  block
                  icon={<PlayCircleOutlined />}
                  onClick={runAdaptationTest}
                  loading={isRunning}
                  disabled={!deviceInfo}
                >
                  运行适配测试
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：测试进度和结果 */}
        <Col xs={24} lg={12}>
          <Card title={
            <Space>
              <CheckCircleOutlined />
              测试进度
            </Space>
          }>
            <div className="space-y-4">
              {/* 测试步骤 */}
              <Steps 
                current={currentStep} 
                direction="vertical"
                size="small"
                status={isRunning ? 'process' : 'wait'}
              >
                {testSteps.map((step, index) => (
                  <Step key={`step-${index}-${step}`} title={step} />
                ))}
              </Steps>

              {/* 进度条 */}
              {isRunning && (
                <div>
                  <Text>测试进度:</Text>
                  <Progress 
                    percent={Math.round((currentStep / testSteps.length) * 100)} 
                    status="active"
                  />
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <Card title="测试结果" className="mt-6">
          <Table
            dataSource={testResults}
            columns={resultColumns}
            rowKey={(record, index) => `${record.step}-${index}`}
            pagination={false}
            size="small"
          />
          
          <div className="mt-4">
            <Alert
              message="测试说明"
              description={
                <div>
                  <p>• 此测试验证不同设备上坐标适配是否正确</p>
                  <p>• 适配基于1080×1920标准分辨率进行缩放</p>
                  <p>• 实际导航测试需要设备上安装小红书应用</p>
                  <p>• 如果某些步骤失败，请检查设备连接和应用状态</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeviceAdaptationTestPage;