/**
 * 联系人导入自动化模块统一导出
 * 
 * 提供完整的对话框自动化处理能力
 */

// 类型定义
export type {
  DialogType,
  DialogDetectionResult,
  ElementMatch,
  AppSelectorDialog,
  VCardConfirmDialog,
  DialogDetectionConfig,
  ClickResult,
  AutomationResult
} from './types/DialogTypes';

export { DEFAULT_DIALOG_CONFIG } from './types/DialogTypes';

// 检测器
export { AppSelectorDetector } from './detectors/AppSelectorDetector';
export { VCardConfirmDetector } from './detectors/VCardConfirmDetector';
export { DialogDetectorFactory } from './detectors/DialogDetectorFactory';

// 处理器
export { ParallelClickHandler, RetryHandler } from './handlers/ParallelClickHandler';

// 自动化引擎
export { AutomationEngine } from './engines/AutomationEngine';

// 导入必要类型用于便捷函数
import { DialogDetectionConfig, AutomationResult } from './types/DialogTypes';
import { AutomationEngine } from './engines/AutomationEngine';
import { DialogDetectorFactory } from './detectors/DialogDetectorFactory';

/**
 * 便捷函数：创建并执行联系人导入自动化
 */
export async function executeContactImportAutomation(
  deviceId: string,
  customConfig?: Partial<DialogDetectionConfig>
): Promise<AutomationResult> {
  const engine = new AutomationEngine(deviceId, customConfig);
  return await engine.executeAutomation();
}

/**
 * 便捷函数：验证自动化配置
 */
export function validateAutomationConfig(
  config: DialogDetectionConfig
): { valid: boolean; errors: string[] } {
  const factory = new DialogDetectorFactory(config);
  return factory.validateAllDetectors();
}
