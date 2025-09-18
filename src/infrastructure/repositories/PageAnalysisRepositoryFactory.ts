/**
 * 页面分析仓储工厂
 * 负责创建和提供页面分析相关的仓储实例
 */

import { 
  TauriPageAnalysisRepository, 
  TauriDeviceUIStateRepository 
} from './TauriPageAnalysisRepository';
import { 
  IPageAnalysisRepository,
  IDeviceUIStateRepository,
} from '../../domain/page-analysis/repositories/IPageAnalysisRepository';

/**
 * 页面分析仓储工厂
 */
export class PageAnalysisRepositoryFactory {
  private static pageAnalysisRepository: IPageAnalysisRepository;
  private static deviceUIStateRepository: IDeviceUIStateRepository;

  /**
   * 获取页面分析仓储实例
   */
  static getPageAnalysisRepository(): IPageAnalysisRepository {
    if (!this.pageAnalysisRepository) {
      this.pageAnalysisRepository = new TauriPageAnalysisRepository();
    }
    return this.pageAnalysisRepository;
  }

  /**
   * 获取设备UI状态仓储实例
   */
  static getDeviceUIStateRepository(): IDeviceUIStateRepository {
    if (!this.deviceUIStateRepository) {
      this.deviceUIStateRepository = new TauriDeviceUIStateRepository();
    }
    return this.deviceUIStateRepository;
  }

  /**
   * 重置所有仓储实例（主要用于测试）
   */
  static reset(): void {
    this.pageAnalysisRepository = null;
    this.deviceUIStateRepository = null;
  }
}