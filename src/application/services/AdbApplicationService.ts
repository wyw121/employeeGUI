import { 
  Device, 
  AdbConnection, 
  AdbConfig, 
  DiagnosticResult,
  DiagnosticSummary,
  DiagnosticCategory,
  DomainEvent
} from '../../domain/adb';
import { DeviceManagerService } from '../../domain/adb/services/DeviceManagerService';
import { ConnectionService } from '../../domain/adb/services/ConnectionService';
import { DiagnosticService } from '../../domain/adb/services/DiagnosticService';
import { useAdbStore } from '../store/adbStore';

/**
 * ADB应用服务
 * 
 * 作为Facade模式的实现，协调各个领域服务，
 * 为UI层提供简化的、业务导向的API接口
 */
export class AdbApplicationService {
  private deviceWatcher: (() => void) | null = null;
  private healthChecker: (() => void) | null = null;

  constructor(
    private deviceManager: DeviceManagerService,
    private connectionService: ConnectionService,
    private diagnosticService: DiagnosticService
  ) {
    // 设置事件处理器来同步状态到Store
    this.setupEventHandlers();
  }

  // ===== 初始化和配置 =====

  /**
   * 初始化ADB环境
   */
  async initialize(config?: AdbConfig): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setInitializing(true);
      store.setError(null);

      // 1. 初始化连接
      const connection = await this.connectionService.initializeConnection(config);
      store.setConnection(connection);
      store.setConfig(config || AdbConfig.default());

      // 2. 运行初始诊断
      const diagnosticSummary = await this.diagnosticService.runQuickDiagnostic();
      store.setDiagnosticResults(this.diagnosticService.getLastDiagnosticResults());

      // 3. 获取设备列表
      const devices = await this.deviceManager.getDevices();
      store.setDevices(devices);

      // 4. 启动设备监听
      this.startDeviceWatching();

      // 5. 启动健康检查
      this.startHealthChecking();

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setInitializing(false);
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: AdbConfig): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      const connection = await this.connectionService.updateConnection(config);
      store.setConnection(connection);
      store.setConfig(config);

      // 重新获取设备列表
      await this.refreshDevices();
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 重置服务状态
   */
  reset(): void {
    this.stopDeviceWatching();
    this.stopHealthChecking();
    useAdbStore.getState().reset();
  }

  // ===== 设备管理 =====

  /**
   * 刷新设备列表
   */
  async refreshDevices(): Promise<Device[]> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      store.setError(null);
      
      const devices = await this.deviceManager.refreshDevices();
      store.setDevices(devices);
      store.incrementRefreshCount();
      
      return devices;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 连接到设备
   */
  async connectToDevice(address: string): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      await this.deviceManager.connectToDevice(address);
      
      // 刷新设备列表以获取最新状态
      await this.refreshDevices();
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      await this.deviceManager.disconnectDevice(deviceId);
      
      // 如果断开的是当前选中的设备，清除选择
      if (store.selectedDeviceId === deviceId) {
        store.setSelectedDevice(null);
      }
      
      // 刷新设备列表
      await this.refreshDevices();
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 连接到常见模拟器端口
   */
  async connectToEmulators(): Promise<Device[]> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      const connectedDevices = await this.deviceManager.connectToCommonEmulatorPorts();
      
      // 刷新设备列表
      await this.refreshDevices();
      
      return connectedDevices;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 获取设备详细信息
   */
  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    return await this.deviceManager.getDeviceInfo(deviceId);
  }

  /**
   * 选择设备
   */
  selectDevice(deviceId: string | null): void {
    useAdbStore.getState().setSelectedDevice(deviceId);
  }

  // ===== 连接管理 =====

  /**
   * 测试ADB连接
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.connectionService.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 启动ADB服务器
   */
  async startAdbServer(): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      await this.connectionService.startServer();
      
      // 等待一段时间后刷新设备列表
      setTimeout(() => {
        this.refreshDevices().catch(console.error);
      }, 1000);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 停止ADB服务器
   */
  async stopAdbServer(): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      await this.connectionService.stopServer();
      
      // 清空设备列表
      store.setDevices([]);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 重启ADB服务器
   */
  async restartAdbServer(): Promise<void> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      await this.connectionService.restartServer();
      
      // 等待一段时间后刷新设备列表
      setTimeout(() => {
        this.refreshDevices().catch(console.error);
      }, 2000);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 自动检测ADB路径
   */
  async autoDetectAdbPath(): Promise<string> {
    try {
      return await this.connectionService.autoDetectBestAdbPath();
    } catch (error) {
      throw new Error(`ADB路径自动检测失败: ${error}`);
    }
  }

  // ===== 诊断管理 =====

  /**
   * 运行完整诊断
   */
  async runFullDiagnostic(): Promise<DiagnosticSummary> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      const summary = await this.diagnosticService.runFullDiagnostic();
      store.setDiagnosticResults(this.diagnosticService.getLastDiagnosticResults());
      
      return summary;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 运行快速诊断
   */
  async runQuickDiagnostic(): Promise<DiagnosticSummary> {
    const store = useAdbStore.getState();
    
    try {
      const summary = await this.diagnosticService.runQuickDiagnostic();
      store.setDiagnosticResults(this.diagnosticService.getLastDiagnosticResults());
      
      return summary;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    }
  }

  /**
   * 执行自动修复
   */
  async executeAutoFix(diagnosticId?: string): Promise<boolean> {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      let success: boolean;
      
      if (diagnosticId) {
        // 修复单个问题
        success = await this.diagnosticService.executeAutoFix(diagnosticId);
      } else {
        // 批量修复
        const result = await this.diagnosticService.executeBatchAutoFix();
        success = result.success > 0;
      }
      
      if (success) {
        // 重新运行诊断以更新状态
        await this.runQuickDiagnostic();
      }
      
      return success;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 获取诊断报告
   */
  getDiagnosticReport() {
    return this.diagnosticService.generateDiagnosticReport();
  }

  // ===== 高级功能 =====

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    connection: AdbConnection | null;
    deviceCount: number;
    diagnosticSummary: DiagnosticSummary | null;
    isHealthy: boolean;
  }> {
    const store = useAdbStore.getState();
    const connectionHealth = await this.connectionService.healthCheck();
    
    return {
      connection: store.connection,
      deviceCount: store.devices.length,
      diagnosticSummary: store.diagnosticSummary,
      isHealthy: connectionHealth.isHealthy && !store.hasErrors()
    };
  }

  /**
   * 批量设备操作
   */
  async batchDeviceOperation(
    deviceIds: string[], 
    operation: 'connect' | 'disconnect'
  ) {
    const store = useAdbStore.getState();
    
    try {
      store.setLoading(true);
      
      const result = await this.deviceManager.batchOperation(deviceIds, operation);
      
      // 刷新设备列表
      await this.refreshDevices();
      
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      store.setError(errorObj);
      throw errorObj;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 获取设备统计信息
   */
  async getDeviceStats() {
    return await this.deviceManager.getDeviceStats();
  }

  // ===== 私有方法 =====

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    const eventHandler = (event: DomainEvent) => {
      console.log(`Domain event: ${event.getEventName()}`, event);
      // 这里可以添加更多的事件处理逻辑，比如日志记录、通知等
    };

    this.deviceManager.addEventHandler(eventHandler);
    this.connectionService.addEventHandler(eventHandler);
    this.diagnosticService.addEventHandler(eventHandler);
  }

  /**
   * 启动设备监听
   */
  private startDeviceWatching(): void {
    if (this.deviceWatcher) {
      this.deviceWatcher();
    }

    this.deviceWatcher = this.deviceManager.watchDeviceChanges((devices) => {
      const store = useAdbStore.getState();
      store.setDevices(devices);
    });
  }

  /**
   * 停止设备监听
   */
  private stopDeviceWatching(): void {
    if (this.deviceWatcher) {
      this.deviceWatcher();
      this.deviceWatcher = null;
    }
  }

  /**
   * 启动健康检查
   */
  private async startHealthChecking(): Promise<void> {
    if (this.healthChecker) {
      this.healthChecker();
    }

    this.healthChecker = await this.diagnosticService.scheduleHealthCheck(300000); // 5分钟
  }

  /**
   * 停止健康检查
   */
  private stopHealthChecking(): void {
    if (this.healthChecker) {
      this.healthChecker();
      this.healthChecker = null;
    }
  }
}

