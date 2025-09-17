/**
 * ADB连接实体
 * 表示与ADB服务的连接状态和配置
 */
export class AdbConnection {
  constructor(
    public readonly adbPath: string,
    public readonly status: ConnectionStatus,
    public readonly version?: string,
    public readonly serverPort: number = 5037,
    public readonly lastCheck: Date = new Date(),
    public readonly errorMessage?: string
  ) {}

  /**
   * 创建新的连接实例
   */
  static create(adbPath: string): AdbConnection {
    return new AdbConnection(adbPath, ConnectionStatus.DISCONNECTED);
  }

  /**
   * 检查连接是否活跃
   */
  isActive(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  /**
   * 检查是否需要重新连接
   */
  needsReconnection(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return (
      this.lastCheck < fiveMinutesAgo || this.status === ConnectionStatus.ERROR
    );
  }

  /**
   * 创建连接副本并更新状态
   */
  withStatus(status: ConnectionStatus, errorMessage?: string): AdbConnection {
    return new AdbConnection(
      this.adbPath,
      status,
      this.version,
      this.serverPort,
      new Date(),
      errorMessage
    );
  }

  /**
   * 创建连接副本并更新版本信息
   */
  withVersion(version: string): AdbConnection {
    return new AdbConnection(
      this.adbPath,
      this.status,
      version,
      this.serverPort,
      this.lastCheck,
      this.errorMessage
    );
  }
}

/**
 * 连接状态枚举
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * ADB配置值对象
 */
export class AdbConfig {
  constructor(
    public readonly adbPath: string,
    public readonly autoDetectPath: boolean = true,
    public readonly ldPlayerPath?: string,
    public readonly autoDetectLdPlayer: boolean = true,
    public readonly serverPort: number = 5037,
    public readonly commandTimeout: number = 300000,
    public readonly enableDeviceWatching: boolean = true,
    public readonly deviceWatchInterval: number = 300000 // 30秒轮询间隔
  ) {}

  /**
   * 创建默认配置
   */
  static default(): AdbConfig {
    return new AdbConfig("auto");
  }

  /**
   * 创建无设备监听的静默配置
   */
  static silent(): AdbConfig {
    return new AdbConfig(
      "auto",
      true,
      undefined,
      true,
      5037,
      30000,
      false, // 禁用设备监听
      30000
    );
  }

  /**
   * 创建配置副本并更新路径
   */
  withAdbPath(adbPath: string): AdbConfig {
    return new AdbConfig(
      adbPath,
      this.autoDetectPath,
      this.ldPlayerPath,
      this.autoDetectLdPlayer,
      this.serverPort,
      this.commandTimeout,
      this.enableDeviceWatching,
      this.deviceWatchInterval
    );
  }

  /**
   * 创建配置副本并禁用设备监听
   */
  withDeviceWatchingDisabled(): AdbConfig {
    return new AdbConfig(
      this.adbPath,
      this.autoDetectPath,
      this.ldPlayerPath,
      this.autoDetectLdPlayer,
      this.serverPort,
      this.commandTimeout,
      false, // 禁用设备监听
      this.deviceWatchInterval
    );
  }
}
