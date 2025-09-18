/**
 * 页面分析应用服务
 * 协调领域服务和基础设施，提供统一的业务操作接口
 */

import { 
  PageAnalysisEntity,
  PageAnalysisConfig,
  UIElementEntity,
  ElementAction,
  PageAnalysisOrchestrator,
  PageTypeIdentifier,
  ElementClassifier,
  ElementDeduplicationService,
} from '../../domain/page-analysis';

import {
  IPageAnalysisRepository,
  IDeviceUIStateRepository,
  UIActionCommand,
  ActionResult,
} from '../../domain/page-analysis/repositories/IPageAnalysisRepository';

/**
 * 页面分析应用服务
 */
export class PageAnalysisApplicationService {
  private orchestrator: PageAnalysisOrchestrator;

  constructor(
    private pageAnalysisRepository: IPageAnalysisRepository,
    private deviceUIStateRepository: IDeviceUIStateRepository
  ) {
    // 初始化领域服务
    const pageTypeIdentifier = new PageTypeIdentifier();
    const elementClassifier = new ElementClassifier();
    const deduplicationService = new ElementDeduplicationService();
    
    this.orchestrator = new PageAnalysisOrchestrator(
      pageTypeIdentifier,
      elementClassifier,
      deduplicationService
    );
  }

  /**
   * 分析当前页面
   */
  async analyzeCurrentPage(
    deviceId: string, 
    config: PageAnalysisConfig = {}
  ): Promise<PageAnalysisEntity> {
    try {
      // 1. 获取设备当前状态
      const [xmlData, appInfo, screenResolution] = await Promise.all([
        this.deviceUIStateRepository.getCurrentUIXml(deviceId),
        this.deviceUIStateRepository.getCurrentAppInfo(deviceId),
        this.deviceUIStateRepository.getScreenResolution(deviceId),
      ]);

      // 2. 使用领域服务进行分析
      const analysis = await this.orchestrator.orchestrateAnalysis(
        xmlData,
        appInfo.packageName,
        appInfo.activityName,
        screenResolution,
        this.mergeWithDefaultConfig(config)
      );

      // 3. 保存分析结果
      await this.pageAnalysisRepository.save(analysis);

      return analysis;

    } catch (error) {
      console.error('页面分析失败:', error);
      throw new Error(`页面分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取分析历史
   */
  async getAnalysisHistory(deviceId: string, limit: number = 10): Promise<PageAnalysisEntity[]> {
    return this.pageAnalysisRepository.findByDeviceId(deviceId, limit);
  }

  /**
   * 根据ID获取分析结果
   */
  async getAnalysisById(analysisId: string): Promise<PageAnalysisEntity | null> {
    return this.pageAnalysisRepository.findById(analysisId);
  }

  /**
   * 执行元素操作
   */
  async executeElementAction(
    deviceId: string,
    element: UIElementEntity,
    action: ElementAction,
    actionParams?: any
  ): Promise<ActionResult> {
    try {
      const command = this.convertToUIActionCommand(element, action, actionParams);
      const result = await this.deviceUIStateRepository.executeUIAction(deviceId, command);
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '操作执行失败',
        executionTime: 0,
      };
    }
  }

  /**
   * 批量分析多个设备
   */
  async batchAnalyzePages(
    deviceIds: string[], 
    config: PageAnalysisConfig = {}
  ): Promise<Record<string, PageAnalysisEntity | Error>> {
    const results: Record<string, PageAnalysisEntity | Error> = {};

    const promises = deviceIds.map(async (deviceId) => {
      try {
        const analysis = await this.analyzeCurrentPage(deviceId, config);
        results[deviceId] = analysis;
      } catch (error) {
        results[deviceId] = error instanceof Error ? error : new Error('批量分析失败');
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 智能搜索元素
   */
  async searchElements(
    analysisId: string, 
    searchQuery: string
  ): Promise<UIElementEntity[]> {
    const analysis = await this.pageAnalysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('分析结果不存在');
    }

    return analysis.searchElements(searchQuery);
  }

  /**
   * 获取指定类型的元素
   */
  async getElementsByType(
    analysisId: string, 
    elementType: string
  ): Promise<UIElementEntity[]> {
    const analysis = await this.pageAnalysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('分析结果不存在');
    }

    return analysis.getElementsByType(elementType);
  }

  /**
   * 获取页面层次结构
   */
  async getPageHierarchy(analysisId: string) {
    const analysis = await this.pageAnalysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('分析结果不存在');
    }

    return analysis.getElementHierarchy();
  }

  /**
   * 验证元素配置
   */
  async validateElementConfiguration(
    deviceId: string,
    element: UIElementEntity,
    action: ElementAction
  ): Promise<boolean> {
    try {
      // 检查元素是否支持指定操作
      if (!element.supportedActions.includes(action)) {
        return false;
      }

      // 检查设备是否可达
      const appInfo = await this.deviceUIStateRepository.getCurrentAppInfo(deviceId);
      if (!appInfo) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getRepositoryStatistics() {
    return this.pageAnalysisRepository.getStatistics();
  }

  /**
   * 清理过期记录
   */
  async cleanupOldRecords(olderThanDays: number = 7): Promise<number> {
    return this.pageAnalysisRepository.cleanupOldRecords(olderThanDays);
  }

  private mergeWithDefaultConfig(config: PageAnalysisConfig): PageAnalysisConfig {
    return {
      includeNonClickable: config.includeNonClickable ?? false,
      enableDeduplication: config.enableDeduplication ?? true,
      maxElements: config.maxElements ?? 50,
      minSimilarityThreshold: config.minSimilarityThreshold ?? 0.8,
      includeInvisibleElements: config.includeInvisibleElements ?? false,
      elementTypeFilters: config.elementTypeFilters ?? [
        'button', 'edit_text', 'text_view', 'image_view', 'navigation_button'
      ],
      screenshotElements: config.screenshotElements ?? false,
    };
  }

  private convertToUIActionCommand(
    element: UIElementEntity,
    action: ElementAction,
    params?: any
  ): UIActionCommand {
    const centerPoint = element.getCenterPoint();

    switch (action) {
      case ElementAction.CLICK:
        return {
          type: 'click',
          x: centerPoint.x,
          y: centerPoint.y,
        };

      case ElementAction.LONG_CLICK:
        return {
          type: 'long_click',
          x: centerPoint.x,
          y: centerPoint.y,
          duration: params?.duration || 1000,
        };

      case ElementAction.INPUT_TEXT:
        return {
          type: 'input',
          x: centerPoint.x,
          y: centerPoint.y,
          text: params?.text || '',
        };

      case ElementAction.SWIPE_UP:
      case ElementAction.SWIPE_DOWN:
      case ElementAction.SWIPE_LEFT:
      case ElementAction.SWIPE_RIGHT:
        return {
          type: 'swipe',
          x: centerPoint.x,
          y: centerPoint.y,
          direction: action.replace('swipe_', '') as 'up' | 'down' | 'left' | 'right',
        };

      default:
        throw new Error(`不支持的操作类型: ${action}`);
    }
  }
}