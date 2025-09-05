import { BarChart3, CheckCircle, Clock, TrendingUp, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ContactStatistics as ContactStatsType, Platform } from '../../types';

export const ContactStatistics: React.FC = () => {
  const [statistics, setStatistics] = useState<ContactStatsType | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // 模拟统计数据
  useEffect(() => {
    setStatistics({
      totalContacts: 1250,
      successfulContacts: 890,
      failedContacts: 360,
      successRate: 71.2,
      avgResponseTime: 4.5,
      platformBreakdown: {
        wechat: {
          total: 450,
          successful: 320,
          failed: 130
        },
        qq: {
          total: 300,
          successful: 210,
          failed: 90
        },
        xiaohongshu: {
          total: 250,
          successful: 180,
          failed: 70
        },
        douyin: {
          total: 150,
          successful: 120,
          failed: 30
        },
        weibo: {
          total: 100,
          successful: 60,
          failed: 40
        }
      }
    });
  }, [timeRange]);

  const timeRangeOptions = [
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'all', label: '全部' }
  ];

  const platformLabels: Record<Platform, string> = {
    wechat: '微信',
    qq: 'QQ',
    xiaohongshu: '小红书',
    douyin: '抖音',
    weibo: '微博',
    kuaishou: '快手',
    bilibili: 'B站'
  };

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">联系统计</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {timeRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总联系数</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalContacts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">成功联系</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.successfulContacts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">联系失败</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.failedContacts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-indigo-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">成功率</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 平台分布 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">平台分布</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(statistics.platformBreakdown).map(([platform, data]) => {
            const platformKey = platform as Platform;
            const successRate = data ? (data.successful / data.total) * 100 : 0;

            return (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="w-16 text-sm font-medium text-gray-700">
                    {platformLabels[platformKey] || platform}
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="relative">
                      <div className="flex mb-1">
                        <span className="text-xs text-gray-500">
                          总数: {data?.total || 0}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          成功率: {successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(successRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-green-600 font-medium">
                      ✓ {data?.successful || 0}
                    </span>
                    <span className="text-red-600 font-medium">
                      ✗ {data?.failed || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 其他统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">响应时间</h3>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{statistics.avgResponseTime}秒</p>
            <p className="text-sm text-gray-500 mt-1">平均响应时间</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">联系趋势</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">今日新增</span>
              <span className="text-sm font-medium text-green-600">+42</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">本周新增</span>
              <span className="text-sm font-medium text-green-600">+286</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">本月新增</span>
              <span className="text-sm font-medium text-green-600">+1,152</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
