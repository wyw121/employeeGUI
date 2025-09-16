import { invoke, isTauri } from '@tauri-apps/api/core';
import { IDeviceRepository } from '../../domain/adb/repositories/IDeviceRepository';
import { Device, DeviceQuery } from '../../domain/adb/entities/Device';

/**
 * 设备状态响应 - 对应Rust的DeviceStateResponse
 */
export interface DeviceStateResponse {
  devices: DeviceSnapshot[];
  version: number;
  has_changes: boolean;
  timestamp: number;
}

/**
 * 设备快照 - 对应Rust的DeviceSnapshot
 */
export interface DeviceSnapshot {
  id: string;
  status: string;
  device_type: string;
  model?: string;
  product?: string;
  last_seen: number;
}

/**
 * 智能设备仓储实现 - ADB管理最佳实践
 * 基于后端智能缓存，避免重复轮询和日志泛滥
 */
export class SmartDeviceRepository implements IDeviceRepository {
  private lastVersion = 0;
  private cachedDevices: Device[] = [];
  private watchCallbacks = new Set<(devices: Device[]) => void>();
  private pollIntervalId?: ReturnType<typeof setInterval>;
  
  async getDevices(): Promise<Device[]> {
    try {
      if (!isTauri()) {
        console.warn('Not running in Tauri environment, returning cached devices');
        return this.cachedDevices;
      }

      // 使用智能设备获取命令 - 后端会进行差异检测
      const response = await invoke<DeviceStateResponse>('get_devices_smart');
      
      // 只有在版本变化时才更新缓存和转换数据
      if (response.has_changes || response.version !== this.lastVersion) {
        console.log(`🔄 设备状态更新: 版本 ${this.lastVersion} -> ${response.version}`);
        this.lastVersion = response.version;
        this.cachedDevices = this.convertSnapshotsToDevices(response.devices);
        
        // 通知所有监听器
        this.notifyWatchers(this.cachedDevices);
      } else {
        console.debug(`📱 设备状态无变化 (版本: ${response.version})`);
      }

      return this.cachedDevices;
    } catch (error) {
      console.error('Failed to get smart devices:', error);
      // 返回缓存的设备，避免因网络问题导致界面空白
      return this.cachedDevices;
    }
  }

  /**
   * 将后端的DeviceSnapshot转换为前端的Device对象
   */
  private convertSnapshotsToDevices(snapshots: DeviceSnapshot[]): Device[] {
    return snapshots.map(snapshot => {
      return Device.fromRaw({
        id: snapshot.id,
        status: snapshot.status,
        model: snapshot.model,
        product: snapshot.product,
        type: snapshot.device_type as 'usb' | 'emulator'
      });
    });
  }

  async getDevice(id: string): Promise<Device | null> {
    const devices = await this.getDevices();
    return devices.find(device => device.id === id) || null;
  }

  async getDevicesByQuery(query: DeviceQuery): Promise<Device[]> {
    const devices = await this.getDevices();
    return devices.filter(device => {
      if (query.status && device.status !== query.status) return false;
      if (query.type && device.type !== query.type) return false;
      if (query.onlineOnly && !device.isOnline()) return false;
      return true;
    });
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    return this.getDevice(deviceId);
  }

  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    try {
      const properties = await this.getDeviceProperties(deviceId);
      return properties;
    } catch (error) {
      console.error(`Failed to get device info for ${deviceId}:`, error);
      return null;
    }
  }

  async isDeviceOnline(deviceId: string): Promise<boolean> {
    const device = await this.getDevice(deviceId);
    return device ? device.isOnline() : false;
  }

  async connectToDevice(address: string): Promise<void> {
    try {
      if (!isTauri()) {
        throw new Error('Not running in Tauri environment');
      }
      await invoke('connect_adb_device', { address });
      // 刷新设备列表
      await this.refreshDevices();
    } catch (error) {
      console.error(`Failed to connect to device ${address}:`, error);
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      if (!isTauri()) {
        throw new Error('Not running in Tauri environment');
      }
      await invoke('disconnect_adb_device', { deviceId });
      // 刷新设备列表
      await this.refreshDevices();
    } catch (error) {
      console.error(`Failed to disconnect device ${deviceId}:`, error);
      throw error;
    }
  }

  async connectToCommonEmulatorPorts(): Promise<Device[]> {
    const commonPorts = [5554, 5556, 5558, 5560, 5562];
    const connectedDevices: Device[] = [];

    for (const port of commonPorts) {
      try {
        await this.connectToDevice(`127.0.0.1:${port}`);
        // 短暂等待设备连接
        await new Promise(resolve => setTimeout(resolve, 500));
        const device = await this.getDevice(`emulator-${port}`);
        if (device) {
          connectedDevices.push(device);
        }
      } catch (error) {
        console.debug(`Failed to connect to ${port}:`, error);
      }
    }

    return connectedDevices;
  }

  async getOnlineDevices(): Promise<Device[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.isOnline());
  }

  async refreshDevices(): Promise<void> {
    // 强制刷新 - 清除版本缓存
    this.lastVersion = 0;
    await this.getDevices();
  }

  /**
   * 智能设备变化监听 - 基于后端的差异检测
   * 避免前端频繁轮询，减少系统负载
   */
  watchDeviceChanges(callback: (devices: Device[]) => void): () => void {
    this.watchCallbacks.add(callback);
    
    // 立即调用一次，返回当前缓存的设备
    callback(this.cachedDevices);

    // 启动智能轮询 - 间隔比原来更长，因为后端有智能缓存
    if (!this.pollIntervalId) {
      this.startSmartPolling();
    }

    // 返回取消监听的函数
    return () => {
      this.watchCallbacks.delete(callback);
      if (this.watchCallbacks.size === 0) {
        this.stopSmartPolling();
      }
    };
  }

  /**
   * 启动智能轮询 - 基于后端差异检测的优化轮询
   */
  private startSmartPolling(): void {
    // 使用更长的轮询间隔，因为后端已经做了智能缓存
    // 只有真正的设备变化才会触发更新
    this.pollIntervalId = setInterval(async () => {
      try {
        await this.getDevices(); // 这会自动处理差异检测
      } catch (error) {
        console.error('Smart polling error:', error);
      }
    }, 5000); // 5秒间隔，比原来的3秒长，减少系统负载

    console.log('🎯 启动智能设备轮询 (5秒间隔，基于后端差异检测)');
  }

  /**
   * 停止智能轮询
   */
  private stopSmartPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = undefined;
      console.log('⏸️ 停止智能设备轮询');
    }
  }

  /**
   * 通知所有监听器设备变化
   */
  private notifyWatchers(devices: Device[]): void {
    this.watchCallbacks.forEach(callback => {
      try {
        callback(devices);
      } catch (error) {
        console.error('Error in device change callback:', error);
      }
    });
  }

  /**
   * 获取设备详细属性 - 使用优化的后端命令
   */
  async getDeviceProperties(deviceId: string): Promise<Record<string, string>> {
    try {
      if (!isTauri()) {
        console.warn('Not running in Tauri environment, returning empty properties');
        return {};
      }

      const properties = await invoke<Record<string, string>>(
        'get_device_properties_optimized',
        { deviceId }
      );

      return properties;
    } catch (error) {
      console.error(`Failed to get properties for device ${deviceId}:`, error);
      return {};
    }
  }

  /**
   * 获取当前缓存统计信息 - 用于调试
   */
  getCacheStats(): {
    version: number;
    deviceCount: number;
    watcherCount: number;
    isPolling: boolean;
  } {
    return {
      version: this.lastVersion,
      deviceCount: this.cachedDevices.length,
      watcherCount: this.watchCallbacks.size,
      isPolling: !!this.pollIntervalId,
    };
  }
}