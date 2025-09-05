import React, { useState, useRef } from 'react';
import type { Platform } from '../../types';
import { PlatformSelector, BalanceDisplay, ProgressBar } from '../common';

interface ContactFollowFormProps {
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  balance: number;
  onSubmit: (data: {
    platform: Platform;
    file: File;
    selectedDevices: number[];
  }) => void;
  availableDevices: Array<{ id: number; name: string; phone_name: string }>;
  selectedDevices: number[];
  onDeviceSelectionChange: (deviceIds: number[]) => void;
  isLoading?: boolean;
  totalContacts?: number;
  processedContacts?: number;
}

/**
 * 通讯录关注表单组件
 * 处理文件上传、设备选择和任务提交
 */
export const ContactFollowForm: React.FC<ContactFollowFormProps> = ({
  platform,
  onPlatformChange,
  balance,
  onSubmit,
  availableDevices,
  selectedDevices,
  onDeviceSelectionChange,
  isLoading = false,
  totalContacts = 0,
  processedContacts = 0
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 这里可以预估费用，假设每个关注0.1元
      // 实际应该根据文件内容计算
      setEstimatedCost(0); // 需要解析文件后计算
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || selectedDevices.length === 0) return;
    
    if (estimatedCost > balance) {
      alert('余额不足，请充值后再试');
      return;
    }

    onSubmit({
      platform,
      file: selectedFile,
      selectedDevices
    });
  };

  const handleDeviceToggle = (deviceId: number) => {
    const newSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId];
    onDeviceSelectionChange(newSelection);
  };

  const handleSelectAllDevices = () => {
    const allDeviceIds = availableDevices.map(d => d.id);
    const allSelected = allDeviceIds.every(id => selectedDevices.includes(id));
    onDeviceSelectionChange(allSelected ? [] : allDeviceIds);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">通讯录关注</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 平台选择 */}
        <PlatformSelector
          selectedPlatform={platform}
          onPlatformChange={onPlatformChange}
          availablePlatforms={['xiaohongshu', 'douyin']}
        />

        {/* 余额显示 */}
        <BalanceDisplay balance={balance} />

        {/* 文件上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上传通讯录文件
          </label>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {selectedFile && (
            <div className="mt-2 text-sm text-gray-600">
              已选择: {selectedFile.name}
            </div>
          )}
        </div>

        {/* 数据统计 */}
        {totalContacts > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">数据统计</span>
              <span className="text-sm text-gray-500">
                总共 {totalContacts} 条数据
              </span>
            </div>
            {processedContacts > 0 && (
              <ProgressBar
                current={processedContacts}
                total={totalContacts}
                label="处理进度"
              />
            )}
          </div>
        )}

        {/* 设备选择 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              选择设备 ({selectedDevices.length}/{availableDevices.length})
            </label>
            <button
              type="button"
              onClick={handleSelectAllDevices}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              全选/取消全选
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto">
            {availableDevices.map((device) => (
              <label
                key={device.id}
                className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => handleDeviceToggle(device.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    设备 {device.id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {device.name} ({device.phone_name})
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 费用预估 */}
        {estimatedCost > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-yellow-800 font-medium">预估费用</span>
              <span className="text-yellow-900 font-bold">¥{estimatedCost.toFixed(2)}</span>
            </div>
            {estimatedCost > balance && (
              <div className="mt-2 text-red-600 text-sm">
                余额不足，请先充值
              </div>
            )}
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || selectedDevices.length === 0 || isLoading || estimatedCost > balance}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '处理中...' : '开始关注'}
          </button>
        </div>
      </form>
    </div>
  );
};
