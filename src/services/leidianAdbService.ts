import { invoke } from '@tauri-apps/api/core';

export interface AdbDevice {
  id: string;
  status: 'device' | 'offline' | 'unauthorized';
  model?: string;
  product?: string;
  transport_id?: string;
}

/**
 * 检查是否在Tauri环境中运行
 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' &&
         typeof (window as any).__TAURI__ !== 'undefined';
}

/**
 * 模拟ADB数据（用于Web环境测试）
 */
function getMockAdbData(): AdbDevice[] {
  return [
    {
      id: '127.0.0.1:5555',
      status: 'device',
      model: 'LDPlayer',
      product: 'LDPlayer9'
    },
    {
      id: 'emulator-5554',
      status: 'device',
      model: 'Android SDK built for x86',
      product: 'sdk_google_phone_x86'
    }
  ];
}

/**
 * ADB服务类 - 专门用于雷电模拟器连接
 */
export class AdbService {
  private static readonly LEIDIAN_ADB_PATH = 'D:\\leidian\\LDPlayer9\\adb.exe';

  /**
   * 检查Tauri环境并提供友好的错误信息
   */
  private static checkTauriEnvironment(): void {
    if (!isTauriEnvironment()) {
      console.warn('当前在Web环境中运行，使用模拟数据。要使用真实ADB功能，请运行: npm run tauri dev');
    }
  }

  /**
   * 获取连接的设备列表
   */
  static async getDevices(): Promise<AdbDevice[]> {
    try {
      this.checkTauriEnvironment();

      if (!isTauriEnvironment()) {
        // 在Web环境中返回模拟数据
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
        return getMockAdbData();
      }

      const result = await invoke<string>('get_adb_devices', {
        adb_path: this.LEIDIAN_ADB_PATH
      });
      return this.parseDevicesOutput(result);
    } catch (error) {
      console.error('Failed to get ADB devices:', error);

      if (!isTauriEnvironment()) {
        // 在Web环境中，即使出错也返回模拟数据
        console.log('返回模拟ADB设备数据');
        return getMockAdbData();
      }

      throw new Error(`获取设备列表失败: ${error}`);
    }
  }

  /**
   * 连接到雷电模拟器 (默认端口 5555)
   */
  static async connectToLeidian(port: number = 5555): Promise<boolean> {
    try {
      this.checkTauriEnvironment();

      if (!isTauriEnvironment()) {
        // 在Web环境中模拟连接成功
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟连接延迟
        console.log(`模拟连接到雷电模拟器端口 ${port}`);
        return true;
      }

      const result = await invoke<string>('connect_adb_device', {
        adbPath: this.LEIDIAN_ADB_PATH,
        address: `127.0.0.1:${port}`
      });
      return result.includes('connected');
    } catch (error) {
      console.error('Failed to connect to Leidian:', error);

      if (!isTauriEnvironment()) {
        return true; // 在Web环境中总是返回成功
      }

      throw new Error(`连接雷电模拟器失败: ${error}`);
    }
  }

  /**
   * 断开指定设备连接
   */
  static async disconnect(deviceId: string): Promise<boolean> {
    try {
      const result = await invoke<string>('disconnect_adb_device', {
        adbPath: this.LEIDIAN_ADB_PATH,
        address: deviceId
      });
      return result.includes('disconnected');
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      throw new Error(`断开设备连接失败: ${error}`);
    }
  }

  /**
   * 重启ADB服务器
   */
  static async restartServer(): Promise<void> {
    try {
      await invoke('kill_adb_server', { adbPath: this.LEIDIAN_ADB_PATH });
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      await invoke('start_adb_server', { adbPath: this.LEIDIAN_ADB_PATH });
    } catch (error) {
      console.error('Failed to restart ADB server:', error);
      throw new Error(`重启ADB服务器失败: ${error}`);
    }
  }

  /**
   * 检查ADB是否可用
   */
  static async checkAdbAvailable(): Promise<boolean> {
    try {
      this.checkTauriEnvironment();

      if (!isTauriEnvironment()) {
        // 在Web环境中模拟ADB可用
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('模拟ADB可用性检查');
        return true;
      }

      await invoke<string>('execute_adb_command', {
        adbPath: this.LEIDIAN_ADB_PATH,
        args: ['version']
      });
      return true;
    } catch (error) {
      console.error('ADB not available:', error);

      if (!isTauriEnvironment()) {
        return true; // 在Web环境中总是返回可用
      }

      return false;
    }
  }

  /**
   * 解析设备列表输出
   */
  private static parseDevicesOutput(output: string): AdbDevice[] {
    const lines = output.split('\n').filter(line => line.trim());
    const devices: AdbDevice[] = [];

    for (const line of lines) {
      if (line.includes('List of devices attached')) continue;
      if (line.trim() === '') continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const [id, status] = parts;
        devices.push({
          id: id.trim(),
          status: status as 'device' | 'offline' | 'unauthorized',
        });
      }
    }

    return devices;
  }

  /**
   * 获取设备详细信息
   */
  static async getDeviceInfo(deviceId: string): Promise<{ model?: string; product?: string }> {
    try {
      const model = await invoke<string>('execute_adb_command', {
        adbPath: this.LEIDIAN_ADB_PATH,
        args: ['-s', deviceId, 'shell', 'getprop', 'ro.product.model']
      });

      const product = await invoke<string>('execute_adb_command', {
        adbPath: this.LEIDIAN_ADB_PATH,
        args: ['-s', deviceId, 'shell', 'getprop', 'ro.product.name']
      });

      return {
        model: model.trim() || undefined,
        product: product.trim() || undefined,
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {};
    }
  }

  /**
   * 获取雷电模拟器的常用端口
   */
  static getLeidianPorts(): number[] {
    return [5555, 5556, 5557, 5558, 5559]; // 雷电模拟器常用端口
  }

  /**
   * 自动检测并连接雷电模拟器
   */
  static async autoConnectLeidian(): Promise<string[]> {
    const ports = this.getLeidianPorts();
    const connectedDevices: string[] = [];

    for (const port of ports) {
      try {
        const connected = await this.connectToLeidian(port);
        if (connected) {
          connectedDevices.push(`127.0.0.1:${port}`);
        }
      } catch (error) {
        // 忽略连接错误，继续尝试下一个端口
        console.debug(`Failed to connect to port ${port}:`, error);
      }
    }

    return connectedDevices;
  }

  /**
   * 执行shell命令
   */
  static async executeShellCommand(deviceId: string, command: string): Promise<string> {
    try {
      const result = await invoke<string>('execute_adb_command', {
        adbPath: this.LEIDIAN_ADB_PATH,
        args: ['-s', deviceId, 'shell', command]
      });
      return result;
    } catch (error) {
      console.error('Failed to execute shell command:', error);
      throw new Error(`执行Shell命令失败: ${error}`);
    }
  }

  /**
   * 模拟点击
   */
  static async tap(deviceId: string, x: number, y: number): Promise<void> {
    try {
      await this.executeShellCommand(deviceId, `input tap ${x} ${y}`);
    } catch (error) {
      console.error('Failed to tap:', error);
      throw new Error(`点击失败: ${error}`);
    }
  }

  /**
   * 输入文本
   */
  static async inputText(deviceId: string, text: string): Promise<void> {
    try {
      // 对文本进行处理以避免特殊字符问题
      const escapedText = text.replace(/"/g, '\\"');
      await this.executeShellCommand(deviceId, `input text "${escapedText}"`);
    } catch (error) {
      console.error('Failed to input text:', error);
      throw new Error(`输入文本失败: ${error}`);
    }
  }

  /**
   * 启动应用
   */
  static async launchApp(deviceId: string, packageName: string, activityName?: string): Promise<void> {
    try {
      const activity = activityName || '.MainActivity';
      await this.executeShellCommand(deviceId, `am start -n ${packageName}/${activity}`);
    } catch (error) {
      console.error('Failed to launch app:', error);
      throw new Error(`启动应用失败: ${error}`);
    }
  }
}
