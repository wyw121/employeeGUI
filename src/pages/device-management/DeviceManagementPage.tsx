import React, { useState, useEffect } from 'react';
import { DeviceList } from '../../components/device';
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
  const handleConnect = async (deviceId: number) => {
    try {
      // 这里应该调用后端API连接设备
      // 暂时模拟连接成功
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'connected', last_connected: new Date().toISOString() }
          : device
      ));
    } catch (error) {
      console.error('Failed to connect device:', error);
      alert('设备连接失败，请重试');
    }
  };

  // 断开设备
  const handleDisconnect = async (deviceId: number) => {
    try {
      // 这里应该调用后端API断开设备
      // 暂时模拟断开成功
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'disconnected' }
          : device
      ));
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      alert('设备断开失败，请重试');
    }
  };

  const connectedCount = devices.filter(d => d.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理和监控最多10台设备的连接状态
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <span className="text-indigo-700 font-medium">已连接设备:</span>
              <span className="text-indigo-800 font-bold text-lg">
                {connectedCount}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 设备状态提示 */}
      {connectedCount === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                暂无已连接设备
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                请先连接设备后再执行任务操作。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 设备列表 */}
      <DeviceList
        devices={devices}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isLoading={isLoading}
      />

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">使用说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 系统支持最多10台设备同时连接</li>
          <li>• 只有已连接的设备才能执行任务</li>
          <li>• 任务会自动分配到已连接的设备上执行</li>
          <li>• 请确保设备网络连接稳定</li>
        </ul>
      </div>
    </div>
  );
};
