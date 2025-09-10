/**
 * 联系人导入自定义Hook
 * 提供完整的联系人导入功能，包括状态管理和事件处理
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ContactImporter,
  ContactImporterEventListener,
} from "../core/ContactImporter";
import { AndroidDeviceManager } from "../devices/IDeviceManager";
import { VcfParser } from "../parsers/VcfParser";
import { ImportStrategyFactory } from "../strategies/ImportStrategies";
import {
  Contact,
  Device,
  ImportConfiguration,
  ImportFormat,
  ImportPhase,
  ImportProgress,
  ImportResult,
  ImportStrategyType,
  ParseOptions,
} from "../types";

export interface UseContactImportOptions {
  /**
   * 导入配置
   */
  configuration?: Partial<ImportConfiguration>;

  /**
   * 事件回调
   */
  onProgress?: (progress: ImportProgress) => void;
  onPhaseChange?: (phase: ImportPhase) => void;
  onComplete?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
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
  parseContacts: (
    fileContent: string,
    options?: ParseOptions
  ) => Promise<Contact[]>;
  detectDevices: () => Promise<Device[]>;
  importContacts: (
    fileContent: string,
    targetDevices: Device[]
  ) => Promise<ImportResult>;
  cancelImport: () => void;
  clearError: () => void;
  reset: () => void;

  // 配置方法
  setStrategy: (strategy: ImportStrategyType) => void;
  setConfiguration: (config: Partial<ImportConfiguration>) => void;
}

const defaultConfiguration: ImportConfiguration = {
  strategy: ImportStrategyType.BALANCED,
  batchSize: 50,
  allowDuplicates: false,
  skipInvalidContacts: true,
  format: ImportFormat.VCF,
  options: {
    preserveGroups: false,
    mergeStrategy: "skip",
    photoHandling: "skip",
  },
};

export function useContactImport(
  options: UseContactImportOptions = {}
): UseContactImportReturn {
  // 状态管理
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ImportPhase>(
    ImportPhase.INITIALIZING
  );
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  // Configuration state
  // eslint-disable-next-line prefer-const
  const [configuration, setConfigurationState] = useState<ImportConfiguration>(
    () => ({
      ...defaultConfiguration,
      ...options.configuration,
    })
  );

  // Refs
  const importerRef = useRef<ContactImporter | null>(null);
  const deviceManagerRef = useRef<AndroidDeviceManager | null>(null);

  // 初始化设备管理器
  useEffect(() => {
    if (!deviceManagerRef.current) {
      deviceManagerRef.current = new AndroidDeviceManager();
    }
  }, []);

  // 解析联系人
  const parseContacts = useCallback(
    async (
      fileContent: string,
      parseOptions?: ParseOptions
    ): Promise<Contact[]> => {
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

  // 检测设备
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
    async (
      fileContent: string,
      targetDevices: Device[]
    ): Promise<ImportResult> => {
      try {
        setError(null);
        setResult(null);
        setIsImporting(true);

        if (!deviceManagerRef.current) {
          throw new Error("设备管理器未初始化");
        }

        // 创建导入器
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
        const importResult = await importer.importContacts(
          fileContent,
          targetDevices
        );

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

    // 配置方法
    setStrategy,
    setConfiguration,
  };
}

/**
 * 联系人导入统计Hook
 * 提供导入过程的统计信息
 */
export function useImportStats(result: ImportResult | null) {
  const stats = {
    successRate:
      result && result.totalContacts > 0
        ? Math.round((result.importedContacts / result.totalContacts) * 100)
        : 0,
    failureRate:
      result && result.totalContacts > 0
        ? Math.round((result.failedContacts / result.totalContacts) * 100)
        : 0,
    skipRate:
      result && result.totalContacts > 0
        ? Math.round((result.skippedContacts / result.totalContacts) * 100)
        : 0,
    duplicateRate:
      result && result.totalContacts > 0
        ? Math.round((result.duplicateContacts / result.totalContacts) * 100)
        : 0,
    totalDuration: result?.duration || 0,
    averageTimePerContact:
      result && result.totalContacts > 0
        ? Math.round(result.duration / result.totalContacts)
        : 0,
  };

  return stats;
}

/**
 * 设备状态监控Hook
 */
export function useDeviceMonitoring() {
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, Device>>(
    new Map()
  );
  const deviceManagerRef = useRef<AndroidDeviceManager | null>(null);

  useEffect(() => {
    if (!deviceManagerRef.current) {
      deviceManagerRef.current = new AndroidDeviceManager();
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
