import { invoke } from '@tauri-apps/api/core';
import type { Device, Platform } from '../types';

/**
 * 设备管理API
 * 封装设备相关的Tauri命令调用
 */
export class DeviceAPI {
  /**
   * 获取所有设备状态
   */
  static async getDevices(): Promise<Device[]> {
    try {
      return await invoke<Device[]>('get_devices');
    } catch (error) {
      console.error('Failed to get devices:', error);
      throw new Error(`获取设备列表失败: ${error}`);
    }
  }

  /**
   * 连接设备
   */
  static async connectDevice(deviceId: number, platform: Platform): Promise<boolean> {
    try {
      return await invoke<boolean>('connect_device', { deviceId, platform });
    } catch (error) {
      console.error('Failed to connect device:', error);
      throw new Error(`连接设备失败: ${error}`);
    }
  }

  /**
   * 断开设备
   */
  static async disconnectDevice(deviceId: number): Promise<boolean> {
    try {
      return await invoke<boolean>('disconnect_device', { deviceId });
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      throw new Error(`断开设备失败: ${error}`);
    }
  }

  /**
   * 检查设备状态
   */
  static async checkDeviceStatus(deviceId: number): Promise<'connected' | 'disconnected'> {
    try {
      return await invoke<'connected' | 'disconnected'>('check_device_status', { deviceId });
    } catch (error) {
      console.error('Failed to check device status:', error);
      throw new Error(`检查设备状态失败: ${error}`);
    }
  }
}

export default DeviceAPI;
