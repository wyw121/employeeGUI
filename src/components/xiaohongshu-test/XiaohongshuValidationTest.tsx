/**
 * 小红书测试功能验证脚本
 * 
 * 这个文件用于快速验证小红书测试模块的基本功能
 * 包括设备连接、API调用、UI组件等
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Space,
  Typography,
  Divider,
  Spin,
  Tag,
  List,
  notification
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { adbManager } from './AdbManager';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const XiaohongshuValidationTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: '检查ADB管理器初始化', status: 'pending', message: '等待开始...' },
    { name: '获取设备列表', status: 'pending', message: '等待开始...' },
    { name: '检查小红书应用', status: 'pending', message: '等待开始...' },
    { name: 'UI元素识别测试', status: 'pending', message: '等待开始...' },
    { name: 'API调用验证', status: 'pending', message: '等待开始...' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);

  // 更新单个测试结果
  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => 
      prev.map((test, i) => 
        i === index ? { ...test, ...update } : test
      )
    );
  };

  // 运行单个测试
  const runTest = async (index: number): Promise<boolean> => {
    const startTime = Date.now();
    updateTest(index, { status: 'running', message: '正在执行...' });

    try {
      let success = false;
      let message = '';

      switch (index) {
        case 0: // 检查ADB管理器初始化
          try {
            const manager = adbManager;
            success = !!manager;
            message = success ? 'ADB管理器初始化成功' : 'ADB管理器初始化失败';
          } catch (error) {
            message = `初始化失败: ${error}`;
          }
          break;

        case 1: // 获取设备列表
          try {
            const devices = await adbManager.getDevices();
            success = true;
            message = `发现 ${devices.length} 个设备: ${devices.map(d => d.id).join(', ') || '无设备'}`;
          } catch (error) {
            message = `获取设备列表失败: ${error}`;
          }
          break;

        case 2: // 检查小红书应用
          try {
            const devices = await adbManager.getDevices();
            if (devices.length > 0) {
              const deviceId = devices[0].id;
              const isInstalled = await adbManager.isAppInstalled(deviceId, 'com.xingin.xhs');
              success = true;
              message = isInstalled 
                ? `设备 ${deviceId} 已安装小红书应用` 
                : `设备 ${deviceId} 未安装小红书应用`;
            } else {
              message = '无可用设备进行测试';
            }
          } catch (error) {
            message = `应用检查失败: ${error}`;
          }
          break;

        case 3: // UI元素识别测试
          try {
            const devices = await adbManager.getDevices();
            if (devices.length > 0) {
              const deviceId = devices[0].id;
              const screenSize = await adbManager.getScreenSize(deviceId);
              success = !!screenSize;
              message = success 
                ? `获取屏幕尺寸成功: ${screenSize?.width}x${screenSize?.height}`
                : '获取屏幕尺寸失败';
            } else {
              message = '无可用设备进行测试';
            }
          } catch (error) {
            message = `UI测试失败: ${error}`;
          }
          break;

        case 4: // API调用验证
          try {
            const devices = await adbManager.getDevices();
            if (devices.length > 0) {
              const deviceId = devices[0].id;
              const currentApp = await adbManager.getCurrentApp(deviceId);
              success = true;
              message = `当前运行应用: ${currentApp || '无应用运行'}`;
            } else {
              message = '无可用设备进行测试';
            }
          } catch (error) {
            message = `API调用失败: ${error}`;
          }
          break;

        default:
          message = '未知测试';
      }

      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: success ? 'success' : 'error', 
        message, 
        duration 
      });

      return success;

    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'error', 
        message: `测试异常: ${error}`, 
        duration 
      });
      return false;
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTestIndex(0);

    let successCount = 0;
    for (let i = 0; i < tests.length; i++) {
      setCurrentTestIndex(i);
      const success = await runTest(i);
      if (success) successCount++;
      
      // 测试间隔
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setCurrentTestIndex(-1);
    setIsRunning(false);

    // 显示结果通知
    if (successCount === tests.length) {
      notification.success({
        message: '所有测试通过',
        description: '小红书测试模块功能验证成功，可以开始正式测试'
      });
    } else {
      notification.warning({
        message: '部分测试失败',
        description: `${successCount}/${tests.length} 个测试通过，请检查失败的测试项目`
      });
    }
  };

  // 重置测试
  const resetTests = () => {
    setTests(prev => 
      prev.map(test => ({ 
        ...test, 
        status: 'pending' as const, 
        message: '等待开始...',
        duration: undefined
      }))
    );
    setCurrentTestIndex(-1);
  };

  // 获取状态图标
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return null;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      default:
        return null;
    }
  };

  // 获取状态标签
  const getStatusTag = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Tag>等待中</Tag>;
      case 'running':
        return <Tag color="processing">执行中</Tag>;
      case 'success':
        return <Tag color="success">成功</Tag>;
      case 'error':
        return <Tag color="error">失败</Tag>;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Card>
        <Title level={2}>小红书功能验证测试</Title>
        <Paragraph type="secondary">
          在开始正式测试前，请先运行此验证测试确保所有基础功能正常工作
        </Paragraph>

        <Alert
          message="测试说明"
          description="此测试将验证ADB连接、设备管理、应用检测等基础功能。请确保至少有一个Android设备已连接。"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Space style={{ marginBottom: '24px' }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={runAllTests}
            loading={isRunning}
            size="large"
          >
            开始验证测试
          </Button>
          <Button 
            onClick={resetTests}
            disabled={isRunning}
          >
            重置测试
          </Button>
        </Space>

        <Divider />

        <List
          dataSource={tests}
          renderItem={(test, index) => (
            <List.Item
              style={{
                backgroundColor: currentTestIndex === index ? '#f0f9ff' : undefined,
                border: currentTestIndex === index ? '1px solid #1890ff' : undefined,
                borderRadius: currentTestIndex === index ? '6px' : undefined,
                padding: '12px',
                marginBottom: '8px'
              }}
            >
              <List.Item.Meta
                avatar={getStatusIcon(test.status)}
                title={
                  <Space>
                    <Text strong>{test.name}</Text>
                    {getStatusTag(test.status)}
                    {test.duration && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ({test.duration}ms)
                      </Text>
                    )}
                  </Space>
                }
                description={
                  test.status === 'running' ? (
                    <Space>
                      <Spin size="small" />
                      <Text>{test.message}</Text>
                    </Space>
                  ) : (
                    <Text type={test.status === 'error' ? 'danger' : 'secondary'}>
                      {test.message}
                    </Text>
                  )
                }
              />
            </List.Item>
          )}
        />

        {!isRunning && tests.some(t => t.status !== 'pending') && (
          <Card title="测试结果总结" size="small" style={{ marginTop: '24px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                成功: <Text type="success">{tests.filter(t => t.status === 'success').length}</Text> / 
                失败: <Text type="danger">{tests.filter(t => t.status === 'error').length}</Text> / 
                总计: {tests.length}
              </Text>
              
              {tests.every(t => t.status === 'success') && (
                <Alert
                  message="验证通过！"
                  description="所有基础功能验证成功，现在可以进行小红书关注功能的正式测试了。"
                  type="success"
                  showIcon
                />
              )}
              
              {tests.some(t => t.status === 'error') && (
                <Alert
                  message="部分验证失败"
                  description="请检查失败的测试项目，确保设备连接正常且具有必要权限。"
                  type="warning"
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default XiaohongshuValidationTest;