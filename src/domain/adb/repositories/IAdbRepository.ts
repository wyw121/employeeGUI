import { AdbConnection, AdbConfig } from '../entities/AdbConnection';

/**
 * ADB仓储接口
 * 定义ADB连接和配置的抽象契约
 */
export interface IAdbRepository {
  /**
   * 检测智能ADB路径
   */
  detectSmartAdbPath(): Promise<string>;

  /**
   * 检测雷电模拟器ADB路径
   */
  detectLdPlayerAdbPath(): Promise<string | null>;

  /**
   * 检查文件是否存在
   */
  checkFileExists(path: string): Promise<boolean>;

  /**
   * 获取ADB版本信息
   */
  getAdbVersion(adbPath?: string): Promise<string>;

  /**
   * 启动ADB服务器
   */
  startAdbServer(adbPath?: string): Promise<void>;

  /**
   * 停止ADB服务器
   */
  stopAdbServer(adbPath?: string): Promise<void>;

  /**
   * 重启ADB服务器
   */
  restartAdbServer(adbPath?: string): Promise<void>;

  /**
   * 检查ADB服务器状态
   */
  checkAdbServerStatus(adbPath?: string): Promise<boolean>;

  /**
   * 执行ADB命令
   */
  executeAdbCommand(args: string[], adbPath?: string): Promise<string>;

  /**
   * 创建ADB连接
   */
  createConnection(config: AdbConfig): Promise<AdbConnection>;

  /**
   * 测试连接
   */
  testConnection(adbPath: string): Promise<boolean>;
}