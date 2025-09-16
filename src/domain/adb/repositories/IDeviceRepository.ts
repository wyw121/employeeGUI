import { Device, DeviceQuery } from '../entities/Device';

/**
 * 设备仓储接口
 * 定义设备数据访问的抽象契约
 */
export interface IDeviceRepository {
  /**
   * 获取所有设备
   */
  getDevices(): Promise<Device[]>;

  /**
   * 根据查询条件获取设备
   */
  getDevicesByQuery(query: DeviceQuery): Promise<Device[]>;

  /**
   * 根据ID获取设备
   */
  getDeviceById(deviceId: string): Promise<Device | null>;

  /**
   * 获取设备详细信息
   */
  getDeviceInfo(deviceId: string): Promise<Record<string, string> | null>;

  /**
   * 检查设备是否在线
   */
  isDeviceOnline(deviceId: string): Promise<boolean>;

  /**
   * 连接到设备
   */
  connectToDevice(address: string): Promise<void>;

  /**
   * 断开设备连接
   */
  disconnectDevice(deviceId: string): Promise<void>;

  /**
   * 连接到常见的模拟器端口
   */
  connectToCommonEmulatorPorts(): Promise<Device[]>;

  /**
   * 监听设备变化
   */
  watchDeviceChanges(callback: (devices: Device[]) => void): () => void;
}

