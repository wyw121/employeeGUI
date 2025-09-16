/**
 * 统一ADB设备管理器适配器
 * 将统一的 useAdb() 接口适配为 contact-import 模块的 IDeviceManager 接口
 */

import { Device as AdbDevice } from '../../../domain/adb/entities/Device';
import { AdbApplicationService } from '../../../application/services/AdbApplicationService';
import { ServiceFactory } from '../../../application/services/ServiceFactory';
import { useAdbStore } from '../../../application/store/adbStore';
import { IDeviceManager } from '../devices/IDeviceManager';
import { 
  Device,
  DeviceCapabilities,
  DeviceStatus,
  DeviceType,
  ValidationResult,
} from '../types';

/**
 * 统一ADB设备管理器适配器
 * 桥接统一的 ADB 架构与 contact-import 模块
 */
export class UnifiedAdbDeviceManager implements IDeviceManager {
  private applicationService: AdbApplicationService;
  private statusListeners: ((device: Device) => void)[] = [];

  constructor() {
    this.applicationService = ServiceFactory.getAdbApplicationService();
  }

  async detectDevices(): Promise<Device[]> {
    try {
      // 使用统一的 ADB 服务刷新设备
      await this.applicationService.refreshDevices();
      
      // 从 store 获取设备列表
      const store = useAdbStore.getState();
      const adbDevices = store.devices;
      
      // 转换为 contact-import 模块的 Device 格式
      return adbDevices.map(this.adaptAdbDeviceToContactDevice);
    } catch (error) {
      console.error("检测设备失败:", error);
      return [];
    }
  }

  async validateDevice(device: Device): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // 使用统一的 ADB 服务进行设备验证
      const deviceInfo = await this.applicationService.getDeviceInfo(device.id);
      
      if (!deviceInfo) {
        errors.push({
          code: "DEVICE_NOT_FOUND",
          message: `设备 ${device.name} 未找到`,
          severity: "error" as const,
        });
        return { valid: false, errors, warnings };
      }

      // 检查设备是否在线
      if (deviceInfo && typeof deviceInfo === 'object') {
        // deviceInfo 是 Record<string, string>，没有 isOnline 方法
        const deviceStatus = deviceInfo.status || deviceInfo.state || 'unknown';
        if (deviceStatus === 'offline') {
          errors.push({
            code: "DEVICE_OFFLINE",
            message: `设备 ${device.name} 离线`,
            severity: "error" as const,
          });
        }

        // 检查设备授权状态
        if (deviceStatus === 'unauthorized') {
          errors.push({
            code: "ADB_UNAUTHORIZED",
            message: `设备 ${device.name} ADB未授权`,
            severity: "error" as const,
          });
        }
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
      // 基于设备信息确定能力
      const store = useAdbStore.getState();
      const deviceInfo = store.getDeviceById(device.id);
      
      if (!deviceInfo) {
        // 返回保守的默认能力
        return this.getDefaultCapabilities();
      }

      // 根据设备属性确定能力
      const apiLevel = this.extractApiLevel(deviceInfo.model || "");
      
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
      return this.getDefaultCapabilities();
    }
  }

  async connectToDevice(device: Device): Promise<boolean> {
    try {
      // 使用统一的 ADB 服务连接设备
      await this.applicationService.connectToDevice(device.connection.address);
      
      // connectToDevice 返回 void，我们需要检查连接状态
      const store = useAdbStore.getState();
      const connectedDevice = store.getDeviceById(device.id);
      const isConnected = connectedDevice?.isOnline() || false;
      
      if (isConnected) {
        // 通知状态变化监听器
        const updatedDevice = { ...device, status: DeviceStatus.CONNECTED };
        this.notifyStatusChange(updatedDevice);
      }

      return isConnected;
    } catch (error) {
      console.error("连接设备失败:", error);
      return false;
    }
  }

  async disconnectFromDevice(deviceId: string): Promise<boolean> {
    try {
      // 使用统一的 ADB 服务断开设备
      await this.applicationService.disconnectDevice(deviceId);
      
      // 通知状态变化监听器
      const device = await this.getDeviceStatus(deviceId);
      if (device) {
        const updatedDevice = { ...device, status: DeviceStatus.DISCONNECTED };
        this.notifyStatusChange(updatedDevice);
      }

      return true;
    } catch (error) {
      console.error("断开设备失败:", error);
      return false;
    }
  }

  async getDeviceStatus(deviceId: string): Promise<Device | null> {
    try {
      // 首先从 store 获取设备信息
      const store = useAdbStore.getState();
      const adbDevice = store.getDeviceById(deviceId);
      
      if (!adbDevice) {
        return null;
      }

      return this.adaptAdbDeviceToContactDevice(adbDevice);
    } catch (error) {
      console.error("获取设备状态失败:", error);
      return null;
    }
  }

  onDeviceStatusChange(callback: (device: Device) => void): () => void {
    this.statusListeners.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
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
      const capabilities = await this.getDeviceCapabilities(device);
      
      return {
        canImport: validation.valid,
        supportedFormats: capabilities.supportedFormats,
        maxBatchSize: capabilities.maxContactsPerImport,
        message: validation.valid 
          ? "设备支持联系人导入" 
          : validation.errors.map(e => e.message).join(', ')
      };
    } catch (error) {
      return {
        canImport: false,
        supportedFormats: [],
        maxBatchSize: 0,
        message: `测试导入能力失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // ===== 私有方法 =====

  /**
   * 将 ADB 设备适配为 contact-import 设备格式
   */
  private adaptAdbDeviceToContactDevice(adbDevice: AdbDevice): Device {
    return {
      id: adbDevice.id,
      name: adbDevice.getDisplayName(),
      type: this.determineDeviceType(adbDevice),
      status: this.mapDeviceStatus(adbDevice.status),
      capabilities: this.getDefaultCapabilities(), // 使用默认能力，可以后续优化
      connection: {
        protocol: 'adb' as const,
        address: adbDevice.id,
        port: undefined
      },
      metadata: {
        model: adbDevice.model || 'Unknown',
        manufacturer: adbDevice.model?.split(' ')[0] || 'Unknown',
        osVersion: 'Unknown', // Android 版本信息需要从其他地方获取
        apiLevel: this.extractApiLevel(adbDevice.model || ""),
      }
    };
  }

  private determineDeviceType(adbDevice: AdbDevice): DeviceType {
    // 根据设备ID判断类型
    if (adbDevice.id.startsWith('emulator-')) {
      return DeviceType.ANDROID_EMULATOR;
    }
    return DeviceType.ANDROID_PHYSICAL;
  }

  private mapDeviceStatus(adbStatus: string): DeviceStatus {
    switch (adbStatus) {
      case 'device':
        return DeviceStatus.CONNECTED;
      case 'offline':
        return DeviceStatus.DISCONNECTED;
      case 'unauthorized':
        return DeviceStatus.UNAUTHORIZED;
      default:
        return DeviceStatus.UNKNOWN;
    }
  }

  private extractApiLevel(model: string): number {
    // 这里可以根据设备型号推断API级别
    // 返回一个保守的默认值
    return 21;
  }

  private calculateMaxContacts(apiLevel: number): number {
    if (apiLevel >= 28) return 1000;
    if (apiLevel >= 24) return 500;
    if (apiLevel >= 21) return 200;
    return 100;
  }

  private getDefaultCapabilities(): DeviceCapabilities {
    return {
      supportedFormats: ["vcf"],
      maxContactsPerImport: 100,
      supportsVcf: true,
      supportsBatchImport: false,
      supportsContactPhotos: false,
      supportsCustomFields: false,
    };
  }

  private notifyStatusChange(device: Device): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(device);
      } catch (error) {
        console.error("设备状态变化通知失败:", error);
      }
    });
  }
}