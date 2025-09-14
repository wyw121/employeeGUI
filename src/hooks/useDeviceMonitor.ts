/**
 * 设备监控相关的React Hook
 * 管理设备连接状态和监控
 */
import { useState, useCallback, useEffect } from 'react';

export interface DeviceInfo {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | 'no permissions';
  model?: string;
  product?: string;
  type: 'emulator' | 'physical';
  lastSeen?: Date;
}

export interface UseDeviceMonitorReturn {
  devices: DeviceInfo[];
  isScanning: boolean;
  refreshDevices: () => Promise<void>;
  getDeviceCount: () => number;
}

export const useDeviceMonitor = (): UseDeviceMonitorReturn => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const refreshDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      // 这里应该调用真实的ADB设备扫描逻辑
      // 暂时返回模拟数据
      const mockDevices: DeviceInfo[] = [
        {
          id: 'emulator-5554',
          status: 'device',
          model: 'Android SDK built for x86',
          product: 'sdk_gphone_x86',
          type: 'emulator',
          lastSeen: new Date()
        }
      ];
      
      setDevices(mockDevices);
    } catch (error) {
      console.error('扫描设备时出错:', error);
      setDevices([]);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const getDeviceCount = useCallback(() => {
    return devices.length;
  }, [devices]);

  // 初始化时扫描设备
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    devices,
    isScanning,
    refreshDevices,
    getDeviceCount
  };
};