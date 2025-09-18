/**
 * 页面分析工具函数
 */

export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = (milliseconds / 1000).toFixed(1);
  return `${seconds}s`;
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const calculateDeduplicationRate = (original: number, afterDedup: number): number => {
  if (original === 0) return 0;
  return ((original - afterDedup) / original) * 100;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};