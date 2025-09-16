import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { EventManager } from './EventManager';

/**
 * 设备变化事件类型
 */
export interface DeviceChangeEvent {
  event_type: DeviceEventType;
  devices: TrackedDevice[];
  timestamp: number;
}

export interface DeviceEventType {
  DevicesChanged?: null;
  DeviceConnected?: string;
  DeviceDisconnected?: string;
  InitialList?: null;
}

export interface TrackedDevice {
  id: string;
  status: string;
  connection_type: string;
}

/**
 * 实时ADB设备跟踪服务
 * 基于host:track-devices协议，实现事件驱动的设备监听
 * 完全替代轮询机制
 */
export class RealTimeDeviceTracker {
  private eventManager: EventManager;
  private unlistenFn: UnlistenFn | null = null;
  private isTracking = false;
  private deviceChangeCallbacks: ((event: DeviceChangeEvent) => void)[] = [];

  constructor() {
    this.eventManager = new EventManager();
  }

  /**
   * 启动实时设备跟踪
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('🎯 设备跟踪已在运行');
      return;
    }

    try {
      console.log('🚀 启动实时ADB设备跟踪...');

      // 启动后端设备跟踪
      await invoke('start_device_tracking');

      // 监听设备变化事件
      this.unlistenFn = await listen('device-change', (event) => {
        const deviceEvent = event.payload as DeviceChangeEvent;
        this.handleDeviceChange(deviceEvent);
      });

      this.isTracking = true;
      console.log('✅ 实时设备跟踪启动成功');
      
      // 获取初始设备列表
      await this.refreshDeviceList();

    } catch (error) {
      console.error('❌ 启动设备跟踪失败:', error);
      throw error;
    }
  }

  /**
   * 停止设备跟踪
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      // 停止事件监听
      if (this.unlistenFn) {
        this.unlistenFn();
        this.unlistenFn = null;
      }

      // 停止后端跟踪
      await invoke('stop_device_tracking');

      this.isTracking = false;
      console.log('⏹️ 设备跟踪已停止');

    } catch (error) {
      console.error('❌ 停止设备跟踪失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前跟踪的设备列表
   */
  async getCurrentDevices(): Promise<TrackedDevice[]> {
    try {
      const devices = await invoke<TrackedDevice[]>('get_tracked_devices');
      console.log(`📱 获取到 ${devices.length} 个设备`);
      return devices;
    } catch (error) {
      console.error('❌ 获取设备列表失败:', error);
      return [];
    }
  }

  /**
   * 订阅设备变化事件
   */
  onDeviceChange(callback: (event: DeviceChangeEvent) => void): () => void {
    this.deviceChangeCallbacks.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const index = this.deviceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.deviceChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 处理设备变化事件
   */
  private handleDeviceChange(event: DeviceChangeEvent): void {
    console.log('🔄 收到设备变化事件:', event);

    // 分析事件类型
    if ('DeviceConnected' in event.event_type) {
      console.log(`📱 设备已连接: ${event.event_type.DeviceConnected}`);
      this.eventManager.emit('device-connected', {
        deviceId: event.event_type.DeviceConnected,
        devices: event.devices,
      });
    } else if ('DeviceDisconnected' in event.event_type) {
      console.log(`📱 设备已断开: ${event.event_type.DeviceDisconnected}`);
      this.eventManager.emit('device-disconnected', {
        deviceId: event.event_type.DeviceDisconnected,
        devices: event.devices,
      });
    } else if ('DevicesChanged' in event.event_type) {
      console.log('🔄 设备状态已变化');
      this.eventManager.emit('devices-changed', {
        devices: event.devices,
      });
    } else if ('InitialList' in event.event_type) {
      console.log('📋 收到初始设备列表');
      this.eventManager.emit('devices-initialized', {
        devices: event.devices,
      });
    }

    // 通知所有订阅者
    this.deviceChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('设备变化回调执行失败:', error);
      }
    });

    // 发送通用设备更新事件
    this.eventManager.emit('device-list-updated', {
      devices: event.devices,
      eventType: event.event_type,
      timestamp: event.timestamp,
    });
  }

  /**
   * 刷新设备列表
   */
  private async refreshDeviceList(): Promise<void> {
    try {
      const devices = await this.getCurrentDevices();
      
      // 模拟初始设备事件
      const initialEvent: DeviceChangeEvent = {
        event_type: { InitialList: null },
        devices,
        timestamp: Math.floor(Date.now() / 1000),
      };

      this.handleDeviceChange(initialEvent);
    } catch (error) {
      console.error('刷新设备列表失败:', error);
    }
  }

  /**
   * 获取跟踪状态
   */
  isRunning(): boolean {
    return this.isTracking;
  }

  /**
   * 获取事件管理器（用于其他组件监听事件）
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.stopTracking();
    this.deviceChangeCallbacks = [];
    this.eventManager.removeAllListeners();
  }
}

// 全局实例
let globalTracker: RealTimeDeviceTracker | null = null;

/**
 * 获取全局设备跟踪器实例
 */
export function getGlobalDeviceTracker(): RealTimeDeviceTracker {
  if (!globalTracker) {
    globalTracker = new RealTimeDeviceTracker();
  }
  return globalTracker;
}

/**
 * 清理全局跟踪器
 */
export async function cleanupGlobalTracker(): Promise<void> {
  if (globalTracker) {
    await globalTracker.cleanup();
    globalTracker = null;
  }
}