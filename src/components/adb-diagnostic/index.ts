/**
 * ADB 诊断模块统一导出文件
 * 提供完整的 ADB 诊断功能模块
 */

// 服务层
export { LogManager } from '../../services/adb-diagnostic/LogManager';
export { EnhancedAdbDiagnosticService } from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';

// 组件层
export { AdbDashboard } from './AdbDashboard';
export { LogViewer } from './LogViewer';
export { EnhancedDeviceManager } from './EnhancedDeviceManager';

// Hooks层
export {
  useLogManager,
  useAdbDiagnostic,
  useDeviceMonitor,
  useNotification
} from './hooks';

// 类型定义
export type {
  UseLogManagerReturn,
  UseAdbDiagnosticReturn,
  UseDeviceMonitorReturn,
  DeviceMonitorData,
  UseNotificationReturn,
  NotificationItem
} from './hooks';

// LogManager 相关类型
export {
  LogLevel,
  LogCategory,
  logManager
} from '../../services/adb-diagnostic/LogManager';

export type {
  LogEntry,
  LogFilter,
  LogExportOptions
} from '../../services/adb-diagnostic/LogManager';

// 增强诊断服务相关类型
export {
  DiagnosticStatus
} from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';

export type {
  DiagnosticResult,
  SystemInfo,
  DeviceInfo,
  AutoFixResult
} from '../../services/adb-diagnostic/EnhancedAdbDiagnosticService';