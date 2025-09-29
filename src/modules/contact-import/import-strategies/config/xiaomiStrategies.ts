/**
 * 小米设备导入策略配置
 * 基于MIUI系统的导入策略
 */

import { ImportStrategy, VCardVersion, ImportTriggerMethod, DeviceManufacturer } from '../types';

export const XIAOMI_STRATEGIES: ImportStrategy[] = [
  {
    id: 'xiaomi_v30_direct',
    name: '小米 vCard 3.0 (直接导入)',
    description: '使用MIUI通讯录原生导入',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.XIAOMI,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.miui.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'high',
    testedDevices: ['Redmi K40', 'Mi 11'],
    notes: 'MIUI系统专用导入器'
  },
  {
    id: 'xiaomi_v30_view',
    name: '小米 vCard 3.0 (VIEW方式)',
    description: '使用VIEW Intent导入',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.XIAOMI,
    mimeType: 'text/x-vcard',
    successRate: 'medium',
    testedDevices: ['Redmi K40'],
    notes: '通用方式，兼容性较好'
  }
];

export const XIAOMI_STRATEGY_PRIORITY = ['xiaomi_v30_direct', 'xiaomi_v30_view'];