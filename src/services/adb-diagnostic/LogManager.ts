/**
 * ADB 日志管理系统
 * 高内聚的日志服务，负责日志的记录、存储、查询和导出
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum LogCategory {
  SYSTEM = 'SYSTEM',        // 系统相关
  DEVICE = 'DEVICE',        // 设备相关
  DIAGNOSTIC = 'DIAGNOSTIC', // 诊断相关
  USER_ACTION = 'USER_ACTION' // 用户操作
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  source: string;           // 日志来源（组件名或服务名）
  message: string;
  details?: any;            // 详细信息（对象、堆栈等）
  deviceId?: string;        // 关联的设备ID
  sessionId?: string;       // 会话ID
}

export interface LogFilter {
  levels?: LogLevel[];
  categories?: LogCategory[];
  sources?: string[];
  deviceIds?: string[];
  startTime?: Date;
  endTime?: Date;
  searchText?: string;
}

export interface LogExportOptions {
  format: 'json' | 'csv' | 'txt';
  includeDetails: boolean;
  filter?: LogFilter;
}

/**
 * 日志管理器
 * 职责：日志记录、存储、查询、导出、清理
 */
export class LogManager {
  private static instance: LogManager;
  private logs: LogEntry[] = [];
  private maxLogEntries = 10000; // 最大日志条数
  private sessionId: string;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
  }

  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  /**
   * 记录日志
   */
  public log(
    level: LogLevel,
    category: LogCategory,
    source: string,
    message: string,
    details?: any,
    deviceId?: string
  ): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      source,
      message,
      details,
      deviceId,
      sessionId: this.sessionId
    };

    this.addLogEntry(logEntry);
    this.notifyListeners();
    this.persistToStorage();
  }

  /**
   * 便捷方法：记录调试日志
   */
  public debug(category: LogCategory, source: string, message: string, details?: any, deviceId?: string): void {
    this.log(LogLevel.DEBUG, category, source, message, details, deviceId);
  }

  /**
   * 便捷方法：记录信息日志
   */
  public info(category: LogCategory, source: string, message: string, details?: any, deviceId?: string): void {
    this.log(LogLevel.INFO, category, source, message, details, deviceId);
  }

  /**
   * 便捷方法：记录警告日志
   */
  public warn(category: LogCategory, source: string, message: string, details?: any, deviceId?: string): void {
    this.log(LogLevel.WARN, category, source, message, details, deviceId);
  }

  /**
   * 便捷方法：记录错误日志
   */
  public error(category: LogCategory, source: string, message: string, details?: any, deviceId?: string): void {
    this.log(LogLevel.ERROR, category, source, message, details, deviceId);
  }

  /**
   * 获取过滤后的日志
   */
  public getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (!filter) {
      return filteredLogs;
    }

    // 按级别过滤
    if (filter.levels && filter.levels.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.levels!.includes(log.level));
    }

    // 按分类过滤
    if (filter.categories && filter.categories.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.categories!.includes(log.category));
    }

    // 按来源过滤
    if (filter.sources && filter.sources.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.sources!.includes(log.source));
    }

    // 按设备ID过滤
    if (filter.deviceIds && filter.deviceIds.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        log.deviceId && filter.deviceIds!.includes(log.deviceId)
      );
    }

    // 按时间范围过滤
    if (filter.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
    }

    // 按搜索文本过滤
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取最新的日志（实时日志流）
   */
  public getLatestLogs(count: number = 100): LogEntry[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * 导出日志
   */
  public async exportLogs(options: LogExportOptions): Promise<string> {
    const logs = this.getLogs(options.filter);
    
    switch (options.format) {
      case 'json':
        return this.exportAsJson(logs, options.includeDetails);
      case 'csv':
        return this.exportAsCsv(logs, options.includeDetails);
      case 'txt':
        return this.exportAsTxt(logs, options.includeDetails);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 清理历史日志
   */
  public clearLogs(filter?: LogFilter): void {
    if (!filter) {
      this.logs = [];
    } else {
      const logsToKeep = this.logs.filter(log => !this.matchesFilter(log, filter));
      this.logs = logsToKeep;
    }
    
    this.notifyListeners();
    this.persistToStorage();
  }

  /**
   * 添加日志监听器（用于实时更新UI）
   */
  public addListener(callback: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取日志统计信息
   */
  public getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    currentSession: number;
  } {
    const byLevel = Object.values(LogLevel).reduce((acc, level) => {
      acc[level] = this.logs.filter(log => log.level === level).length;
      return acc;
    }, {} as Record<LogLevel, number>);

    const byCategory = Object.values(LogCategory).reduce((acc, category) => {
      acc[category] = this.logs.filter(log => log.category === category).length;
      return acc;
    }, {} as Record<LogCategory, number>);

    const currentSession = this.logs.filter(log => log.sessionId === this.sessionId).length;

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      currentSession
    };
  }

  // === 私有方法 ===

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 限制日志数量，删除最老的日志
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback([...this.logs]);
      } catch (error) {
        console.error('日志监听器回调出错:', error);
      }
    });
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesFilter(log: LogEntry, filter: LogFilter): boolean {
    return this.matchesBasicFilters(log, filter) && this.matchesSearchFilter(log, filter);
  }

  private matchesBasicFilters(log: LogEntry, filter: LogFilter): boolean {
    if (filter.levels && !filter.levels.includes(log.level)) return false;
    if (filter.categories && !filter.categories.includes(log.category)) return false;
    if (filter.sources && !filter.sources.includes(log.source)) return false;
    if (filter.deviceIds && log.deviceId && !filter.deviceIds.includes(log.deviceId)) return false;
    if (filter.startTime && log.timestamp < filter.startTime) return false;
    if (filter.endTime && log.timestamp > filter.endTime) return false;
    
    return true;
  }

  private matchesSearchFilter(log: LogEntry, filter: LogFilter): boolean {
    if (!filter.searchText) return true;
    
    const searchLower = filter.searchText.toLowerCase();
    return log.message.toLowerCase().includes(searchLower) ||
           log.source.toLowerCase().includes(searchLower) ||
           (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower));
  }

  private exportAsJson(logs: LogEntry[], includeDetails: boolean): string {
    const exportData = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      category: log.category,
      source: log.source,
      message: log.message,
      deviceId: log.deviceId,
      sessionId: log.sessionId,
      ...(includeDetails && log.details && { details: log.details })
    }));

    return JSON.stringify(exportData, null, 2);
  }

  private exportAsCsv(logs: LogEntry[], includeDetails: boolean): string {
    const headers = ['时间', '级别', '分类', '来源', '消息', '设备ID'];
    if (includeDetails) headers.push('详细信息');

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.source,
      `"${log.message.replace(/"/g, '""')}"`,
      log.deviceId || '',
      ...(includeDetails ? [log.details ? JSON.stringify(log.details) : ''] : [])
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private exportAsTxt(logs: LogEntry[], includeDetails: boolean): string {
    return logs.map(log => {
      let line = `[${log.timestamp.toISOString()}] ${log.level} [${log.category}] ${log.source}: ${log.message}`;
      if (log.deviceId) line += ` (设备: ${log.deviceId})`;
      if (includeDetails && log.details) {
        line += `\n  详情: ${JSON.stringify(log.details, null, 2)}`;
      }
      return line;
    }).join('\n\n');
  }

  private loadStoredLogs(): void {
    try {
      const stored = localStorage.getItem('adb_diagnostic_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('加载存储的日志失败:', error);
      this.logs = [];
    }
  }

  private persistToStorage(): void {
    try {
      // 只保存最近的日志到本地存储
      const recentLogs = this.logs.slice(-1000);
      localStorage.setItem('adb_diagnostic_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('保存日志到本地存储失败:', error);
    }
  }
}

// 导出单例实例
export const logManager = LogManager.getInstance();