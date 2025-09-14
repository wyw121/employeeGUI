/**
 * 增强版 ADB 诊断服务
 * 高内聚的诊断核心服务，集成日志管理和自动修复功能
 */

import { LogManager, LogLevel, LogCategory, logManager } from './LogManager';

export enum DiagnosticStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SKIPPED = 'skipped'
}

export interface DiagnosticResult {
  id: string;
  name: string;
  description: string;
  status: DiagnosticStatus;
  message: string;
  details?: any;
  suggestion?: string;
  canAutoFix?: boolean;
  autoFixAction?: () => Promise<boolean>;
  duration?: number; // 执行时间（毫秒）
  timestamp: Date;
}

export interface SystemInfo {
  adbVersion?: string;
  platformPath: string;
  osInfo: string;
  javaVersion?: string;
  deviceCount: number;
  serverStatus: 'running' | 'stopped' | 'unknown';
  lastDiagnosticTime?: Date;
}

export interface DeviceInfo {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | 'no permissions';
  model?: string;
  product?: string;
  androidVersion?: string;
  apiLevel?: string;
  batteryLevel?: number;
  connectionType: 'usb' | 'wifi' | 'emulator';
  features: string[];
  lastSeen: Date;
  isHealthy: boolean;
  healthIssues: string[];
}

export interface AutoFixResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 诊断进度回调接口
 */
export interface DiagnosticProgress {
  currentStep: number;
  totalSteps: number;
  currentResult: DiagnosticResult;
  allResults: DiagnosticResult[];
  progress: number; // 0-100
}

/**
 * 增强版 ADB 诊断服务
 * 职责：环境诊断、设备检测、问题修复、状态监控
 */
export class EnhancedAdbDiagnosticService {
  private static instance: EnhancedAdbDiagnosticService;
  private logManager: LogManager;
  private isRunning = false;
  private lastDiagnosticResults: DiagnosticResult[] = [];
  private systemInfo: SystemInfo | null = null;
  private diagnosticSteps: Array<{
    id: string;
    name: string;
    description: string;
    execute: () => Promise<DiagnosticResult>;
    required: boolean;
  }>;

  private constructor() {
    this.logManager = logManager;
    this.initializeDiagnosticSteps();
    this.logManager.info(LogCategory.SYSTEM, 'EnhancedAdbDiagnosticService', '增强版 ADB 诊断服务已初始化');
  }

  public static getInstance(): EnhancedAdbDiagnosticService {
    if (!EnhancedAdbDiagnosticService.instance) {
      EnhancedAdbDiagnosticService.instance = new EnhancedAdbDiagnosticService();
    }
    return EnhancedAdbDiagnosticService.instance;
  }

  /**
   * 运行完整诊断流程
   */
  public async runFullDiagnostic(
    onProgress?: (progress: DiagnosticProgress) => void
  ): Promise<DiagnosticResult[]> {
    if (this.isRunning) {
      throw new Error('诊断已在运行中，请等待完成');
    }

    this.isRunning = true;
    this.lastDiagnosticResults = [];
    
    this.logManager.info(
      LogCategory.DIAGNOSTIC, 
      'EnhancedAdbDiagnosticService', 
      '开始完整诊断流程',
      { stepsCount: this.diagnosticSteps.length }
    );

    try {
      return await this.executeDiagnosticSteps(onProgress);
    } finally {
      this.isRunning = false;
    }
  }

  private async executeDiagnosticSteps(
    onProgress?: (progress: DiagnosticProgress) => void
  ): Promise<DiagnosticResult[]> {
    const totalSteps = this.diagnosticSteps.length;
    
    for (let i = 0; i < this.diagnosticSteps.length; i++) {
      const step = this.diagnosticSteps[i];
      const result = await this.executeSingleStep(step, i);
      
      this.lastDiagnosticResults.push(result);
      this.logDiagnosticResult(step, result);

      // 通知进度
      if (onProgress) {
        onProgress({
          currentStep: i + 1,
          totalSteps,
          currentResult: result,
          allResults: [...this.lastDiagnosticResults],
          progress: ((i + 1) / totalSteps) * 100
        });
      }
      
      // 检查是否需要停止
      if (step.required && this.shouldStopOnError(result)) {
        this.logManager.warn(
          LogCategory.DIAGNOSTIC,
          'EnhancedAdbDiagnosticService',
          '必需诊断步骤失败，停止诊断流程',
          { failedStep: step.name }
        );
        break;
      }
    }

    // 分析诊断结果
    const summary = this.analyzeDiagnosticResults(this.lastDiagnosticResults);
    
    this.logManager.info(
      LogCategory.DIAGNOSTIC,
      'EnhancedAdbDiagnosticService',
      '诊断流程完成',
      summary
    );

    return this.lastDiagnosticResults;
  }

  private async executeSingleStep(step: any, stepIndex: number): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    this.logManager.debug(
      LogCategory.DIAGNOSTIC,
      'EnhancedAdbDiagnosticService',
      `开始执行诊断步骤: ${step.name}`,
      { stepId: step.id, stepIndex: stepIndex + 1 }
    );

    try {
      const result = await step.execute();
      result.duration = Date.now() - startTime;
      result.timestamp = new Date();
      return result;
    } catch (error) {
      return {
        id: step.id,
        name: step.name,
        description: step.description,
        status: DiagnosticStatus.ERROR,
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
        details: error,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private logDiagnosticResult(step: any, result: DiagnosticResult): void {
    const logLevel = this.getLogLevelForResult(result);
    
    this.logManager.log(
      logLevel,
      LogCategory.DIAGNOSTIC,
      'EnhancedAdbDiagnosticService',
      `诊断步骤完成: ${step.name} - ${result.message}`,
      { 
        stepId: step.id,
        status: result.status,
        duration: result.duration,
        details: result.details
      }
    );
  }

  private getLogLevelForResult(result: DiagnosticResult): LogLevel {
    if (result.status === DiagnosticStatus.ERROR) return LogLevel.ERROR;
    if (result.status === DiagnosticStatus.WARNING) return LogLevel.WARN;
    return LogLevel.INFO;
  }

  /**
   * 执行快速检查（仅检查关键项）
   */
  public async runQuickCheck(): Promise<DiagnosticResult[]> {
    const quickSteps = this.diagnosticSteps.filter(step => 
      ['check-adb-tool', 'check-adb-server', 'scan-devices'].includes(step.id)
    );

    this.logManager.info(
      LogCategory.DIAGNOSTIC,
      'EnhancedAdbDiagnosticService',
      '开始快速检查'
    );

    const results: DiagnosticResult[] = [];
    
    for (const step of quickSteps) {
      try {
        const result = await step.execute();
        result.timestamp = new Date();
        results.push(result);
      } catch (error) {
        results.push({
          id: step.id,
          name: step.name,
          description: step.description,
          status: DiagnosticStatus.ERROR,
          message: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * 自动修复检测到的问题
   */
  public async autoFixIssues(results?: DiagnosticResult[]): Promise<AutoFixResult[]> {
    const targetResults = results || this.lastDiagnosticResults;
    const fixableResults = targetResults.filter(r => r.canAutoFix && r.autoFixAction);
    
    this.logManager.info(
      LogCategory.DIAGNOSTIC,
      'EnhancedAdbDiagnosticService',
      `开始自动修复，发现 ${fixableResults.length} 个可修复问题`
    );

    const fixResults: AutoFixResult[] = [];

    for (const result of fixableResults) {
      const fixResult = await this.executeSingleFix(result);
      fixResults.push(fixResult);
    }

    return fixResults;
  }

  private async executeSingleFix(result: DiagnosticResult): Promise<AutoFixResult> {
    if (!result.autoFixAction) {
      return {
        success: false,
        message: `无法修复: ${result.name} - 缺少修复方法`
      };
    }

    try {
      this.logManager.info(
        LogCategory.DIAGNOSTIC,
        'EnhancedAdbDiagnosticService',
        `尝试自动修复: ${result.name}`
      );

      const success = await result.autoFixAction();
      const fixResult: AutoFixResult = {
        success,
        message: success ? `成功修复: ${result.name}` : `修复失败: ${result.name}`
      };
      
      this.logManager.log(
        success ? LogLevel.INFO : LogLevel.WARN,
        LogCategory.DIAGNOSTIC,
        'EnhancedAdbDiagnosticService',
        fixResult.message,
        { originalIssue: result.name }
      );
      
      return fixResult;
    } catch (error) {
      const fixResult: AutoFixResult = {
        success: false,
        message: `修复异常: ${result.name}`,
        details: error
      };
      
      this.logManager.error(
        LogCategory.DIAGNOSTIC,
        'EnhancedAdbDiagnosticService',
        `自动修复执行异常: ${result.name}`,
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      return fixResult;
    }
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<SystemInfo> {
    if (!this.systemInfo) {
      await this.refreshSystemInfo();
    }
    return this.systemInfo!;
  }

  /**
   * 获取最后的诊断结果
   */
  public getLastDiagnosticResults(): DiagnosticResult[] {
    return [...this.lastDiagnosticResults];
  }

  /**
   * 检查是否正在运行诊断
   */
  public isRunningDiagnostic(): boolean {
    return this.isRunning;
  }

  // === 私有方法 ===

  private initializeDiagnosticSteps(): void {
    this.diagnosticSteps = [
      {
        id: 'check-adb-tool',
        name: '检查 ADB 工具',
        description: '验证 ADB 调试工具是否正确安装和可用',
        execute: this.checkAdbTool.bind(this),
        required: true
      },
      {
        id: 'check-adb-server',
        name: '检查 ADB 服务器',
        description: '确认 ADB 服务器运行状态',
        execute: this.checkAdbServer.bind(this),
        required: true
      },
      {
        id: 'scan-devices',
        name: '扫描设备',
        description: '查找连接的 Android 设备和模拟器',
        execute: this.scanDevices.bind(this),
        required: false
      },
      {
        id: 'test-emulator',
        name: '测试模拟器连接',
        description: '尝试连接到常见的 Android 模拟器',
        execute: this.testEmulatorConnection.bind(this),
        required: false
      },
      {
        id: 'health-check',
        name: '设备健康检查',
        description: '检查已连接设备的响应和功能状态',
        execute: this.performHealthCheck.bind(this),
        required: false
      }
    ];
  }

  private async checkAdbTool(): Promise<DiagnosticResult> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const version = await invoke<string>('get_adb_version');
      
      return {
        id: 'check-adb-tool',
        name: '检查 ADB 工具',
        description: '验证 ADB 调试工具是否正确安装和可用',
        status: DiagnosticStatus.SUCCESS,
        message: `ADB 工具正常 (版本: ${version})`,
        details: { version },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        id: 'check-adb-tool',
        name: '检查 ADB 工具',
        description: '验证 ADB 调试工具是否正确安装和可用',
        status: DiagnosticStatus.ERROR,
        message: 'ADB 工具未找到或不可用',
        details: error,
        suggestion: '请确保 platform-tools 文件夹在程序目录下，或重新下载完整程序包',
        canAutoFix: false,
        timestamp: new Date()
      };
    }
  }

  private async checkAdbServer(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('../adbService');
      const adbService = AdbService.getInstance();
      
      // 尝试重启 ADB 服务器来测试
      await adbService.restartServer();
      
      return {
        id: 'check-adb-server',
        name: '检查 ADB 服务器',
        description: '确认 ADB 服务器运行状态',
        status: DiagnosticStatus.SUCCESS,
        message: 'ADB 服务器运行正常',
        timestamp: new Date(),
        canAutoFix: true,
        autoFixAction: async () => {
          try {
            await adbService.restartServer();
            return true;
          } catch {
            return false;
          }
        }
      };
    } catch (error) {
      return {
        id: 'check-adb-server',
        name: '检查 ADB 服务器',
        description: '确认 ADB 服务器运行状态',
        status: DiagnosticStatus.ERROR,
        message: 'ADB 服务器启动失败',
        details: error,
        suggestion: '尝试重启 ADB 服务器，或以管理员权限运行程序',
        canAutoFix: true,
        autoFixAction: async () => {
          try {
            const { AdbService } = await import('../adbService');
            const adbService = AdbService.getInstance();
            await adbService.restartServer();
            return true;
          } catch {
            return false;
          }
        },
        timestamp: new Date()
      };
    }
  }

  private async scanDevices(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('../adbService');
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      if (devices.length > 0) {
        return {
          id: 'scan-devices',
          name: '扫描设备',
          description: '查找连接的 Android 设备和模拟器',
          status: DiagnosticStatus.SUCCESS,
          message: `找到 ${devices.length} 个设备`,
          details: { devices: devices.map(d => ({ id: d.id, status: d.status })) },
          timestamp: new Date()
        };
      } else {
        return {
          id: 'scan-devices',
          name: '扫描设备',
          description: '查找连接的 Android 设备和模拟器',
          status: DiagnosticStatus.WARNING,
          message: '未找到连接的设备',
          suggestion: '请确保设备已连接并启用 USB 调试，或启动 Android 模拟器',
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        id: 'scan-devices',
        name: '扫描设备',
        description: '查找连接的 Android 设备和模拟器',
        status: DiagnosticStatus.ERROR,
        message: '设备扫描失败',
        details: error,
        suggestion: '检查 ADB 服务状态，确保没有其他程序占用 ADB',
        timestamp: new Date()
      };
    }
  }

  private async testEmulatorConnection(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('../adbService');
      const adbService = AdbService.getInstance();
      
      // 尝试连接常见模拟器端口
      const emulatorPorts = [5555, 5554, 21503];
      let connectedCount = 0;
      const connectionResults: string[] = [];
      
      for (const port of emulatorPorts) {
        try {
          const connected = await adbService.connectToLdPlayer(port);
          if (connected) {
            connectedCount++;
            connectionResults.push(`127.0.0.1:${port}: 连接成功`);
          } else {
            connectionResults.push(`127.0.0.1:${port}: 连接失败`);
          }
        } catch {
          connectionResults.push(`127.0.0.1:${port}: 连接异常`);
        }
      }
      
      if (connectedCount > 0) {
        return {
          id: 'test-emulator',
          name: '测试模拟器连接',
          description: '尝试连接到常见的 Android 模拟器',
          status: DiagnosticStatus.SUCCESS,
          message: `成功连接 ${connectedCount} 个模拟器`,
          details: { connectionResults },
          timestamp: new Date()
        };
      } else {
        return {
          id: 'test-emulator',
          name: '测试模拟器连接',
          description: '尝试连接到常见的 Android 模拟器',
          status: DiagnosticStatus.WARNING,
          message: '未能连接到模拟器',
          details: { connectionResults },
          suggestion: '请启动 Android 模拟器（如雷电模拟器）并确保开启 ADB 调试',
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        id: 'test-emulator',
        name: '测试模拟器连接',
        description: '尝试连接到常见的 Android 模拟器',
        status: DiagnosticStatus.ERROR,
        message: '模拟器连接测试失败',
        details: error,
        timestamp: new Date()
      };
    }
  }

  private async performHealthCheck(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('../adbService');
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      if (devices.length === 0) {
        return {
          id: 'health-check',
          name: '设备健康检查',
          description: '检查已连接设备的响应和功能状态',
          status: DiagnosticStatus.SKIPPED,
          message: '跳过健康检查 - 没有可用设备',
          timestamp: new Date()
        };
      }
      
      const healthResults = [];
      let healthyDevices = 0;
      
      for (const device of devices) {
        try {
          // 使用 getDeviceInfo 来测试设备响应
          const deviceInfo = await adbService.getDeviceInfo(device.id);
          if (deviceInfo) {
            healthyDevices++;
            healthResults.push(`${device.id}: 健康`);
          } else {
            healthResults.push(`${device.id}: 信息获取失败`);
          }
        } catch {
          healthResults.push(`${device.id}: 响应异常`);
        }
      }
      
      if (healthyDevices === devices.length) {
        return {
          id: 'health-check',
          name: '设备健康检查',
          description: '检查已连接设备的响应和功能状态',
          status: DiagnosticStatus.SUCCESS,
          message: `所有设备 (${healthyDevices}/${devices.length}) 响应正常`,
          details: { healthResults },
          timestamp: new Date()
        };
      } else {
        return {
          id: 'health-check',
          name: '设备健康检查',
          description: '检查已连接设备的响应和功能状态',
          status: DiagnosticStatus.WARNING,
          message: `部分设备响应异常 (${healthyDevices}/${devices.length} 正常)`,
          details: { healthResults },
          suggestion: '检查异常设备的连接状态，可能需要重新连接或重启设备',
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        id: 'health-check',
        name: '设备健康检查',
        description: '检查已连接设备的响应和功能状态',
        status: DiagnosticStatus.ERROR,
        message: '健康检查执行失败',
        details: error,
        timestamp: new Date()
      };
    }
  }

  private async refreshSystemInfo(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { AdbService } = await import('../adbService');
      
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      this.systemInfo = {
        adbVersion: await invoke<string>('get_adb_version').catch(() => undefined),
        platformPath: 'platform-tools/',
        osInfo: navigator.platform,
        deviceCount: devices.length,
        serverStatus: devices.length > 0 ? 'running' : 'unknown',
        lastDiagnosticTime: new Date()
      };
    } catch (error) {
      this.logManager.error(
        LogCategory.SYSTEM,
        'EnhancedAdbDiagnosticService',
        '刷新系统信息失败',
        error
      );
    }
  }

  private shouldStopOnError(errorResult: DiagnosticResult): boolean {
    // 如果是 ADB 工具检查失败，停止诊断
    return errorResult.id === 'check-adb-tool';
  }

  private analyzeDiagnosticResults(results: DiagnosticResult[]): any {
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === DiagnosticStatus.SUCCESS).length,
      warning: results.filter(r => r.status === DiagnosticStatus.WARNING).length,
      error: results.filter(r => r.status === DiagnosticStatus.ERROR).length,
      skipped: results.filter(r => r.status === DiagnosticStatus.SKIPPED).length,
      canAutoFix: results.filter(r => r.canAutoFix).length,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };

    return summary;
  }
}

// 导出单例实例
export const enhancedAdbDiagnosticService = EnhancedAdbDiagnosticService.getInstance();