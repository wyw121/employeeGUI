import { IDeviceRepository } from '../../domain/adb/repositories/IDeviceRepository';
import { Device, DeviceQuery, DeviceStatus, DeviceType } from '../../domain/adb/entities/Device';
import { getGlobalDeviceTracker, TrackedDevice } from '../RealTimeDeviceTracker';

/**
 * 实时设备Repository
 * 基于RealTimeDeviceTracker的事件驱动设备管理
 * 完全替代所有轮询机制
 */
export class RealTimeDeviceRepository implements IDeviceRepository {
  private deviceChangeCallbacks: ((devices: Device[]) => void)[] = [];
  private isInitialized = false;
  
  constructor() {
    this.initializeEventListeners();
  }

  /**
   * 初始化事件监听器
   */
  private async initializeEventListeners(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const tracker = getGlobalDeviceTracker();
    
    // 监听设备变化事件
    tracker.onDeviceChange((event) => {
      const devices = event.devices.map(device => this.convertToDevice(device));
      
      // 通知所有监听器
      this.deviceChangeCallbacks.forEach(callback => {
        try {
          callback(devices);
        } catch (error) {
          console.error('设备变化回调执行失败:', error);
        }
      });
    });

    // 确保跟踪器已启动
    if (!tracker.isRunning()) {
      try {
        await tracker.startTracking();
      } catch (error) {
        console.error('启动实时设备跟踪失败:', error);
      }
    }

    this.isInitialized = true;
    console.log('✅ RealTimeDeviceRepository 初始化完成 (替代轮询)');
  }

  /**
   * 获取所有设备
   */
  async getDevices(): Promise<Device[]> {
    const tracker = getGlobalDeviceTracker();
    const trackedDevices = await tracker.getCurrentDevices();
    
    return trackedDevices.map(device => this.convertToDevice(device));
  }

  /**
   * 根据查询条件获取设备
   */
  async getDevicesByQuery(query: DeviceQuery): Promise<Device[]> {
    const allDevices = await this.getDevices();
    
    return allDevices.filter(device => {
      if (query.status && device.status !== query.status) {
        return false;
      }
      if (query.type && device.type !== query.type) {
        return false;
      }
      if (query.onlineOnly && !device.isOnline()) {
        return false;
      }
      return true;
    });
  }

  /**
   * 根据ID获取设备
   */
  async getDeviceById(deviceId: string): Promise<Device | null> {
    const allDevices = await this.getDevices();
    return allDevices.find(device => device.id === deviceId) || null;
  }

  /**
   * 获取设备详细信息
   */
  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    const device = await this.getDeviceById(deviceId);
    return device ? device.properties : null;
  }

  /**
   * 检查设备是否在线
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    const device = await this.getDeviceById(deviceId);
    return device ? device.status === DeviceStatus.ONLINE : false;
  }

  /**
   * 连接到设备
   */
  async connectToDevice(address: string): Promise<void> {
    // 这里应该调用Tauri后端的连接命令
    throw new Error('connectToDevice 需要实现 Tauri 后端调用');
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    // 这里应该调用Tauri后端的断开命令
    throw new Error('disconnectDevice 需要实现 Tauri 后端调用');
  }

  /**
   * 连接到常见的模拟器端口
   */
  async connectToCommonEmulatorPorts(): Promise<Device[]> {
    // 这里应该调用Tauri后端的模拟器连接命令
    throw new Error('connectToCommonEmulatorPorts 需要实现 Tauri 后端调用');
  }

  /**
   * 监听设备变化
   */
  watchDeviceChanges(callback: (devices: Device[]) => void): () => void {
    this.deviceChangeCallbacks.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = this.deviceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.deviceChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 将TrackedDevice转换为Device
   */
  private convertToDevice(trackedDevice: TrackedDevice): Device {
    return Device.fromRaw({
      id: trackedDevice.id,
      status: trackedDevice.status,
      type: trackedDevice.connection_type,
    });
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.deviceChangeCallbacks = [];
    this.isInitialized = false;
  }
}
