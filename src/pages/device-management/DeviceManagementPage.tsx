import { Plus, Smartphone } from 'lucide-react';
import React, { useEffect } from 'react';
import { DeviceList } from '../../components/device';
import { PageWrapper } from '../../components/layout';
import { useDevices, useSelectedDevice, useDeviceLoading, useDeviceError, useDeviceActions } from '../../store/deviceStore';
import { message } from 'antd';

/**
 * 设备管理页面
 * 允许员工管理设备的连接状态 - 使用全局设备状态
 */
export const DeviceManagementPage: React.FC = () => {
  // 使用全局设备状态
  const devices = useDevices();
  const selectedDevice = useSelectedDevice();
  const isLoading = useDeviceLoading();
  const error = useDeviceError();
  const { initializeAdb, refreshDevices, setSelectedDevice } = useDeviceActions();

  // 初始化ADB和设备列表
  useEffect(() => {
    const initDevices = async () => {
      try {
        await initializeAdb();
        await refreshDevices();
      } catch (error) {
        console.error('初始化设备管理失败:', error);
        message.error('设备管理初始化失败');
      }
    };

    initDevices();
  }, [initializeAdb, refreshDevices]);

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    message.success(`已选择设备: ${deviceId}`);
  };

  // 手动刷新设备列表
  const handleRefresh = async () => {
    try {
      await refreshDevices();
    } catch (error) {
      console.error('刷新设备列表失败:', error);
      message.error('刷新失败，请重试');
    }
  };

  const connectedCount = devices.filter(d => d.status === 'device').length;

  return (
    <PageWrapper
      title="设备管理"
      subtitle="管理设备的连接状态，确保任务正常执行"
      icon={<Smartphone className="w-6 h-6 text-indigo-600" />}
      onRefresh={handleRefresh}
      actions={
        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          刷新设备
        </button>
      }
    >
      <div className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-lg">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  设备管理错误
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 设备统计卡片 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-indigo-700 font-medium text-sm">设备连接状态</p>
                <p className="text-indigo-600 text-xs mt-0.5">实时监控设备状态</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-indigo-700 font-medium text-sm block">已连接设备</span>
              <span className="text-indigo-800 font-bold text-2xl">
                {connectedCount}/{devices.length}
              </span>
            </div>
          </div>
        </div>

        {/* 设备状态提示 */}
        {connectedCount === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  暂无已连接设备
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  请先使用ADB连接设备后再执行任务操作。点击"刷新设备"按钮扫描可用设备。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 设备列表 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">设备列表</h3>
            <p className="text-sm text-gray-600 mt-1">管理所有可用设备的连接状态</p>
          </div>
          <DeviceList
            devices={devices}
            selectedDevice={selectedDevice || undefined}
            onDeviceSelect={handleDeviceSelect}
            loading={isLoading}
          />
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">💡</span>
            {' '}
            使用说明
          </h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {' '}
              设备通过ADB自动检测，支持Android手机和模拟器
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {' '}
              只有状态为"device"的设备才能参与任务执行
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {' '}
              任务会根据设备状态智能分配到可用设备
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {' '}
              请确保设备已开启USB调试模式并授权
            </li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};
