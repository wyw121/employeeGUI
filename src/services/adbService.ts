import { invoke } from '@tauri-apps/api/core';

export interface AdbDevice {
  id: string;
  status: 'device' | 'offline' | 'unauthorized';
  model?: string;
  product?: string;
  transport_id?: string;
  type: 'usb' | 'wifi' | 'emulator';
  lastSeen: Date;
}

export interface AdbServiceConfig {
  adbPath: string;
  ldPlayerPath?: string;
  autoDetectLdPlayer: boolean;
}

/**
 * ADB服务类
 * 处理与Android设备/模拟器的连接
 */
export class AdbService {
  private static readonly LEIDIAN_ADB_PATH = 'D:\leidian\LDPlayer9\adb.exe';
  private config: AdbServiceConfig;
  private static instance: AdbService;

  constructor(config?: Partial<AdbServiceConfig>) {
    this.config = {
      adbPath: config?.adbPath || 'auto', // 'auto' 表示自动检测
      ldPlayerPath: config?.ldPlayerPath,
      autoDetectLdPlayer: config?.autoDetectLdPlayer ?? true,
      ...config
    };
  }

  public static getInstance(config?: Partial<AdbServiceConfig>): AdbService {
    if (!AdbService.instance) {
      AdbService.instance = new AdbService(config);
    }
    return AdbService.instance;
  }

  /**
   * 智能检测最佳ADB路径 (环境感知)
   */
  private async detectSmartAdbPath(): Promise<string> {
    try {
      const result = await invoke('detect_smart_adb_path');
      console.log('Smart ADB path detected:', result);
      return result as string;
    } catch (error) {
      console.error('Smart ADB detection failed:', error);
      // 回退到默认路径
      return 'adb.exe';
    }
  }

  /**
   * 自动检测雷电模拟器ADB路径
   */
  private async detectLdPlayerAdb(): Promise<string | null> {
    const commonPaths = [
      'C:\\LDPlayer\\LDPlayer9\\adb.exe',
      'C:\\LDPlayer\\LDPlayer4\\adb.exe',
      'D:\\LDPlayer\\LDPlayer9\\adb.exe',
      'D:\\LDPlayer\\LDPlayer4\\adb.exe',
      'E:\\LDPlayer\\LDPlayer9\\adb.exe',
      'E:\\LDPlayer\\LDPlayer4\\adb.exe',
    ];

    try {
      for (const path of commonPaths) {
        const exists = await this.checkFileExists(path);
        if (exists) {
          console.log(`Found LDPlayer ADB at: ${path}`);
          return path;
        }
      }
      return null;
    } catch (error) {
      console.error('Error detecting LDPlayer ADB:', error);
      return null;
    }
  }

  /**
   * 检查文件是否存在
   */
  private async checkFileExists(path: string): Promise<boolean> {
    try {
      const result = await invoke('check_file_exists', { path });
      return result as boolean;
    } catch (error) {
      console.error(`Failed to check file existence: ${path}`, error);
      return false;
    }
  }

  /**
   * 执行ADB命令
   */
  private async executeAdbCommand(args: string[]): Promise<string> {
    try {
      let adbPath = this.config.adbPath;
      
      // 如果是自动检测模式，使用智能检测
      if (adbPath === 'auto') {
        adbPath = await this.detectSmartAdbPath();
        this.config.adbPath = adbPath; // 缓存检测到的路径
      }
      
      // 如果启用自动检测且路径不是具体路径，尝试智能检测
      if (this.config.autoDetectLdPlayer && (adbPath === 'adb' || adbPath === 'platform-tools/adb.exe')) {
        const smartPath = await this.detectSmartAdbPath();
        if (smartPath) {
          adbPath = smartPath;
          this.config.adbPath = smartPath; // 缓存检测到的路径
        }
      }

      const result = await invoke('execute_adb_command', {
        adb_path: adbPath,
        args
      });
      return result as string;
    } catch (error) {
      console.error('ADB command execution failed:', error);
      throw new Error(`ADB命令执行失败: ${error}`);
    }
  }

  /**
   * 获取连接的设备列表
   */
  async getDevices(): Promise<AdbDevice[]> {
    try {
      const output = await this.executeAdbCommand(['devices', '-l']);
      const devices = this.parseDevicesOutput(output);
      console.log('Connected devices:', devices);
      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error);
      throw error;
    }
  }

  /**
   * 解析adb devices命令输出
   */
  private parseDevicesOutput(output: string): AdbDevice[] {
    const lines = output.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
    const devices: AdbDevice[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        // 判断设备类型
        let type: 'usb' | 'wifi' | 'emulator' = 'usb';
        const deviceId = parts[0];
        
        if (deviceId.includes('emulator') || deviceId.includes('127.0.0.1')) {
          type = 'emulator';
        } else if (deviceId.includes('.') && deviceId.includes(':')) {
          type = 'wifi';
        }

        const device: AdbDevice = {
          id: deviceId,
          status: parts[1] as AdbDevice['status'],
          type,
          lastSeen: new Date()
        };

        // 解析额外信息
        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          if (part.startsWith('model:')) {
            device.model = part.split(':')[1];
          } else if (part.startsWith('product:')) {
            device.product = part.split(':')[1];
          } else if (part.startsWith('transport_id:')) {
            device.transport_id = part.split(':')[1];
          }
        }

        devices.push(device);
      }
    }

    return devices;
  }

  /**
   * 连接到指定端口的雷电模拟器
   */
  async connectToLdPlayer(port: number = 5555): Promise<boolean> {
    try {
      console.log(`Attempting to connect to LDPlayer on port ${port}`);
      const output = await this.executeAdbCommand(['connect', `127.0.0.1:${port}`]);

      const success = output.includes('connected') || output.includes('already connected');
      if (success) {
        console.log(`Successfully connected to LDPlayer on port ${port}`);
      } else {
        console.warn(`Failed to connect to LDPlayer on port ${port}: ${output}`);
      }

      return success;
    } catch (error) {
      console.error(`Error connecting to LDPlayer on port ${port}:`, error);
      return false;
    }
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      console.log(`Disconnecting device: ${deviceId}`);
      const output = await this.executeAdbCommand(['disconnect', deviceId]);
      const success = output.includes('disconnected');

      if (success) {
        console.log(`Successfully disconnected device: ${deviceId}`);
      } else {
        console.warn(`Failed to disconnect device ${deviceId}: ${output}`);
      }

      return success;
    } catch (error) {
      console.error(`Error disconnecting device ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * 启动ADB服务器
   */
  async startServer(): Promise<boolean> {
    try {
      console.log('Starting ADB server...');
      await invoke('start_adb_server_simple');
      console.log('ADB server started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start ADB server:', error);
      return false;
    }
  }

  /**
   * 停止ADB服务器
   */
  async stopServer(): Promise<boolean> {
    try {
      console.log('Stopping ADB server...');
      await invoke('kill_adb_server_simple');
      console.log('ADB server stopped successfully');
      return true;
    } catch (error) {
      console.error('Failed to stop ADB server:', error);
      return false;
    }
  }

  /**
   * 重启ADB服务器
   */
  async restartServer(): Promise<boolean> {
    try {
      await this.stopServer();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      return await this.startServer();
    } catch (error) {
      console.error('Failed to restart ADB server:', error);
      return false;
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    try {
      const output = await this.executeAdbCommand(['-s', deviceId, 'shell', 'getprop']);
      return this.parseProperties(output);
    } catch (error) {
      console.error(`Failed to get device info for ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * 解析设备属性
   */
  private parseProperties(output: string): Record<string, string> {
    const properties: Record<string, string> = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/\[(.+?)\]: \[(.+?)\]/);
      if (match) {
        properties[match[1]] = match[2];
      }
    }

    return properties;
  }

  /**
   * 检查设备是否在线
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    try {
      const devices = await this.getDevices();
      return devices.some(device => device.id === deviceId && device.status === 'device');
    } catch (error) {
      console.error(`Failed to check device status for ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * 尝试连接到常见的雷电模拟器端口
   */
  async connectToCommonLdPlayerPorts(): Promise<AdbDevice[]> {
    const commonPorts = [5555, 5554, 5556, 5557, 5558, 5559];
    const connectedDevices: AdbDevice[] = [];

    console.log('Attempting to connect to common LDPlayer ports...');

    for (const port of commonPorts) {
      const connected = await this.connectToLdPlayer(port);
      if (connected) {
        // 获取更新后的设备列表
        try {
          const devices = await this.getDevices();
          const newDevice = devices.find(d => d.id === `127.0.0.1:${port}`);
          if (newDevice) {
            connectedDevices.push(newDevice);
          }
        } catch (error) {
          console.error(`Error getting device info after connecting to port ${port}:`, error);
        }
      }
    }

    console.log(`Connected to ${connectedDevices.length} LDPlayer instances`);
    return connectedDevices;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AdbServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AdbServiceConfig {
    return { ...this.config };
  }
}

export default AdbService;
