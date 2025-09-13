import React, { useState } from 'react';
import {
  Button,
  Card,
  Space,
  Steps,
  Alert,
  Typography,
  InputNumber,
  Switch,
  Progress,
  Row,
  Col,
  Tag,
  Divider,
  message
} from 'antd';
import {
  HeartOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AndroidOutlined
} from '@ant-design/icons';
import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';
import { XiaohongshuService } from '../../services/xiaohongshuService';

const { Text, Title } = Typography;
const { Step } = Steps;

interface XiaohongshuAutoFollowProps {
  importResults?: VcfImportResult[];
  selectedDevice?: Device;
  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;
  onError?: (error: string) => void;
}

interface FollowConfig {
  maxPages: number;
  followInterval: number;
  skipExisting: boolean;
  returnToHome: boolean;
}

export const XiaohongshuAutoFollow: React.FC<XiaohongshuAutoFollowProps> = ({
  importResults,
  selectedDevice,
  onWorkflowComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followConfig, setFollowConfig] = useState<FollowConfig>({
    maxPages: 3,
    followInterval: 2000,
    skipExisting: true,
    returnToHome: true
  });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [followResult, setFollowResult] = useState<XiaohongshuFollowResult | null>(null);

  const startWorkflow = async () => {
    if (!selectedDevice) {
      onError?.('请先选择设备');
      return;
    }

    try {
      setIsFollowing(true);
      setCurrentStep(0);
      setProgress(0);
      setStatusMessage('开始自动关注流程...');

      // 初始化服务
      setStatusMessage('初始化小红书服务...');
      await XiaohongshuService.initializeService(selectedDevice.id.toString());
      setProgress(10);

      // 步骤1: 检查应用状态
      setStatusMessage('检查小红书应用状态...');
      const appStatus = await XiaohongshuService.checkAppStatus();
      
      if (!appStatus.app_installed) {
        throw new Error('小红书应用未安装');
      }
      
      setCurrentStep(1);
      setProgress(25);

      // 步骤2: 导航到通讯录页面
      setStatusMessage('导航到通讯录页面...');
      const navResult = await XiaohongshuService.navigateToContacts();
      
      if (!navResult.success) {
        throw new Error(navResult.message);
      }
      
      setCurrentStep(2);
      setProgress(50);

      // 步骤3: 执行自动关注
      setStatusMessage('执行自动关注...');
      const followOptions = {
        max_pages: followConfig.maxPages,
        follow_interval: followConfig.followInterval,
        skip_existing: followConfig.skipExisting,
        return_to_home: followConfig.returnToHome
      };

      const result = await XiaohongshuService.autoFollowContacts(followOptions);

      // 转换结果格式以匹配类型
      const convertedResult: XiaohongshuFollowResult = {
        success: result.success,
        totalFollowed: result.total_followed,
        pagesProcessed: result.pages_processed,
        duration: result.duration,
        details: result.details.map(detail => ({
          userPosition: { x: detail.user_position[0], y: detail.user_position[1] },
          followSuccess: detail.follow_success,
          buttonTextBefore: detail.button_text_before,
          buttonTextAfter: detail.button_text_after,
          error: detail.error
        })),
        message: result.message
      };

      setFollowResult(convertedResult);
      setCurrentStep(3);
      setProgress(100);
      setStatusMessage(`关注完成: 成功关注 ${convertedResult.totalFollowed} 个用户`);
      
      message.success(`成功关注 ${convertedResult.totalFollowed} 个用户！`);
      onWorkflowComplete?.(convertedResult);

    } catch (error) {
      const errorMsg = `自动关注失败: ${error}`;
      setStatusMessage(errorMsg);
      onError?.(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsFollowing(false);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep(0);
    setProgress(0);
    setFollowResult(null);
    setStatusMessage('');
  };

  return (
    <div className="xiaohongshu-auto-follow">
      <div className="mb-4">
        <Title level={4}>
          <HeartOutlined className="mr-2" />
          小红书自动关注
        </Title>
      </div>

      <Steps current={currentStep} className="mb-6">
        <Step
          title="检查应用"
          description="验证小红书应用状态"
          icon={<AndroidOutlined />}
        />
        <Step
          title="导航页面"
          description="前往通讯录页面"
          icon={<ClockCircleOutlined />}
        />
        <Step
          title="自动关注"
          description="执行关注操作"
          icon={<HeartOutlined />}
        />
        <Step
          title="完成"
          description="关注流程完成"
          icon={<CheckCircleOutlined />}
        />
      </Steps>

      <Card title="设备信息" className="mb-4" size="small">
        {selectedDevice ? (
          <div>
            <Tag color="blue" icon={<AndroidOutlined />}>
              {selectedDevice.name}
            </Tag>
            <Text className="ml-2">状态: </Text>
            <Tag color={selectedDevice.status === 'connected' ? 'green' : 'red'}>
              {selectedDevice.status === 'connected' ? '已连接' : '未连接'}
            </Tag>
          </div>
        ) : (
          <Alert type="warning" message="请先选择设备" />
        )}
      </Card>

      {importResults && importResults.length > 0 && (
        <Card title="导入结果" className="mb-4" size="small">
          <Text>
            已导入 <Text strong>{importResults.reduce((sum, result) => sum + result.importedContacts, 0)}</Text> 个联系人到 <Text strong>{importResults.length}</Text> 台设备
          </Text>
        </Card>
      )}

      <Card title="关注配置" className="mb-4" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <div className="mb-3">
              <Text>最大页数:</Text>
              <InputNumber
                min={1}
                max={10}
                value={followConfig.maxPages}
                onChange={(value) => setFollowConfig(prev => ({ ...prev, maxPages: value || 3 }))}
                className="w-full"
              />
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-3">
              <Text>关注间隔(ms):</Text>
              <InputNumber
                min={1000}
                max={10000}
                step={500}
                value={followConfig.followInterval}
                onChange={(value) => setFollowConfig(prev => ({ ...prev, followInterval: value || 2000 }))}
                className="w-full"
              />
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-3">
              <Text>跳过已关注:</Text>
              <Switch
                checked={followConfig.skipExisting}
                onChange={(checked) => setFollowConfig(prev => ({ ...prev, skipExisting: checked }))}
                className="ml-2"
              />
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-3">
              <Text>完成后返回:</Text>
              <Switch
                checked={followConfig.returnToHome}
                onChange={(checked) => setFollowConfig(prev => ({ ...prev, returnToHome: checked }))}
                className="ml-2"
              />
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="执行进度" className="mb-4" size="small">
        <Progress 
          percent={progress}
          status={isFollowing ? 'active' : 'normal'}
          className="mb-2"
        />
        <Text>{statusMessage}</Text>
      </Card>

      {followResult && (
        <Card title="关注结果" className="mb-4" size="small">
          <Row gutter={16}>
            <Col span={6}>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">{followResult.totalFollowed}</div>
                <div className="text-sm text-gray-600">关注用户</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{followResult.pagesProcessed}</div>
                <div className="text-sm text-gray-600">处理页面</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(followResult.duration)}s</div>
                <div className="text-sm text-gray-600">耗时</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${followResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {followResult.success ? '成功' : '失败'}
                </div>
                <div className="text-sm text-gray-600">状态</div>
              </div>
            </Col>
          </Row>
          
          <Divider />
          
          <div className="mb-3">
            <Text>{followResult.message}</Text>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startWorkflow}
            loading={isFollowing}
            disabled={!selectedDevice || selectedDevice.status !== 'connected'}
            size="large"
          >
            {isFollowing ? '执行中...' : '开始自动关注'}
          </Button>
          
          {followResult && (
            <Button
              icon={<SettingOutlined />}
              onClick={resetWorkflow}
            >
              重新配置
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default XiaohongshuAutoFollow;