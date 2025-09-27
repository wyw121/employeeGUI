import { useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  useAdbStore,
  // useDevices, // ✅ 移除废弃的导出，直接使用 useAdbStore
  useSelectedDevice,
  useOnlineDevices,
  useConnection,
  useIsConnected,
  useAdbPath,
  useDiagnosticResults,
  useDiagnosticSummary,
  useHasErrors,
  useIsLoading,
  useIsInitializing,
  useLastError,
  useAdbActions
} from '../store/adbStore';
import { AdbConfig } from '../../domain/adb';
import { ServiceFactory } from '../services/ServiceFactory';
// 统一策略/字段规范化工具（与网格检查器一致）
import { toBackendStrategy, normalizeFieldsAndValues, normalizeIncludes, normalizeExcludes } from '../../components/universal-ui/views/grid-view/panels/node-detail';

/**
 * 统一的ADB Hook
 * 
 * 作为React组件与ADB功能的唯一接口，
 * 提供所有ADB相关的状态和操作方法
 */
export const useAdb = () => {
  const applicationService = useMemo(() => ServiceFactory.getAdbApplicationService(), []);
  const initializeRef = useRef<Promise<void> | null>(null);

  // ===== 状态选择器 =====
  
  // 设备相关状态
  const devices = useAdbStore(state => state.devices); // ✅ 直接使用 store
  const selectedDevice = useSelectedDevice();
  const onlineDevices = useOnlineDevices();
  
  // 连接相关状态
  const connection = useConnection();
  const isConnected = useIsConnected();
  const adbPath = useAdbPath();
  
  // 诊断相关状态
  const diagnosticResults = useDiagnosticResults();
  const diagnosticSummary = useDiagnosticSummary();
  const hasErrors = useHasErrors();
  
  // UI状态
  const isLoading = useIsLoading();
  const isInitializing = useIsInitializing();
  const lastError = useLastError();
  
  // Store操作
  const actions = useAdbActions();

  // ===== 计算属性 =====
  
  const deviceCount = devices.length;
  const onlineDeviceCount = onlineDevices.length;
  const hasDevices = deviceCount > 0;
  const hasOnlineDevices = onlineDeviceCount > 0;
  const isReady = isConnected && !isInitializing && !isLoading;
  
  // 健康状态
  const isHealthy = useMemo(() => {
    return isConnected && !hasErrors && hasOnlineDevices;
  }, [isConnected, hasErrors, hasOnlineDevices]);

  // ===== 初始化 =====
  
  /**
   * 初始化ADB环境
   */
  const initialize = useCallback(async (config?: AdbConfig) => {
    // 防止重复初始化
    if (initializeRef.current) {
      return initializeRef.current;
    }

    initializeRef.current = applicationService.initialize(config);
    
    try {
      await initializeRef.current;
    } finally {
      initializeRef.current = null;
    }
  }, []); // 移除applicationService依赖，因为它是通过useMemo稳定的

  /**
   * 更新配置
   */
  const updateConfig = useCallback(async (config: AdbConfig) => {
    return await applicationService.updateConfig(config);
  }, []); // 移除applicationService依赖

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    applicationService.reset();
  }, []); // 移除applicationService依赖

  // ===== 设备操作 =====
  
  /**
   * 刷新设备列表
   */
  const refreshDevices = useCallback(async () => {
    return await applicationService.refreshDevices();
  }, []);

  /**
   * 连接到设备
   */
  const connectToDevice = useCallback(async (address: string) => {
    return await applicationService.connectToDevice(address);
  }, []);

  /**
   * 断开设备连接
   */
  const disconnectDevice = useCallback(async (deviceId: string) => {
    return await applicationService.disconnectDevice(deviceId);
  }, []);

  /**
   * 连接到模拟器
   */
  const connectToEmulators = useCallback(async () => {
    return await applicationService.connectToEmulators();
  }, []);

  /**
   * 选择设备
   */
  const selectDevice = useCallback((deviceId: string | null) => {
    applicationService.selectDevice(deviceId);
  }, []);

  /**
   * 获取设备详细信息
   */
  const getDeviceInfo = useCallback(async (deviceId: string) => {
    return await applicationService.getDeviceInfo(deviceId);
  }, []);

  /**
   * 批量设备操作
   */
  const batchDeviceOperation = useCallback(async (
    deviceIds: string[], 
    operation: 'connect' | 'disconnect'
  ) => {
    return await applicationService.batchDeviceOperation(deviceIds, operation);
  }, []);

  // ===== 连接管理 =====
  
  /**
   * 测试连接
   */
  const testConnection = useCallback(async () => {
    return await applicationService.testConnection();
  }, []);

  /**
   * 启动ADB服务器
   */
  const startAdbServer = useCallback(async () => {
    return await applicationService.startAdbServer();
  }, []);

  /**
   * 停止ADB服务器
   */
  const stopAdbServer = useCallback(async () => {
    return await applicationService.stopAdbServer();
  }, []);

  /**
   * 重启ADB服务器
   */
  const restartAdbServer = useCallback(async () => {
    return await applicationService.restartAdbServer();
  }, []);

  /**
   * 自动检测ADB路径
   */
  const autoDetectAdbPath = useCallback(async () => {
    return await applicationService.autoDetectAdbPath();
  }, []);

  // ===== 诊断功能 =====
  
  /**
   * 运行完整诊断
   */
  const runFullDiagnostic = useCallback(async () => {
    return await applicationService.runFullDiagnostic();
  }, []);

  /**
   * 运行快速诊断
   */
  const runQuickDiagnostic = useCallback(async () => {
    return await applicationService.runQuickDiagnostic();
  }, []);

  /**
   * 执行自动修复
   */
  const executeAutoFix = useCallback(async (diagnosticId?: string) => {
    return await applicationService.executeAutoFix(diagnosticId);
  }, []);

  /**
   * 获取诊断报告
   */
  const getDiagnosticReport = useCallback(() => {
    return applicationService.getDiagnosticReport();
  }, []);

  // ===== 授权/无线调试辅助 =====

  /** 清理本机 ADB 密钥（触发手机重新授权） */
  const clearAdbKeys = useCallback(async () => {
    return await applicationService.clearAdbKeys();
  }, []);

  /** 无线调试配对 */
  const pairWireless = useCallback(async (hostPort: string, code: string) => {
    return await applicationService.pairWireless(hostPort, code);
  }, []);

  /** 便捷：无线连接到设备（adb connect ip:port） */
  const wirelessConnect = useCallback(async (ip: string, port: number) => {
    const addr = `${ip}:${port}`;
    return await applicationService.connectToDevice(addr);
  }, []);

  // ===== 高级功能 =====
  
  /**
   * 获取健康状态
   */
  const getHealthStatus = useCallback(async () => {
    return await applicationService.getHealthStatus();
  }, []);

  /**
   * 获取设备统计信息
   */
  const getDeviceStats = useCallback(async () => {
    return await applicationService.getDeviceStats();
  }, []);

  /**
   * 获取设备联系人数量（统一接口）
   */
  const getDeviceContactCount = useCallback(async (deviceId: string) => {
    return await applicationService.getDeviceContactCount(deviceId);
  }, []);

  // ===== 工具方法 =====
  
  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    actions.setError(null);
  }, [actions]);

  /**
   * 快速操作 - 一键连接模拟器并刷新
   */
  const quickConnect = useCallback(async () => {
    try {
      await connectToEmulators();
      await refreshDevices();
    } catch (error) {
      console.error('Quick connect failed:', error);
      throw error;
    }
  }, []); // 移除对其他functions的依赖，避免循环

  /**
   * 快速修复 - 运行诊断并自动修复
   */
  const quickFix = useCallback(async () => {
    try {
      await runQuickDiagnostic();
      const hasAutoFixableIssues = diagnosticResults.some(r => r.isAutoFixable());
      if (hasAutoFixableIssues) {
        await executeAutoFix();
      }
      return true;
    } catch (error) {
      console.error('Quick fix failed:', error);
      return false;
    }
  }, [diagnosticResults]); // 只保留真正需要的依赖

  // ===== UI 元素匹配 =====
  const matchElementByCriteria = useCallback(async (
    deviceId: string,
    criteria: { 
      strategy: any; 
      fields: string[]; 
      values: Record<string, string>; 
      includes?: Record<string, string[]>; 
      excludes?: Record<string, string[]>;
      matchMode?: Record<string, 'equals' | 'contains' | 'regex'>;
      regexIncludes?: Record<string, string[]>;
      regexExcludes?: Record<string, string[]>;
    }
  ) => {
    // 发送前统一处理：
    // - custom → 映射为 absolute 或 standard
    // - 移除空值字段
    // - includes/excludes 仅保留已选字段且去重
    const backendStrategy = toBackendStrategy(criteria.strategy, criteria.fields || [], criteria.values || {});
    const { fields, values } = normalizeFieldsAndValues(criteria.fields || [], criteria.values || {});
    const includes = normalizeIncludes(criteria.includes || {}, fields);
    const excludes = normalizeExcludes(criteria.excludes || {}, fields);

    // 透传并转换 camelCase → snake_case（后端采用 match_mode/regex_includes/regex_excludes）
    const match_mode = criteria.matchMode ? Object.fromEntries(Object.entries(criteria.matchMode)) : undefined;
    const regex_includes = criteria.regexIncludes ? Object.fromEntries(Object.entries(criteria.regexIncludes)) : undefined;
    const regex_excludes = criteria.regexExcludes ? Object.fromEntries(Object.entries(criteria.regexExcludes)) : undefined;

    return await applicationService.matchElementByCriteria(deviceId, {
      strategy: backendStrategy,
      fields,
      values,
      includes,
      excludes,
      ...(match_mode ? { match_mode } : {}),
      ...(regex_includes ? { regex_includes } : {}),
      ...(regex_excludes ? { regex_excludes } : {}),
    } as any);
  }, []);

  // ===== 智能脚本执行（统一出口） =====
  const executeSmartScriptOnDevice = useCallback(async (
    deviceId: string,
    steps: any[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ) => {
    return await applicationService.executeSmartScriptOnDevice(deviceId, steps as any, config);
  }, []);

  const executeSmartScriptOnDevices = useCallback(async (
    deviceIds: string[],
    steps: any[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ) => {
    return await applicationService.executeSmartScriptOnDevices(deviceIds, steps as any, config);
  }, []);

  // ===== 生命周期 =====
  
  /**
   * 自动初始化 - 优化版，避免循环依赖
   */
  useEffect(() => {
    let isMounted = true;
    
    // 只有在真正需要且没有正在初始化时才触发初始化
    const shouldInitialize = !isConnected && !isInitializing && !initializeRef.current;
    
    if (shouldInitialize) {
      initialize().catch(error => {
        if (isMounted) {
          console.error('Auto initialization failed:', error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, []); // 移除所有依赖，只在组件挂载时执行一次

  // ===== 返回接口 =====
  
  return {
    // === 状态 ===
    devices,
    selectedDevice,
    onlineDevices,
    connection,
    diagnosticResults,
    diagnosticSummary,
    
    // === 计算属性 ===
    deviceCount,
    onlineDeviceCount,
    hasDevices,
    hasOnlineDevices,
    isConnected,
    isReady,
    isHealthy,
    hasErrors,
    adbPath,
    
    // === UI状态 ===
    isLoading,
    isInitializing,
    lastError,
    
    // === 初始化 ===
    initialize,
    updateConfig,
    reset,
    
    // === 设备操作 ===
    refreshDevices,
    connectToDevice,
    disconnectDevice,
    connectToEmulators,
    selectDevice,
    getDeviceInfo,
    batchDeviceOperation,
    
    // === 连接管理 ===
    testConnection,
    startAdbServer,
    stopAdbServer,
    restartAdbServer,
    autoDetectAdbPath,
    
    // === 诊断功能 ===
    runFullDiagnostic,
    runQuickDiagnostic,
    executeAutoFix,
    getDiagnosticReport,
  clearAdbKeys,
  pairWireless,
  wirelessConnect,
    
    // === 高级功能 ===
    getHealthStatus,
    getDeviceStats,
  getDeviceContactCount,
    
    // === 工具方法 ===
    clearError,
    quickConnect,
    quickFix
    ,
    // 匹配
    matchElementByCriteria
    ,
    // 智能脚本执行
    executeSmartScriptOnDevice,
    executeSmartScriptOnDevices
  };
};

export default useAdb;

