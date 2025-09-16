import { invoke, isTauri } from '@tauri-apps/api/core';
import { IAdbRepository } from '../../domain/adb/repositories/IAdbRepository';
import { AdbConnection, AdbConfig, ConnectionStatus } from '../../domain/adb/entities/AdbConnection';

/**
 * Tauri ADB仓储实现
 * 通过Tauri接口访问ADB功能
 */
export class TauriAdbRepository implements IAdbRepository {

  async detectSmartAdbPath(): Promise<string> {
    try {
      if (!isTauri()) {
        throw new Error('Not running in Tauri environment');
      }
      const result = await invoke<string>('detect_smart_adb_path');
      return result;
    } catch (error) {
      console.error('Smart ADB detection failed:', error);
      throw new Error(`智能ADB路径检测失败: ${error}`);
    }
  }

  async detectLdPlayerAdbPath(): Promise<string | null> {
    try {
      if (!isTauri()) {
        console.warn('Not running in Tauri environment, LDPlayer detection unavailable');
        return null;
      }
      const result = await invoke<string | null>('detect_ldplayer_adb');
      return result;
    } catch (error) {
      console.error('LDPlayer ADB detection failed:', error);
      return null;
    }
  }

  async checkFileExists(path: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('check_file_exists', { path });
      return result;
    } catch (error) {
      console.error(`Failed to check file existence: ${path}`, error);
      return false;
    }
  }

  async getAdbVersion(adbPath?: string): Promise<string> {
    try {
      const result = await invoke<string>('get_adb_version', { 
        adbPath: adbPath || 'auto' 
      });
      return result;
    } catch (error) {
      throw new Error(`获取ADB版本失败: ${error}`);
    }
  }

  async startAdbServer(adbPath?: string): Promise<void> {
    try {
      if (adbPath) {
        await invoke('start_adb_server', { adbPath });
      } else {
        await invoke('start_adb_server_simple');
      }
    } catch (error) {
      throw new Error(`启动ADB服务器失败: ${error}`);
    }
  }

  async stopAdbServer(adbPath?: string): Promise<void> {
    try {
      if (adbPath) {
        await invoke('kill_adb_server', { adbPath });
      } else {
        await invoke('kill_adb_server_simple');
      }
    } catch (error) {
      throw new Error(`停止ADB服务器失败: ${error}`);
    }
  }

  async restartAdbServer(adbPath?: string): Promise<void> {
    await this.stopAdbServer(adbPath);
    // 等待1秒确保服务器完全停止
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startAdbServer(adbPath);
  }

  async checkAdbServerStatus(adbPath?: string): Promise<boolean> {
    try {
      // 尝试执行简单的ADB命令来检查服务器状态
      await this.executeAdbCommand(['version'], adbPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async executeAdbCommand(args: string[], adbPath?: string): Promise<string> {
    try {
      const result = await invoke<string>('execute_adb_command', {
        args,
        adbPath: adbPath || 'auto'
      });
      return result;
    } catch (error) {
      throw new Error(`执行ADB命令失败: ${error}`);
    }
  }

  async createConnection(config: AdbConfig): Promise<AdbConnection> {
    let adbPath = config.adbPath;
    
    // 如果配置为自动检测，则检测路径
    if (adbPath === 'auto') {
      try {
        adbPath = await this.detectSmartAdbPath();
      } catch (error) {
        // 回退到雷电模拟器检测
        if (config.autoDetectLdPlayer) {
          const ldPlayerPath = await this.detectLdPlayerAdbPath();
          if (ldPlayerPath) {
            adbPath = ldPlayerPath;
          } else {
            adbPath = 'adb.exe'; // 最终回退
          }
        } else {
          adbPath = 'adb.exe';
        }
      }
    }

    // 创建连接对象
    let connection = AdbConnection.create(adbPath);

    try {
      // 测试连接
      const isValid = await this.testConnection(adbPath);
      if (isValid) {
        // 获取版本信息
        const version = await this.getAdbVersion(adbPath);
        connection = connection.withVersion(version).withStatus(ConnectionStatus.CONNECTED);
      } else {
        connection = connection.withStatus(ConnectionStatus.ERROR, 'ADB路径无效或不可用');
      }
    } catch (error) {
      connection = connection.withStatus(ConnectionStatus.ERROR, `连接失败: ${error}`);
    }

    return connection;
  }

  async testConnection(adbPath: string): Promise<boolean> {
    try {
      await this.getAdbVersion(adbPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

