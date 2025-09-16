import {
    CheckCircleOutlined,
    HeartOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    StopOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    InputNumber,
    Progress,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Typography,
    message
} from 'antd';
import React, { useEffect, useState } from 'react';
import { XiaohongshuService } from '../services/xiaohongshuService';
import { useAdb } from '../application/hooks/useAdb';
import { Device } from '../domain/adb';

const { Title, Text } = Typography;
const { Option } = Select;

interface FollowConfig {
  max_pages: number;
  follow_interval: number;
  skip_existing: boolean;
  return_to_home: boolean;
}

interface SimpleFollowResult {
  success: boolean;
  totalFollowed: number;
  failedAttempts: number;
  message: string;
}

const XiaohongshuFollowPage: React.FC = () => {
  // 使用新的统一ADB状态
  const { 
    devices, 
    selectedDevice, 
    isLoading: deviceLoading, 
    refreshDevices, 
    selectDevice: setSelectedDevice, 
    initialize: initializeAdb 
  } = useAdb();
  
  // 本地状态
  const [isFollowing, setIsFollowing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [followResult, setFollowResult] = useState<SimpleFollowResult | null>(null);
  
  const [followConfig, setFollowConfig] = useState<FollowConfig>({
    max_pages: 3,
    follow_interval: 2000,
    skip_existing: true,
    return_to_home: true
  });

  // 初始化ADB和设备列表
  useEffect(() => {
    const initDevices = async () => {
      await initializeAdb();
      await refreshDevices();
    };
    initDevices();
  }, [initializeAdb, refreshDevices]);

  const startAutoFollow = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    try {
      setIsFollowing(true);
      setProgress(0);
      setFollowResult(null);
      setStatusMessage('正在启动小红书自动关注...');

      // 调用后端的小红书自动关注功能
      const result = await XiaohongshuService.executeCompleteWorkflow(
        selectedDevice?.id,
        followConfig
      );

      if (result.follow_result.success) {
        setFollowResult({
          success: true,
          totalFollowed: result.follow_result.total_followed,
          failedAttempts: result.follow_result.pages_processed - result.follow_result.total_followed,
          message: result.follow_result.message
        });
        setStatusMessage('自动关注完成!');
        setProgress(100);
        message.success(`关注成功! 共关注了 ${result.follow_result.total_followed} 个用户`);
      } else {
        setFollowResult({
          success: false,
          totalFollowed: 0,
          failedAttempts: 0,
          message: result.follow_result.message
        });
        setStatusMessage('自动关注失败');
        message.error('自动关注失败: ' + result.follow_result.message);
      }
    } catch (error) {
      setStatusMessage('操作失败: ' + error);
      message.error('自动关注失败: ' + error);
    } finally {
      setIsFollowing(false);
    }
  };

  const stopAutoFollow = async () => {
    try {
      // 简单的停止逻辑，设置状态
      setIsFollowing(false);
      setStatusMessage('用户手动停止了自动关注');
      message.info('已停止自动关注');
    } catch (error) {
      message.error('停止操作失败: ' + error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #ff6b8a, #4ecdc4)' }}
        >
          <HeartOutlined style={{ color: 'white' }} />
        </div>
        <div>
          <Title level={2} style={{ margin: 0 }}>小红书自动关注</Title>
          <Text type="secondary">独立的小红书自动关注功能，无需先导入通讯录</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：设备选择和配置 */}
        <Col xs={24} lg={12}>
          <Card title={
            <Space>
              <MobileOutlined />
              设备选择与配置
            </Space>
          }>
            <div className="space-y-4">
              {/* 设备选择 */}
              <div>
                <Text strong>选择设备:</Text>
                <Space className="w-full mt-2" direction="vertical">
                  <Select
                    value={selectedDevice?.id}
                    onChange={(value) => setSelectedDevice(value)}
                    className="w-full"
                    loading={deviceLoading}
                    placeholder="请选择设备"
                  >
                    {devices.map((device: Device) => (
                      <Option key={device.id} value={device.id}>
                        <Space>
                          <MobileOutlined />
                          {device.name || device.id}
                          <Tag color={device.status === 'online' ? 'green' : 'orange'}>
                            {device.status}
                          </Tag>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                  <Button onClick={refreshDevices} loading={deviceLoading} block>
                    刷新设备列表
                  </Button>
                </Space>
              </div>

              <Divider />

              {/* 关注配置 */}
              <div className="space-y-3">
                <Text strong>
                  <SettingOutlined /> 关注配置
                </Text>
                
                <div>
                  <Text>最大页数:</Text>
                  <InputNumber
                    value={followConfig.max_pages}
                    onChange={(value) => setFollowConfig({
                      ...followConfig,
                      max_pages: value || 3
                    })}
                    min={1}
                    max={10}
                    className="ml-2"
                  />
                  <Text type="secondary" className="ml-2">页</Text>
                </div>

                <div>
                  <Text>关注间隔:</Text>
                  <InputNumber
                    value={followConfig.follow_interval}
                    onChange={(value) => setFollowConfig({
                      ...followConfig,
                      follow_interval: value || 2000
                    })}
                    min={1000}
                    max={10000}
                    step={500}
                    className="ml-2"
                  />
                  <Text type="secondary" className="ml-2">毫秒</Text>
                </div>

                <div className="flex justify-between items-center">
                  <Text>跳过已关注用户:</Text>
                  <Switch
                    checked={followConfig.skip_existing}
                    onChange={(checked) => setFollowConfig({
                      ...followConfig,
                      skip_existing: checked
                    })}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <Text>完成后返回主页:</Text>
                  <Switch
                    checked={followConfig.return_to_home}
                    onChange={(checked) => setFollowConfig({
                      ...followConfig,
                      return_to_home: checked
                    })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：操作控制和结果显示 */}
        <Col xs={24} lg={12}>
          <Card title={
            <Space>
              <PlayCircleOutlined />
              操作控制
            </Space>
          }>
            <div className="space-y-4">
              {/* 操作按钮 */}
              <Space className="w-full" direction="vertical">
                {!isFollowing ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<HeartOutlined />}
                    onClick={startAutoFollow}
                    disabled={!selectedDevice || devices.length === 0}
                    className="w-full"
                  >
                    开始自动关注
                  </Button>
                ) : (
                  <Button
                    danger
                    size="large"
                    icon={<StopOutlined />}
                    onClick={stopAutoFollow}
                    className="w-full"
                  >
                    停止关注
                  </Button>
                )}
              </Space>

              {/* 进度显示 */}
              {isFollowing && (
                <div className="space-y-3">
                  <Text strong>执行进度:</Text>
                  <Progress percent={progress} status="active" />
                  <Alert
                    message={statusMessage}
                    type="info"
                    showIcon
                    icon={<Spin />}
                  />
                </div>
              )}

              {/* 结果显示 */}
              {followResult && (
                <div className="space-y-3">
                  <Text strong>执行结果:</Text>
                  <Alert
                    message={followResult.success ? '关注成功!' : '关注失败'}
                    description={
                      <div className="space-y-2">
                        <div>关注用户数: {followResult.totalFollowed}</div>
                        <div>失败次数: {followResult.failedAttempts}</div>
                        <div>详细信息: {followResult.message}</div>
                      </div>
                    }
                    type={followResult.success ? 'success' : 'error'}
                    showIcon
                    icon={followResult.success ? <CheckCircleOutlined /> : undefined}
                  />
                </div>
              )}

              {/* 功能说明 */}
              <div className="mt-6">
                <Text strong>功能说明:</Text>
                <ul className="mt-2 space-y-1 text-sm text-gray-400">
                  <li>• 独立运行，无需先导入通讯录</li>
                  <li>• 智能识别小红书界面元素</li>
                  <li>• 支持自定义关注配置</li>
                  <li>• 自动处理页面导航和错误恢复</li>
                  <li>• 详细的日志记录和进度反馈</li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default XiaohongshuFollowPage;

