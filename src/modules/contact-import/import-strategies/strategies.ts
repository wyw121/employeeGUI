import { ImportStrategy, VCardVersion, ImportTriggerMethod, DeviceManufacturer } from './types';

/**
 * 预定义的导入策略配置
 * 基于实际测试结果
 */

export const IMPORT_STRATEGIES: ImportStrategy[] = [
  // Honor/Huawei 成功策略
  {
    id: 'honor_v30_direct',
    name: 'Honor vCard 3.0 (直接导入)',
    description: '使用 Honor 原生导入器，兼容性最佳',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.hihonor.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'high',
    testedDevices: ['WDY_AN00'],
    notes: '测试中批量20条全部成功导入'
  },
  {
    id: 'honor_v21_direct',
    name: 'Honor vCard 2.1 (直接导入)',
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
    name: 'Honor vCard 3.0 (VIEW方式A)',
    description: '使用 VIEW Intent + text/x-vcard',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    successRate: 'high',
    testedDevices: ['WDY_AN00'],
    notes: '通用性较好，会弹出应用选择器'
  },
  {
    id: 'honor_v30_view_std',
    name: 'Honor vCard 3.0 (VIEW方式B)',
    description: '使用 VIEW Intent + text/vcard',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_VCARD,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/vcard',
    successRate: 'high',
    testedDevices: ['WDY_AN00'],
    notes: '标准 MIME 类型，兼容性好'
  },

  // 失败策略 - 仍提供给用户尝试
  {
    id: 'honor_v40_direct',
    name: 'Honor vCard 4.0 (直接导入)',
    description: 'vCard 4.0 格式测试',
    vCardVersion: VCardVersion.V40,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.HONOR,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.hihonor.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'failed',
    testedDevices: ['WDY_AN00'],
    notes: '⚠️ 测试失败：Honor 导入器不支持 vCard 4.0 格式'
  },

  // 通用策略（适用于其他厂商）
  {
    id: 'generic_v30_view_x',
    name: '通用 vCard 3.0 (VIEW方式A)',
    description: '适用于大多数 Android 设备的通用方式',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_X_VCARD,
    manufacturer: DeviceManufacturer.OTHER,
    mimeType: 'text/x-vcard',
    successRate: 'medium',
    testedDevices: [],
    notes: '建议作为未知设备的首选方式'
  },
  {
    id: 'generic_v30_view_std',
    name: '通用 vCard 3.0 (VIEW方式B)',
    description: '使用标准 text/vcard MIME 类型',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.VIEW_VCARD,
    manufacturer: DeviceManufacturer.OTHER,
    mimeType: 'text/vcard',
    successRate: 'medium',
    testedDevices: [],
    notes: '标准方式，可作为备选方案'
  },

  // Xiaomi 预设策略
  {
    id: 'xiaomi_v30_direct',
    name: 'Xiaomi vCard 3.0 (MIUI联系人)',
    description: '针对 MIUI 系统的导入策略',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.XIAOMI,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.android.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'medium',
    testedDevices: [],
    notes: '需要实际测试验证，MIUI 可能有定制'
  },

  // Samsung 预设策略
  {
    id: 'samsung_v30_direct',
    name: 'Samsung vCard 3.0 (三星联系人)',
    description: '针对三星设备的导入策略',
    vCardVersion: VCardVersion.V30,
    triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
    manufacturer: DeviceManufacturer.SAMSUNG,
    mimeType: 'text/x-vcard',
    activityComponent: 'com.samsung.android.contacts/com.android.contacts.vcard.ImportVCardActivity',
    successRate: 'medium',
    testedDevices: [],
    notes: '需要实际测试验证，三星可能有定制包名'
  }
];

/**
 * 根据设备信息推荐导入策略
 */
export function getRecommendedStrategies(deviceInfo: {
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
}): ImportStrategy[] {
  const manufacturer = detectManufacturer(deviceInfo.manufacturer);
  
  return IMPORT_STRATEGIES
    .filter(strategy => 
      strategy.manufacturer === manufacturer || 
      strategy.manufacturer === DeviceManufacturer.OTHER
    )
    .sort((a, b) => {
      // 优先级排序：成功率 > 是否有测试数据 > 直接导入方式
      const successRateOrder = { high: 4, medium: 3, low: 2, failed: 1 };
      const aScore = successRateOrder[a.successRate] * 10 +
                    (a.testedDevices.length > 0 ? 5 : 0) +
                    (a.triggerMethod === ImportTriggerMethod.DIRECT_ACTIVITY ? 2 : 0);
      const bScore = successRateOrder[b.successRate] * 10 +
                    (b.testedDevices.length > 0 ? 5 : 0) +
                    (b.triggerMethod === ImportTriggerMethod.DIRECT_ACTIVITY ? 2 : 0);
      return bScore - aScore;
    });
}

function detectManufacturer(manufacturerStr?: string): DeviceManufacturer {
  if (!manufacturerStr) return DeviceManufacturer.OTHER;
  
  const lower = manufacturerStr.toLowerCase();
  if (lower.includes('honor') || lower.includes('hihonor')) return DeviceManufacturer.HONOR;
  if (lower.includes('huawei')) return DeviceManufacturer.HUAWEI;
  if (lower.includes('xiaomi') || lower.includes('redmi')) return DeviceManufacturer.XIAOMI;
  if (lower.includes('oppo')) return DeviceManufacturer.OPPO;
  if (lower.includes('vivo')) return DeviceManufacturer.VIVO;
  if (lower.includes('samsung')) return DeviceManufacturer.SAMSUNG;
  if (lower.includes('google') || lower.includes('pixel')) return DeviceManufacturer.GOOGLE;
  
  return DeviceManufacturer.OTHER;
}

export { detectManufacturer };