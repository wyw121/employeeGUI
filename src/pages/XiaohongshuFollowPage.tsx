import {
    CheckCircleOutlined,
    HeartOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    StopOutlined,
    ThunderboltOutlined,
    LinkOutlined
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
  App,
  message,
    Radio
} from 'antd';
import React, { useEffect, useState } from 'react';
import { XiaohongshuService } from '../services/xiaohongshuService';
import XiaohongshuLongConnectionService from '../services/xiaohongshuLongConnectionService';
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
  connectionMode?: 'long' | 'single';
  performanceStats?: {
    totalTime: number;
    connectionReuses: number;
    estimatedTimeSaved: number;
  };
}

type ConnectionMode = 'single' | 'long';

const XiaohongshuFollowPage: React.FC = () => {
  const { message: msgApi } = App.useApp();
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
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('long'); // 默认使用长连接
  const [performanceInfo, setPerformanceInfo] = useState<{
    timeReduction: string;
    resourceSaving: string;
    reliabilityIncrease: string;
  } | null>(null);
  
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

  // 获取性能信息
  useEffect(() => {
    const info = XiaohongshuLongConnectionService.estimatePerformanceImprovement();
    setPerformanceInfo(info);
  }, []);

  const startAutoFollow = async () => {
    if (!selectedDevice) {
  msgApi.error('请先选择设备');
      return;
    }

    try {
      setIsFollowing(true);
      setProgress(0);
      setFollowResult(null);
      setStatusMessage(`正在启动小红书自动关注...（${connectionMode === 'long' ? '长连接模式' : '独立命令模式'}）`);

      let result;
      
      if (connectionMode === 'long') {
        // 使用长连接模式
        setStatusMessage('正在建立长连接...');
        result = await XiaohongshuLongConnectionService.executeCompleteWorkflow(
          selectedDevice?.id,
          followConfig
        );

        if (result.success) {
          setFollowResult({
            success: true,
            totalFollowed: result.follow_result.total_followed,
            failedAttempts: result.follow_result.pages_processed - result.follow_result.total_followed,
            message: result.message,
            connectionMode: 'long',
            performanceStats: result.performance_stats && {
              totalTime: result.performance_stats.total_time_ms || 0,
              connectionReuses: result.performance_stats.connection_reuses || 0,
              estimatedTimeSaved: result.performance_stats.estimated_time_saved_ms || 0
            }
          });
          setStatusMessage('长连接自动关注完成!');
          setProgress(100);
          const timeSaved = result.performance_stats?.estimated_time_saved_ms 
            ? `，节省时间 ~${Math.round(result.performance_stats.estimated_time_saved_ms / 1000)}秒` 
            : '';
          msgApi.success(`长连接模式关注成功! 共关注了 ${result.follow_result.total_followed} 个用户${timeSaved}`);
        } else {
          setFollowResult({
            success: false,
            totalFollowed: 0,
            failedAttempts: 0,
            message: result.message,
            connectionMode: 'long'
          });
          setStatusMessage('长连接自动关注失败');
          msgApi.error('长连接自动关注失败: ' + result.message);
        }
      } else {
        // 使用原有的独立命令模式
        const legacyResult = await XiaohongshuService.executeCompleteWorkflow(
          selectedDevice?.id,
          followConfig
        );

        if (legacyResult.follow_result.success) {
          setFollowResult({
            success: true,
            totalFollowed: legacyResult.follow_result.total_followed,
            failedAttempts: legacyResult.follow_result.pages_processed - legacyResult.follow_result.total_followed,
            message: legacyResult.follow_result.message,
            connectionMode: 'single'
          });
          setStatusMessage('独立命令自动关注完成!');
          setProgress(100);
          msgApi.success(`独立命令模式关注成功! 共关注了 ${legacyResult.follow_result.total_followed} 个用户`);
        } else {
          setFollowResult({
            success: false,
            totalFollowed: 0,
            failedAttempts: 0,
            message: legacyResult.follow_result.message,
            connectionMode: 'single'
          });
          setStatusMessage('独立命令自动关注失败');
          msgApi.error('独立命令自动关注失败: ' + legacyResult.follow_result.message);
        }
      }
    } catch (error) {
      setStatusMessage('操作失败: ' + error);
  msgApi.error('自动关注失败: ' + error);
    } finally {
      setIsFollowing(false);
    }
  };

  const stopAutoFollow = async () => {
    try {
      // 简单的停止逻辑，设置状态
      setIsFollowing(false);
      setStatusMessage('用户手动停止了自动关注');
  msgApi.info('已停止自动关注');
    } catch (error) {
  msgApi.error('停止操作失败: ' + error);
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

              {/* 连接模式选择 */}
              <div>
                <Text strong>连接模式:</Text>
                <Radio.Group 
                  value={connectionMode} 
                  onChange={(e) => setConnectionMode(e.target.value)}
                  className="w-full mt-2"
                >
                  <Radio.Button value="long" className="flex-1">
                    🚀 长连接模式 (推荐)
                  </Radio.Button>
                  <Radio.Button value="single" className="flex-1">
                    ⚡ 独立命令模式
                  </Radio.Button>
                </Radio.Group>

                <div className={`mt-2 p-3 rounded ${
                  connectionMode === 'long' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  {connectionMode === 'long' ? (
                    <>
                      <div className="text-green-600 font-bold mb-2">
                        🚀 高性能长连接模式特点:
                      </div>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>时间节省: 60-80% ⏱️</li>
                        <li>资源消耗: 降低 40-60% 💡</li>
                        <li>稳定性: 提升 30-50% 🛡️</li>
                        <li>持久连接，无需重复认证 🔐</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <div className="text-orange-600 font-bold mb-2">
                        ⚡ 独立命令模式特点:
                      </div>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>每次操作建立新连接 🔄</li>
                        <li>兼容旧版本设备 📱</li>
                        <li>适合调试和单次操作 🔧</li>
                        <li>资源占用相对较高 📊</li>
                      </ul>
                    </>
                  )}
                </div>
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
                        {followResult.connectionMode && (
                          <div className="mt-3 p-2 bg-gray-50 rounded">
                            <div className="text-xs text-gray-500 mb-1">
                              连接模式: {followResult.connectionMode === 'long' ? '🚀 长连接模式' : '⚡ 独立命令模式'}
                            </div>
                            {followResult.connectionMode === 'long' && followResult.performanceStats && (
                              <div className="text-xs space-y-1">
                                <div>⏱️ 总用时: {followResult.performanceStats.totalTime}ms</div>
                                <div>🔄 连接复用: {followResult.performanceStats.connectionReuses} 次</div>
                                <div>💡 估计节省时间: ~{Math.round(followResult.performanceStats.estimatedTimeSaved / 1000)}s</div>
                              </div>
                            )}
                          </div>
                        )}
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

