/**
 * 联系人导入模块统一状态管理类型定义
 */
import type { Device } from '../../../../domain/adb/entities/Device';
import type { ContactNumberDto } from '../services/contactNumberService';
import type { ContactNumberStatsDto } from '../services/stats/contactStatsService';
import type { UseContactImportStateReturn } from '../hooks/useContactImportState';

/**
 * 联系人导入Context的完整类型定义
 * 继承业务状态Hook的返回类型，并添加额外的ADB状态和操作
 */
export interface ContactImportContextValue extends UseContactImportStateReturn {
  // ADB状态
  devices: Device[];
  selectedDevice: Device | null;
  
  // 设备操作方法
  validateDevice: (deviceId: string) => Promise<boolean>;
  validateDevices: (deviceIds: string[]) => Promise<string[]>;
  getOnlineDevices: () => Device[];
  getDeviceStatusText: (device: Device) => string;
  
  // 批量操作方法
  batchAssignNumbers: (
    deviceIds: string[], 
    assignments: Record<string, { industry?: string; idStart?: number; idEnd?: number }>
  ) => Promise<void>;
  batchGenerateVcf: (deviceIds: string[]) => Promise<any[]>;
  batchImport: (deviceIds: string[]) => Promise<any[]>;
  
  // 模态框状态
  batchDrawerOpen: boolean;
  sessionsModal: {
    open: boolean;
    deviceId?: string;
    status?: 'all' | 'pending' | 'success' | 'failed';
  };
  
  // ADB操作方法
  selectDevice: (deviceId: string | null) => void;
  refreshDevices: () => Promise<void>;
  
  // 模态框操作方法
  openBatchDrawer: () => void;
  closeBatchDrawer: () => void;
  openSessionsModal: (options: { deviceId?: string; status?: string }) => void;
  closeSessionsModal: () => void;
}