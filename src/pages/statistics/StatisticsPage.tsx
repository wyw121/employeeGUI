import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../../components/common';
import type { FollowStatistics } from '../../types';

/**
 * 关注统计页面
 * 显示关注数据、费用统计和任务进度
 */
export const StatisticsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<FollowStatistics>({
    total_follows: 0,
    daily_follows: 0,
    success_rate: 0,
    cost_today: 0,
    cost_total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // 模拟获取统计数据
  useEffect(() => {
    const fetchStatistics = async () => {
      // 模拟API调用延迟
      setTimeout(() => {
        setStatistics({
          total_follows: 1250,
          daily_follows: 45,
          success_rate: 92.5,
          cost_today: 4.5,
          cost_total: 125.0
        });
        setIsLoading(false);
      }, 1000);
    };

    fetchStatistics();
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    icon?: string;
  }> = ({ title, value, subtitle, color = 'bg-white', icon }) => (
    <div className={`${color} overflow-hidden shadow rounded-lg`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon && <span className="text-2xl">{icon}</span>}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
              {subtitle && (
                <dd className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">关注统计</h1>
        <div className="text-center py-12">
          <div className="text-gray-500">正在加载统计数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">关注统计</h1>
        <p className="mt-2 text-sm text-gray-700">
          查看关注数据、成功率和费用统计
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总关注人数"
          value={statistics.total_follows.toLocaleString()}
          subtitle="累计关注用户数"
          color="bg-blue-50 border border-blue-200"
          icon="👥"
        />
        <StatCard
          title="今日新增关注"
          value={statistics.daily_follows.toLocaleString()}
          subtitle="今日关注数量"
          color="bg-green-50 border border-green-200"
          icon="📈"
        />
        <StatCard
          title="关注成功率"
          value={`${statistics.success_rate}%`}
          subtitle="成功关注比例"
          color="bg-purple-50 border border-purple-200"
          icon="🎯"
        />
        <StatCard
          title="今日费用"
          value={`¥${statistics.cost_today.toFixed(2)}`}
          subtitle="今日消费金额"
          color="bg-orange-50 border border-orange-200"
          icon="💰"
        />
      </div>

      {/* 费用详情 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            费用详情
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">总消费金额</span>
              <span className="text-lg font-bold text-gray-900">
                ¥{statistics.cost_total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">平均每次关注成本</span>
              <span className="text-sm text-gray-900">
                ¥{(statistics.cost_total / statistics.total_follows).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-700">今日关注成本</span>
              <span className="text-sm text-gray-900">
                ¥{statistics.cost_today.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 成功率分析 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            成功率分析
          </h3>
          <div className="space-y-4">
            <ProgressBar
              current={Math.round(statistics.success_rate)}
              total={100}
              label="关注成功率"
              barColor="bg-green-600"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {Math.round((statistics.total_follows * statistics.success_rate) / 100)}
                </div>
                <div className="text-sm text-green-700">成功关注</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {statistics.total_follows - Math.round((statistics.total_follows * statistics.success_rate) / 100)}
                </div>
                <div className="text-sm text-red-700">关注失败</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 使用提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">注意事项</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 费用仅在关注成功后才会扣除</li>
          <li>• 重复关注同一用户不会重复扣费</li>
          <li>• 数据每小时自动同步更新</li>
          <li>• 如有异常请及时联系管理员</li>
        </ul>
      </div>
    </div>
  );
};
