import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdbDevices } from '../../../hooks/useAdbDevices';
import { useLogManager } from './useLogManager';
import { LogCategory } from '../../../services/adb-diagnostic/LogManager';

export interface DeviceMonitorData {
  id: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  connectionType: 'usb' | 'wifi' | 'emulator';
  isHealthy: boolean;
  healthScore: number; // 0-100
  batteryLevel?: number;
  performance?: {
    cpuUsage?: number;
    memoryUsage?: number;
    storageUsage?: number;
  };
  issues: string[];
}

export interface UseDeviceMonitorReturn {
  // 监控数据
  monitorData: DeviceMonitorData[];
  isMonitoring: boolean;
  
  // 监控控制
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshMonitorData: () => Promise<void>;
  
  // 设备操作
  checkDeviceHealth: (deviceId: string) => Promise<DeviceMonitorData>;
  
  // 统计信息
  getMonitorStats: () => {
    total: number;
    online: number;
    offline: number;
    unhealthy: number;
    averageHealth: number;
  };
  
  // 配置
  setMonitorInterval: (interval: number) => void;
  getDeviceById: (deviceId: string) => DeviceMonitorData | undefined;
}

/**
 * useDeviceMonitor Hook
 * 提供设备监控功能的响应式接口
 */
export const useDeviceMonitor = (
  initialInterval: number = 10000
): UseDeviceMonitorReturn => {
  const [monitorData, setMonitorData] = useState<DeviceMonitorData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorInterval, setMonitorIntervalState] = useState(initialInterval);
  
  const { devices, getDeviceDetails } = useAdbDevices();
  const { info, warn, error } = useLogManager();
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
      }
    };
  }, []);

  // 设备列表变化时更新监控数据
  useEffect(() => {
    updateMonitorDataFromDevices();
  }, [devices]);

  // 从设备列表更新监控数据
  const updateMonitorDataFromDevices = useCallback(() => {
    const newMonitorData: DeviceMonitorData[] = devices.map(device => {
      // 查找现有监控数据
      const existingData = monitorData.find(data => data.id === device.id);
      
      return {
        id: device.id,
        status: device.status === 'device' ? 'online' : 'offline',
        lastSeen: device.lastSeen || new Date(),
        connectionType: device.type || 'usb',
        isHealthy: device.status === 'device',
        healthScore: device.status === 'device' ? 100 : 0,
        issues: device.status !== 'device' ? ['设备离线或未连接'] : [],
        // 保留现有的性能数据
        ...(existingData && {
          batteryLevel: existingData.batteryLevel,
          performance: existingData.performance
        })
      } as DeviceMonitorData;
    });

    setMonitorData(newMonitorData);
  }, [devices, monitorData]);

  // 检查单个设备健康状态
  const checkDeviceHealth = useCallback(async (deviceId: string): Promise<DeviceMonitorData> => {
    info(LogCategory.DEVICE, 'useDeviceMonitor', `检查设备健康状态: ${deviceId}`);

    try {
      // 获取设备详细信息
      const deviceDetails = await getDeviceDetails(deviceId);
      
      const issues: string[] = [];
      let healthScore = 100;
      let isHealthy = true;

      // 分析设备属性判断健康状态
      if (deviceDetails) {
        // 检查电池状态
        const batteryLevel = deviceDetails['battery.level'];
        if (batteryLevel && parseInt(batteryLevel) < 20) {
          issues.push('电池电量低');
          healthScore -= 20;
        }

        // 检查存储空间
        const storage = deviceDetails['storage.available'];
        if (storage && parseInt(storage) < 1000) { // 少于1GB
          issues.push('存储空间不足');
          healthScore -= 15;
        }

        // 检查系统状态
        const bootCompleted = deviceDetails['sys.boot_completed'];
        if (bootCompleted !== '1') {
          issues.push('系统未完全启动');
          healthScore -= 30;
          isHealthy = false;
        }
      } else {
        issues.push('无法获取设备信息');
        healthScore = 0;
        isHealthy = false;
      }

      const healthData: DeviceMonitorData = {
        id: deviceId,
        status: isHealthy ? 'online' : 'error',
        lastSeen: new Date(),
        connectionType: 'usb', // 这里应该从设备信息中获取
        isHealthy,
        healthScore: Math.max(0, healthScore),
        batteryLevel: deviceDetails?.['battery.level'] ? parseInt(deviceDetails['battery.level']) : undefined,
        performance: {
          // 这里可以添加更多性能监控
          memoryUsage: Math.random() * 100, // 模拟数据
          cpuUsage: Math.random() * 100,    // 模拟数据
          storageUsage: Math.random() * 100  // 模拟数据
        },
        issues
      };

      // 更新监控数据
      setMonitorData(prev => {
        const index = prev.findIndex(data => data.id === deviceId);
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = healthData;
          return newData;
        } else {
          return [...prev, healthData];
        }
      });

      info(LogCategory.DEVICE, 'useDeviceMonitor', `设备健康检查完成: ${deviceId}`, {
        healthScore,
        issues: issues.length
      });

      return healthData;
    } catch (err) {
      error(LogCategory.DEVICE, 'useDeviceMonitor', `设备健康检查失败: ${deviceId}`, { error: err });
      
      const errorData: DeviceMonitorData = {
        id: deviceId,
        status: 'error',
        lastSeen: new Date(),
        connectionType: 'usb',
        isHealthy: false,
        healthScore: 0,
        issues: ['健康检查失败']
      };

      return errorData;
    }
  }, [getDeviceDetails, info, error]);

  // 开始监控
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    info(LogCategory.SYSTEM, 'useDeviceMonitor', '开始设备监控', { interval: monitorInterval });

    monitorTimerRef.current = setInterval(async () => {
      try {
        // 对所有在线设备进行健康检查
        const onlineDevices = monitorData.filter(data => data.status === 'online');
        
        for (const deviceData of onlineDevices) {
          await checkDeviceHealth(deviceData.id);
        }
      } catch (err) {
        warn(LogCategory.SYSTEM, 'useDeviceMonitor', '监控过程中出现错误', { error: err });
      }
    }, monitorInterval);
  }, [isMonitoring, monitorInterval, monitorData, checkDeviceHealth, info, warn]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    info(LogCategory.SYSTEM, 'useDeviceMonitor', '停止设备监控');

    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
  }, [isMonitoring, info]);

  // 刷新监控数据
  const refreshMonitorData = useCallback(async () => {
    info(LogCategory.DEVICE, 'useDeviceMonitor', '刷新监控数据');

    try {
      // 对所有设备进行健康检查
      for (const deviceData of monitorData) {
        await checkDeviceHealth(deviceData.id);
      }
    } catch (err) {
      warn(LogCategory.DEVICE, 'useDeviceMonitor', '刷新监控数据失败', { error: err });
    }
  }, [monitorData, checkDeviceHealth, info, warn]);

  // 设置监控间隔
  const setMonitorInterval = useCallback((interval: number) => {
    setMonitorIntervalState(interval);
    
    // 如果正在监控，重启监控器
    if (isMonitoring) {
      stopMonitoring();
      setTimeout(() => startMonitoring(), 100);
    }
    
    info(LogCategory.SYSTEM, 'useDeviceMonitor', '监控间隔已更新', { interval });
  }, [isMonitoring, startMonitoring, stopMonitoring, info]);

  // 根据ID获取设备数据
  const getDeviceById = useCallback((deviceId: string): DeviceMonitorData | undefined => {
    return monitorData.find(data => data.id === deviceId);
  }, [monitorData]);

  // 获取监控统计
  const getMonitorStats = useCallback(() => {
    const stats = {
      total: monitorData.length,
      online: 0,
      offline: 0,
      unhealthy: 0,
      averageHealth: 0
    };

    let totalHealth = 0;

    monitorData.forEach(data => {
      if (data.status === 'online') stats.online++;
      else stats.offline++;
      
      if (!data.isHealthy) stats.unhealthy++;
      
      totalHealth += data.healthScore;
    });

    stats.averageHealth = stats.total > 0 ? Math.round(totalHealth / stats.total) : 0;

    return stats;
  }, [monitorData]);

  return {
    // 数据
    monitorData,
    isMonitoring,
    
    // 控制
    startMonitoring,
    stopMonitoring,
    refreshMonitorData,
    
    // 操作
    checkDeviceHealth,
    
    // 统计
    getMonitorStats,
    
    // 配置
    setMonitorInterval,
    getDeviceById
  };
};