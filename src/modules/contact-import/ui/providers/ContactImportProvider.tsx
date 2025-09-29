import React, { createContext, useContext, useCallback, useState } from 'react';
import { useAdb } from '../../../../application/hooks/useAdb';
import { useContactImportState } from '../hooks/useContactImportState';
import { useDeviceOperations, useBatchOperations } from '../hooks/useDeviceOperations';
import type { ContactImportContextValue } from './types';

// 创建Context
const ContactImportContext = createContext<ContactImportContextValue | null>(null);

// 自定义Hook用于访问Context
export const useContactImportContext = (): ContactImportContextValue => {
  const context = useContext(ContactImportContext);
  if (!context) {
    throw new Error('useContactImportContext must be used within ContactImportProvider');
  }
  return context;
};

// Provider组件
export const ContactImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 统一的ADB状态管理 - 只在这里调用一次useAdb()
  const adbState = useAdb();
  
  // 业务状态管理
  const businessState = useContactImportState();
  
  // 设备和批量操作
  const deviceOperations = useDeviceOperations(adbState.devices);
  const batchOperations = useBatchOperations();
  
  // 模态框状态
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  const [sessionsModal, setSessionsModal] = useState<{
    open: boolean;
    deviceId?: string;
    status?: 'all' | 'pending' | 'success' | 'failed';
  }>({ open: false });

  // 模态框操作
  const openBatchDrawer = useCallback(() => setBatchDrawerOpen(true), []);
  const closeBatchDrawer = useCallback(() => setBatchDrawerOpen(false), []);
  
  const openSessionsModal = useCallback((options: { deviceId?: string; status?: string }) => {
    setSessionsModal({ 
      open: true, 
      deviceId: options.deviceId,
      status: options.status as any
    });
  }, []);
  
  const closeSessionsModal = useCallback(() => {
    setSessionsModal({ open: false });
  }, []);

  // 组合所有状态和操作
  const contextValue: ContactImportContextValue = {
    // ADB状态（从useAdb获取）
    devices: adbState.devices,
    selectedDevice: adbState.selectedDevice,
    
    // 业务状态（从useContactImportState获取）
    ...businessState,
    
    // 操作方法
    ...deviceOperations,
    ...batchOperations,
    
    // 模态框状态
    batchDrawerOpen,
    sessionsModal,
    
    // ADB操作（修复类型）
    selectDevice: adbState.selectDevice,
    refreshDevices: async () => {
      await adbState.refreshDevices();
    },
    
    // 模态框操作
    openBatchDrawer,
    closeBatchDrawer,
    openSessionsModal,
    closeSessionsModal,
  };

  return (
    <ContactImportContext.Provider value={contextValue}>
      {children}
    </ContactImportContext.Provider>
  );
};

export default ContactImportProvider;