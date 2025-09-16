import React from 'react';

interface BalanceDisplayProps {
  balance: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * 余额显示组件
 * 统一的余额显示UI，支持加载状态
 */
export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balance,
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-green-700 font-medium">当前余额</span>
        {isLoading ? (
          <div className="text-green-600">加载中...</div>
        ) : (
          <span className="text-green-800 font-bold text-lg">
            ¥{balance.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
};

