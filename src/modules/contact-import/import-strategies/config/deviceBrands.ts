/**
 * 设备品牌配置模块
 * 统一管理设备品牌的显示名称和内部标识
 * 
 * 特性：
 * - ✅ 显示名称与内部标识分离
 * - ✅ 支持多语言显示名称
 * - ✅ 统一的品牌配置管理
 * - ✅ 易于维护和扩展
 */

export interface DeviceBrandConfig {
  /** 内部标识符 */
  id: string;
  /** 显示名称 */
  displayName: string;
  /** 英文名称 */
  englishName: string;
  /** 品牌标识符（用于匹配设备） */
  brandIdentifiers: string[];
  /** 包名模式 */
  packagePatterns?: string[];
  /** 品牌描述 */
  description?: string;
}

/**
 * 设备品牌配置表
 */
export const DEVICE_BRAND_CONFIGS: Record<string, DeviceBrandConfig> = {
  HONOR: {
    id: 'HONOR',
    displayName: '华为荣耀',
    englishName: 'Honor',
    brandIdentifiers: ['honor', 'huawei', '荣耀', 'hihonor'],
    packagePatterns: ['com.hihonor.contacts', 'com.huawei.contacts'],
    description: '华为荣耀系列设备，支持原生通讯录导入'
  },
  HUAWEI: {
    id: 'HUAWEI',
    displayName: '华为',
    englishName: 'Huawei',
    brandIdentifiers: ['huawei', '华为'],
    packagePatterns: ['com.huawei.contacts', 'com.android.contacts'],
    description: '华为设备，EMUI系统'
  },
  XIAOMI: {
    id: 'XIAOMI',
    displayName: '小米',
    englishName: 'Xiaomi',
    brandIdentifiers: ['xiaomi', 'mi', '小米', 'redmi'],
    packagePatterns: ['com.miui.contacts', 'com.android.contacts'],
    description: '小米设备，MIUI系统'
  },
  OPPO: {
    id: 'OPPO',
    displayName: 'OPPO',
    englishName: 'OPPO',
    brandIdentifiers: ['oppo', 'oneplus'],
    packagePatterns: ['com.oppo.contacts', 'com.android.contacts'],
    description: 'OPPO设备，ColorOS系统'
  },
  VIVO: {
    id: 'VIVO',
    displayName: 'Vivo',
    englishName: 'Vivo',
    brandIdentifiers: ['vivo', 'iqoo'],
    packagePatterns: ['com.vivo.contacts', 'com.android.contacts'],
    description: 'Vivo设备，OriginOS系统'
  },
  SAMSUNG: {
    id: 'SAMSUNG',
    displayName: '三星',
    englishName: 'Samsung',
    brandIdentifiers: ['samsung', '三星'],
    packagePatterns: ['com.samsung.android.app.contacts', 'com.android.contacts'],
    description: '三星设备，One UI系统'
  },
  GOOGLE: {
    id: 'GOOGLE',
    displayName: '谷歌',
    englishName: 'Google',
    brandIdentifiers: ['google', 'pixel'],
    packagePatterns: ['com.google.android.contacts', 'com.android.contacts'],
    description: '谷歌设备，原生Android系统'
  },
  OTHER: {
    id: 'OTHER',
    displayName: '其他',
    englishName: 'Other',
    brandIdentifiers: [],
    packagePatterns: ['com.android.contacts'],
    description: '其他品牌设备，使用通用策略'
  }
};

/**
 * 根据品牌ID获取配置
 */
export function getBrandConfig(brandId: string): DeviceBrandConfig | undefined {
  return DEVICE_BRAND_CONFIGS[brandId];
}

/**
 * 获取品牌显示名称
 */
export function getBrandDisplayName(brandId: string): string {
  const config = getBrandConfig(brandId);
  return config?.displayName || brandId;
}

/**
 * 获取所有品牌配置
 */
export function getAllBrandConfigs(): DeviceBrandConfig[] {
  return Object.values(DEVICE_BRAND_CONFIGS);
}

/**
 * 根据设备属性匹配品牌
 */
export function matchDeviceBrand(deviceInfo: {
  manufacturer?: string;
  brand?: string;
  model?: string;
  product?: string;
}): string {
  const searchText = [
    deviceInfo.manufacturer,
    deviceInfo.brand,
    deviceInfo.model,
    deviceInfo.product
  ].filter(Boolean).join(' ').toLowerCase();

  for (const config of getAllBrandConfigs()) {
    for (const identifier of config.brandIdentifiers) {
      if (searchText.includes(identifier.toLowerCase())) {
        return config.id;
      }
    }
  }

  return 'OTHER';
}