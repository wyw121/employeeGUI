/**
 * 设备监控相关的React Hook
 * 管理设备连接状态和监控，与Tauri后端的ADB服务集成
 */
import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
      // 使用真实的Tauri ADB命令获取设备列表
      const deviceList = await invoke<string>('execute_adb_command_simple', { 
        command: 'devices -l' 
      });

      // 解析ADB设备输出
      const deviceLines = deviceList.split('\n').filter(line => 
        line.trim() && 
        !line.includes('List of devices attached') && 
        line.includes('\t')
      );

      const parsedDevices: DeviceInfo[] = deviceLines.map(line => {
        const parts = line.trim().split(/\s+/);
        const deviceId = parts[0];
        const status = parts[1] as DeviceInfo['status'];
        
        // 解析设备属性
        let model = 'Unknown Model';
        let product = 'Unknown Product';
        let type: 'emulator' | 'physical' = 'physical';

        // 检查是否是模拟器
        if (deviceId.includes('emulator') || deviceId.includes('127.0.0.1')) {
          type = 'emulator';
        }

        // 解析model和product信息
        const modelMatch = line.match(/model:(\w+)/);
        const productMatch = line.match(/product:(\w+)/);
        
        if (modelMatch) model = modelMatch[1];
        if (productMatch) product = productMatch[1];

        return {
          id: deviceId,
          status,
          model,
          product,
          type,
          lastSeen: new Date()
        };
      });

      setDevices(parsedDevices);
      
      // 记录日志到后端
      await invoke('add_log_entry', {
        level: 'INFO',
        category: 'DEVICE',
        source: 'DeviceMonitor',
        message: `刷新设备列表，发现 ${parsedDevices.length} 台设备`,
        details: JSON.stringify(parsedDevices)
      });
      
    } catch (error) {
      console.error('扫描设备时出错:', error);
      setDevices([]);
      
      // 记录错误到后端
      await invoke('add_log_entry', {
        level: 'ERROR',
        category: 'DEVICE',
        source: 'DeviceMonitor',
        message: `设备扫描失败: ${error}`,
        details: JSON.stringify(error)
      });
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