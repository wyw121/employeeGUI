/**
 * 设备实体 - 核心领域对象
 * 表示一个Android设备或模拟器
 */
export class Device {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly status: DeviceStatus,
    public readonly type: DeviceType,
    public readonly model?: string,
    public readonly product?: string,
    public readonly transportId?: string,
    public readonly lastSeen: Date = new Date(),
    public readonly properties: Record<string, string> = {}
  ) {}

  /**
   * 从原始数据创建设备实例
   */
  static fromRaw(data: {
    id: string;
    status: string;
    model?: string;
    product?: string;
    transport_id?: string;
    type?: string;
  }): Device {
    return new Device(
      data.id,
      data.model || data.product || `Device-${data.id.slice(0, 8)}`,
      Device.parseStatus(data.status),
      Device.parseType(data.type || data.id),
      data.model,
      data.product,
      data.transport_id,
      new Date()
    );
  }

  /**
   * 解析设备状态
   */
  private static parseStatus(status: string): DeviceStatus {
    switch (status.toLowerCase()) {
      case 'device':
        return DeviceStatus.ONLINE;
      case 'offline':
        return DeviceStatus.OFFLINE;
      case 'unauthorized':
        return DeviceStatus.UNAUTHORIZED;
      default:
        return DeviceStatus.UNKNOWN;
    }
  }

  /**
   * 解析设备类型
   */
  private static parseType(identifier: string): DeviceType {
    if (identifier.includes('emulator') || identifier.startsWith('127.0.0.1')) {
      return DeviceType.EMULATOR;
    }
    if (identifier.includes(':')) {
      return DeviceType.WIFI;
    }
    return DeviceType.USB;
  }

  /**
   * 检查设备是否在线
   */
  isOnline(): boolean {
    return this.status === DeviceStatus.ONLINE;
  }

  /**
   * 检查设备是否为模拟器
   */
  isEmulator(): boolean {
    return this.type === DeviceType.EMULATOR;
  }

  /**
   * 获取设备显示名称
   */
  getDisplayName(): string {
    if (this.model) return this.model;
    if (this.product) return this.product;
    return this.isEmulator() ? `模拟器 ${this.id}` : `设备 ${this.id}`;
  }

  /**
   * 创建设备副本并更新状态
   */
  withStatus(status: DeviceStatus): Device {
    return new Device(
      this.id,
      this.name,
      status,
      this.type,
      this.model,
      this.product,
      this.transportId,
      new Date(),
      this.properties
    );
  }

  /**
   * 创建设备副本并更新属性
   */
  withProperties(properties: Record<string, string>): Device {
    return new Device(
      this.id,
      this.name,
      this.status,
      this.type,
      this.model,
      this.product,
      this.transportId,
      this.lastSeen,
      { ...this.properties, ...properties }
    );
  }
}

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNAUTHORIZED = 'unauthorized',
  CONNECTING = 'connecting',
  UNKNOWN = 'unknown'
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  USB = 'usb',
  WIFI = 'wifi',
  EMULATOR = 'emulator'
}

/**
 * 设备查询接口
 */
export interface DeviceQuery {
  status?: DeviceStatus;
  type?: DeviceType;
  onlineOnly?: boolean;
}