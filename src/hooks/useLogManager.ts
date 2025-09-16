/**
 * 日志管理相关的React Hook
 * 管理应用程序日志的读取和过滤，与Tauri后端的日志桥接
 */
import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO格式时间戳
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  source: string;
  message: string;
  details?: string;
  device_id?: string;
  session_id: string;
}

export interface AdbCommandLog {
  command: string;
  args: string[];
  output: string;
  error?: string;
  exit_code?: number;
  duration_ms: number;
  timestamp: string;
}

export interface UseLogManagerReturn {
  logs: LogEntry[];
  adbCommandLogs: AdbCommandLog[];
  filteredLogs: LogEntry[];
  logFilter: {
    level?: string;
    category?: string;
    search?: string;
  };
  setLogFilter: (filter: Partial<{
    level?: string;
    category?: string;
    search?: string;
  }>) => void;
  clearLogs: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  addLogEntry: (level: string, category: string, source: string, message: string, details?: string, deviceId?: string) => Promise<void>;
  isLoading: boolean;
}

export const useLogManager = (): UseLogManagerReturn => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [adbCommandLogs, setAdbCommandLogs] = useState<AdbCommandLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logFilter, setLogFilterState] = useState<{
    level?: string;
    category?: string;
    search?: string;
  }>({});

  const setLogFilter = useCallback((filter: Partial<{
    level?: string;
    category?: string;
    search?: string;
  }>) => {
    setLogFilterState(prev => ({ ...prev, ...filter }));
  }, []);

  const clearLogs = useCallback(async () => {
    try {
      await invoke('clear_logs');
      setLogs([]);
      setAdbCommandLogs([]);
    } catch (error) {
      console.error('清空日志失败:', error);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [generalLogs, commandLogs] = await Promise.all([
        invoke<LogEntry[]>('get_logs'),
        invoke<AdbCommandLog[]>('get_adb_command_logs')
      ]);
      
      setLogs(generalLogs);
      setAdbCommandLogs(commandLogs);
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addLogEntry = useCallback(async (
    level: string,
    category: string,
    source: string,
    message: string,
    details?: string,
    deviceId?: string
  ) => {
    try {
      await invoke('add_log_entry', {
        level,
        category,
        source,
        message,
        details,
        deviceId
      });
    } catch (error) {
      console.error('添加日志条目失败:', error);
    }
  }, []);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    if (logFilter.level && log.level !== logFilter.level) return false;
    if (logFilter.category && log.category !== logFilter.category) return false;
    if (logFilter.search && !log.message.toLowerCase().includes(logFilter.search.toLowerCase())) return false;
    return true;
  });

  // 监听实时日志事件
  useEffect(() => {
    const unlistenLog = listen<LogEntry>('log-entry', (event) => {
      setLogs(prev => [...prev, event.payload]);
    });

    const unlistenAdbLog = listen<AdbCommandLog>('adb-command-log', (event) => {
      setAdbCommandLogs(prev => [...prev, event.payload]);
    });

    const unlistenClear = listen('logs-cleared', () => {
      setLogs([]);
      setAdbCommandLogs([]);
    });

    // 初始化时加载日志
    refreshLogs();

    return () => {
      unlistenLog.then(fn => fn());
      unlistenAdbLog.then(fn => fn());
      unlistenClear.then(fn => fn());
    };
  }, [refreshLogs]);

  return {
    logs,
    adbCommandLogs,
    filteredLogs,
    logFilter,
    setLogFilter,
    clearLogs,
    refreshLogs,
    addLogEntry,
    isLoading
  };
};