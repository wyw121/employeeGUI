/**
 * 通用导入策略配置
 * 适用于其他品牌和未识别设备
 */

import { ImportStrategy, VCardVersion, ImportTriggerMethod, DeviceManufacturer } from '../types';

export const GENERIC_STRATEGIES: ImportStrategy[] = [
  {
    id: 'generic_v30_view_x',
    name: '通用 vCard 3.0 (VIEW X)',
    description: '通用VIEW Intent导入方式',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.OTHER,
    mimeType: 'text/x-vcard',
    successRate: 'medium',
    testedDevices: ['Generic Android'],
    notes: '兼容大部分Android设备'
  },
  {
    id: 'generic_v30_view',
    name: '通用 vCard 3.0 (VIEW)',
    description: '标准VIEW Intent导入',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_VCARD,
    manufacturer: DeviceManufacturer.OTHER,
    mimeType: 'text/vcard',
    successRate: 'medium',
    testedDevices: ['Generic Android'],
    notes: '标准MIME类型，通用性最好'
  },
  {
    id: 'generic_v21_view',
    name: '通用 vCard 2.1 (VIEW)',
    description: 'vCard 2.1 格式通用导入',
    vCardVersion: VCardVersion.V21,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.OTHER,
    mimeType: 'text/x-vcard',
    successRate: 'low',
    testedDevices: ['Generic Android'],
    notes: '兼容性备选方案'
  }
];

export const GENERIC_STRATEGY_PRIORITY = [
  'generic_v30_view_x',
  'generic_v30_view',
  'generic_v21_view'
];