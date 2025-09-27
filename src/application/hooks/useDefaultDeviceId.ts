import { useEffect, useMemo } from 'react';
import { useAdb } from './useAdb';

/**
 * 统一的默认设备选择逻辑
 * 优先级：已选设备 → 首台在线设备 → 首台设备
 */
export interface UseDefaultDeviceIdOptions {
  /** 是否优先返回已选设备（默认 true） */
  preferSelected?: boolean;
  /** 是否在挂载时自动将默认设备写入全局选中状态（默认 false） */
  autoSelectOnMount?: boolean;
}

export interface UseDefaultDeviceIdResult {
  /** 计算得到的默认设备 ID（可能为 undefined） */
  defaultDeviceId?: string;
  /** 列表中是否至少有一台设备 */
  hasDevices: boolean;
  /** 是否至少有一台在线设备 */
  hasOnlineDevices: boolean;
  /** 将默认设备写入全局选中状态（若存在） */
  selectDefaultDevice: () => void;
}

export function useDefaultDeviceId(options: UseDefaultDeviceIdOptions = {}): UseDefaultDeviceIdResult {
  const { preferSelected = true, autoSelectOnMount = false } = options;
  const { devices, selectedDevice, selectDevice } = useAdb();

  const { defaultDeviceId, hasDevices, hasOnlineDevices } = useMemo(() => {
    const hasDevices = devices.length > 0;
    const online = devices.filter((d: any) => typeof d.isOnline === 'function' ? d.isOnline() : (d.status === 'online' || d.status === 1 || d.status === 'ONLINE'));
    const hasOnlineDevices = online.length > 0;

    // 选择顺序：selected → first online → first
    const selectedId = preferSelected && selectedDevice ? selectedDevice.id : undefined;
    const firstOnlineId = online[0]?.id as string | undefined;
    const firstId = devices[0]?.id as string | undefined;

    const id = selectedId || firstOnlineId || firstId;

    return { defaultDeviceId: id, hasDevices, hasOnlineDevices };
  }, [devices, selectedDevice, preferSelected]);

  const selectDefaultDevice = () => {
    if (defaultDeviceId) {
      selectDevice(defaultDeviceId);
    }
  };

  // 可选：挂载时自动同步到全局选中设备
  useEffect(() => {
    if (autoSelectOnMount && defaultDeviceId && (!selectedDevice || selectedDevice.id !== defaultDeviceId)) {
      selectDevice(defaultDeviceId);
    }
  }, [autoSelectOnMount, defaultDeviceId, selectDevice, selectedDevice]);

  return { defaultDeviceId, hasDevices, hasOnlineDevices, selectDefaultDevice };
}

export default useDefaultDeviceId;
