import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, Button, Select, Alert, Progress, Timeline, Tag, Spin } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

interface AppInfo {
  package_name: string;
  app_name: string;
  version_name?: string;
  is_system_app: boolean;
  main_activity?: string;
}

interface AppStateResult {
  state: string;
  is_functional: boolean;
  message: string;
  checked_elements: number;
  total_checks: number;
}

interface AppLaunchResult {
  success: boolean;
  message: string;
  package_name: string;
  launch_time_ms: number;
  app_state?: AppStateResult;
  ready_time_ms?: number;
  startup_issues: string[];
}

interface Device {
  id: string;
  name: string;
  status: string;
}

/**
 * 应用启动检测测试页面
 * 用于测试和演示新的智能应用启动状态检测功能
 */
const AppLaunchTestPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<AppLaunchResult | null>(null);
  const [launchHistory, setLaunchHistory] = useState<AppLaunchResult[]>([]);

  // 获取设备列表
  useEffect(() => {
    loadDevices();
  }, []);

  // 获取应用列表
  useEffect(() => {
    if (selectedDevice) {
      loadApps();
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      const result = await invoke<Device[]>('get_adb_devices_safe');
      setDevices(result);
      if (result.length > 0) {
        setSelectedDevice(result[0].id);
      }
    } catch (error) {
      console.error('获取设备列表失败:', error);
    }
  };

  const loadApps = async () => {
    if (!selectedDevice) return;
    
    try {
      const result = await invoke<AppInfo[]>('get_device_apps', { 
        deviceId: selectedDevice 
      });
      
      // 过滤出常用应用并排序
      const filteredApps = result
        .filter(app => !app.is_system_app)
        .sort((a, b) => a.app_name.localeCompare(b.app_name));
      
      setApps(filteredApps);
      
      // 默认选择小红书
      const xhsApp = filteredApps.find(app => app.package_name === 'com.xingin.xhs');
      if (xhsApp) {
        setSelectedApp(xhsApp.package_name);
      }
    } catch (error) {
      console.error('获取应用列表失败:', error);
    }
  };

  const handleLaunchApp = async () => {
    if (!selectedDevice || !selectedApp) return;
    
    setIsLaunching(true);
    setLaunchResult(null);

    try {
      const result = await invoke<AppLaunchResult>('launch_device_app', {
        deviceId: selectedDevice,
        packageName: selectedApp
      });
      
      setLaunchResult(result);
      setLaunchHistory(prev => [result, ...prev.slice(0, 9)]); // 保留最近10次
    } catch (error) {
      console.error('启动应用失败:', error);
      setLaunchResult({
        success: false,
        message: `启动失败: ${error}`,
        package_name: selectedApp,
        launch_time_ms: 0,
        startup_issues: [String(error)]
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'Ready': return 'success';
      case 'Loading': return 'processing';
      case 'SplashScreen': return 'warning';
      case 'PermissionDialog': return 'warning';
      case 'LoginRequired': return 'warning';
      case 'NetworkCheck': return 'warning';
      case 'NotStarted': return 'default';
      default: return 'error';
    }
  };

  const getStateText = (state: string): string => {
    const stateMap: { [key: string]: string } = {
      'Ready': '就绪',
      'Loading': '加载中',
      'SplashScreen': '启动画面',
      'PermissionDialog': '权限弹窗',
      'LoginRequired': '需要登录',
      'NetworkCheck': '网络检查',
      'NotStarted': '未启动',
    };
    return stateMap[state] || state;
  };

  const selectedAppInfo = apps.find(app => app.package_name === selectedApp);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">应用启动状态检测测试</h1>
        <p className="text-gray-600">测试新的智能应用启动检测功能，确保应用真正就绪后再执行自动化操作</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 控制面板 */}
        <Card title="控制面板" className="h-fit">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择设备
              </label>
              <Select
                value={selectedDevice}
                onChange={setSelectedDevice}
                className="w-full"
                placeholder="请选择设备"
              >
                {devices.map(device => (
                  <Option key={device.id} value={device.id}>
                    {device.name} ({device.id})
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择应用
              </label>
              <Select
                value={selectedApp}
                onChange={setSelectedApp}
                className="w-full"
                placeholder="请选择应用"
                showSearch
                filterOption={(input, option) =>
                  option?.label?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                }
              >
                {apps.map(app => (
                  <Option key={app.package_name} value={app.package_name}>
                    {app.app_name} ({app.package_name})
                  </Option>
                ))}
              </Select>
            </div>

            {selectedAppInfo && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>应用名称:</strong> {selectedAppInfo.app_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>包名:</strong> {selectedAppInfo.package_name}
                </p>
                {selectedAppInfo.version_name && (
                  <p className="text-sm text-gray-600">
                    <strong>版本:</strong> {selectedAppInfo.version_name}
                  </p>
                )}
                {selectedAppInfo.main_activity && (
                  <p className="text-sm text-gray-600">
                    <strong>主Activity:</strong> {selectedAppInfo.main_activity}
                  </p>
                )}
              </div>
            )}

            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleLaunchApp}
              disabled={!selectedDevice || !selectedApp || isLaunching}
              loading={isLaunching}
              className="w-full"
            >
              {isLaunching ? '启动中...' : '启动应用并检测状态'}
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={loadDevices}
              className="w-full"
            >
              刷新设备列表
            </Button>
          </div>
        </Card>

        {/* 启动结果 */}
        <Card title="启动结果" className="h-fit">
          {isLaunching && (
            <div className="text-center p-6">
              <Spin size="large" />
              <p className="mt-4 text-gray-600">正在启动应用并检测状态...</p>
              <p className="text-sm text-gray-500">这可能需要15-45秒</p>
            </div>
          )}

          {launchResult && (
            <div className="space-y-4">
              <Alert
                type={launchResult.success ? 'success' : 'error'}
                message={launchResult.success ? '启动成功' : '启动失败'}
                description={launchResult.message}
                showIcon
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">启动时间</p>
                  <p className="text-lg font-semibold">{launchResult.launch_time_ms}ms</p>
                </div>
                {launchResult.ready_time_ms && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">就绪时间</p>
                    <p className="text-lg font-semibold">{launchResult.ready_time_ms}ms</p>
                  </div>
                )}
              </div>

              {launchResult.app_state && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">应用状态</p>
                    <Tag color={getStateColor(launchResult.app_state.state)} className="text-sm">
                      {getStateText(launchResult.app_state.state)}
                    </Tag>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">检测进度</p>
                    <Progress 
                      percent={Math.round((launchResult.app_state.checked_elements / launchResult.app_state.total_checks) * 100)}
                      format={() => `${launchResult.app_state?.checked_elements}/${launchResult.app_state?.total_checks}`}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">状态消息</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {launchResult.app_state.message}
                    </p>
                  </div>
                </div>
              )}

              {launchResult.startup_issues.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">启动问题</p>
                  <ul className="text-sm text-red-600">
                    {launchResult.startup_issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 历史记录 */}
      {launchHistory.length > 0 && (
        <Card title="启动历史" className="mt-6">
          <Timeline>
            {launchHistory.map((result, index) => (
              <Timeline.Item 
                key={index}
                color={result.success ? 'green' : 'red'}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {apps.find(app => app.package_name === result.package_name)?.app_name || result.package_name}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {result.launch_time_ms}ms
                    </span>
                    {result.app_state && (
                      <Tag 
                        color={getStateColor(result.app_state.state)} 
                        className="ml-2 text-xs"
                      >
                        {getStateText(result.app_state.state)}
                      </Tag>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      {/* 功能说明 */}
      <Card title="功能说明" className="mt-6">
        <div className="prose max-w-none">
          <h4>新的应用启动检测功能特点：</h4>
          <ul>
            <li><strong>多层次检测</strong>：从进程启动到UI就绪的完整检测链</li>
            <li><strong>智能超时</strong>：针对不同应用的自适应超时设置</li>
            <li><strong>状态识别</strong>：识别启动画面、权限弹窗、登录页面等中间状态</li>
            <li><strong>小红书专用</strong>：特别优化了小红书应用的首页检测逻辑</li>
            <li><strong>详细报告</strong>：提供完整的启动时间线和问题诊断</li>
          </ul>
          
          <h4>支持的应用状态：</h4>
          <ul>
            <li><Tag color="success">Ready</Tag> - 应用完全就绪，可以执行自动化操作</li>
            <li><Tag color="processing">Loading</Tag> - 应用正在加载中</li>
            <li><Tag color="warning">SplashScreen</Tag> - 停留在启动画面</li>
            <li><Tag color="warning">PermissionDialog</Tag> - 需要处理权限弹窗</li>
            <li><Tag color="warning">LoginRequired</Tag> - 需要用户登录</li>
            <li><Tag color="warning">NetworkCheck</Tag> - 网络连接检查中</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AppLaunchTestPage;