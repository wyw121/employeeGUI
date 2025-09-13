/**
 * 小红书好友关注功能测试模块
 * 
 * 本模块用于开发和测试小红书通讯录好友关注功能
 * 完成后将集成到 ContactImportManager 中
 * 
 * 功能包括：
 * 1. 小红书应用检测和启动
 * 2. 通讯录导入到小红书
 * 3. 自动批量关注好友
 * 4. 关注进度监控和统计
 */

import React, { useState, useCallback } from 'react';
import { 
  Button, 
  Card, 
  Space, 
  Typography, 
  Alert, 
  Progress, 
  Statistic, 
  Row, 
  Col,
  Select,
  Tag,
  Table
} from 'antd';
import { 
  HeartOutlined, 
  UserAddOutlined, 
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text } = Typography;
const { Option } = Select;

interface XiaohongshuContact {
  id: string;
  name: string;
  phone: string;
  followStatus: 'pending' | 'following' | 'success' | 'failed' | 'skipped';
  followTime?: string;
  errorMessage?: string;
}

interface XiaohongshuFollowResult {
  success: boolean;
  totalContacts: number;
  followedCount: number;
  failedCount: number;
  skippedCount: number;
  message: string;
  details?: string;
}

// 导出类型
export type { XiaohongshuContact, XiaohongshuFollowResult };

interface XiaohongshuTestProps {
  // 预留props，用于与主模块集成
  deviceId?: string;
  contacts?: any[];
  onComplete?: (result: XiaohongshuFollowResult) => void;
}

const XiaohongshuFollowTest: React.FC<XiaohongshuTestProps> = ({ 
  deviceId = 'emulator-5556', 
  onComplete 
}) => {
  const [selectedDevice, setSelectedDevice] = useState(deviceId);
  const [testContacts, setTestContacts] = useState<XiaohongshuContact[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followProgress, setFollowProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('准备中');
  const [appStatus, setAppStatus] = useState<string>('未检测');
  const [followResults, setFollowResults] = useState<XiaohongshuFollowResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 添加日志
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // 检测小红书应用状态
  const checkXiaohongshuApp = useCallback(async () => {
    setAppStatus('检测中...');
    addLog('开始检测小红书应用状态');
    
    try {
      const result = await invoke<string>('check_xiaohongshu_app_status', {
        deviceId: selectedDevice
      });
      
      setAppStatus(result);
      addLog(`小红书应用状态: ${result}`);
    } catch (error) {
      const errorMsg = `检测失败: ${error}`;
      setAppStatus(errorMsg);
      addLog(errorMsg);
    }
  }, [selectedDevice, addLog]);

  // 生成测试联系人数据
  const generateTestContacts = useCallback(() => {
    const sampleContacts: XiaohongshuContact[] = [
      { id: '1', name: '张三', phone: '13800138001', followStatus: 'pending' },
      { id: '2', name: '李四', phone: '13800138002', followStatus: 'pending' },
      { id: '3', name: '王五', phone: '13800138003', followStatus: 'pending' },
      { id: '4', name: '赵六', phone: '13800138004', followStatus: 'pending' },
      { id: '5', name: '孙七', phone: '13800138005', followStatus: 'pending' }
    ];
    
    setTestContacts(sampleContacts);
    addLog(`生成了 ${sampleContacts.length} 个测试联系人`);
  }, [addLog]);

  // 开始小红书关注流程
  const startXiaohongshuFollow = useCallback(async () => {
    if (testContacts.length === 0) {
      addLog('错误: 没有联系人数据');
      return;
    }

    setIsFollowing(true);
    setFollowProgress(0);
    setCurrentStep('准备关注');
    addLog('开始小红书好友关注流程');

    try {
      // 准备关注选项
      const followOptions = {
        deviceId: selectedDevice,
        followDelay: 3000, // 3秒间隔
        maxFollowCount: testContacts.length,
        enableScreenshots: true
      };

      addLog(`关注配置: 设备=${selectedDevice}, 间隔=3秒, 数量=${testContacts.length}`);

      // 调用小红书自动关注功能
      const result = await invoke<XiaohongshuFollowResult>('xiaohongshu_auto_follow', {
        deviceId: selectedDevice,
        contacts: testContacts.map(c => ({
          name: c.name,
          phone: c.phone
        })),
        options: followOptions
      });

      setFollowResults(result);
      setFollowProgress(100);
      setCurrentStep('关注完成');
      
      addLog(`关注完成: 成功=${result.followedCount}, 失败=${result.failedCount}, 跳过=${result.skippedCount}`);
      
      // 回调通知完成
      onComplete?.(result);

    } catch (error) {
      const errorMsg = `关注失败: ${error}`;
      addLog(errorMsg);
      setCurrentStep('关注失败');
      
      const failedResult: XiaohongshuFollowResult = {
        success: false,
        totalContacts: testContacts.length,
        followedCount: 0,
        failedCount: testContacts.length,
        skippedCount: 0,
        message: errorMsg
      };
      
      setFollowResults(failedResult);
      onComplete?.(failedResult);
    } finally {
      setIsFollowing(false);
    }
  }, [selectedDevice, testContacts, addLog, onComplete]);

  // 停止关注
  const stopFollow = useCallback(() => {
    setIsFollowing(false);
    setCurrentStep('已停止');
    addLog('用户手动停止关注流程');
  }, [addLog]);

  // 清除日志
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // 联系人表格列定义
  const contactColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '状态',
      dataIndex: 'followStatus',
      key: 'followStatus',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'default', text: '待关注' },
          following: { color: 'processing', text: '关注中' },
          success: { color: 'success', text: '已关注' },
          failed: { color: 'error', text: '失败' },
          skipped: { color: 'warning', text: '跳过' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    }
  ];

  return (
    <div className="xiaohongshu-follow-test p-6 max-w-6xl mx-auto" style={{ minHeight: '100vh' }}>
      <Title level={2} className="text-center mb-6">
        <HeartOutlined className="mr-2" />
        小红书好友关注功能测试
      </Title>

      {/* 设备配置区域 */}
      <Card title="设备配置" className="mb-6">
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" className="w-full">
              <Text strong>目标设备:</Text>
              <Select
                value={selectedDevice}
                onChange={setSelectedDevice}
                className="w-full"
                disabled={isFollowing}
              >
                <Option value="emulator-5554">模拟器 (emulator-5554)</Option>
                <Option value="emulator-5556">模拟器 (emulator-5556)</Option>
              </Select>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" className="w-full">
              <Text strong>小红书应用状态:</Text>
              <div className="flex items-center gap-2">
                <Text>{appStatus}</Text>
                <Button 
                  icon={<ReloadOutlined />} 
                  size="small" 
                  onClick={checkXiaohongshuApp}
                  loading={appStatus === '检测中...'}
                >
                  检测
                </Button>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 测试数据区域 */}
      <Card title="测试数据" className="mb-6">
        <Space className="mb-4">
          <Button 
            icon={<UserAddOutlined />}
            onClick={generateTestContacts}
            disabled={isFollowing}
          >
            生成测试联系人
          </Button>
          <Text type="secondary">当前联系人数量: {testContacts.length}</Text>
        </Space>
        
        {testContacts.length > 0 && (
          <Table
            dataSource={testContacts}
            columns={contactColumns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
          />
        )}
      </Card>

      {/* 关注控制区域 */}
      <Card title="关注控制" className="mb-6">
        <Space className="mb-4">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startXiaohongshuFollow}
            disabled={isFollowing || testContacts.length === 0}
            loading={isFollowing}
          >
            开始关注
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={stopFollow}
            disabled={!isFollowing}
          >
            停止关注
          </Button>
        </Space>

        {isFollowing && (
          <div className="mb-4">
            <Text strong>当前步骤: </Text>
            <Text>{currentStep}</Text>
            <Progress 
              percent={followProgress} 
              status={isFollowing ? 'active' : 'normal'}
              className="mt-2"
            />
          </div>
        )}

        {/* 关注结果统计 */}
        {followResults && (
          <Row gutter={16} className="mt-4">
            <Col span={6}>
              <Statistic 
                title="总数" 
                value={followResults.totalContacts}
                prefix={<UserAddOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="成功" 
                value={followResults.followedCount}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="失败" 
                value={followResults.failedCount}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="跳过" 
                value={followResults.skippedCount}
                valueStyle={{ color: '#d46b08' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* 日志输出区域 */}
      <Card 
        title="执行日志" 
        extra={
          <Button size="small" onClick={clearLogs}>
            清除日志
          </Button>
        }
      >
        <div 
          className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto font-mono text-sm"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {logs.length === 0 ? (
            <Text type="secondary">暂无日志...</Text>
          ) : (
            logs.map((log) => (
              <div key={log} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 使用说明 */}
      <Alert
        className="mt-6"
        message="使用说明"
        description={
          <ul className="list-disc list-inside mt-2">
            <li>确保目标设备已连接且小红书应用已安装</li>
            <li>点击"生成测试联系人"创建测试数据</li>
            <li>点击"检测"确认小红书应用状态</li>
            <li>点击"开始关注"执行自动关注流程</li>
            <li>关注过程中可以实时查看日志和进度</li>
            <li>测试完成后，此功能将集成到通讯录管理模块</li>
          </ul>
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default XiaohongshuFollowTest;