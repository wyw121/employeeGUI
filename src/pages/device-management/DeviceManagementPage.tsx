import { Plus, Smartphone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DeviceList } from '../../components/device';
import { PageWrapper } from '../../components/layout';
import type { Device } from '../../types';

/**
 * 设备管理页面
 * 允许员工管理最多10台设备的连接状态
 */
export const DeviceManagementPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化设备列表（1-10号设备）
  useEffect(() => {
    const initializeDevices = () => {
      const initialDevices: Device[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Device-${String(i + 1).padStart(2, '0')}`,
        phone_name: `Phone-${i + 1}`,
        status: 'disconnected' as const,
        last_connected: undefined
      }));

      setDevices(initialDevices);
      setIsLoading(false);
    };

    initializeDevices();
  }, []);

  // 连接设备
  const handleConnect = async (device: Device) => {
    try {
      // 这里应该调用后端API连接设备
      // 暂时模拟连接成功
      setDevices(prev => prev.map(d =>
        d.id === device.id
          ? { ...d, status: 'connected', last_connected: new Date().toISOString() }
          : d
      ));
    } catch (error) {
      console.error('Failed to connect device:', error);
      alert('设备连接失败，请重试');
    }
  };

  // 断开设备
  const handleDisconnect = async (device: Device) => {
    try {
      // 这里应该调用后端API断开设备
      // 暂时模拟断开成功
      setDevices(prev => prev.map(d =>
        d.id === device.id
          ? { ...d, status: 'disconnected' }
          : d
      ));
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      alert('设备断开失败，请重试');
    }
  };

  const connectedCount = devices.filter(d => d.status === 'connected').length;

  return (
    <PageWrapper
      title="设备管理"
      subtitle="管理最多10台设备的连接状态，确保任务正常执行"
      icon={<Smartphone className="w-6 h-6 text-indigo-600" />}
      onRefresh={() => window.location.reload()}
      actions={
        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" />
          添加设备
        </button>
      }
    >
      <div className="space-y-6">
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
                {connectedCount}/10
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
                  请先连接设备后再执行任务操作。点击设备卡片中的"连接"按钮开始连接。
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
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isLoading={isLoading}
          />
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">💡</span>
            使用说明
          </h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              系统支持最多10台设备同时连接，确保高效任务执行
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              只有已连接的设备才能参与任务执行
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              任务会根据设备状态智能分配到可用设备
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              请确保设备网络连接稳定，避免任务执行中断
            </li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};
