import { Device, DeviceQuery, DeviceStatus } from '../entities/Device';
import { IDeviceRepository } from '../repositories/IDeviceRepository';
import { 
  DomainEvent, 
  DeviceConnectedEvent, 
  DeviceDisconnectedEvent, 
  DeviceStatusChangedEvent 
} from '../events/DomainEvents';

/**
 * 设备管理服务
 * 负责设备的发现、连接、状态管理等核心业务逻辑
 */
export class DeviceManagerService {
  private eventHandlers: ((event: DomainEvent) => void)[] = [];

  constructor(private deviceRepository: IDeviceRepository) {}

  /**
   * 获取所有设备
   */
  async getDevices(): Promise<Device[]> {
    return await this.deviceRepository.getDevices();
  }

  /**
   * 根据查询条件获取设备
   */
  async getDevicesByQuery(query: DeviceQuery): Promise<Device[]> {
    return await this.deviceRepository.getDevicesByQuery(query);
  }

  /**
   * 获取在线设备
   */
  async getOnlineDevices(): Promise<Device[]> {
    return await this.getDevicesByQuery({ onlineOnly: true });
  }

  /**
   * 根据ID获取设备
   */
  async getDeviceById(deviceId: string): Promise<Device | null> {
    return await this.deviceRepository.getDeviceById(deviceId);
  }

  /**
   * 获取设备详细信息
   */
  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    return await this.deviceRepository.getDeviceInfo(deviceId);
  }

  /**
   * 检查设备是否在线
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    return await this.deviceRepository.isDeviceOnline(deviceId);
  }

  /**
   * 连接到设备
   */
  async connectToDevice(address: string): Promise<void> {
    try {
      await this.deviceRepository.connectToDevice(address);
      
      // 验证连接是否成功
      const device = await this.deviceRepository.getDeviceById(address);
      if (device && device.isOnline()) {
        this.publishEvent(new DeviceConnectedEvent(device.id, device.getDisplayName()));
      }
    } catch (error) {
      throw new Error(`连接设备失败: ${error}`);
    }
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      // 获取设备信息用于事件
      const device = await this.deviceRepository.getDeviceById(deviceId);
      
      await this.deviceRepository.disconnectDevice(deviceId);
      
      if (device) {
        this.publishEvent(new DeviceDisconnectedEvent(device.id));
      }
    } catch (error) {
      throw new Error(`断开设备连接失败: ${error}`);
    }
  }

  /**
   * 连接到常见的模拟器端口
   */
  async connectToCommonEmulatorPorts(): Promise<Device[]> {
    try {
      const connectedDevices = await this.deviceRepository.connectToCommonEmulatorPorts();
      
      // 为每个成功连接的设备发送事件
      for (const device of connectedDevices) {
        this.publishEvent(new DeviceConnectedEvent(device.id, device.getDisplayName()));
      }
      
      return connectedDevices;
    } catch (error) {
      throw new Error(`连接模拟器失败: ${error}`);
    }
  }

  /**
   * 刷新设备列表
   */
  async refreshDevices(): Promise<Device[]> {
    const devices = await this.getDevices();
    return devices;
  }

  /**
   * 监听设备变化
   */
  watchDeviceChanges(callback: (devices: Device[]) => void): () => void {
    return this.deviceRepository.watchDeviceChanges((devices) => {
      // 检测设备状态变化并发送相应事件
      this.handleDeviceChanges(devices);
      callback(devices);
    });
  }

  /**
   * 获取设备统计信息
   */
  async getDeviceStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    emulators: number;
    usbDevices: number;
  }> {
    const devices = await this.getDevices();
    
    return {
      total: devices.length,
      online: devices.filter(d => d.isOnline()).length,
      offline: devices.filter(d => !d.isOnline()).length,
      emulators: devices.filter(d => d.isEmulator()).length,
      usbDevices: devices.filter(d => !d.isEmulator()).length
    };
  }

  /**
   * 批量操作设备
   */
  async batchOperation(
    deviceIds: string[], 
    operation: 'connect' | 'disconnect'
  ): Promise<{ success: string[]; failed: { deviceId: string; error: string }[] }> {
    const success: string[] = [];
    const failed: { deviceId: string; error: string }[] = [];

    for (const deviceId of deviceIds) {
      try {
        if (operation === 'connect') {
          await this.connectToDevice(deviceId);
        } else {
          await this.disconnectDevice(deviceId);
        }
        success.push(deviceId);
      } catch (error) {
        failed.push({
          deviceId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { success, failed };
  }

  /**
   * 添加事件处理器
   */
  addEventHandler(handler: (event: DomainEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 移除事件处理器
   */
  removeEventHandler(handler: (event: DomainEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * 发布领域事件
   */
  private publishEvent(event: DomainEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }

  /**
   * 处理设备变化，发送相应的领域事件
   */
  private previousDevices: Device[] = [];
  
  private handleDeviceChanges(currentDevices: Device[]): void {
    // 检测新连接的设备
    const newDevices = currentDevices.filter(current => 
      !this.previousDevices.some(prev => prev.id === current.id)
    );

    // 检测断开的设备
    const disconnectedDevices = this.previousDevices.filter(prev => 
      !currentDevices.some(current => current.id === prev.id)
    );

    // 检测状态变化的设备
    const statusChangedDevices = currentDevices.filter(current => {
      const previous = this.previousDevices.find(prev => prev.id === current.id);
      return previous && previous.status !== current.status;
    });

    // 发送事件
    newDevices.forEach(device => {
      this.publishEvent(new DeviceConnectedEvent(device.id, device.getDisplayName()));
    });

    disconnectedDevices.forEach(device => {
      this.publishEvent(new DeviceDisconnectedEvent(device.id));
    });

    statusChangedDevices.forEach(device => {
      const previous = this.previousDevices.find(prev => prev.id === device.id);
      if (previous) {
        this.publishEvent(new DeviceStatusChangedEvent(
          device.id, 
          previous.status, 
          device.status
        ));
      }
    });

    // 更新设备记录
    this.previousDevices = [...currentDevices];
  }
}

