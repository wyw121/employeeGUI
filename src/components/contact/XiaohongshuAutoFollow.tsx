import {
    AndroidOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    HeartOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    InputNumber,
    message,
    Progress,
    Row,
    Space,
    Spin,
    Steps,
    Switch,
    Tag,
    Typography
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { XiaohongshuService } from '../../services/xiaohongshuService';
import { useAdb } from '../../application/hooks/useAdb';
import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';

const { Text, Title } = Typography;
const { Step } = Steps;

interface XiaohongshuAutoFollowProps {
  importResults?: VcfImportResult[];
  selectedDevice?: string;  // 改为字符串设备ID
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
  
  // 设备检测相关状态
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 使用新的统一ADB状态
  const adbHook = useAdb();
  const currentAdbPath = adbHook.adbPath || 'platform-tools/adb.exe';

  // 解析ADB设备输出 - 与ContactImportManager保持一致
  const parseDevicesOutput = useCallback((output: string): Device[] => {
    const lines = output.split('\n').filter(line => 
      line.trim() && !line.includes('List of devices')
    );

    const devices: Device[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      const deviceId = parts[0];
      const status = parts[1];

      // 只处理已连接的设备
      if (status !== 'device') {
        return;
      }

      // 检测是否为雷电模拟器
      const isEmulator = deviceId.includes('127.0.0.1') || deviceId.includes('emulator');

      // 解析设备信息
      let model = '';
      let product = '';
      
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('model:')) {
          model = part.split(':')[1];
        } else if (part.startsWith('product:')) {
          product = part.split(':')[1];
        }
      }

      // 生成友好的设备名称
      let deviceName = '';
      if (isEmulator) {
        if (deviceId.includes('127.0.0.1')) {
          deviceName = `雷电模拟器 (${deviceId})`;
        } else {
          deviceName = `模拟器 (${deviceId})`;
        }
      } else {
        deviceName = model || product || `设备 ${index + 1}`;
      }

      devices.push({
        id: devices.length + 1, // 使用当前设备数量+1作为ID
        name: deviceName,
        phone_name: deviceId,
        status: 'connected'
      });
    });

    return devices;
  }, []);

  // 初始化ADB路径
  useEffect(() => {
    const initAdbPath = async () => {
      // 初始化全局设备状态
      await adbHook.initialize();
      
      try {
        // 使用智能ADB检测
        const smartPath = await invoke<string>('detect_smart_adb_path');
        if (smartPath) {
          console.log('已检测到智能ADB路径:', smartPath);
          // TODO: 新架构中需要实现setAdbPath功能
          // deviceStore.setAdbPath(smartPath);
          console.log('会使用智能检测的ADB路径:', smartPath);
          return;
        }
      } catch (error) {
        console.log('智能ADB检测失败:', error);
      }
      
      try {
        // 回退：首先尝试检测雷电模拟器ADB
        const ldPlayerAdb = await invoke<string>('detect_ldplayer_adb');
        if (ldPlayerAdb) {
          console.log('已检测到雷电模拟器ADB路径:', ldPlayerAdb);
          // TODO: 新架构中需要实现setAdbPath功能
          // deviceStore.setAdbPath(ldPlayerAdb);
          console.log('会使用LDPlayer的ADB路径:', ldPlayerAdb);
          return;
        }
      } catch (error) {
        console.log('雷电模拟器ADB检测失败:', error);
      }

      try {
        // 使用系统ADB
        const systemAdb = await invoke<string>('detect_system_adb');
        if (systemAdb) {
          console.log('已检测到系统ADB路径:', systemAdb);
          // TODO: 新架构中需要实现setAdbPath功能
          // deviceStore.setAdbPath(systemAdb);
          console.log('会使用系统的ADB路径:', systemAdb);
          return;
        }
      } catch (error) {
        console.log('系统ADB检测失败:', error);
      }

      // 使用最后的默认路径
      // TODO: 新架构中需要实现setAdbPath功能
      // deviceStore.setAdbPath('adb.exe');
      console.log('使用默认ADB路径: adb.exe');
    };

    initAdbPath();
  }, [adbHook]);

  // 检测可用设备
  const detectDevices = useCallback(async () => {
    if (!currentAdbPath) {
      console.log('ADB路径未初始化，跳过设备检测');
      return;
    }

    setLoading(true);
    try {
      // 刷新全局设备状态
      await adbHook.refreshDevices();
      
      // 同时获取当前设备用于本地显示
      const output = await invoke<string>('get_adb_devices', { adbPath: currentAdbPath });
      const devices = parseDevicesOutput(output);
      
      setAvailableDevices(devices);
      
      // 如果从props传递了设备ID，在可用设备中查找
      if (propSelectedDevice && devices.length > 0) {
        const foundDevice = devices.find(d => d.id.toString() === propSelectedDevice);
        if (foundDevice) {
          setSelectedDevice(foundDevice);
          setSelectedDevices([foundDevice.id.toString()]);
        }
      } else if (devices.length > 0) {
        // 默认选中第一个设备
        setSelectedDevice(devices[0]);
        setSelectedDevices([devices[0].id.toString()]);
      }
      
      if (devices.length === 0) {
        message.info('未检测到连接的设备，请确保设备已连接并启用USB调试');
      } else {
        message.success(`检测到 ${devices.length} 台设备`);
        console.log('检测到的设备:', devices);
      }
      
    } catch (error) {
      console.error('获取设备列表失败:', error);
      onError?.(`设备检测失败: ${error}`);
      message.error(`设备检测失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [currentAdbPath, parseDevicesOutput, onError, propSelectedDevice]);

  // 当ADB路径初始化完成后自动检测设备
  useEffect(() => {
    if (currentAdbPath) {
      detectDevices();
    }
  }, [currentAdbPath, detectDevices]);

  // 当props中的selectedDevice改变时，在设备列表中查找对应设备
  useEffect(() => {
    if (propSelectedDevice && availableDevices.length > 0) {
      const foundDevice = availableDevices.find(d => d.id.toString() === propSelectedDevice);
      if (foundDevice) {
        setSelectedDevice(foundDevice);
        setSelectedDevices([foundDevice.id.toString()]);
      }
    }
  }, [propSelectedDevice, availableDevices]);

  // 调试：监听 selectedDevice 的变化
  useEffect(() => {
    console.log('XiaohongshuAutoFollow: selectedDevice 发生变化:', selectedDevice);
    console.log('XiaohongshuAutoFollow: selectedDevice 类型:', typeof selectedDevice);
    console.log('XiaohongshuAutoFollow: selectedDevice 是否为空:', selectedDevice === null || selectedDevice === undefined);
    if (selectedDevice) {
      console.log('XiaohongshuAutoFollow: 设备详情:', {
        id: selectedDevice.id,
        name: selectedDevice.name,
        status: selectedDevice.status
      });
    }
  }, [selectedDevice]);

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
      console.log('🔍 DEBUG: selectedDevice 对象:', selectedDevice);
      console.log('🔍 DEBUG: selectedDevice.phone_name:', selectedDevice.phone_name);
      console.log('🔍 DEBUG: selectedDevice.id:', selectedDevice.id);
      await XiaohongshuService.initializeService(selectedDevice.phone_name);
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

      <Card 
        title={
          <div className="flex items-center justify-between">
            <span>设备信息</span>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={detectDevices}
              loading={loading}
            >
              刷新设备
            </Button>
          </div>
        }
        className="mb-4" 
        size="small"
      >
        {availableDevices.length > 0 && (
          <div>
            <div className="mb-3">
              <Text>选择设备：</Text>
              <Checkbox.Group
                value={selectedDevices}
                onChange={(values) => {
                  setSelectedDevices(values);
                  if (values.length > 0) {
                    // 使用第一个选中的设备
                    const firstSelectedId = values[0];
                    const device = availableDevices.find(d => d.id.toString() === firstSelectedId);
                    if (device) {
                      setSelectedDevice(device);
                    }
                  } else {
                    setSelectedDevice(null);
                  }
                }}
                className="w-full"
              >
                <Row>
                  {availableDevices.map(device => (
                    <Col span={24} key={device.id} className="mb-2">
                      <Checkbox value={device.id.toString()}>
                        <Tag color="blue" icon={<AndroidOutlined />}>
                          {device.name}
                        </Tag>
                        <Text className="ml-2">状态: </Text>
                        <Tag color={device.status === 'connected' ? 'green' : 'red'}>
                          {device.status === 'connected' ? '已连接' : '未连接'}
                        </Tag>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </div>
            
            {selectedDevice && (
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <Text strong>当前选中设备：</Text>
                <br />
                <Tag color="blue" icon={<AndroidOutlined />}>
                  {selectedDevice.name}
                </Tag>
                <Text className="ml-2">状态: </Text>
                <Tag color={selectedDevice.status === 'connected' ? 'green' : 'red'}>
                  {selectedDevice.status === 'connected' ? '已连接' : '未连接'}
                </Tag>
              </div>
            )}
          </div>
        )}
        
        {availableDevices.length === 0 && loading && (
          <div className="text-center py-4">
            <Spin />
            <Text className="ml-2">正在检测设备...</Text>
          </div>
        )}
        
        {availableDevices.length === 0 && !loading && (
          <Alert 
            type="warning" 
            message="未检测到设备" 
            description="请确保设备已连接并启用USB调试，然后点击刷新设备"
            action={
              <Button size="small" onClick={detectDevices}>
                重新检测
              </Button>
            }
          />
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