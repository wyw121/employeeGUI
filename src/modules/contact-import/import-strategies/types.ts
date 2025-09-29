/**
 * vCard 导入策略类型定义
 * 基于实际测试结果定义的导入方式组合
 */

import { getBrandDisplayName } from './config/deviceBrands';

export enum VCardVersion {
  V21 = '2.1',
  V30 = '3.0',
  V40 = '4.0'
}

export enum ImportTriggerMethod {
  /** 方式 A: VIEW + text/x-vcard */
  VIEW_X_VCARD = 'VIEW_X_VCARD',
  /** 方式 B: VIEW + text/vcard */
  VIEW_VCARD = 'VIEW_VCARD',
  /** 方式 C: 直接调用厂商ImportActivity */
  DIRECT_ACTIVITY = 'DIRECT_ACTIVITY'
}

export enum DeviceManufacturer {
  HONOR = 'HONOR',
  HUAWEI = 'HUAWEI',
  XIAOMI = 'XIAOMI',
  OPPO = 'OPPO',
  VIVO = 'VIVO',
  SAMSUNG = 'SAMSUNG',
  GOOGLE = 'GOOGLE',
  OTHER = 'OTHER'
}

/**
 * 获取设备制造商的显示名称
 */
export function getManufacturerDisplayName(manufacturer: DeviceManufacturer): string {
  return getBrandDisplayName(manufacturer);
}

export interface ImportStrategy {
  id: string;
  name: string;
  description: string;
  vCardVersion: VCardVersion;
  triggerMethod: ImportTriggerMethod;
  manufacturer: DeviceManufacturer;
  mimeType: string;
  activityComponent?: string;
  /** 基于测试结果的成功率 */
  successRate: 'high' | 'medium' | 'low' | 'failed';
  /** 实测设备型号 */
  testedDevices: string[];
  /** 注意事项 */
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  strategy: ImportStrategy;
  errorMessage?: string;
  /** 增强的错误详情 */
  errorDetails?: {
    description: string;
    suggestions: string[];
    recoverable: boolean;
    type: string;
  };
  verificationDetails?: {
    sampledContacts: Array<{
      id: string;
      displayName: string;
      phoneNumber: string;
    }>;
    totalFound: number;
  };
}

export interface ImportStrategySelection {
  selectedStrategy: ImportStrategy;
  vcfFilePath: string;
  deviceId: string;
  /** 是否执行导入后验证 */
  enableVerification: boolean;
  /** 验证时使用的号码样本 */
  verificationPhones?: string[];
}