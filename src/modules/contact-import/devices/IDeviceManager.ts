/**
 * 设备管理器接口
 * 负责设备检测、连接和管理
 */

import {
  Device,
  DeviceCapabilities,
  DeviceStatus,
  DeviceType,
  ValidationResult,
} from "../types";

export interface IDeviceManager {
  /**
   * 检测可用设备
   * @returns 设备列表
   */
  detectDevices(): Promise<Device[]>;

  /**
   * 验证设备连接状态
   * @param device 设备信息
   * @returns 验证结果
   */
  validateDevice(device: Device): Promise<ValidationResult>;

  /**
   * 获取设备能力信息
   * @param device 设备信息
   * @returns 设备能力
   */
  getDeviceCapabilities(device: Device): Promise<DeviceCapabilities>;

  /**
   * 连接到设备
   * @param device 设备信息
   * @returns 是否连接成功
   */
  connectToDevice(device: Device): Promise<boolean>;

  /**
   * 断开设备连接
   * @param deviceId 设备ID
   * @returns 是否断开成功
   */
  disconnectFromDevice(deviceId: string): Promise<boolean>;

  /**
   * 获取设备状态
   * @param deviceId 设备ID
   * @returns 设备对象或null
   */
  getDeviceStatus(deviceId: string): Promise<Device | null>;

  /**
   * 监听设备状态变化
   * @param callback 状态变化回调
   * @returns 取消监听的函数
   */
  onDeviceStatusChange(callback: (device: Device) => void): () => void;

  /**
   * 测试设备导入能力
   * @param device 设备信息
   * @returns 测试结果
   */
  testImportCapability(device: Device): Promise<{
    canImport: boolean;
    supportedFormats: string[];
    maxBatchSize: number;
    message?: string;
  }>;
}

/**
 * Android设备管理器实现
 */
export class AndroidDeviceManager implements IDeviceManager {
  private devices: Map<string, Device> = new Map();
  private statusListeners: ((device: Device) => void)[] = [];

  async detectDevices(): Promise<Device[]> {
    try {
      // 使用Tauri调用ADB检测设备
      const { invoke } = await import("@tauri-apps/api/core");

      // 调用后端的ADB设备检测方法
      const adbOutput = await invoke<string>("get_adb_devices", { 
        adb_path: "platform-tools/adb.exe"
      });
      return this.parseAdbDevices(adbOutput);
    } catch (error) {
      console.error("检测Android设备失败:", error);
      return [];
    }
  }

  async validateDevice(device: Device): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // 检查设备连接
      const isConnected = await this.checkDeviceConnection(device);
      if (!isConnected) {
        errors.push({
          code: "DEVICE_NOT_CONNECTED",
          message: `设备 ${device.name} 未连接`,
          severity: "error" as const,
        });
      }

      // 检查ADB授权
      const isAuthorized = await this.checkAdbAuthorization(device);
      if (!isAuthorized) {
        errors.push({
          code: "ADB_UNAUTHORIZED",
          message: `设备 ${device.name} ADB未授权`,
          severity: "error" as const,
        });
      }

      // 检查联系人权限
      const hasContactPermission = await this.checkContactPermission(device);
      if (!hasContactPermission) {
        warnings.push({
          code: "MISSING_CONTACT_PERMISSION",
          message: `设备 ${device.name} 可能缺少联系人权限`,
          severity: "warning" as const,
          suggestion: "请在设备上授予联系人权限",
        });
      }
    } catch (error) {
      errors.push({
        code: "VALIDATION_ERROR",
        message: `验证设备时出错: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: "error" as const,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getDeviceCapabilities(device: Device): Promise<DeviceCapabilities> {
    try {
      // 根据设备类型和API级别确定能力
      const apiLevel = device.metadata?.apiLevel || 21;

      return {
        supportedFormats: ["vcf", "csv"],
        maxContactsPerImport: this.calculateMaxContacts(apiLevel),
        supportsVcf: true,
        supportsBatchImport: apiLevel >= 23,
        supportsContactPhotos: apiLevel >= 21,
        supportsCustomFields: apiLevel >= 24,
      };
    } catch (error) {
      console.error("获取设备能力失败:", error);
      // 返回保守的默认能力
      return {
        supportedFormats: ["vcf"],
        maxContactsPerImport: 100,
        supportsVcf: true,
        supportsBatchImport: false,
        supportsContactPhotos: false,
        supportsCustomFields: false,
      };
    }
  }

  async connectToDevice(device: Device): Promise<boolean> {
    try {
      const { invoke } = await import("@tauri-apps/api/core");

      // 尝试连接设备
      const result = await invoke<boolean>("connect_adb_device", {
        deviceId: device.connection.address,
      });

      if (result) {
        // 更新设备状态
        const updatedDevice = { ...device, status: DeviceStatus.CONNECTED };
        this.devices.set(device.id, updatedDevice);
        this.notifyStatusChange(updatedDevice);
      }

      return result;
    } catch (error) {
      console.error("连接设备失败:", error);
      return false;
    }
  }

  async disconnectFromDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) return false;

      const { invoke } = await import("@tauri-apps/api/core");

      const result = await invoke<boolean>("disconnect_adb_device", {
        deviceId: device.connection.address,
      });

      if (result) {
        // 更新设备状态
        const updatedDevice = { ...device, status: DeviceStatus.DISCONNECTED };
        this.devices.set(deviceId, updatedDevice);
        this.notifyStatusChange(updatedDevice);
      }

      return result;
    } catch (error) {
      console.error("断开设备连接失败:", error);
      return false;
    }
  }

  async getDeviceStatus(deviceId: string): Promise<Device | null> {
    return this.devices.get(deviceId) || null;
  }

  onDeviceStatusChange(callback: (device: Device) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index !== -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  async testImportCapability(device: Device): Promise<{
    canImport: boolean;
    supportedFormats: string[];
    maxBatchSize: number;
    message?: string;
  }> {
    try {
      const validation = await this.validateDevice(device);
      if (!validation.valid) {
        return {
          canImport: false,
          supportedFormats: [],
          maxBatchSize: 0,
          message: validation.errors[0]?.message || "设备验证失败",
        };
      }

      const capabilities = await this.getDeviceCapabilities(device);
      return {
        canImport: true,
        supportedFormats: capabilities.supportedFormats,
        maxBatchSize: capabilities.maxContactsPerImport,
        message: "设备支持联系人导入",
      };
    } catch (error) {
      return {
        canImport: false,
        supportedFormats: [],
        maxBatchSize: 0,
        message: `测试失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * 解析ADB设备输出
   * @param adbOutput ADB输出
   * @returns 设备列表
   */
  private parseAdbDevices(adbOutput: string): Device[] {
    const devices: Device[] = [];
    const lines = adbOutput.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("List of devices") && trimmed !== "") {
        const parts = trimmed.split("\t");
        if (parts.length >= 2) {
          const deviceId = parts[0];
          const status = parts[1];

          const device: Device = {
            id: deviceId,
            name: this.getDeviceName(deviceId),
            type: this.getDeviceType(deviceId),
            status: this.mapAdbStatus(status),
            capabilities: {
              supportedFormats: ["vcf"],
              maxContactsPerImport: 100,
              supportsVcf: true,
              supportsBatchImport: true,
              supportsContactPhotos: true,
              supportsCustomFields: false,
            },
            connection: {
              protocol: "adb",
              address: deviceId,
            },
          };

          devices.push(device);
          this.devices.set(deviceId, device);
        }
      }
    }

    return devices;
  }

  private getDeviceName(deviceId: string): string {
    if (deviceId.startsWith("emulator-")) {
      return `模拟器 (${deviceId})`;
    } else if (deviceId.includes(":")) {
      return `网络设备 (${deviceId})`;
    } else {
      return `设备 (${deviceId})`;
    }
  }

  private getDeviceType(deviceId: string): Device["type"] {
    if (deviceId.startsWith("emulator-")) {
      return DeviceType.ANDROID_EMULATOR;
    }
    return DeviceType.ANDROID_PHYSICAL;
  }

  private mapAdbStatus(adbStatus: string): DeviceStatus {
    switch (adbStatus.toLowerCase()) {
      case "device":
        return DeviceStatus.CONNECTED;
      case "unauthorized":
        return DeviceStatus.UNAUTHORIZED;
      case "offline":
        return DeviceStatus.OFFLINE;
      default:
        return DeviceStatus.UNKNOWN;
    }
  }

  private calculateMaxContacts(apiLevel: number): number {
    if (apiLevel >= 26) return 1000;
    if (apiLevel >= 23) return 500;
    if (apiLevel >= 21) return 200;
    return 100;
  }

  private async checkDeviceConnection(device: Device): Promise<boolean> {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<boolean>("check_adb_device_connection", {
        deviceId: device.connection.address,
      });
    } catch {
      return false;
    }
  }

  private async checkAdbAuthorization(device: Device): Promise<boolean> {
    return device.status !== DeviceStatus.UNAUTHORIZED;
  }

  private async checkContactPermission(device: Device): Promise<boolean> {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<boolean>("check_device_contact_permission", {
        deviceId: device.connection.address,
      });
    } catch {
      // 假设有权限，因为这个检查比较复杂
      return true;
    }
  }

  private notifyStatusChange(device: Device): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(device);
      } catch (error) {
        console.error("设备状态监听器执行失败:", error);
      }
    });
  }
}
