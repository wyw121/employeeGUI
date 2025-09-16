import { useEffect, useState, useCallback } from 'react';
import { 
  RealTimeDeviceTracker, 
  DeviceChangeEvent, 
  TrackedDevice,
  getGlobalDeviceTracker 
} from '../../infrastructure/RealTimeDeviceTracker';

/**
 * 使用实时ADB设备跟踪的Hook
 * 基于host:track-devices协议，完全替代轮询机制
 */
export function useRealTimeDevices() {
  const [devices, setDevices] = useState<TrackedDevice[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<DeviceChangeEvent | null>(null);

  // 获取全局跟踪器实例
  const tracker = getGlobalDeviceTracker();

  /**
   * 启动设备跟踪
   */
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      await tracker.startTracking();
      setIsTracking(true);
      
      // 获取初始设备列表
      const initialDevices = await tracker.getCurrentDevices();
      setDevices(initialDevices);
      
      console.log('✅ 实时设备跟踪启动成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启动设备跟踪失败';
      setError(errorMessage);
      console.error('❌ 启动设备跟踪失败:', err);
    }
  }, [tracker]);

  /**
   * 停止设备跟踪
   */
  const stopTracking = useCallback(async () => {
    try {
      await tracker.stopTracking();
      setIsTracking(false);
      console.log('⏹️ 设备跟踪已停止');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '停止设备跟踪失败';
      setError(errorMessage);
      console.error('❌ 停止设备跟踪失败:', err);
    }
  }, [tracker]);

  /**
   * 手动刷新设备列表
   */
  const refreshDevices = useCallback(async () => {
    try {
      const currentDevices = await tracker.getCurrentDevices();
      setDevices(currentDevices);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新设备列表失败';
      setError(errorMessage);
      console.error('❌ 刷新设备列表失败:', err);
    }
  }, [tracker]);

  /**
   * 处理设备变化事件
   */
  const handleDeviceChange = useCallback((event: DeviceChangeEvent) => {
    console.log('🔄 设备状态变化:', event);
    
    setDevices(event.devices);
    setLastEvent(event);
    setError(null);
    
    // 根据事件类型进行不同的处理
    if ('DeviceConnected' in event.event_type) {
      console.log(`📱 设备已连接: ${event.event_type.DeviceConnected}`);
    } else if ('DeviceDisconnected' in event.event_type) {
      console.log(`📱 设备已断开: ${event.event_type.DeviceDisconnected}`);
    } else if ('DevicesChanged' in event.event_type) {
      console.log('🔄 设备状态已变化');
    } else if ('InitialList' in event.event_type) {
      console.log('📋 收到初始设备列表');
    }
  }, []);

  // 组件挂载时设置事件监听
  useEffect(() => {
    const unsubscribe = tracker.onDeviceChange(handleDeviceChange);
    
    // 检查跟踪状态
    setIsTracking(tracker.isRunning());
    
    return () => {
      unsubscribe();
    };
  }, [tracker, handleDeviceChange]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 注意：这里不调用stopTracking，因为可能其他组件还在使用
      // 只有在应用关闭时才需要清理全局跟踪器
    };
  }, []);

  /**
   * 获取在线设备列表
   */
  const onlineDevices = devices.filter(device => 
    device.status === 'device' || device.status === 'online'
  );

  /**
   * 获取离线设备列表
   */
  const offlineDevices = devices.filter(device => 
    device.status === 'offline'
  );

  /**
   * 获取USB连接的设备
   */
  const usbDevices = devices.filter(device => 
    device.connection_type === 'usb'
  );

  /**
   * 获取模拟器设备
   */
  const emulatorDevices = devices.filter(device => 
    device.connection_type === 'emulator'
  );

  /**
   * 检查是否有特定设备
   */
  const hasDevice = useCallback((deviceId: string) => {
    return devices.some(device => device.id === deviceId);
  }, [devices]);

  /**
   * 获取设备统计信息
   */
  const deviceStats = {
    total: devices.length,
    online: onlineDevices.length,
    offline: offlineDevices.length,
    usb: usbDevices.length,
    emulator: emulatorDevices.length,
  };

  return {
    // 设备数据
    devices,
    onlineDevices,
    offlineDevices,
    usbDevices,
    emulatorDevices,
    deviceStats,
    
    // 控制方法
    startTracking,
    stopTracking,
    refreshDevices,
    
    // 状态
    isTracking,
    error,
    lastEvent,
    
    // 工具方法
    hasDevice,
    
    // 跟踪器实例（高级用法）
    tracker,
  };
}

/**
 * 自动启动设备跟踪的Hook
 * 组件挂载时自动启动，卸载时不会停止（供其他组件继续使用）
 */
export function useAutoDeviceTracking() {
  const realTimeDevices = useRealTimeDevices();
  
  useEffect(() => {
    // 自动启动跟踪
    if (!realTimeDevices.isTracking) {
      realTimeDevices.startTracking();
    }
  }, [realTimeDevices]);
  
  return realTimeDevices;
}

/**
 * 仅用于显示设备列表的简化Hook
 */
export function useDeviceList() {
  const { devices, onlineDevices, deviceStats, isTracking, error } = useAutoDeviceTracking();
  
  return {
    devices,
    onlineDevices,
    deviceStats,
    isTracking,
    error,
  };
}