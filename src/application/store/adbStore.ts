import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  Device, 
  AdbConnection, 
  DiagnosticResult, 
  DiagnosticSummary,
  AdbConfig,
  ConnectionStatus,
  DeviceStatus
} from '../../domain/adb';

/**
 * ADB应用状态接口
 */
interface AdbState {
  // === 连接状态 ===
  connection: AdbConnection | null;
  config: AdbConfig;
  
  // === 设备管理 ===
  devices: Device[];
  selectedDeviceId: string | null;
  
  // === 诊断信息 ===
  diagnosticResults: DiagnosticResult[];
  diagnosticSummary: DiagnosticSummary | null;
  
  // === UI状态 ===
  isLoading: boolean;
  isInitializing: boolean;
  lastError: Error | null;
  
  // === 操作计数 ===
  refreshCount: number;
  lastRefreshTime: Date | null;
}

/**
 * ADB应用操作接口
 */
interface AdbActions {
  // === 连接管理 ===
  setConnection: (connection: AdbConnection) => void;
  updateConnectionStatus: (status: ConnectionStatus, errorMessage?: string) => void;
  setConfig: (config: AdbConfig) => void;
  
  // === 设备管理 ===
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (deviceId: string, updater: (device: Device) => Device) => void;
  removeDevice: (deviceId: string) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  
  // === 诊断管理 ===
  setDiagnosticResults: (results: DiagnosticResult[]) => void;
  addDiagnosticResult: (result: DiagnosticResult) => void;
  updateDiagnosticSummary: () => void;
  clearDiagnosticResults: () => void;
  
  // === UI状态管理 ===
  setLoading: (loading: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setError: (error: Error | null) => void;
  
  // === 工具方法 ===
  incrementRefreshCount: () => void;
  reset: () => void;
  
  // === 选择器 ===
  getSelectedDevice: () => Device | null;
  getOnlineDevices: () => Device[];
  getDeviceById: (deviceId: string) => Device | null;
  hasErrors: () => boolean;
  isConnected: () => boolean;
}

/**
 * 初始状态
 */
const initialState: AdbState = {
  connection: null,
  config: AdbConfig.default(),
  devices: [],
  selectedDeviceId: null,
  diagnosticResults: [],
  diagnosticSummary: null,
  isLoading: false,
  isInitializing: false,
  lastError: null,
  refreshCount: 0,
  lastRefreshTime: null,
};

/**
 * 统一的ADB状态管理Store
 * 
 * 使用Zustand提供单一数据源，替换分散的状态管理
 * 支持选择器模式，提供细粒度的状态订阅
 */
export const useAdbStore = create<AdbState & AdbActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // === 连接管理 ===
    setConnection: (connection) => set({ connection }),
    
    updateConnectionStatus: (status, errorMessage) => set((state) => ({
      connection: state.connection?.withStatus(status, errorMessage) || null,
      lastError: status === ConnectionStatus.ERROR && errorMessage ? new Error(errorMessage) : null
    })),
    
    setConfig: (config) => set({ config }),

    // === 设备管理 ===
    setDevices: (devices) => set({ 
      devices,
      lastRefreshTime: new Date()
    }),
    
    addDevice: (device) => set((state) => ({
      devices: [...state.devices.filter(d => d.id !== device.id), device]
    })),
    
    updateDevice: (deviceId, updater) => set((state) => ({
      devices: state.devices.map(device => 
        device.id === deviceId ? updater(device) : device
      )
    })),
    
    removeDevice: (deviceId) => set((state) => ({
      devices: state.devices.filter(device => device.id !== deviceId),
      selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId
    })),
    
    setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

    // === 诊断管理 ===
    setDiagnosticResults: (results) => set({ 
      diagnosticResults: results,
      diagnosticSummary: DiagnosticSummary.fromResults(results)
    }),
    
    addDiagnosticResult: (result) => set((state) => {
      const newResults = [...state.diagnosticResults.filter(r => r.id !== result.id), result];
      return {
        diagnosticResults: newResults,
        diagnosticSummary: DiagnosticSummary.fromResults(newResults)
      };
    }),
    
    updateDiagnosticSummary: () => set((state) => ({
      diagnosticSummary: DiagnosticSummary.fromResults(state.diagnosticResults)
    })),
    
    clearDiagnosticResults: () => set({ 
      diagnosticResults: [],
      diagnosticSummary: null 
    }),

    // === UI状态管理 ===
    setLoading: (isLoading) => set({ isLoading }),
    setInitializing: (isInitializing) => set({ isInitializing }),
    setError: (lastError) => set({ lastError }),

    // === 工具方法 ===
    incrementRefreshCount: () => set((state) => ({ 
      refreshCount: state.refreshCount + 1,
      lastRefreshTime: new Date()
    })),
    
    reset: () => set(initialState),

    // === 选择器 ===
    getSelectedDevice: () => {
      const state = get();
      return state.selectedDeviceId 
        ? state.devices.find(d => d.id === state.selectedDeviceId) || null
        : null;
    },
    
    getOnlineDevices: () => {
      return get().devices.filter(device => device.isOnline());
    },
    
    getDeviceById: (deviceId) => {
      return get().devices.find(device => device.id === deviceId) || null;
    },
    
    hasErrors: () => {
      const state = get();
      return state.lastError !== null || 
             (state.diagnosticSummary?.hasErrors() || false);
    },
    
    isConnected: () => {
      return get().connection?.isActive() || false;
    }
  }))
);

// === 细粒度选择器 ===

/**
 * 设备相关选择器
 */
// export const useDevices = () => useAdbStore(state => state.devices); // ✅ 废弃：直接使用 useAdbStore
export const useSelectedDevice = () => useAdbStore(state => state.getSelectedDevice());

// ✅ 修复：创建稳定的选择器，避免无限重渲染
const selectOnlineDevices = (state: AdbState & AdbActions) => 
  state.devices.filter(device => device.isOnline());

export const useOnlineDevices = () => {
  return useAdbStore(selectOnlineDevices);
};

export const useDeviceCount = () => useAdbStore(state => state.devices.length);

/**
 * 连接相关选择器
 */
export const useConnection = () => useAdbStore(state => state.connection);
export const useConnectionStatus = () => useAdbStore(state => state.connection?.status);
export const useIsConnected = () => useAdbStore(state => state.isConnected());
export const useAdbPath = () => useAdbStore(state => state.config.adbPath);

/**
 * 诊断相关选择器
 */
export const useDiagnosticResults = () => useAdbStore(state => state.diagnosticResults);
export const useDiagnosticSummary = () => useAdbStore(state => state.diagnosticSummary);
export const useHasErrors = () => useAdbStore(state => state.hasErrors());

/**
 * UI状态选择器
 */
export const useIsLoading = () => useAdbStore(state => state.isLoading);
export const useIsInitializing = () => useAdbStore(state => state.isInitializing);
export const useLastError = () => useAdbStore(state => state.lastError);

/**
 * 操作选择器
 */
export const useAdbActions = () => useAdbStore(state => ({
  setConnection: state.setConnection,
  updateConnectionStatus: state.updateConnectionStatus,
  setConfig: state.setConfig,
  setDevices: state.setDevices,
  addDevice: state.addDevice,
  updateDevice: state.updateDevice,
  removeDevice: state.removeDevice,
  setSelectedDevice: state.setSelectedDevice,
  setDiagnosticResults: state.setDiagnosticResults,
  addDiagnosticResult: state.addDiagnosticResult,
  setLoading: state.setLoading,
  setError: state.setError,
  incrementRefreshCount: state.incrementRefreshCount,
  reset: state.reset
}));

