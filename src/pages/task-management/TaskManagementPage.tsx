import React, { useState, useEffect } from 'react';
import { ContactFollowForm, PreciseAcquisitionForm } from '../../components/task';
import type { Platform, Device } from '../../types';

/**
 * 任务管理页面
 * 包含通讯录关注和精准获客两个核心功能
 */
export const TaskManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contact' | 'acquisition'>('contact');
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

  // 通讯录关注提交
  const handleContactSubmit = async (data: {
    platform: Platform;
    file: File;
    selectedDevices: number[];
  }) => {
    setIsLoading(true);
    try {
      console.log('提交通讯录关注任务:', data);
      // 这里调用后端API
      alert('任务已提交，开始执行关注操作');
    } catch (error) {
      console.error('任务提交失败:', error);
      alert('任务提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            暂无可用设备
          </h3>
          <p className="text-yellow-700">
            请先到设备管理页面连接设备后再执行任务操作。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
        <p className="mt-2 text-sm text-gray-700">
          通讯录关注和精准获客操作平台
        </p>
      </div>

      {/* 任务类型选择标签 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contact')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contact'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📇 通讯录关注
          </button>
          <button
            onClick={() => setActiveTab('acquisition')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'acquisition'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎯 精准获客
          </button>
        </nav>
      </div>

      {/* 任务表单内容 */}
      <div className="min-h-screen">
        {activeTab === 'contact' ? (
          <ContactFollowForm
            platform={platform}
            onPlatformChange={setPlatform}
            balance={balance}
            onSubmit={handleContactSubmit}
            availableDevices={availableDevices}
            selectedDevices={selectedDevices}
            onDeviceSelectionChange={setSelectedDevices}
            isLoading={isLoading}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
};
