/**
 * 重构后的联系人导入 Hook
 * 使用统一的 ADB 设备管理器适配器
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ContactImporter, ContactImporterEventListener } from '../core/ContactImporter';
import { UnifiedAdbDeviceManager } from '../adapters/UnifiedAdbDeviceManager';
import { VcfParser } from '../parsers/VcfParser';
import { ImportStrategyFactory } from '../strategies/ImportStrategies';
import {
  Contact,
  Device,
  ImportConfiguration,
  ImportResult,
  ImportPhase,
  ImportStrategyType,
  ImportProgress,
  ParseOptions,
} from '../types';

// 默认配置
const defaultConfiguration: ImportConfiguration = {
  strategy: ImportStrategyType.BALANCED,
  batchSize: 50,
  allowDuplicates: false,
  skipInvalidContacts: true,
  format: 'vcf' as any,
  options: {
    preserveGroups: true,
    mergeStrategy: 'skip',
    photoHandling: 'reference',
  },
};

export interface UseContactImportOptions {
  configuration?: Partial<ImportConfiguration>;
  onProgress?: (progress: ImportProgress) => void;
  onPhaseChange?: (phase: ImportPhase) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: ImportResult) => void;
}

export interface UseContactImportReturn {
  // 状态
  isImporting: boolean;
  progress: ImportProgress | null;
  currentPhase: ImportPhase;
  error: Error | null;
  result: ImportResult | null;

  // 数据
  contacts: Contact[];
  devices: Device[];

  // 操作方法
  parseContacts: (fileContent: string, parseOptions?: ParseOptions) => Promise<Contact[]>;
  detectDevices: () => Promise<Device[]>;
  importContacts: (fileContent: string, targetDevices: Device[]) => Promise<ImportResult>;
  cancelImport: () => void;
  clearError: () => void;
  reset: () => void;

  // 配置
  setStrategy: (strategy: ImportStrategyType) => void;
  setConfiguration: (config: Partial<ImportConfiguration>) => void;
  configuration: ImportConfiguration;
}

/**
 * 联系人导入Hook - 使用统一ADB架构
 */
export function useContactImport(options: UseContactImportOptions = {}): UseContactImportReturn {
  // 状态
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ImportPhase>(ImportPhase.INITIALIZING);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  // 数据状态
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  
  // 配置状态
  const [configuration, setConfigurationState] = useState<ImportConfiguration>(() => ({
    ...defaultConfiguration,
    ...options.configuration,
  }));

  // Refs
  const importerRef = useRef<ContactImporter | null>(null);
  const deviceManagerRef = useRef<UnifiedAdbDeviceManager | null>(null);

  // 初始化统一设备管理器
  useEffect(() => {
    if (!deviceManagerRef.current) {
      deviceManagerRef.current = new UnifiedAdbDeviceManager();
    }
  }, []);

  // 解析联系人
  const parseContacts = useCallback(
    async (fileContent: string, parseOptions?: ParseOptions): Promise<Contact[]> => {
      try {
        setError(null);
        const parser = new VcfParser();

        // 验证格式
        if (!parser.validateFormat(fileContent)) {
          throw new Error("文件格式不受支持，请确保是有效的VCF文件");
        }

        const parsedContacts = await parser.parse(fileContent, parseOptions);
        setContacts(parsedContacts);

        return parsedContacts;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        throw error;
      }
    },
    [options]
  );

  // 检测设备 - 使用统一的设备管理器
  const detectDevices = useCallback(async (): Promise<Device[]> => {
    try {
      setError(null);
      if (!deviceManagerRef.current) {
        throw new Error("设备管理器未初始化");
      }

      const detectedDevices = await deviceManagerRef.current.detectDevices();
      setDevices(detectedDevices);

      return detectedDevices;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      throw error;
    }
  }, [options]);

  // 导入联系人
  const importContacts = useCallback(
    async (fileContent: string, targetDevices: Device[]): Promise<ImportResult> => {
      try {
        setError(null);
        setResult(null);
        setIsImporting(true);

        if (!deviceManagerRef.current) {
          throw new Error("设备管理器未初始化");
        }

        // 创建导入器 - 使用统一的设备管理器
        const parser = new VcfParser();
        const strategy = ImportStrategyFactory.create(configuration.strategy);

        const importer = new ContactImporter({
          parser,
          deviceManager: deviceManagerRef.current,
          strategy,
          configuration,
        });

        importerRef.current = importer;

        // 设置事件监听器
        const eventListener: ContactImporterEventListener = {
          onProgress: (progressData) => {
            setProgress(progressData);
            options.onProgress?.(progressData);
          },
          onPhaseChange: (phase) => {
            setCurrentPhase(phase);
            options.onPhaseChange?.(phase);
          },
          onError: (err) => {
            setError(err);
            options.onError?.(err);
          },
          onComplete: (importResult) => {
            setResult(importResult);
            options.onComplete?.(importResult);
          },
        };

        importer.addEventListener(eventListener);

        // 执行导入
        const importResult = await importer.importContacts(fileContent, targetDevices);

        setResult(importResult);
        return importResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsImporting(false);
        importerRef.current = null;
      }
    },
    [configuration, options]
  );

  // 取消导入
  const cancelImport = useCallback(() => {
    if (importerRef.current && isImporting) {
      importerRef.current.cancelImport();
    }
  }, [isImporting]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 重置所有状态
  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress(null);
    setCurrentPhase(ImportPhase.INITIALIZING);
    setError(null);
    setResult(null);
    setContacts([]);
    setDevices([]);
    importerRef.current = null;
  }, []);

  // 设置策略
  const setStrategy = useCallback((strategy: ImportStrategyType) => {
    setConfigurationState((prev) => ({
      ...prev,
      strategy,
    }));
  }, []);

  // 设置配置
  const setConfiguration = useCallback(
    (config: Partial<ImportConfiguration>) => {
      setConfigurationState((prev) => ({
        ...prev,
        ...config,
      }));
    },
    []
  );

  return {
    // 状态
    isImporting,
    progress,
    currentPhase,
    error,
    result,

    // 数据
    contacts,
    devices,

    // 操作方法
    parseContacts,
    detectDevices,
    importContacts,
    cancelImport,
    clearError,
    reset,

    // 配置
    setStrategy,
    setConfiguration,
    configuration,
  };
}

/**
 * 设备状态监控Hook - 使用统一ADB架构
 */
export function useDeviceMonitoring() {
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, Device>>(new Map());
  const deviceManagerRef = useRef<UnifiedAdbDeviceManager | null>(null);

  useEffect(() => {
    if (!deviceManagerRef.current) {
      deviceManagerRef.current = new UnifiedAdbDeviceManager();
    }

    const deviceManager = deviceManagerRef.current;

    // 监听设备状态变化
    const unsubscribe = deviceManager.onDeviceStatusChange((device) => {
      setDeviceStatuses((prev) => new Map(prev.set(device.id, device)));
    });

    return unsubscribe;
  }, []);

  const getDeviceStatus = useCallback(
    (deviceId: string): Device | undefined => {
      return deviceStatuses.get(deviceId);
    },
    [deviceStatuses]
  );

  const refreshDeviceStatus = useCallback(
    async (deviceId: string): Promise<Device | null> => {
      if (!deviceManagerRef.current) return null;

      const device = await deviceManagerRef.current.getDeviceStatus(deviceId);
      if (device) {
        setDeviceStatuses((prev) => new Map(prev.set(device.id, device)));
      }
      return device;
    },
    []
  );

  return {
    deviceStatuses: Array.from(deviceStatuses.values()),
    getDeviceStatus,
    refreshDeviceStatus,
  };
}

/**
 * 导入统计Hook - 增强功能
 */
export function useImportStats() {
  const [stats, setStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    failedImports: 0,
    totalContacts: 0,
    averageImportTime: 0,
    deviceUsage: new Map<string, number>(),
  });

  const recordImport = useCallback((result: ImportResult, deviceId: string, duration: number) => {
    setStats((prev) => ({
      ...prev,
      totalImports: prev.totalImports + 1,
      successfulImports: result.success ? prev.successfulImports + 1 : prev.successfulImports,
      failedImports: result.success ? prev.failedImports : prev.failedImports + 1,
      totalContacts: prev.totalContacts + result.importedContacts,
      averageImportTime: (prev.averageImportTime * (prev.totalImports - 1) + duration) / prev.totalImports,
      deviceUsage: new Map(prev.deviceUsage.set(deviceId, (prev.deviceUsage.get(deviceId) || 0) + 1)),
    }));
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      totalImports: 0,
      successfulImports: 0,
      failedImports: 0,
      totalContacts: 0,
      averageImportTime: 0,
      deviceUsage: new Map(),
    });
  }, []);

  return {
    stats,
    recordImport,
    resetStats,
  };
}