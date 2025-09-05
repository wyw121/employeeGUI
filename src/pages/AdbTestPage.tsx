import {
    AlertCircle,
    CheckCircle2,
    Monitor,
    Play,
    RefreshCw,
    Smartphone,
    Square,
    Wifi,
    WifiOff
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AdbDevice, AdbService } from '../services/leidianAdbService';

export const AdbTestPage: React.FC = () => {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<number>(5555);
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(false);

  // 检查Tauri环境
  useEffect(() => {
    const checkEnvironment = () => {
      const isInsideTauri = typeof window !== 'undefined' &&
                           typeof (window as any).__TAURI__ !== 'undefined';
      setIsTauriEnv(isInsideTauri);
    };

    checkEnvironment();
  }, []);

  // 检查ADB可用性
  useEffect(() => {
    checkAdbAvailability();
  }, []);

  const checkAdbAvailability = async () => {
    try {
      const available = await AdbService.checkAdbAvailable();
      setAdbAvailable(available);
      if (!available) {
        setError('雷电模拟器ADB不可用，请检查路径是否正确');
      }
    } catch (err) {
      setAdbAvailable(false);
      setError(`检查ADB可用性失败: ${err}`);
    }
  };

  const refreshDevices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const deviceList = await AdbService.getDevices();
      setDevices(deviceList);

      // 获取设备详细信息
      const devicesWithInfo = await Promise.all(
        deviceList.map(async (device) => {
          const info = await AdbService.getDeviceInfo(device.id);
          return { ...device, ...info };
        })
      );
      setDevices(devicesWithInfo);
    } catch (err) {
      setError(`获取设备列表失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const connectToLeidian = async () => {
    setConnectionStatus('connecting');
    setError('');
    try {
      const success = await AdbService.connectToLeidian(selectedPort);
      if (success) {
        setConnectionStatus('connected');
        await refreshDevices();
      } else {
        setConnectionStatus('disconnected');
        setError('连接失败');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(`连接雷电模拟器失败: ${err}`);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      await AdbService.disconnect(deviceId);
      await refreshDevices();
    } catch (err) {
      setError(`断开设备失败: ${err}`);
    }
  };

  const restartAdbServer = async () => {
    setIsLoading(true);
    try {
      await AdbService.restartServer();
      setConnectionStatus('disconnected');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待服务器启动
      await refreshDevices();
    } catch (err) {
      setError(`重启ADB服务器失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeviceCommand = async (deviceId: string) => {
    try {
      const result = await AdbService.executeShellCommand(deviceId, 'echo "Hello from ADB!"');
      alert(`设备响应: ${result}`);
    } catch (err) {
      setError(`测试设备命令失败: ${err}`);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAdbStatusText = () => {
    if (adbAvailable === null) return '检查中...';
    return adbAvailable ? '是' : '否';
  };

  const getDeviceStatusColor = (status: string) => {
    if (status === 'device') return 'bg-green-500';
    if (status === 'offline') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      default:
        return '未连接';
    }
  };

  return (
    <PageWrapper
      title="ADB连接测试"
      subtitle="测试与雷电模拟器的ADB连接"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshDevices}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新设备
          </button>
          <button
            onClick={restartAdbServer}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            重启ADB服务
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 环境提示 */}
        {!isTauriEnv && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">开发模式 - 模拟数据</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  当前在Web环境中运行，显示模拟ADB数据。要使用真实ADB功能，请运行:
                  <code className="ml-1 px-2 py-1 bg-yellow-100 rounded text-yellow-800">npm run tauri dev</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ADB状态卡片 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ADB状态</h2>
            {getStatusIcon()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                ADB可用: {getAdbStatusText()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ?
                <Wifi className="w-5 h-5 text-green-500" /> :
                <WifiOff className="w-5 h-5 text-gray-500" />
              }
              <span className="text-sm text-gray-600">
                连接状态: {getConnectionStatusText()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                设备数量: {devices.length}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="port-select" className="text-sm font-medium text-gray-700">端口:</label>
              <select
                id="port-select"
                value={selectedPort}
                onChange={(e) => setSelectedPort(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={connectionStatus === 'connecting'}
              >
                {AdbService.getLeidianPorts().map(port => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>

            <button
              onClick={connectToLeidian}
              disabled={connectionStatus === 'connecting' || !adbAvailable}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connectionStatus === 'connecting' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              连接雷电模拟器
            </button>
          </div>
        </div>

        {/* 设备列表 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">连接的设备</h2>
          </div>

          <div className="p-6">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">没有发现连接的设备</p>
                <p className="text-sm text-gray-400 mt-1">请确保雷电模拟器正在运行并已开启ADB调试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device, index) => (
                  <div key={device.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getDeviceStatusColor(device.status)}`} />
                        <div>
                          <div className="font-medium text-gray-900">{device.id}</div>
                          <div className="text-sm text-gray-500">
                            状态: {device.status}
                            {device.model && ` | 型号: ${device.model}`}
                            {device.product && ` | 产品: ${device.product}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => testDeviceCommand(device.id)}
                          disabled={device.status !== 'device'}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          测试
                        </button>

                        <button
                          onClick={() => disconnectDevice(device.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          断开
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 确保雷电模拟器正在运行</li>
            <li>• 在模拟器中开启ADB调试模式</li>
            <li>• 默认连接端口为5555，如果连接失败可尝试其他端口</li>
            <li>• 连接成功后可以执行各种ADB命令</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};
