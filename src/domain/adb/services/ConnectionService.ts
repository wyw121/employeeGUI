import { AdbConnection, AdbConfig, ConnectionStatus } from '../entities/AdbConnection';
import { IAdbRepository } from '../repositories/IAdbRepository';
import { DomainEvent, AdbConnectionStatusChangedEvent } from '../events/DomainEvents';

/**
 * ADB连接服务
 * 负责ADB连接的建立、维护和状态管理
 */
export class ConnectionService {
  private eventHandlers: ((event: DomainEvent) => void)[] = [];
  private currentConnection: AdbConnection | null = null;

  constructor(private adbRepository: IAdbRepository) {}

  /**
   * 初始化ADB连接
   */
  async initializeConnection(config?: AdbConfig): Promise<AdbConnection> {
    const finalConfig = config || AdbConfig.default();
    
    try {
      const connection = await this.adbRepository.createConnection(finalConfig);
      this.setCurrentConnection(connection);
      return connection;
    } catch (error) {
      throw new Error(`初始化ADB连接失败: ${error}`);
    }
  }

  /**
   * 获取当前连接
   */
  getCurrentConnection(): AdbConnection | null {
    return this.currentConnection;
  }

  /**
   * 检查连接是否活跃
   */
  isConnected(): boolean {
    return this.currentConnection?.isActive() || false;
  }

  /**
   * 测试连接
   */
  async testConnection(adbPath?: string): Promise<boolean> {
    try {
      const pathToTest = adbPath || this.currentConnection?.adbPath;
      if (!pathToTest) {
        throw new Error('没有可用的ADB路径');
      }
      
      return await this.adbRepository.testConnection(pathToTest);
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 检测智能ADB路径
   */
  async detectSmartAdbPath(): Promise<string> {
    return await this.adbRepository.detectSmartAdbPath();
  }

  /**
   * 检测雷电模拟器ADB路径
   */
  async detectLdPlayerAdbPath(): Promise<string | null> {
    return await this.adbRepository.detectLdPlayerAdbPath();
  }

  /**
   * 自动检测最佳ADB路径
   */
  async autoDetectBestAdbPath(): Promise<string> {
    try {
      // 首先尝试智能检测
      return await this.detectSmartAdbPath();
    } catch (error) {
      console.warn('Smart ADB detection failed, trying LDPlayer detection:', error);
      
      try {
        // 回退到雷电模拟器检测
        const ldPlayerPath = await this.detectLdPlayerAdbPath();
        if (ldPlayerPath) {
          return ldPlayerPath;
        }
      } catch (ldError) {
        console.warn('LDPlayer ADB detection failed:', ldError);
      }
      
      // 最终回退到默认路径
      return 'adb.exe';
    }
  }

  /**
   * 更新连接配置
   */
  async updateConnection(config: AdbConfig): Promise<AdbConnection> {
    try {
      const newConnection = await this.adbRepository.createConnection(config);
      this.setCurrentConnection(newConnection);
      return newConnection;
    } catch (error) {
      throw new Error(`更新连接配置失败: ${error}`);
    }
  }

  /**
   * 启动ADB服务器
   */
  async startServer(): Promise<void> {
    try {
      const adbPath = this.currentConnection?.adbPath;
      await this.adbRepository.startAdbServer(adbPath);
      
      // 更新连接状态
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(ConnectionStatus.CONNECTED)
        );
      }
    } catch (error) {
      // 更新错误状态
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(
            ConnectionStatus.ERROR, 
            `启动服务器失败: ${error}`
          )
        );
      }
      throw error;
    }
  }

  /**
   * 停止ADB服务器
   */
  async stopServer(): Promise<void> {
    try {
      const adbPath = this.currentConnection?.adbPath;
      await this.adbRepository.stopAdbServer(adbPath);
      
      // 更新连接状态
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(ConnectionStatus.DISCONNECTED)
        );
      }
    } catch (error) {
      // 更新错误状态
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(
            ConnectionStatus.ERROR, 
            `停止服务器失败: ${error}`
          )
        );
      }
      throw error;
    }
  }

  /**
   * 重启ADB服务器
   */
  async restartServer(): Promise<void> {
    try {
      const adbPath = this.currentConnection?.adbPath;
      
      // 更新状态为连接中
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(ConnectionStatus.CONNECTING)
        );
      }
      
      await this.adbRepository.restartAdbServer(adbPath);
      
      // 更新状态为已连接
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(ConnectionStatus.CONNECTED)
        );
      }
    } catch (error) {
      // 更新错误状态
      if (this.currentConnection) {
        this.setCurrentConnection(
          this.currentConnection.withStatus(
            ConnectionStatus.ERROR, 
            `重启服务器失败: ${error}`
          )
        );
      }
      throw error;
    }
  }

  /**
   * 检查ADB服务器状态
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      const adbPath = this.currentConnection?.adbPath;
      const isRunning = await this.adbRepository.checkAdbServerStatus(adbPath);
      
      // 根据服务器状态更新连接状态
      if (this.currentConnection) {
        const newStatus = isRunning ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED;
        if (this.currentConnection.status !== newStatus) {
          this.setCurrentConnection(
            this.currentConnection.withStatus(newStatus)
          );
        }
      }
      
      return isRunning;
    } catch (error) {
      console.error('Failed to check server status:', error);
      return false;
    }
  }

  /**
   * 获取ADB版本信息
   */
  async getAdbVersion(): Promise<string> {
    try {
      const adbPath = this.currentConnection?.adbPath;
      const version = await this.adbRepository.getAdbVersion(adbPath);
      
      // 更新连接中的版本信息
      if (this.currentConnection && !this.currentConnection.version) {
        this.setCurrentConnection(
          this.currentConnection.withVersion(version)
        );
      }
      
      return version;
    } catch (error) {
      throw new Error(`获取ADB版本失败: ${error}`);
    }
  }

  /**
   * 执行ADB命令
   */
  async executeCommand(args: string[]): Promise<string> {
    if (!this.currentConnection) {
      throw new Error('没有活跃的ADB连接');
    }
    
    try {
      return await this.adbRepository.executeAdbCommand(args, this.currentConnection.adbPath);
    } catch (error) {
      throw new Error(`执行ADB命令失败: ${error}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    connection: AdbConnection | null;
    serverRunning: boolean;
    version?: string;
    error?: string;
  }> {
    try {
      const serverRunning = await this.checkServerStatus();
      let version: string | undefined;
      
      if (serverRunning) {
        try {
          version = await this.getAdbVersion();
        } catch (error) {
          console.warn('Failed to get version during health check:', error);
        }
      }
      
      const isHealthy = this.isConnected() && serverRunning;
      
      return {
        isHealthy,
        connection: this.currentConnection,
        serverRunning,
        version
      };
    } catch (error) {
      return {
        isHealthy: false,
        connection: this.currentConnection,
        serverRunning: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
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
   * 设置当前连接并发送状态变更事件
   */
  private setCurrentConnection(connection: AdbConnection): void {
    const oldStatus = this.currentConnection?.status;
    const newStatus = connection.status;
    
    this.currentConnection = connection;
    
    // 如果状态发生变化，发送事件
    if (oldStatus !== newStatus) {
      this.publishEvent(new AdbConnectionStatusChangedEvent(
        oldStatus || 'none',
        newStatus,
        connection.adbPath
      ));
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
}

