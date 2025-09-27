import { 
  Device, 
  AdbConnection, 
  AdbConfig, 
  DiagnosticResult,
  DiagnosticSummary,
  DiagnosticCategory,
  DiagnosticStatus,
  DomainEvent
} from '../../domain/adb';
import { DeviceManagerService } from '../../domain/adb/services/DeviceManagerService';
import { ConnectionService } from '../../domain/adb/services/ConnectionService';
import { DiagnosticService } from '../../domain/adb/services/DiagnosticService';
import { useAdbStore } from '../store/adbStore';
import { IUiMatcherRepository, MatchCriteriaDTO, MatchResultDTO } from '../../domain/page-analysis/repositories/IUiMatcherRepository';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * ADB应用服务
 * 
 * 作为Facade模式的实现，协调各个领域服务，
 * 为UI层提供简化的、业务导向的API接口
 */
export class AdbApplicationService {
  private deviceWatcher: (() => void) | null = null;
  private healthChecker: (() => void) | null = null;
  private logUnlisteners: UnlistenFn[] = [];
  private logBridgeReady = false;

  constructor(
    private deviceManager: DeviceManagerService,
    private connectionService: ConnectionService,
    private diagnosticService: DiagnosticService,
    private uiMatcherRepository: IUiMatcherRepository
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
    
    // ✅ 检查Tauri环境
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) {
      console.warn('🌐 运行在浏览器环境中，ADB功能将受限');
      // 在浏览器环境中，设置模拟状态但不执行实际ADB操作
      store.setInitializing(false);
      store.setDevices([]); // 空设备列表
      store.setError(null);
      return;
    }
    
    try {
      store.setInitializing(true);
      store.setError(null);

      // 先建立日志桥接订阅，确保初始化过程中产生的后端日志也能被捕获
      if (!this.logBridgeReady) {
        await this.setupLogBridgeSubscriptions();
      }

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
    this.teardownLogBridgeSubscriptions();
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
   * 清理本机已保存的 ADB 密钥（触发手机重新授权弹窗）
   */
  async clearAdbKeys(): Promise<void> {
    const store = useAdbStore.getState();
    try {
      store.setLoading(true);
      await this.connectionService.clearAdbKeys();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      store.setError(err);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 无线调试配对
   * @param hostPort 例如 "192.168.1.10:37123"
   * @param code 6位配对码
   * @returns adb 输出
   */
  async pairWireless(hostPort: string, code: string): Promise<string> {
    const store = useAdbStore.getState();
    try {
      store.setLoading(true);
      const output = await this.connectionService.pairWireless(hostPort, code);
      return output;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      store.setError(err);
      throw err;
    } finally {
      store.setLoading(false);
    }
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

  /**
   * 获取设备联系人数量（应用层统一入口）
   */
  async getDeviceContactCount(deviceId: string): Promise<number> {
    try {
      const { isTauri, invoke } = await import('@tauri-apps/api/core');
      if (!isTauri()) return 0;
      const count = await invoke<number>('get_device_contact_count', { device_id: deviceId });
      return Math.max(0, Number(count || 0));
    } catch (error) {
      console.error('getDeviceContactCount failed:', error);
      return 0;
    }
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

  // ===== UI 元素匹配 =====

  /**
   * 根据匹配条件在真机当前界面查找元素
   */
  async matchElementByCriteria(deviceId: string, criteria: MatchCriteriaDTO): Promise<MatchResultDTO> {
    const store = useAdbStore.getState();
    try {
      store.setLoading(true);
  return await this.uiMatcherRepository.matchByCriteria(deviceId, criteria);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      store.setError(err);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * 订阅后端日志事件，并转换为 DiagnosticResult 写入 Store
   */
  private async setupLogBridgeSubscriptions(): Promise<void> {
    const store = useAdbStore.getState();

    // 避免重复订阅
    if (this.logBridgeReady) return;

    // adb-command-log 事件
    const unlistenAdb = await listen<AdbCommandLog>('adb-command-log', (event) => {
      try {
        const payload = event.payload;
        const diag = this.mapAdbCommandLogToDiagnostic(payload);
        store.addDiagnosticResult(diag);
      } catch (e) {
        console.error('Failed to map adb-command-log:', e, event.payload);
      }
    });

    // 通用 log-entry 事件
    const unlistenLog = await listen<BackendLogEntry>('log-entry', (event) => {
      try {
        const payload = event.payload;
        const diag = this.mapBackendLogEntryToDiagnostic(payload);
        store.addDiagnosticResult(diag);
      } catch (e) {
        console.error('Failed to map log-entry:', e, event.payload);
      }
    });

    this.logUnlisteners.push(unlistenAdb, unlistenLog);
    this.logBridgeReady = true;
  }

  /** 取消订阅日志事件 */
  private teardownLogBridgeSubscriptions(): void {
    if (this.logUnlisteners.length > 0) {
      this.logUnlisteners.forEach((fn) => {
        try { fn(); } catch {}
      });
      this.logUnlisteners = [];
    }
    this.logBridgeReady = false;
  }

  /** 将 ADB 命令日志映射为 DiagnosticResult */
  private mapAdbCommandLogToDiagnostic(log: AdbCommandLog) : DiagnosticResult {
    const args = log.args || [];
    const joined = args.join(' ');
    const isServerCmd = args.includes('start-server') || args.includes('kill-server');
    const isConnectCmd = args.includes('connect') || args.includes('disconnect');
    const category: DiagnosticCategory = isServerCmd
      ? DiagnosticCategory.SERVER_STATUS
      : (isConnectCmd ? DiagnosticCategory.DEVICE_CONNECTION : DiagnosticCategory.GENERAL);

  const hasError = !!log.error && log.error.trim().length > 0;
  const status = hasError ? DiagnosticStatus.ERROR : DiagnosticStatus.SUCCESS;
    const name = `ADB: ${args[0] ?? 'command'}`;
    const message = hasError 
      ? `失败: adb ${joined} | ${log.error}`
      : `成功: adb ${joined}`;

    return new DiagnosticResult(
      this.genId(),
      name,
      status,
      message,
      JSON.stringify(log),
      undefined,
      false,
      undefined,
      new Date(log.timestamp || Date.now()),
      category,
      'ADB',
      (log as any).device_id || undefined,
      (log as any).session_id || undefined
    );
  }

  /** 将通用后端日志映射为 DiagnosticResult */
  private mapBackendLogEntryToDiagnostic(entry: BackendLogEntry): DiagnosticResult {
    // 等级 → 诊断状态
    const status = entry.level === 'ERROR' 
      ? DiagnosticStatus.ERROR 
      : (entry.level === 'WARN' ? DiagnosticStatus.WARNING : DiagnosticStatus.SUCCESS);

    // 类别映射
    const cat = (entry.category || '').toUpperCase();
    let category: DiagnosticCategory = DiagnosticCategory.GENERAL;
    if (cat.includes('SERVER')) category = DiagnosticCategory.SERVER_STATUS;
    else if (cat.includes('DEVICE')) category = DiagnosticCategory.DEVICE_CONNECTION;

    const details = entry.details ?? undefined;
    const name = `${entry.source || 'Backend'}: ${entry.category || 'log'}`;
    const message = entry.message || '日志事件';

    // 使用后端提供的 id 作为结果 id，避免重复
    return new DiagnosticResult(
      entry.id || this.genId(),
      name,
      status,
      message,
      details,
      undefined,
      false,
      undefined,
      new Date(entry.timestamp || Date.now()),
      category,
      entry.source || 'Backend',
      entry.device_id || undefined,
      entry.session_id || undefined
    );
  }

  private genId(): string {
    // 兼容不同环境生成唯一ID
    const g = (globalThis as any);
    if (g && g.crypto && typeof g.crypto.randomUUID === 'function') {
      return g.crypto.randomUUID();
    }
    return 'log-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

// ===== 后端事件载荷类型（与 Rust 后端保持同步的最小必要字段） =====
interface AdbCommandLog {
  command: string;
  args: string[];
  output: string;
  error?: string | null;
  exit_code?: number | null;
  duration_ms: number;
  timestamp: string;
  device_id?: string | null;
  session_id?: string | null;
}

interface BackendLogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  source: string;
  message: string;
  details?: string | null;
  device_id?: string | null;
  session_id: string;
}

