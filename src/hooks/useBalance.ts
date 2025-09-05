import { useState, useEffect } from 'react';
import type { UserBalance } from '../types';

/**
 * 余额管理钩子
 * 管理用户余额状态和获取余额信息
 */
export const useBalance = () => {
  const [balance, setBalance] = useState<UserBalance>({
    current_balance: 0,
    total_spent: 0,
    last_updated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);

  // 获取余额信息
  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      // 这里应该调用Tauri命令获取余额
      // 暂时使用模拟数据
      setTimeout(() => {
        setBalance({
          current_balance: 1000,
          total_spent: 125.50,
          last_updated: new Date().toISOString()
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setIsLoading(false);
    }
  };

  // 检查余额是否足够
  const checkBalance = (requiredAmount: number): boolean => {
    return balance.current_balance >= requiredAmount;
  };

  // 扣除余额
  const deductBalance = async (amount: number): Promise<boolean> => {
    try {
      if (!checkBalance(amount)) {
        return false;
      }
      // 这里应该调用Tauri命令扣除余额
      setBalance(prev => ({
        ...prev,
        current_balance: prev.current_balance - amount,
        total_spent: prev.total_spent + amount,
        last_updated: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('Failed to deduct balance:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return {
    balance: balance.current_balance,
    totalSpent: balance.total_spent,
    lastUpdated: balance.last_updated,
    isLoading,
    fetchBalance,
    checkBalance,
    deductBalance
  };
};
