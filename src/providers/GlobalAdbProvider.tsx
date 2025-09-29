/**
 * 全局ADB Provider
 * 在应用顶层统一管理ADB状态，避免每个页面重复初始化
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useAdb } from '../application/hooks/useAdb';

// 获取useAdb的返回类型
type UseAdbReturnType = ReturnType<typeof useAdb>;

// 全局ADB上下文类型定义 - 直接使用useAdb的返回类型
export interface GlobalAdbContextValue extends UseAdbReturnType {}

// 创建全局Context
const GlobalAdbContext = createContext<GlobalAdbContextValue | null>(null);

// 全局ADB Provider Props
interface GlobalAdbProviderProps {
  children: ReactNode;
}

/**
 * 全局ADB状态管理Provider
 * 在应用根级别统一管理ADB状态，所有页面通过Context获取
 */
export const GlobalAdbProvider: React.FC<GlobalAdbProviderProps> = ({ children }) => {
  // 只在这里调用一次useAdb() - 全应用唯一调用点
  const adbState = useAdb();

  // 直接传递所有useAdb的返回值
  const contextValue: GlobalAdbContextValue = {
    ...adbState
  };

  return (
    <GlobalAdbContext.Provider value={contextValue}>
      {children}
    </GlobalAdbContext.Provider>
  );
};

/**
 * 使用全局ADB状态的Hook
 * 替代直接调用useAdb()
 */
export const useGlobalAdb = (): GlobalAdbContextValue => {
  const context = useContext(GlobalAdbContext);
  if (!context) {
    throw new Error('useGlobalAdb must be used within GlobalAdbProvider');
  }
  return context;
};

/**
 * 设备相关的简化Hook
 * 只获取设备状态，用于只需要设备信息的组件
 */
export const useDevices = () => {
  const { devices, selectedDevice, onlineDevices, refreshDevices, selectDevice } = useGlobalAdb();
  return {
    devices,
    selectedDevice,
    onlineDevices,
    refreshDevices,
    selectDevice
  };
};

/**
 * 连接状态的简化Hook
 * 用于只关心连接状态的组件
 */
export const useAdbConnection = () => {
  const { 
    connection, 
    isConnected, 
    isReady, 
    isHealthy, 
    testConnection, 
    restartAdbServer 
  } = useGlobalAdb();
  
  return {
    connection,
    isConnected,
    isReady,
    isHealthy,
    testConnection,
    restartAdbServer
  };
};

/**
 * 诊断相关的简化Hook
 * 用于诊断页面
 */
export const useAdbDiagnostic = () => {
  const { 
    diagnosticResults,
    diagnosticSummary,
    hasErrors,
    runFullDiagnostic,
    runQuickDiagnostic,
    executeAutoFix,
    getDiagnosticReport
  } = useGlobalAdb();
  
  return {
    diagnosticResults,
    diagnosticSummary,
    hasErrors,
    runFullDiagnostic,
    runQuickDiagnostic,
    executeAutoFix,
    getDiagnosticReport
  };
};