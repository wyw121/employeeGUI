import { TauriDeviceRepository } from '../../infrastructure/repositories/TauriDeviceRepository';
import { SmartDeviceRepository } from '../../infrastructure/repositories/SmartDeviceRepository';
import { TauriAdbRepository } from '../../infrastructure/repositories/TauriAdbRepository';
import { TauriDiagnosticRepository } from '../../infrastructure/repositories/TauriDiagnosticRepository';
import { IDeviceRepository } from '../../domain/adb/repositories/IDeviceRepository';
import { IAdbRepository } from '../../domain/adb/repositories/IAdbRepository';
import { IDiagnosticRepository } from '../../domain/adb/repositories/IDiagnosticRepository';
import { DeviceManagerService } from '../../domain/adb/services/DeviceManagerService';
import { ConnectionService } from '../../domain/adb/services/ConnectionService';
import { DiagnosticService } from '../../domain/adb/services/DiagnosticService';
import { AdbApplicationService } from './AdbApplicationService';

/**
 * 服务容器
 * 负责依赖注入和服务生命周期管理
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * 注册服务
   */
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  /**
   * 获取服务（单例模式）
   */
  get<T>(key: string): T {
    if (!this.services.has(key)) {
      throw new Error(`Service ${key} not registered`);
    }

    const serviceKey = `${key}_instance`;
    if (!this.services.has(serviceKey)) {
      const factory = this.services.get(key);
      this.services.set(serviceKey, factory());
    }

    return this.services.get(serviceKey);
  }

  /**
   * 清理所有服务实例（主要用于测试）
   */
  clear(): void {
    this.services.clear();
    this.registerDefaultServices();
  }

  /**
   * 注册默认服务
   */
  registerDefaultServices(): void {
    // 注册Repository层 - 使用智能设备仓储实现最佳实践
    this.register('deviceRepository', () => new SmartDeviceRepository());
    this.register('adbRepository', () => new TauriAdbRepository());
    this.register('diagnosticRepository', () => new TauriDiagnosticRepository());

    // 注册Domain Service层
    this.register('deviceManagerService', () => {
      const deviceRepository = this.get<IDeviceRepository>('deviceRepository');
      return new DeviceManagerService(deviceRepository);
    });

    this.register('connectionService', () => {
      const adbRepository = this.get<IAdbRepository>('adbRepository');
      return new ConnectionService(adbRepository);
    });

    this.register('diagnosticService', () => {
      const diagnosticRepository = this.get<IDiagnosticRepository>('diagnosticRepository');
      return new DiagnosticService(diagnosticRepository);
    });

    // 注册Application Service层
    this.register('adbApplicationService', () => {
      const deviceManager = this.get<DeviceManagerService>('deviceManagerService');
      const connectionService = this.get<ConnectionService>('connectionService');
      const diagnosticService = this.get<DiagnosticService>('diagnosticService');
      return new AdbApplicationService(deviceManager, connectionService, diagnosticService);
    });
  }
}

// 初始化服务容器
const container = ServiceContainer.getInstance();
container.registerDefaultServices();

/**
 * 服务工厂 - 提供便捷的服务获取方法
 */
export const ServiceFactory = {
  /**
   * 获取ADB应用服务（主要入口）
   */
  getAdbApplicationService(): AdbApplicationService {
    return container.get<AdbApplicationService>('adbApplicationService');
  },

  /**
   * 获取设备管理服务
   */
  getDeviceManagerService(): DeviceManagerService {
    return container.get<DeviceManagerService>('deviceManagerService');
  },

  /**
   * 获取连接服务
   */
  getConnectionService(): ConnectionService {
    return container.get<ConnectionService>('connectionService');
  },

  /**
   * 获取诊断服务
   */
  getDiagnosticService(): DiagnosticService {
    return container.get<DiagnosticService>('diagnosticService');
  },

  /**
   * 重置服务容器（主要用于测试）
   */
  reset(): void {
    container.clear();
  }
};

export default ServiceFactory;

