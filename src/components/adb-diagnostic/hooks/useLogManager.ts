import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LogManager, 
  LogEntry, 
  LogFilter, 
  LogLevel, 
  LogCategory,
  LogExportOptions,
  logManager 
} from '../../../services/adb-diagnostic/LogManager';

export interface UseLogManagerReturn {
  // 日志数据
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  logStats: ReturnType<LogManager['getLogStats']>;
  
  // 过滤和搜索
  filter: LogFilter;
  setFilter: (filter: LogFilter) => void;
  clearFilter: () => void;
  
  // 日志操作
  addLog: (level: LogLevel, category: LogCategory, source: string, message: string, details?: any, deviceId?: string) => void;
  clearLogs: (filter?: LogFilter) => void;
  exportLogs: (options: LogExportOptions) => Promise<string>;
  
  // 便捷方法
  debug: (category: LogCategory, source: string, message: string, details?: any, deviceId?: string) => void;
  info: (category: LogCategory, source: string, message: string, details?: any, deviceId?: string) => void;
  warn: (category: LogCategory, source: string, message: string, details?: any, deviceId?: string) => void;
  error: (category: LogCategory, source: string, message: string, details?: any, deviceId?: string) => void;
  
  // 状态
  isLoading: boolean;
  isExporting: boolean;
}

/**
 * useLogManager Hook
 * 提供日志管理的响应式接口
 */
export const useLogManager = (initialFilter?: LogFilter): UseLogManagerReturn => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilterState] = useState<LogFilter>(initialFilter || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 初始化和清理
  useEffect(() => {
    setIsLoading(true);
    
    // 获取初始日志
    const initialLogs = logManager.getLogs();
    setLogs(initialLogs);
    
    // 订阅日志更新
    unsubscribeRef.current = logManager.addListener((newLogs) => {
      setLogs(newLogs);
    });
    
    setIsLoading(false);

    // 清理函数
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // 计算过滤后的日志
  const filteredLogs = logs.filter(log => {
    if (!filter || Object.keys(filter).length === 0) return true;
    return logManager.getLogs(filter).includes(log);
  });

  // 计算日志统计
  const logStats = logManager.getLogStats();

  // 设置过滤器
  const setFilter = useCallback((newFilter: LogFilter) => {
    setFilterState(newFilter);
  }, []);

  // 清除过滤器
  const clearFilter = useCallback(() => {
    setFilterState({});
  }, []);

  // 添加日志
  const addLog = useCallback((
    level: LogLevel,
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ) => {
    logManager.log(level, category, source, message, details, deviceId);
  }, []);

  // 清除日志
  const clearLogs = useCallback((clearFilter?: LogFilter) => {
    logManager.clearLogs(clearFilter);
  }, []);

  // 导出日志
  const exportLogs = useCallback(async (options: LogExportOptions): Promise<string> => {
    setIsExporting(true);
    try {
      const exportData = await logManager.exportLogs(options);
      return exportData;
    } finally {
      setIsExporting(false);
    }
  }, []);

  // 便捷日志方法
  const debug = useCallback((
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ) => {
    logManager.debug(category, source, message, details, deviceId);
  }, []);

  const info = useCallback((
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ) => {
    logManager.info(category, source, message, details, deviceId);
  }, []);

  const warn = useCallback((
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ) => {
    logManager.warn(category, source, message, details, deviceId);
  }, []);

  const error = useCallback((
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ) => {
    logManager.error(category, source, message, details, deviceId);
  }, []);

  return {
    // 数据
    logs,
    filteredLogs,
    logStats,
    
    // 过滤
    filter,
    setFilter,
    clearFilter,
    
    // 操作
    addLog,
    clearLogs,
    exportLogs,
    
    // 便捷方法
    debug,
    info,
    warn,
    error,
    
    // 状态
    isLoading,
    isExporting
  };
};