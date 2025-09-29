import { ImportStrategy, VCardVersion, ImportTriggerMethod, DeviceManufacturer } from './types';
import { HONOR_STRATEGIES, HONOR_STRATEGY_PRIORITY } from './config/honorStrategies';
import { XIAOMI_STRATEGIES, XIAOMI_STRATEGY_PRIORITY } from './config/xiaomiStrategies';
import { GENERIC_STRATEGIES, GENERIC_STRATEGY_PRIORITY } from './config/genericStrategies';

/**
 * 预定义的导入策略配置
 * 基于实际测试结果，按品牌分类管理
 * 
 * 特性：
 * - ✅ 模块化策略配置，易于维护
 * - ✅ 基于品牌的策略推荐
 * - ✅ 成功率和优先级管理
 * - ✅ 详细的测试数据记录
 */

export const IMPORT_STRATEGIES: ImportStrategy[] = [
  ...HONOR_STRATEGIES,
  ...XIAOMI_STRATEGIES,
  ...GENERIC_STRATEGIES
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
      const aScore = (successRateOrder[a.successRate] || 0) * 10 +
                    (a.testedDevices.length > 0 ? 5 : 0) +
                    (a.triggerMethod === ImportTriggerMethod.DIRECT_ACTIVITY ? 2 : 0);
      const bScore = (successRateOrder[b.successRate] || 0) * 10 +
                    (b.testedDevices.length > 0 ? 5 : 0) +
                    (b.triggerMethod === ImportTriggerMethod.DIRECT_ACTIVITY ? 2 : 0);
      return bScore - aScore;
    });
}

/**
 * 检测设备制造商
 */
function detectManufacturer(manufacturerStr?: string): DeviceManufacturer {
  if (!manufacturerStr) return DeviceManufacturer.OTHER;
  
  const lower = manufacturerStr.toLowerCase();
  if (lower.includes('honor') || lower.includes('hihonor')) return DeviceManufacturer.HONOR;
  if (lower.includes('huawei')) return DeviceManufacturer.HUAWEI;
  if (lower.includes('xiaomi') || lower.includes('redmi')) return DeviceManufacturer.XIAOMI;
  if (lower.includes('oppo')) return DeviceManufacturer.OPPO;
  if (lower.includes('vivo') || lower.includes('iqoo')) return DeviceManufacturer.VIVO;
  if (lower.includes('samsung')) return DeviceManufacturer.SAMSUNG;
  if (lower.includes('google') || lower.includes('pixel')) return DeviceManufacturer.GOOGLE;
  
  return DeviceManufacturer.OTHER;
}

/**
 * 获取所有可用策略
 */
export function getAllStrategies(): ImportStrategy[] {
  return IMPORT_STRATEGIES;
}

/**
 * 根据制造商获取策略
 */
export function getStrategiesByManufacturer(manufacturer: DeviceManufacturer): ImportStrategy[] {
  return IMPORT_STRATEGIES.filter(strategy => strategy.manufacturer === manufacturer);
}

/**
 * 导出制造商检测函数
 */
export { detectManufacturer };