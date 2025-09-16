/**
 * 智能ADB状态缓存管理
 * 解决ADB命令每次返回新对象导致的无限重渲染问题
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Device, DeviceStatus } from '../../domain/adb';

interface DeviceSnapshot {
  id: string;
  status: string;
  properties: Record<string, any>;
  lastSeen: number;
}

interface AdbCacheState {
  devices: Map<string, DeviceSnapshot>;
  lastUpdate: number;
  version: number;
}

/**
 * 智能ADB缓存管理器
 * 
 * 核心思路：
 * 1. 对设备状态进行规范化存储
 * 2. 只有真正状态改变时才更新
 * 3. 提供稳定的对象引用
 */
class SmartAdbCache {
  private state: AdbCacheState = {
    devices: new Map(),
    lastUpdate: 0,
    version: 0
  };

  private subscribers = new Set<() => void>();

  /**
   * 更新设备列表，只有实际改变时才触发更新
   */
  updateDevices(newDevices: Device[]): boolean {
    let hasChanges = false;
    const now = Date.now();
    const newDeviceMap = new Map<string, DeviceSnapshot>();

    // 检查新设备和状态变化
    for (const device of newDevices) {
      const deviceId = device.id;
      const currentSnapshot = this.state.devices.get(deviceId);
      
      const newSnapshot: DeviceSnapshot = {
        id: deviceId,
        status: device.status.toString(),
        properties: this.normalizeProperties(device),
        lastSeen: now
      };

      // 比较是否有实际变化
      if (!currentSnapshot || this.hasDeviceChanged(currentSnapshot, newSnapshot)) {
        hasChanges = true;
      }

      newDeviceMap.set(deviceId, newSnapshot);
    }

    // 检查是否有设备被移除
    for (const [deviceId] of this.state.devices) {
      if (!newDeviceMap.has(deviceId)) {
        hasChanges = true;
        break;
      }
    }

    // 只有实际变化时才更新状态
    if (hasChanges) {
      this.state = {
        devices: newDeviceMap,
        lastUpdate: now,
        version: this.state.version + 1
      };
      
      this.notifySubscribers();
      return true;
    }

    return false;
  }

  /**
   * 获取稳定的设备列表
   */
  getDevices(): Device[] {
    // 返回规范化的设备对象，确保引用稳定
    const devices: Device[] = [];
    
    for (const [_, snapshot] of this.state.devices) {
      devices.push(this.snapshotToDevice(snapshot));
    }

    return devices;
  }

  /**
   * 获取在线设备（缓存结果）
   */
  private _onlineDevicesCache: Device[] | null = null;
  private _onlineDevicesCacheVersion: number = -1;

  getOnlineDevices(): Device[] {
    if (this._onlineDevicesCacheVersion !== this.state.version) {
      this._onlineDevicesCache = this.getDevices().filter(device => device.isOnline());
      this._onlineDevicesCacheVersion = this.state.version;
    }

    return this._onlineDevicesCache || [];
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * 获取缓存版本，用于React依赖比较
   */
  getVersion(): number {
    return this.state.version;
  }

  /**
   * 私有方法：规范化设备属性
   */
  private normalizeProperties(device: Device): Record<string, any> {
    // 提取关键属性，忽略可能变化的非关键信息
    return {
      name: device.getDisplayName(),
      isOnline: device.isOnline(),
      type: device.type || 'unknown',
      // 只包含稳定的属性，忽略时间戳等易变信息
    };
  }

  /**
   * 私有方法：比较设备是否真正改变
   */
  private hasDeviceChanged(old: DeviceSnapshot, new_: DeviceSnapshot): boolean {
    if (old.status !== new_.status) return true;
    
    // 深度比较关键属性
    const oldProps = old.properties;
    const newProps = new_.properties;
    
    const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
    
    for (const key of keys) {
      if (oldProps[key] !== newProps[key]) {
        return true;
      }
    }

    return false;
  }

  /**
   * 私有方法：将快照转换为设备对象
   */
  private snapshotToDevice(snapshot: DeviceSnapshot): Device {
    // 基于快照创建设备对象，使用正确的构造函数参数
    return Device.fromRaw({
      id: snapshot.id,
      status: snapshot.status,
      model: snapshot.properties.name,
      type: 'device'
    });
  }

  /**
   * 私有方法：通知订阅者
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('SmartAdbCache subscriber error:', error);
      }
    });
  }
}

// 全局单例
export const smartAdbCache = new SmartAdbCache();

/**
 * React Hook - 使用智能缓存的设备列表
 */
export const useSmartAdbDevices = () => {
  const [version, setVersion] = useState(smartAdbCache.getVersion());

  useEffect(() => {
    const unsubscribe = smartAdbCache.subscribe(() => {
      setVersion(smartAdbCache.getVersion());
    });

    return unsubscribe;
  }, []);

  return useMemo(() => ({
    devices: smartAdbCache.getDevices(),
    onlineDevices: smartAdbCache.getOnlineDevices(),
    version
  }), [version]);
};