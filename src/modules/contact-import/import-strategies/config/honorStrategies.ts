/**
 * 华为荣耀设备导入策略配置
 * 基于实际测试的华为荣耀设备专用策略
 * 
 * 特性：
 * - ✅ 基于真实设备测试结果
 * - ✅ 支持多种vCard版本和触发方式
 * - ✅ 优先级和成功率配置
 * - ✅ 详细的测试记录和说明
 */

import { ImportStrategy, VCardVersion, ImportTriggerMethod, DeviceManufacturer } from '../types';

/**
 * 华为荣耀设备策略配置
 */
export const HONOR_STRATEGIES: ImportStrategy[] = [
  {
    id: 'honor_v30_direct',
    name: '华为荣耀 vCard 3.0 (直接导入)',
    description: '使用华为荣耀原生导入器，兼容性最佳',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.hihonor.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'high',
    testedDevices: ['WDY_AN00', 'Honor 70', 'Honor Magic 4'],
    notes: '测试中批量20条全部成功导入，推荐优先使用'
  },
  {
    id: 'honor_v21_direct',
    name: '华为荣耀 vCard 2.1 (直接导入)',
    description: 'vCard 2.1 格式，支持 Quoted-Printable 编码',
    vCardVersion: VCardVersion.V21,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.hihonor.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'high',
    testedDevices: ['WDY_AN00'],
    notes: '支持中文编码，QP 格式正常解析'
  },
  {
    id: 'honor_v30_view_x',
    name: '华为荣耀 vCard 3.0 (VIEW方式A)',
    description: '使用 VIEW Intent + text/x-vcard',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    successRate: 'medium',
    testedDevices: ['WDY_AN00'],
    notes: '通用性较好，会弹出应用选择器，需要用户手动选择'
  },
  {
    id: 'honor_v30_view_std',
    name: '华为荣耀 vCard 3.0 (VIEW方式B)',
    description: '使用 VIEW Intent + text/vcard',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_VCARD,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/vcard',
    successRate: 'medium',
    testedDevices: ['WDY_AN00'],
    notes: '标准 MIME 类型，兼容性好，但可能需要用户确认'
  }
];

/**
 * 华为荣耀策略推荐优先级
 * 按照成功率和稳定性排序
 */
export const HONOR_STRATEGY_PRIORITY = [
  'honor_v30_direct',
  'honor_v21_direct',
  'honor_v30_view_x',
  'honor_v30_view_std'
];

/**
 * 华为荣耀设备识别模式
 */
export const HONOR_DEVICE_PATTERNS = [
  'honor',
  'huawei',
  '荣耀',
  'hihonor',
  'wdy-an00',
  'magic',
  'honor'
];