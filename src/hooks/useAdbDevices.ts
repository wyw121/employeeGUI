import { useCallback, useRef, useState } from 'react';
import { AdbDevice, AdbService } from '../services/adbService';

export interface AdbDeviceInfo extends AdbDevice {
  name?: string;
  isConnecting?: boolean;
  lastConnected?: string;
}

/**
 * ADB设备管理Hook
 */
export const useAdbDevices = () => {
  const [devices, setDevices] = useState<AdbDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adbServiceRef = useRef<AdbService | null>(null);

  // 获取ADB服务实例
  const getAdbService = useCallback(() => {
    if (!adbServiceRef.current) {
      adbServiceRef.current = AdbService.getInstance({
        autoDetectLdPlayer: true
      });
    }
    return adbServiceRef.current;
  }, []);

  // 刷新设备列表
  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const adbService = getAdbService();
      const adbDevices = await adbService.getDevices();

      const devicesWithInfo: AdbDeviceInfo[] = adbDevices.map((device, index) => ({
        ...device,
        name: device.model || device.product || `Device-${index + 1}`,
        isConnecting: false
      }));

      setDevices(devicesWithInfo);
      console.log(`Found ${adbDevices.length} ADB devices`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get ADB devices';
      setError(errorMessage);
      console.error('Error refreshing devices:', err);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAdbService]);

  // 连接到雷电模拟器常用端口
  const connectToLdPlayer = useCallback(async (port?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const adbService = getAdbService();

      if (port) {
        // 连接到指定端口
        const success = await adbService.connectToLdPlayer(port);
        if (success) {
          await refreshDevices();
          return true;
        }
        return false;
      } else {
        // 尝试连接到常见端口
        const connectedDevices = await adbService.connectToCommonLdPlayerPorts();
        await refreshDevices();
        return connectedDevices.length > 0;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to LDPlayer';
      setError(errorMessage);
      console.error('Error connecting to LDPlayer:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAdbService, refreshDevices]);

  // 断开设备连接
  const disconnectDevice = useCallback(async (deviceId: string) => {
    setError(null);

    // 更新UI状态
    setDevices(prev => prev.map(device =>
      device.id === deviceId
        ? { ...device, isConnecting: true }
        : device
    ));

    try {
      const adbService = getAdbService();
      const success = await adbService.disconnectDevice(deviceId);

      if (success) {
        // 刷新设备列表
        await refreshDevices();
        return true;
      } else {
        setError(`Failed to disconnect device: ${deviceId}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect device';
      setError(errorMessage);
      console.error('Error disconnecting device:', err);
      return false;
    } finally {
      // 恢复UI状态
      setDevices(prev => prev.map(device =>
        device.id === deviceId
          ? { ...device, isConnecting: false }
          : device
      ));
    }
  }, [getAdbService, refreshDevices]);

  // 重启ADB服务器
  const restartAdbServer = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const adbService = getAdbService();
      const success = await adbService.restartServer();

      if (success) {
        // 等待服务器重启后刷新设备列表
        setTimeout(() => {
          refreshDevices();
        }, 2000);
        return true;
      } else {
        setError('Failed to restart ADB server');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart ADB server';
      setError(errorMessage);
      console.error('Error restarting ADB server:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAdbService, refreshDevices]);

  // 获取设备详细信息
  const getDeviceDetails = useCallback(async (deviceId: string) => {
    try {
      const adbService = getAdbService();
      const deviceInfo = await adbService.getDeviceInfo(deviceId);
      return deviceInfo;
    } catch (err) {
      console.error(`Error getting device details for ${deviceId}:`, err);
      return null;
    }
  }, [getAdbService]);

  // 检查设备是否在线
  const checkDeviceStatus = useCallback(async (deviceId: string) => {
    try {
      const adbService = getAdbService();
      const isOnline = await adbService.isDeviceOnline(deviceId);
      return isOnline;
    } catch (err) {
      console.error(`Error checking device status for ${deviceId}:`, err);
      return false;
    }
  }, [getAdbService]);

  // 更新ADB配置
  const updateAdbConfig = useCallback((config: Parameters<AdbService['updateConfig']>[0]) => {
    const adbService = getAdbService();
    adbService.updateConfig(config);
  }, [getAdbService]);

  // 获取ADB配置
  const getAdbConfig = useCallback(() => {
    const adbService = getAdbService();
    return adbService.getConfig();
  }, [getAdbService]);

  const connectedDevices = devices.filter(d => d.status === 'device');
  const offlineDevices = devices.filter(d => d.status === 'offline');
  const unauthorizedDevices = devices.filter(d => d.status === 'unauthorized');

  return {
    // 状态
    devices,
    connectedDevices,
    offlineDevices,
    unauthorizedDevices,
    isLoading,
    error,

    // 方法
    refreshDevices,
    connectToLdPlayer,
    disconnectDevice,
    restartAdbServer,
    getDeviceDetails,
    checkDeviceStatus,
    updateAdbConfig,
    getAdbConfig,

    // 便捷属性
    hasConnectedDevices: connectedDevices.length > 0,
    totalDevices: devices.length,
    connectedCount: connectedDevices.length
  };
};
