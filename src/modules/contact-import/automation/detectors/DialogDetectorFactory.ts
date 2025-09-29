import { DialogDetectionConfig } from '../types/DialogTypes';
import { AppSelectorDetector } from './AppSelectorDetector';
import { VCardConfirmDetector } from './VCardConfirmDetector';

/**
 * 对话框检测器工厂
 * 
 * 负责创建和管理不同类型的对话框检测器实例
 */
export class DialogDetectorFactory {
  private config: DialogDetectionConfig;
  private appSelectorDetector: AppSelectorDetector | null = null;
  private vCardConfirmDetector: VCardConfirmDetector | null = null;

  constructor(config: DialogDetectionConfig) {
    this.config = config;
    this.initializeDetectors();
  }

  /**
   * 初始化所有检测器实例
   */
  private initializeDetectors(): void {
    try {
      this.appSelectorDetector = new AppSelectorDetector(this.config.appSelector);
      this.vCardConfirmDetector = new VCardConfirmDetector(this.config.vCardConfirm);
    } catch (error) {
      throw new Error(`Failed to initialize detectors: ${error}`);
    }
  }

  /**
   * 获取应用选择器检测器
   */
  public getAppSelectorDetector(): AppSelectorDetector {
    if (!this.appSelectorDetector) {
      throw new Error('App selector detector not initialized');
    }
    return this.appSelectorDetector;
  }

  /**
   * 获取vCard确认检测器
   */
  public getVCardConfirmDetector(): VCardConfirmDetector {
    if (!this.vCardConfirmDetector) {
      throw new Error('vCard confirm detector not initialized');
    }
    return this.vCardConfirmDetector;
  }

  /**
   * 验证所有检测器配置
   */
  public validateAllDetectors(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.appSelectorDetector?.validateConfig()) {
      errors.push('App selector detector configuration invalid');
    }

    if (!this.vCardConfirmDetector?.validateConfig()) {
      errors.push('vCard confirm detector configuration invalid');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 重新配置检测器工厂
   */
  public reconfigure(newConfig: DialogDetectionConfig): void {
    this.config = newConfig;
    this.initializeDetectors();
  }

  /**
   * 获取当前配置
   */
  public getConfig(): DialogDetectionConfig {
    return { ...this.config }; // 返回配置副本
  }
}