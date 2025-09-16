import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Tag, Table, message, Row, Col } from 'antd';
import { MobileOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { XiaohongshuService } from '../services/xiaohongshuService';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

const XiaohongshuContactsTestPage: React.FC = () => {
  const { selectedDevice, isLoading } = useAdb();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (step: string, status: 'running' | 'success' | 'error', message: string, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        existing.status = status;
        existing.message = message;
        if (duration) existing.duration = duration;
        return [...prev];
      } else {
        return [...prev, { step, status, message, duration }];
      }
    });
  };

  const runContactsNavigationTest = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    const startTime = Date.now();

    try {
      // 步骤1: 初始化服务
      updateTestResult('初始化服务', 'running', '正在初始化小红书服务...');
      await XiaohongshuService.initializeService(selectedDevice.id);
      updateTestResult('初始化服务', 'success', '服务初始化成功', Date.now() - startTime);

      // 步骤2: 检查应用状态
      updateTestResult('检查应用状态', 'running', '正在检查小红书应用状态...');
      const appStatus = await XiaohongshuService.checkAppStatus();
      updateTestResult('检查应用状态', 'success', 
        `应用状态: ${appStatus.app_installed ? '已安装' : '未安装'}, ${appStatus.app_running ? '运行中' : '未运行'}`, 
        Date.now() - startTime
      );

      if (!appStatus.app_installed) {
        updateTestResult('检查应用状态', 'error', '小红书应用未安装');
        return;
      }

      // 步骤3: 导航到通讯录
      updateTestResult('导航到通讯录', 'running', '正在执行导航流程: 头像 → 侧边栏 → 发现好友 → 通讯录...');
      const navigation = await XiaohongshuService.navigateToContacts();
      
      if (navigation.success) {
        updateTestResult('导航到通讯录', 'success', 
          `导航成功! ${navigation.message}`, 
          Date.now() - startTime
        );

        // 步骤4: 准备关注测试（可选）
        updateTestResult('准备关注测试', 'running', '测试关注功能准备就绪...');
        updateTestResult('准备关注测试', 'success', 
          '✅ 已到达通讯录页面，可以开始关注流程', 
          Date.now() - startTime
        );

        message.success('🎉 通讯录导航测试成功！现在可以在通讯录页面进行关注操作。');
      } else {
        updateTestResult('导航到通讯录', 'error', `导航失败: ${navigation.message}`);
        message.error('导航失败，请检查设备状态和应用界面');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      updateTestResult('测试执行', 'error', `测试失败: ${errorMessage}`);
      message.error(`测试失败: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runAutoFollowTest = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setIsRunning(true);

    try {
      updateTestResult('执行自动关注', 'running', '在通讯录页面开始关注流程...');
      
      const followResult = await XiaohongshuService.autoFollowContacts({
        max_pages: 2,  // 限制为2页测试
        follow_interval: 3000,  // 3秒间隔，比较保守
        skip_existing: true,
        return_to_home: true
      });

      if (followResult.success) {
        updateTestResult('执行自动关注', 'success', 
          `关注完成! 总计关注: ${followResult.total_followed}人, 处理页数: ${followResult.pages_processed}页`
        );
        message.success(`🎉 关注测试成功! 关注了 ${followResult.total_followed} 人`);
      } else {
        updateTestResult('执行自动关注', 'error', `关注失败: ${followResult.message}`);
        message.error('关注失败，请检查页面状态');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      updateTestResult('执行自动关注', 'error', `关注失败: ${errorMessage}`);
      message.error(`关注失败: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testResultColumns = [
    {
      title: '步骤',
      dataIndex: 'step',
      key: 'step',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = {
          pending: { color: 'default', text: '待执行' },
          running: { color: 'processing', text: '执行中' },
          success: { color: 'success', text: '成功' },
          error: { color: 'error', text: '失败' },
        };
        const { color, text } = config[status as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration?: number) => duration ? `${duration}ms` : '-',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <MobileOutlined /> 小红书通讯录关注功能测试
      </Title>
      
      <Alert
        message="功能说明"
        description={
          <div>
            <Paragraph>
              <strong>新的关注流程</strong>：头像 → 侧边栏 → 发现好友 → <strong>通讯录</strong> → 在通讯录页面进行关注
            </Paragraph>
            <Paragraph>
              <strong>设备适配增强</strong>：支持多种屏幕分辨率和设备类型，提高不同手机型号的兼容性
            </Paragraph>
            <Paragraph type="secondary">
              测试前请确保：1) 设备已连接 2) 小红书应用已安装 3) 已登录小红书账号
            </Paragraph>
          </div>
        }
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="设备信息" extra={<MobileOutlined />}>
            {selectedDevice ? (
              <div>
                <Text strong>设备ID:</Text> <Text code>{selectedDevice.id}</Text><br />
                <Text strong>设备名称:</Text> <Text>{selectedDevice.name}</Text><br />
                <Text strong>状态:</Text> <Tag color="green">已连接</Tag>
              </div>
            ) : (
              <Alert message="请先选择设备" type="warning" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="测试控制" extra={<PlayCircleOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                onClick={runContactsNavigationTest}
                loading={isRunning}
                disabled={!selectedDevice || isLoading}
                block
                icon={<PlayCircleOutlined />}
              >
                测试导航到通讯录
              </Button>
              
              <Button
                type="default"
                onClick={runAutoFollowTest}
                loading={isRunning}
                disabled={!selectedDevice || isLoading}
                block
                icon={<CheckCircleOutlined />}
              >
                测试通讯录关注功能
              </Button>
              
              <Text type="secondary" style={{ fontSize: '12px' }}>
                建议先运行导航测试，确认能到达通讯录页面后再测试关注功能
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card 
        title="测试结果" 
        style={{ marginTop: 24 }}
        extra={testResults.length > 0 && <Text type="secondary">{testResults.length} 个步骤</Text>}
      >
        {testResults.length > 0 ? (
          <Table
            columns={testResultColumns}
            dataSource={testResults.map((result, index) => ({ ...result, key: index }))}
            size="small"
            pagination={false}
          />
        ) : (
          <Alert message="暂无测试结果" type="info" />
        )}
      </Card>

      <Card title="使用说明" style={{ marginTop: 24 }}>
        <Paragraph>
          <Title level={4}>测试步骤：</Title>
          <ol>
            <li><strong>选择设备</strong>：在设备管理页面选择已连接的Android设备</li>
            <li><strong>测试导航</strong>：点击"测试导航到通讯录"按钮，验证能否成功到达通讯录页面</li>
            <li><strong>测试关注</strong>：导航成功后，点击"测试通讯录关注功能"进行实际关注测试</li>
          </ol>
        </Paragraph>
        
        <Paragraph>
          <Title level={4}>故障排除：</Title>
          <ul>
            <li>如果导航失败，检查小红书应用是否已登录并在主界面</li>
            <li>如果点击位置不准确，可能需要调整设备适配参数</li>
            <li>如果应用响应慢，可以增加等待时间间隔</li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default XiaohongshuContactsTestPage;