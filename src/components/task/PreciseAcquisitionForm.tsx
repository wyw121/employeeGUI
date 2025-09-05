import React, { useState } from 'react';
import type { Platform } from '../../types';
import { PlatformSelector, BalanceDisplay } from '../common';
import { SAMPLE_KEYWORDS, SAMPLE_CITIES } from '../../constants';

interface PreciseAcquisitionFormProps {
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  balance: number;
  onSubmit: (data: {
    platform: Platform;
    searchKeywords: string[];
    competitorAccounts: string[];
    targetKeywords: string[];
    targetCount: number;
    preferenceTags: string[];
    selectedDevices: number[];
  }) => void;
  availableDevices: Array<{ id: number; name: string; phone_name: string }>;
  selectedDevices: number[];
  onDeviceSelectionChange: (deviceIds: number[]) => void;
  isLoading?: boolean;
  collectedCount?: number;
}

/**
 * 精准获客表单组件
 * 处理同行监控、关键词设置和AI生成
 */
export const PreciseAcquisitionForm: React.FC<PreciseAcquisitionFormProps> = ({
  platform,
  onPlatformChange,
  balance,
  onSubmit,
  availableDevices,
  selectedDevices,
  onDeviceSelectionChange,
  isLoading = false,
  collectedCount = 0
}) => {
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [competitorAccounts, setCompetitorAccounts] = useState<string[]>([]);
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [targetCount, setTargetCount] = useState(100);
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  
  const [searchInput, setSearchInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const addSearchKeyword = () => {
    if (searchInput.trim() && !searchKeywords.includes(searchInput.trim())) {
      setSearchKeywords([...searchKeywords, searchInput.trim()]);
      setSearchInput('');
    }
  };

  const addCompetitorAccount = () => {
    if (competitorInput.trim() && !competitorAccounts.includes(competitorInput.trim())) {
      setCompetitorAccounts([...competitorAccounts, competitorInput.trim()]);
      setCompetitorInput('');
    }
  };

  const addTargetKeyword = () => {
    if (keywordInput.trim() && !targetKeywords.includes(keywordInput.trim())) {
      setTargetKeywords([...targetKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const addPreferenceTag = () => {
    if (tagInput.trim() && !preferenceTags.includes(tagInput.trim())) {
      setPreferenceTags([...preferenceTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const addSampleKeywords = (keywords: string[]) => {
    const newKeywords = keywords.filter(k => !targetKeywords.includes(k));
    setTargetKeywords([...targetKeywords, ...newKeywords]);
  };

  const removeItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    setter(array.filter(i => i !== item));
  };

  const generateLongTailKeywords = async () => {
    // 这里应该调用AI接口生成长尾词
    // 暂时模拟生成
    if (searchKeywords.length === 0) {
      alert('请先添加搜索关键词');
      return;
    }
    
    const generated = searchKeywords.flatMap(keyword => [
      `如何${keyword}`,
      `${keyword}推荐`,
      `${keyword}哪个好`,
      `${keyword}多少钱`
    ]);
    
    const newKeywords = generated.filter(k => !targetKeywords.includes(k));
    setTargetKeywords([...targetKeywords, ...newKeywords]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchKeywords.length === 0 || competitorAccounts.length === 0 || selectedDevices.length === 0) {
      alert('请完善必填信息');
      return;
    }

    const estimatedCost = targetCount * 0.1; // 假设每个用户0.1元
    if (estimatedCost > balance) {
      alert('余额不足，请充值后再试');
      return;
    }

    onSubmit({
      platform,
      searchKeywords,
      competitorAccounts,
      targetKeywords,
      targetCount,
      preferenceTags,
      selectedDevices
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">精准获客 (同行监控)</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 平台选择 */}
        <PlatformSelector
          selectedPlatform={platform}
          onPlatformChange={onPlatformChange}
          availablePlatforms={['xiaohongshu', 'douyin']}
        />

        {/* 余额显示 */}
        <BalanceDisplay balance={balance} />

        {/* 搜索关键词 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索条件 (关键词/长尾词) *
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="输入搜索关键词"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={addSearchKeyword}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeItem(searchKeywords, keyword, setSearchKeywords)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-indigo-400 hover:text-indigo-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 同行账号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            同行账号ID *
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              placeholder="输入同行账号ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={addCompetitorAccount}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {competitorAccounts.map((account) => (
              <span
                key={account}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {account}
                <button
                  type="button"
                  onClick={() => removeItem(competitorAccounts, account, setCompetitorAccounts)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-green-400 hover:text-green-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 目标关键词 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              目标关键词 (评论监控)
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => addSampleKeywords(SAMPLE_KEYWORDS)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                添加常用词
              </button>
              <button
                type="button"
                onClick={() => addSampleKeywords(SAMPLE_CITIES)}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                添加城市
              </button>
              <button
                type="button"
                onClick={generateLongTailKeywords}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                AI生成长尾词
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="输入目标关键词"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={addTargetKeyword}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
            >
              添加
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {targetKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeItem(targetKeywords, keyword, setTargetKeywords)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-yellow-400 hover:text-yellow-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 目标数量 */}
        <div>
          <label htmlFor="target-count" className="block text-sm font-medium text-gray-700 mb-2">
            目标收集用户数量
          </label>
          <input
            id="target-count"
            type="number"
            min="1"
            max="10000"
            value={targetCount}
            onChange={(e) => setTargetCount(parseInt(e.target.value) || 100)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {collectedCount > 0 && (
            <div className="mt-1 text-sm text-gray-500">
              已收集: {collectedCount} 个用户
            </div>
          )}
        </div>

        {/* 偏好标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            偏好标签 (用于过滤帖子)
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="输入偏好标签"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={addPreferenceTag}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferenceTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeItem(preferenceTags, tag, setPreferenceTags)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-purple-400 hover:text-purple-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 设备选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择执行设备 * ({selectedDevices.length}/{availableDevices.length})
          </label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto">
            {availableDevices.map((device) => (
              <div key={device.id} className="flex items-center px-4 py-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={`device-${device.id}`}
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => {
                    const newSelection = selectedDevices.includes(device.id)
                      ? selectedDevices.filter(id => id !== device.id)
                      : [...selectedDevices, device.id];
                    onDeviceSelectionChange(newSelection);
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`device-${device.id}`} className="ml-3 cursor-pointer">
                  <div className="text-sm font-medium text-gray-900">
                    设备 {device.id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {device.name} ({device.phone_name})
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || searchKeywords.length === 0 || competitorAccounts.length === 0 || selectedDevices.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '启动中...' : '开始获客'}
          </button>
        </div>
      </form>
    </div>
  );
};
