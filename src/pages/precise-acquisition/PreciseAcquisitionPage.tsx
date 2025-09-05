import React, { useEffect, useState } from 'react';
import { PreciseAcquisitionForm } from '../../components/task';
import type { Device, Platform } from '../../types';

/**
 * 精准获客页面
 * 专注于精准获客功能
 */
export const PreciseAcquisitionPage: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>('xiaohongshu');
  const [balance] = useState(1000); // 示例余额
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取可用设备列表（仅已连接的设备）
  useEffect(() => {
    // 模拟获取已连接设备
    const connectedDevices: Device[] = [
      { id: 1, name: 'Device-01', phone_name: 'Phone-1', status: 'connected' },
      { id: 2, name: 'Device-02', phone_name: 'Phone-2', status: 'connected' },
      { id: 3, name: 'Device-03', phone_name: 'Phone-3', status: 'connected' }
    ];
    setDevices(connectedDevices);
  }, []);

  // 精准获客提交
  const handleAcquisitionSubmit = async (data: {
    platform: Platform;
    searchKeywords: string[];
    competitorAccounts: string[];
    targetKeywords: string[];
    targetCount: number;
    preferenceTags: string[];
    selectedDevices: number[];
  }) => {
    setIsLoading(true);
    try {
      console.log('提交精准获客任务:', data);
      // 这里调用后端API
      alert('任务已提交，开始执行获客操作');
    } catch (error) {
      console.error('任务提交失败:', error);
      alert('任务提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 转换设备数据格式
  const availableDevices = devices.map(d => ({
    id: d.id,
    name: d.name,
    phone_name: d.phone_name
  }));

  if (devices.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">精准获客</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            暂无可用设备
          </h3>
          <p className="text-yellow-700">
            请先到设备管理页面连接设备后再执行获客操作。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">精准获客</h1>
        <p className="mt-2 text-sm text-gray-700">
          基于关键词和竞对分析的精准用户获取平台
        </p>
      </div>

      {/* 精准获客表单 */}
      <div className="min-h-screen">
        <PreciseAcquisitionForm
          platform={platform}
          onPlatformChange={setPlatform}
          balance={balance}
          onSubmit={handleAcquisitionSubmit}
          availableDevices={availableDevices}
          selectedDevices={selectedDevices}
          onDeviceSelectionChange={setSelectedDevices}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
