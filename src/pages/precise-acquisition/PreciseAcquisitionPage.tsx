import React, { useState } from 'react';
import { PreciseAcquisitionForm } from '../../components/task';
import { useAdb } from '../../application/hooks/useAdb';
import { Platform } from '../../types';

/**
 * 精准获客页面
 * 专注于精准获客功能
 */
export const PreciseAcquisitionPage: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>('xiaohongshu');
  const [balance] = useState(1000); // 示例余额
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 使用统一的ADB接口 - 遵循DDD架构约束
  const { 
    devices, 
    onlineDevices,
    refreshDevices,
    initialize
  } = useAdb();

  // 精准获客提交
  const handleAcquisitionSubmit = async (data: {
    platform: Platform;
    searchKeywords: string[];
    competitorAccounts: string[];
    targetKeywords: string[];
    targetCount: number;
    preferenceTags: string[];
    selectedDevices: string[];
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

  // 转换设备数据格式以兼容现有组件
  const availableDevices = onlineDevices.map(d => ({
    id: d.id,
    name: d.getDisplayName(),
    phone_name: d.id
  }));

  if (onlineDevices.length === 0) {
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
          <button
            onClick={refreshDevices}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            刷新设备列表
          </button>
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

