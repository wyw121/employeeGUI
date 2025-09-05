import { useState, useEffect } from 'react';
import type { Device } from '../types';

/**
 * 设备管理钩子
 * 管理设备状态和连接操作
 */
export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化设备列表
  useEffect(() => {
    const initializeDevices = () => {
      const initialDevices: Device[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Device-${String(i + 1).padStart(2, '0')}`,
        phone_name: `Phone-${i + 1}`,
        status: 'disconnected' as const,
        last_connected: undefined
      }));
      
      setDevices(initialDevices);
      setIsLoading(false);
    };

    initializeDevices();
  }, []);

  // 连接设备
  const connectDevice = async (deviceId: number) => {
    try {
      // 这里应该调用Tauri命令
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'connected', last_connected: new Date().toISOString() }
          : device
      ));
      return true;
    } catch (error) {
      console.error('Failed to connect device:', error);
      return false;
    }
  };

  // 断开设备
  const disconnectDevice = async (deviceId: number) => {
    try {
      // 这里应该调用Tauri命令
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'disconnected' }
          : device
      ));
      return true;
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      return false;
    }
  };

  const connectedDevices = devices.filter(d => d.status === 'connected');

  return {
    devices,
    connectedDevices,
    isLoading,
    connectDevice,
    disconnectDevice
  };
};
