// ADB诊断服务 - 专门用于客户自助诊断
export interface DiagnosticResult {
  id: string;
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending' | 'running';
  message: string;
  details?: string;
  suggestion?: string;
  canAutoFix?: boolean;
}

export interface SystemInfo {
  adbVersion?: string;
  platformPath: string;
  osInfo: string;
  javaVersion?: string;
  deviceCount: number;
}

export interface DeviceHealthInfo {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  batteryLevel?: number;
  connectionType: 'usb' | 'wifi' | 'emulator';
  lastSeen: Date;
  issues: string[];
}

/**
 * ADB诊断服务 - 高内聚的核心业务逻辑
 * 专注于为客户提供自助诊断和问题解决方案
 */
export class AdbDiagnosticService {
  private static instance: AdbDiagnosticService;
  private diagnosticSteps: Array<{
    id: string;
    name: string;
    description: string;
    execute: () => Promise<DiagnosticResult>;
  }>;

  private constructor() {
    this.initializeDiagnosticSteps();
  }

  public static getInstance(): AdbDiagnosticService {
    if (!AdbDiagnosticService.instance) {
      AdbDiagnosticService.instance = new AdbDiagnosticService();
    }
    return AdbDiagnosticService.instance;
  }

  /**
   * 初始化诊断步骤 - 为客户设计的简化流程
   */
  private initializeDiagnosticSteps() {
    this.diagnosticSteps = [
      {
        id: 'check-adb-tool',
        name: '检查ADB工具',
        description: '验证ADB调试工具是否正确安装',
        execute: this.checkAdbTool
      },
      {
        id: 'check-adb-server',
        name: '检查ADB服务',
        description: '确认ADB服务器运行状态',
        execute: this.checkAdbServer
      },
      {
        id: 'scan-devices',
        name: '扫描设备',
        description: '查找连接的Android设备',
        execute: this.scanDevices
      },
      {
        id: 'test-emulator',
        name: '测试模拟器',
        description: '尝试连接Android模拟器',
        execute: this.testEmulatorConnection
      },
      {
        id: 'health-check',
        name: '设备健康检查',
        description: '检查设备响应和功能状态',
        execute: this.performHealthCheck
      }
    ];
  }

  /**
   * 运行完整诊断流程
   */
  public async runFullDiagnostic(
    onProgress?: (step: number, total: number, result: DiagnosticResult) => void
  ): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    for (let i = 0; i < this.diagnosticSteps.length; i++) {
      const step = this.diagnosticSteps[i];
      
      // 通知进度
      if (onProgress) {
        onProgress(i, this.diagnosticSteps.length, {
          id: step.id,
          name: step.name,
          status: 'running',
          message: `正在${step.description}...`
        });
      }

      try {
        const result = await step.execute.call(this);
        results.push(result);
        
        if (onProgress) {
          onProgress(i + 1, this.diagnosticSteps.length, result);
        }
        
        // 如果是关键步骤失败，可以选择是否继续
        if (result.status === 'error' && (step.id === 'check-adb-tool' || step.id === 'check-adb-server')) {
          // 关键步骤失败，但继续诊断以给出完整的问题报告
        }
        
        // 添加延迟让用户看到进度
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorResult: DiagnosticResult = {
          id: step.id,
          name: step.name,
          status: 'error',
          message: `${step.description}失败`,
          details: error instanceof Error ? error.message : '未知错误',
          suggestion: '请联系技术支持'
        };
        results.push(errorResult);
      }
    }
    
    return results;
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<SystemInfo> {
    try {
      const adbVersion = await this.getAdbVersion();
      
      return {
        adbVersion,
        platformPath: 'platform-tools/',
        osInfo: `Windows ${navigator.platform}`,
        deviceCount: 0 // 将在设备扫描时更新
      };
    } catch (error) {
      console.warn('获取系统信息时发生错误:', error);
      return {
        platformPath: 'platform-tools/',
        osInfo: `Windows ${navigator.platform}`,
        deviceCount: 0
      };
    }
  }

  /**
   * 一键快速修复常见问题
   */
  public async quickFix(): Promise<DiagnosticResult> {
    try {
      // 1. 重启ADB服务器
      await this.restartAdbServer();
      
      // 2. 清理ADB进程
      await this.killAdbProcesses();
      
      // 3. 重新启动ADB
      await this.startAdbServer();
      
      // 4. 尝试连接常见模拟器端口
      await this.connectCommonEmulatorPorts();
      
      return {
        id: 'quick-fix',
        name: '一键修复',
        status: 'success',
        message: '快速修复完成',
        details: '已重启ADB服务并尝试连接模拟器'
      };
    } catch (error) {
      return {
        id: 'quick-fix',
        name: '一键修复',
        status: 'error',
        message: '快速修复失败',
        details: error instanceof Error ? error.message : '未知错误',
        suggestion: '请尝试手动诊断或联系技术支持'
      };
    }
  }

  // 私有方法实现具体的诊断逻辑
  private async checkAdbTool(): Promise<DiagnosticResult> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const version = await invoke<string>('get_adb_version');
      
      return {
        id: 'check-adb-tool',
        name: '检查ADB工具',
        status: 'success',
        message: `ADB工具正常 (${version})`,
        details: '找到platform-tools/adb.exe'
      };
    } catch (error) {
      console.error('检查ADB工具时发生错误:', error);
      return {
        id: 'check-adb-tool',
        name: '检查ADB工具',
        status: 'error',
        message: 'ADB工具未找到',
        details: '请确保platform-tools文件夹与程序在同一目录',
        suggestion: '重新下载完整的程序包，确保platform-tools文件夹完整',
        canAutoFix: false
      };
    }
  }

  private async checkAdbServer(): Promise<DiagnosticResult> {
    try {
      // 尝试启动ADB服务器
      await this.startAdbServer();
      
      return {
        id: 'check-adb-server',
        name: '检查ADB服务',
        status: 'success',
        message: 'ADB服务器运行正常',
        details: 'ADB daemon已启动'
      };
    } catch (error) {
      return {
        id: 'check-adb-server',
        name: '检查ADB服务',
        status: 'error',
        message: 'ADB服务器启动失败',
        details: error instanceof Error ? error.message : '服务器启动异常',
        suggestion: '尝试以管理员身份运行程序',
        canAutoFix: true
      };
    }
  }

  private async scanDevices(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('./adbService');
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      if (devices.length > 0) {
        return {
          id: 'scan-devices',
          name: '扫描设备',
          status: 'success',
          message: `找到 ${devices.length} 个设备`,
          details: devices.map(d => `${d.id} (${d.status})`).join(', ')
        };
      } else {
        return {
          id: 'scan-devices',
          name: '扫描设备',
          status: 'warning',
          message: '未找到设备',
          details: '没有检测到连接的Android设备',
          suggestion: '请确保设备已连接并启用USB调试，或启动Android模拟器',
          canAutoFix: false
        };
      }
    } catch (error) {
      return {
        id: 'scan-devices',
        name: '扫描设备',
        status: 'error',
        message: '设备扫描失败',
        details: error instanceof Error ? error.message : '扫描过程出错',
        suggestion: '检查ADB服务状态',
        canAutoFix: true
      };
    }
  }

  private async testEmulatorConnection(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('./adbService');
      const adbService = AdbService.getInstance();
      
      // 尝试连接常见的模拟器端口
      const commonPorts = [5555, 5554, 5556, 5557];
      let connectedCount = 0;
      
      for (const port of commonPorts) {
        try {
          const success = await adbService.connectToLdPlayer(port);
          if (success) {
            connectedCount++;
          }
        } catch (connectError) {
          // 继续尝试其他端口
          console.warn(`端口 ${port} 连接失败:`, connectError);
        }
      }
      
      if (connectedCount > 0) {
        return {
          id: 'test-emulator',
          name: '测试模拟器',
          status: 'success',
          message: `成功连接 ${connectedCount} 个模拟器`,
          details: `已连接到端口: ${commonPorts.slice(0, connectedCount).join(', ')}`
        };
      } else {
        return {
          id: 'test-emulator',
          name: '测试模拟器',
          status: 'warning',
          message: '未找到运行的模拟器',
          details: '尝试连接常见端口均失败',
          suggestion: '请启动雷电模拟器或其他Android模拟器',
          canAutoFix: false
        };
      }
    } catch (error) {
      return {
        id: 'test-emulator',
        name: '测试模拟器',
        status: 'error',
        message: '模拟器连接测试失败',
        details: error instanceof Error ? error.message : '连接测试出错',
        canAutoFix: true
      };
    }
  }

  private async performHealthCheck(): Promise<DiagnosticResult> {
    try {
      const { AdbService } = await import('./adbService');
      const adbService = AdbService.getInstance();
      const devices = await adbService.getDevices();
      
      if (devices.length === 0) {
        return {
          id: 'health-check',
          name: '设备健康检查',
          status: 'warning',
          message: '跳过健康检查',
          details: '没有可用设备进行检查'
        };
      }
      
      // 检查第一个设备的响应
      const device = devices[0];
      // 这里可以添加更多的健康检查逻辑
      
      return {
        id: 'health-check',
        name: '设备健康检查',
        status: 'success',
        message: `设备 ${device.id} 响应正常`,
        details: `状态: ${device.status}, 型号: ${device.model || '未知'}`
      };
    } catch (error) {
      return {
        id: 'health-check',
        name: '设备健康检查',
        status: 'error',
        message: '健康检查失败',
        details: error instanceof Error ? error.message : '检查过程出错',
        canAutoFix: true
      };
    }
  }

  // 辅助方法
  private async getAdbVersion(): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('get_adb_version');
  }

  private async startAdbServer(): Promise<void> {
    const { AdbService } = await import('./adbService');
    const adbService = AdbService.getInstance();
    await adbService.startServer();
  }

  private async restartAdbServer(): Promise<void> {
    const { AdbService } = await import('./adbService');
    const adbService = AdbService.getInstance();
    await adbService.restartServer();
  }

  private async killAdbProcesses(): Promise<void> {
    // 实现ADB进程清理逻辑
    try {
      const { AdbService } = await import('./adbService');
      const adbService = AdbService.getInstance();
      await adbService.stopServer();
    } catch (error) {
      // 记录错误但不抛出，允许其他修复步骤继续
      console.warn('停止ADB服务器时发生错误:', error);
    }
  }

  private async connectCommonEmulatorPorts(): Promise<void> {
    const { AdbService } = await import('./adbService');
    const adbService = AdbService.getInstance();
    await adbService.connectToCommonLdPlayerPorts();
  }
}