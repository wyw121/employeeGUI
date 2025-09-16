import { invoke, isTauri } from '@tauri-apps/api/core';
import { IDeviceRepository } from '../../domain/adb/repositories/IDeviceRepository';
import { Device, DeviceQuery } from '../../domain/adb/entities/Device';

/**
 * Tauri设备仓储实现
 * 通过Tauri接口访问设备数据
 */
export class TauriDeviceRepository implements IDeviceRepository {
  
  async getDevices(): Promise<Device[]> {
    try {
      if (!isTauri()) {
        console.warn('Not running in Tauri environment, returning empty device list');
        return [];
      }
      // 使用安全的ADB设备获取命令
      const deviceIds = await invoke<string[]>('get_adb_devices_safe');
      const devices: Device[] = [];

      for (const deviceId of deviceIds) {
        try {
          // 获取设备详细信息
          const deviceInfo = await this.getDeviceInfo(deviceId);
          const device = Device.fromRaw({
            id: deviceId,
            status: 'device', // 默认在线状态，因为能够获取到
            model: deviceInfo?.['ro.product.model'],
            product: deviceInfo?.['ro.product.name'],
            type: deviceId.includes('emulator') ? 'emulator' : 'usb'
          });
          devices.push(device);
        } catch (error) {
          // 如果获取详细信息失败，创建基础设备对象
          console.warn(`Failed to get info for device ${deviceId}:`, error);
          const device = Device.fromRaw({
            id: deviceId,
            status: 'device',
            type: deviceId.includes('emulator') ? 'emulator' : 'usb'
          });
          devices.push(device);
        }
      }

      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error);
      throw new Error(`获取设备列表失败: ${error}`);
    }
  }

  async getDevicesByQuery(query: DeviceQuery): Promise<Device[]> {
    const allDevices = await this.getDevices();
    
    return allDevices.filter(device => {
      if (query.status && device.status !== query.status) return false;
      if (query.type && device.type !== query.type) return false;
      if (query.onlineOnly && !device.isOnline()) return false;
      return true;
    });
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    const devices = await this.getDevices();
    return devices.find(device => device.id === deviceId) || null;
  }

  async getDeviceInfo(deviceId: string): Promise<Record<string, string> | null> {
    try {
      const result = await invoke<string>('get_device_properties', { deviceId });
      return this.parseProperties(result);
    } catch (error) {
      console.error(`Failed to get device info for ${deviceId}:`, error);
      return null;
    }
  }

  async isDeviceOnline(deviceId: string): Promise<boolean> {
    try {
      const devices = await this.getDevices();
      const device = devices.find(d => d.id === deviceId);
      return device?.isOnline() || false;
    } catch (error) {
      console.error(`Failed to check device status for ${deviceId}:`, error);
      return false;
    }
  }

  async connectToDevice(address: string): Promise<void> {
    try {
      await invoke('connect_adb_device', { address });
    } catch (error) {
      throw new Error(`连接设备失败: ${error}`);
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      await invoke('disconnect_adb_device', { address: deviceId });
    } catch (error) {
      throw new Error(`断开设备连接失败: ${error}`);
    }
  }

  async connectToCommonEmulatorPorts(): Promise<Device[]> {
    const commonPorts = [
      '127.0.0.1:5555',
      '127.0.0.1:5556',
      '127.0.0.1:5557',
      '127.0.0.1:5558',
      '127.0.0.1:5559',
      '127.0.0.1:5554' // 雷电模拟器常用端口
    ];

    const connectedDevices: Device[] = [];

    for (const port of commonPorts) {
      try {
        await this.connectToDevice(port);
        // 等待短暂时间确保连接建立
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 检查是否成功连接
        const device = await this.getDeviceById(port);
        if (device && device.isOnline()) {
          connectedDevices.push(device);
        }
      } catch (error) {
        // 忽略连接失败的端口
        console.debug(`Failed to connect to ${port}:`, error);
      }
    }

    return connectedDevices;
  }

  watchDeviceChanges(callback: (devices: Device[]) => void): () => void {
    // 使用轮询方式监听设备变化
    // 在实际项目中，可以考虑使用WebSocket或其他实时通信方式
    let isWatching = true;
    let lastDeviceIds: string[] = [];

    const pollDevices = async () => {
      if (!isWatching) return;

      try {
        const devices = await this.getDevices();
        const currentDeviceIds = devices.map(d => d.id).sort();
        
        // 检查设备列表是否发生变化
        if (JSON.stringify(currentDeviceIds) !== JSON.stringify(lastDeviceIds)) {
          lastDeviceIds = currentDeviceIds;
          callback(devices);
        }
      } catch (error) {
        console.error('Error polling devices:', error);
      }

      if (isWatching) {
        setTimeout(pollDevices, 3000); // 每3秒检查一次
      }
    };

    // 立即执行一次
    pollDevices();

    // 返回停止监听的函数
    return () => {
      isWatching = false;
    };
  }

  /**
   * 解析设备属性字符串
   */
  private parseProperties(output: string): Record<string, string> {
    const properties: Record<string, string> = {};
    
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^\[(.+?)\]: \[(.+?)\]$/);
      if (match) {
        const [, key, value] = match;
        properties[key] = value;
      }
    }
    
    return properties;
  }
}

