import {
    AndroidOutlined,
    CheckCircleOutlined,
    HeartOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    SettingOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    InputNumber,
    message,
    Progress,
    Row,
    Select,
    Space,
    Steps,
    Switch,
    Tag,
    Typography
} from 'antd';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { XiaohongshuService } from '../../services/xiaohongshuService';
import { useAdb } from '../../application/hooks/useAdb';
import { DynamicContactsService } from '../../services/dynamicContactsService';

const { Text, Title } = Typography;
const { Step } = Steps;
const { Option } = Select;

interface VcfImportResult {
  name: string;
  phone: string;
  isValid: boolean;
  errorMessage?: string;
}

interface XiaohongshuFollowResult {
  totalAttempts: number;
  successfulFollows: number;
  errors: string[];
  duration: number;
}

interface XiaohongshuAutoFollowProps {
  importResults?: VcfImportResult[];
  selectedDevice?: string;  // 设备ID
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
  selectedDevice: propSelectedDevice,
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
  const [deviceCompatibility, setDeviceCompatibility] = useState<{
    isChecked: boolean;
    isCompatible: boolean;
    screenResolution?: [number, number];
    appStatus?: any;
    message?: string;
  }>({ isChecked: false, isCompatible: false });
  
  // 使用统一的ADB接口 - 遵循DDD架构约束
  const { 
    devices, 
    selectedDevice, 
    selectDevice, 
    isLoading: adbLoading,
    refreshDevices,
    initialize,
    onlineDevices
  } = useAdb();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 辅助函数：获取不兼容原因
  const getIncompatibilityReason = (appStatus: any): string => {
    if (!appStatus.app_installed) {
      return '设备不兼容 - 未安装小红书应用';
    }
    return '设备不兼容 - 无法获取屏幕信息';
  };

  // 辅助函数：获取Alert类型
  const getAlertType = (): "success" | "info" | "warning" | "error" => {
    if (isFollowing) return "info";
    if (followResult?.successfulFollows) return "success";
    return "warning";
  };

  // 辅助函数：转换服务配置到组件配置
  const convertServiceConfig = (serviceConfig: any): FollowConfig => ({
    maxPages: serviceConfig.max_pages || 5,
    followInterval: serviceConfig.follow_interval || 2000,
    skipExisting: serviceConfig.skip_existing !== undefined ? serviceConfig.skip_existing : true,
    returnToHome: serviceConfig.return_to_home !== undefined ? serviceConfig.return_to_home : true
  });

  // 辅助函数：转换组件配置到服务配置
  const convertToServiceConfig = (config: FollowConfig) => ({
    max_pages: config.maxPages,
    follow_interval: config.followInterval,
    skip_existing: config.skipExisting,
    return_to_home: config.returnToHome
  });

  // 初始化ADB环境
  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
      } catch (error) {
        console.error('ADB初始化失败:', error);
        onError?.(`ADB初始化失败: ${error}`);
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices, onError]);

  // 自动选择设备
  useEffect(() => {
    if (propSelectedDevice && devices.length > 0) {
      const foundDevice = devices.find(d => d.id === propSelectedDevice);
      if (foundDevice) {
        selectDevice(foundDevice.id);
      }
    } else if (devices.length > 0 && !selectedDevice) {
      // 自动选择第一个在线设备
      const firstOnlineDevice = onlineDevices[0];
      if (firstOnlineDevice) {
        selectDevice(firstOnlineDevice.id);
      }
    }
  }, [propSelectedDevice, devices, selectedDevice, selectDevice, onlineDevices]);

  // 刷新设备列表
  const handleRefreshDevices = useCallback(async () => {
    try {
      await refreshDevices();
      message.success('设备列表已刷新');
      // 清除之前的兼容性检测结果
      setDeviceCompatibility({ isChecked: false, isCompatible: false });
    } catch (error) {
      console.error('刷新设备失败:', error);
      message.error('刷新设备失败');
    }
  }, [refreshDevices]);

  // 设备兼容性检测
  const handleDeviceCompatibilityCheck = useCallback(async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setStatusMessage('正在检测设备兼容性...');
    
    try {
      // 获取设备屏幕分辨率
      const screenResolution = await XiaohongshuService.getDeviceScreenResolution(selectedDevice.id);
      
      // 检查小红书应用状态
      await XiaohongshuService.initializeService(selectedDevice.id);
      const appStatus = await XiaohongshuService.checkAppStatus();
      
      const isCompatible = appStatus.app_installed && screenResolution[0] > 0 && screenResolution[1] > 0;
      
      setDeviceCompatibility({
        isChecked: true,
        isCompatible,
        screenResolution,
        appStatus,
        message: isCompatible 
          ? `设备兼容 - 分辨率: ${screenResolution[0]}x${screenResolution[1]}, 小红书: ${appStatus.app_version || '已安装'}`
          : getIncompatibilityReason(appStatus)
      });
      
      if (isCompatible) {
        message.success('设备兼容性检测通过！');
        setStatusMessage('设备兼容性检测通过，可以开始关注操作');
      } else {
        message.error('设备兼容性检测失败，请检查设备状态');
        setStatusMessage('设备兼容性检测失败');
      }
      
    } catch (error) {
      console.error('兼容性检测失败:', error);
      setDeviceCompatibility({
        isChecked: true,
        isCompatible: false,
        message: `检测失败: ${error}`
      });
      message.error('设备兼容性检测失败');
      setStatusMessage('设备兼容性检测失败');
    }
  }, [selectedDevice]);

  // 动态通讯录按钮定位测试
  const handleTestContactsButtonLocation = useCallback(async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setStatusMessage('正在测试动态通讯录按钮定位...');
    
    try {
      const result = await DynamicContactsService.locateContactsButton(selectedDevice.id);
      const quality = DynamicContactsService.analyzeLocationQuality(result);
      
      if (result.success) {
        const confidenceText = `置信度: ${(quality.confidence * 100).toFixed(1)}%`;
        const methodText = result.method === 'dynamic_ui_parsing' ? '动态UI解析' : '真机测试备用';
        
        message.success(`通讯录按钮定位成功！坐标: (${result.coordinates.x}, ${result.coordinates.y})`);
        setStatusMessage(
          `✅ 动态定位成功：(${result.coordinates.x}, ${result.coordinates.y}) | 方法: ${methodText} | ${confidenceText}`
        );
        
        if (quality.recommendations.length > 0) {
          console.log('📋 定位质量建议:', quality.recommendations);
        }
      } else {
        message.error('通讯录按钮定位失败');
        setStatusMessage('❌ 动态定位失败');
      }
    } catch (error) {
      console.error('动态定位测试失败:', error);
      message.error(`动态定位测试失败: ${error}`);
      setStatusMessage('动态定位测试失败');
    }
  }, [selectedDevice]);

  // 完整导航流程测试
  const handleTestNavigationFlow = useCallback(async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setStatusMessage('正在测试完整通讯录导航流程...');
    
    try {
      const result = await DynamicContactsService.testNavigationFlow(selectedDevice.id);
      
      if (result.success) {
        message.success('通讯录导航流程测试成功！');
        setStatusMessage(`✅ 导航测试成功：${result.message}`);
        
        if (result.navigation_steps) {
          const formattedSteps = DynamicContactsService.formatNavigationSteps(result.navigation_steps);
          console.log('🚀 导航步骤:', formattedSteps);
        }
      } else {
        message.error('通讯录导航流程测试失败');
        setStatusMessage(`❌ 导航测试失败：${result.message}`);
      }
    } catch (error) {
      console.error('导航流程测试失败:', error);
      message.error(`导航流程测试失败: ${error}`);
      setStatusMessage('导航流程测试失败');
    }
  }, [selectedDevice]);

  // 开始关注流程
  const handleStartFollow = useCallback(async () => {
    if (!selectedDevice) {
      message.error('请选择一个设备');
      return;
    }

    if (!importResults || importResults.length === 0) {
      message.error('没有可关注的用户');
      return;
    }

    setIsFollowing(true);
    setProgress(0);
    setStatusMessage('开始初始化小红书服务...');

    try {
      console.log('🔍 DEBUG: selectedDevice:', selectedDevice);
      
      // 使用完整工作流程，包含所有设备适配和动态UI解析功能
      setStatusMessage('正在检测设备兼容性...');
      setProgress(10);
      
      // 首先验证设备连接状态
      const isDeviceValid = await XiaohongshuService.validateDeviceConnection(selectedDevice.id);
      if (!isDeviceValid) {
        throw new Error('设备连接验证失败，请检查设备状态和小红书应用');
      }
      
      setStatusMessage('设备验证通过，启动完整工作流程...');
      setProgress(25);
      setCurrentStep(1);

      // 使用增强的完整工作流程 - 包含动态UI解析和多设备适配
      const workflowResult = await XiaohongshuService.executeCompleteWorkflow(
        selectedDevice.id,
        convertToServiceConfig(followConfig)
      );

      setProgress(90);
      
      // 分析和转换结果
      const analysis = XiaohongshuService.analyzeFollowResult(workflowResult.follow_result);
      
      const convertedResult: XiaohongshuFollowResult = {
        totalAttempts: analysis.totalAttempts,
        successfulFollows: workflowResult.follow_result.total_followed || 0,
        errors: analysis.errorSummary,
        duration: workflowResult.follow_result.duration || 0
      };

      setFollowResult(convertedResult);
      setCurrentStep(2);
      setProgress(100);
      
      const successMessage = `关注完成: 成功关注 ${convertedResult.successfulFollows} 个用户 (成功率: ${analysis.successRate.toFixed(1)}%)`;
      setStatusMessage(successMessage);
      
      if (analysis.isSuccess) {
        message.success(successMessage);
      } else {
        message.warning(`${successMessage}，但成功率较低，请检查设备状态`);
      }
      
      onWorkflowComplete?.(convertedResult);
    } catch (error) {
      console.error('关注操作失败:', error);
      const errorMessage = `关注操作失败: ${error}`;
      setStatusMessage(errorMessage);
      message.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsFollowing(false);
      setProgress(100);
    }
  }, [selectedDevice, importResults, followConfig, onWorkflowComplete, onError]);

  // 停止关注
  const handleStopFollow = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsFollowing(false);
    setStatusMessage('用户已停止关注操作');
    message.info('已停止关注操作');
  }, []);

  // 渲染设备选择器
  const renderDeviceSelector = () => (
    <Card title="设备选择" size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="选择设备"
            value={selectedDevice?.id}
            onChange={(deviceId) => selectDevice(deviceId)}
            loading={adbLoading}
          >
            {devices.map(device => (
              <Option key={device.id} value={device.id}>
                <Space>
                  <AndroidOutlined />
                  <span>{device.getDisplayName()}</span>
                  <Tag color={device.isOnline() ? 'green' : 'red'}>
                    {device.isOnline() ? '在线' : '离线'}
                  </Tag>
                </Space>
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleRefreshDevices} loading={adbLoading}>
            刷新
          </Button>
        </div>
        
        {devices.length === 0 && (
          <Alert
            message="未检测到设备"
            description="请确保设备已连接并启用USB调试"
            type="warning"
            showIcon
          />
        )}
        
        {selectedDevice && (
          <Alert
            message={
              <div>
                <div><strong>已选择设备:</strong> {selectedDevice.getDisplayName()}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  设备ID: {selectedDevice.id} | 
                  类型: {selectedDevice.isEmulator() ? '模拟器' : '真机'} | 
                  状态: {selectedDevice.isOnline() ? '在线' : '离线'}
                </div>
              </div>
            }
            type="success"
            showIcon
          />
        )}
      </Space>
    </Card>
  );

  // 渲染配置面板
  const renderConfigPanel = () => (
    <Card title="关注配置" size="small" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Text style={{ fontSize: '12px', color: '#666' }}>快速配置:</Text>
          <Button 
            size="small" 
            onClick={() => setFollowConfig(convertServiceConfig(XiaohongshuService.getRecommendedOptions('conservative')))}
          >
            保守模式
          </Button>
          <Button 
            size="small" 
            type="primary" 
            onClick={() => setFollowConfig(convertServiceConfig(XiaohongshuService.getRecommendedOptions('normal')))}
          >
            标准模式
          </Button>
          <Button 
            size="small" 
            onClick={() => setFollowConfig(convertServiceConfig(XiaohongshuService.getRecommendedOptions('aggressive')))}
          >
            激进模式
          </Button>
        </Space>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div>
            <Text>最大页面数:</Text>
            <InputNumber
              min={1}
              max={10}
              value={followConfig.maxPages}
              onChange={(value) => setFollowConfig({...followConfig, maxPages: value || 3})}
              style={{ width: '100%', marginTop: 4 }}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              预计 {followConfig.maxPages * 10} 个联系人
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Text>关注间隔(毫秒):</Text>
            <InputNumber
              min={1000}
              max={10000}
              step={500}
              value={followConfig.followInterval}
              onChange={(value) => setFollowConfig({...followConfig, followInterval: value || 2000})}
              style={{ width: '100%', marginTop: 4 }}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              预计耗时: {XiaohongshuService.formatDuration(
                XiaohongshuService.estimateFollowTime(convertToServiceConfig(followConfig))
              )}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text>跳过已关注:</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>避免重复关注</Text>
            </div>
            <Switch
              checked={followConfig.skipExisting}
              onChange={(checked) => setFollowConfig({...followConfig, skipExisting: checked})}
            />
          </div>
        </Col>
        <Col span={12}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text>完成后返回首页:</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>自动回到主界面</Text>
            </div>
            <Switch
              checked={followConfig.returnToHome}
              onChange={(checked) => setFollowConfig({...followConfig, returnToHome: checked})}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // 渲染操作面板
  const renderActionPanel = () => (
    <Card title="操作控制" size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Button
            icon={<AndroidOutlined />}
            onClick={handleDeviceCompatibilityCheck}
            disabled={!selectedDevice || isFollowing}
          >
            检测设备兼容性
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={handleTestContactsButtonLocation}
            disabled={!selectedDevice || isFollowing}
          >
            测试通讯录定位
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={handleTestNavigationFlow}
            disabled={!selectedDevice || isFollowing}
          >
            测试导航流程
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartFollow}
            disabled={!selectedDevice || !importResults || importResults.length === 0 || isFollowing || (deviceCompatibility.isChecked && !deviceCompatibility.isCompatible)}
            loading={isFollowing}
          >
            开始关注
          </Button>
          <Button
            danger
            onClick={handleStopFollow}
            disabled={!isFollowing}
          >
            停止关注
          </Button>
        </Space>
        
        {/* 设备兼容性状态显示 */}
        {deviceCompatibility.isChecked && (
          <Alert
            message={deviceCompatibility.message}
            type={deviceCompatibility.isCompatible ? "success" : "error"}
            showIcon
            style={{ fontSize: '12px' }}
          />
        )}
        
        {importResults && (
          <div>
            <Text type="secondary">
              共 {importResults.length} 个用户待关注
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );

  // 渲染进度面板
  const renderProgressPanel = () => (
    <Card title="关注进度" size="small" style={{ marginBottom: 16 }}>
      <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}>
        <Step 
          title="设备检测" 
          icon={<AndroidOutlined />} 
          description="验证设备状态和应用兼容性"
        />
        <Step 
          title="智能导航" 
          icon={<SettingOutlined />} 
          description="动态UI解析，适配不同设备"
        />
        <Step 
          title="批量关注" 
          icon={<HeartOutlined />} 
          description="执行智能关注操作"
        />
        <Step 
          title="完成" 
          icon={<CheckCircleOutlined />} 
          description="关注操作完成"
        />
      </Steps>
      
      <Progress 
        percent={progress} 
        status={isFollowing ? "active" : "normal"} 
        strokeColor={isFollowing ? "#1890ff" : "#52c41a"}
      />
      
      {statusMessage && (
        <Alert
          message={statusMessage}
          type={getAlertType()}
          style={{ marginTop: 8 }}
          showIcon
        />
      )}
      
      {followResult && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>关注结果统计</Title>
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col span={6}>
              <Tag color="blue">总尝试: {followResult.totalAttempts}</Tag>
            </Col>
            <Col span={6}>
              <Tag color="green">成功: {followResult.successfulFollows}</Tag>
            </Col>
            <Col span={6}>
              <Tag color="red">失败: {followResult.errors.length}</Tag>
            </Col>
            <Col span={6}>
              <Tag color="purple">耗时: {XiaohongshuService.formatDuration(followResult.duration)}</Tag>
            </Col>
          </Row>
          
          {followResult.successfulFollows > 0 && (
            <Alert
              message={`成功关注 ${followResult.successfulFollows} 个用户！`}
              type="success"
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}
          
          {followResult.errors.length > 0 && (
            <Alert
              message="部分关注失败"
              description={
                <div>
                  <div>错误数量: {followResult.errors.length}</div>
                  <div style={{ marginTop: 4, maxHeight: 100, overflow: 'auto' }}>
                    {followResult.errors.slice(0, 3).map((error) => (
                      <div key={error} style={{ fontSize: '12px', color: '#666' }}>
                        • {error}
                      </div>
                    ))}
                    {followResult.errors.length > 3 && (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        ... 还有 {followResult.errors.length - 3} 个错误
                      </div>
                    )}
                  </div>
                </div>
              }
              type="warning"
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>
        <HeartOutlined /> 小红书自动关注
      </Title>
      <Divider />
      
      {renderDeviceSelector()}
      {renderConfigPanel()}
      {renderActionPanel()}
      {renderProgressPanel()}
    </div>
  );
};

export default XiaohongshuAutoFollow;

