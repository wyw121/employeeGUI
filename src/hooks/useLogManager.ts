/**
 * 日志管理相关的React Hook
 * 管理应用程序日志的读取和过滤
 */
import { useState, useCallback, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  category: string;
  source: string;
  message: string;
  details?: any;
}

export interface UseLogManagerReturn {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  logFilter: {
    level?: string;
    category?: string;
    search?: string;
  };
  setLogFilter: (filter: Partial<typeof logFilter>) => void;
  clearLogs: () => void;
  refreshLogs: () => void;
}

export const useLogManager = (): UseLogManagerReturn => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilterState] = useState<{
    level?: string;
    category?: string;
    search?: string;
  }>({});

  const setLogFilter = useCallback((filter: Partial<typeof logFilter>) => {
    setLogFilterState(prev => ({ ...prev, ...filter }));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const refreshLogs = useCallback(() => {
    // 这里应该从LogManager获取真实日志
    // 暂时返回模拟数据
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date(),
        level: 'info',
        category: 'SYSTEM',
        source: 'AdbDiagnosticService',
        message: '系统初始化完成'
      }
    ];
    setLogs(mockLogs);
  }, []);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    if (logFilter.level && log.level !== logFilter.level) return false;
    if (logFilter.category && log.category !== logFilter.category) return false;
    if (logFilter.search && !log.message.toLowerCase().includes(logFilter.search.toLowerCase())) return false;
    return true;
  });

  // 初始化时加载日志
  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  return {
    logs,
    filteredLogs,
    logFilter,
    setLogFilter,
    clearLogs,
    refreshLogs
  };
};