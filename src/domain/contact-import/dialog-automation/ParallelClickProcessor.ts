/**
 * 并行点击处理器
 * 负责并行处理多个对话框的点击操作，支持重试和超时机制
 */

import invokeCompat from '../../../api/core/tauriInvoke';
import { 
  DialogType, 
  ParallelProcessingConfig, 
  AutomationResult, 
  ClickResult,
  DialogDetectionResult,
  UIElement
} from './types';
import { DialogDetector } from './DialogDetector';

export class ParallelClickProcessor {
  private detector: DialogDetector;
  private defaultConfig: ParallelProcessingConfig;

  constructor() {
    this.detector = new DialogDetector();
    this.defaultConfig = {
      maxConcurrentTasks: 2,
      retryAttempts: 3,
      retryDelay: 500,
      totalTimeout: 15000,
      successCondition: 'any',
      requiredSuccessTypes: [DialogType.VCARD_CONFIRMATION] // 必须成功处理vCard对话框
    };
  }

  /**
   * 并行处理联系人导入对话框
   */
  async processContactImportDialogs(
    deviceId: string,
    config?: Partial<ParallelProcessingConfig>
  ): Promise<AutomationResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    
    console.log(`🔄 开始并行处理对话框 (设备: ${deviceId})`);

    try {
      // 创建并行处理任务
      const tasks = [
        this.createDialogProcessingTask(deviceId, DialogType.APP_SELECTION, finalConfig),
        this.createDialogProcessingTask(deviceId, DialogType.VCARD_CONFIRMATION, finalConfig)
      ];

      // 执行并行任务
      const results = await Promise.allSettled(
        tasks.map(task => this.executeWithTimeout(task, finalConfig.totalTimeout))
      );

      // 分析结果
      const clickResults: ClickResult[] = [];
      const processedDialogs: DialogType[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          clickResults.push(result.value);
          if (result.value.success) {
            processedDialogs.push(index === 0 ? DialogType.APP_SELECTION : DialogType.VCARD_CONFIRMATION);
          }
        } else if (result.status === 'rejected') {
          clickResults.push({
            success: false,
            error: String(result.reason),
            timestamp: Date.now()
          });
        }
      });

      const success = this.evaluateSuccess(processedDialogs, finalConfig);
      const totalTime = Date.now() - startTime;

      const automationResult: AutomationResult = {
        success,
        processedDialogs,
        clickResults,
        totalTime,
        error: success ? undefined : this.generateErrorMessage(clickResults, finalConfig)
      };

      console.log(`✅ 对话框处理完成: 成功=${success}, 耗时=${totalTime}ms`);
      return automationResult;

    } catch (error) {
      console.error('❌ 并行对话框处理失败:', error);
      return {
        success: false,
        processedDialogs: [],
        clickResults: [],
        totalTime: Date.now() - startTime,
        error: `并行处理异常: ${String(error)}`
      };
    }
  }

  /**
   * 创建对话框处理任务
   */
  private createDialogProcessingTask(
    deviceId: string,
    dialogType: DialogType,
    config: ParallelProcessingConfig
  ) {
    return async (): Promise<ClickResult> => {
      console.log(`🔍 开始处理 ${dialogType} 对话框`);

      for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
          // 1. 获取当前页面UI
          const xmlContent = await this.captureUI(deviceId);
          
          // 2. 检测目标对话框
          const detection = await this.detector.detectDialog(xmlContent);
          
          if (!detection.found || detection.type !== dialogType) {
            console.log(`⏰ ${dialogType} 对话框未检测到 (尝试 ${attempt}/${config.retryAttempts})`);
            
            if (attempt < config.retryAttempts) {
              await this.delay(config.retryDelay);
              continue;
            } else {
              return {
                success: false,
                error: `未检测到 ${dialogType} 对话框`,
                timestamp: Date.now()
              };
            }
          }

          // 3. 执行点击操作
          const clickResult = await this.performClick(deviceId, detection.targetElement!);
          
          if (clickResult.success) {
            console.log(`✅ ${dialogType} 对话框处理成功`);
            return clickResult;
          } else {
            console.log(`❌ ${dialogType} 点击失败 (尝试 ${attempt}/${config.retryAttempts})`);
            if (attempt < config.retryAttempts) {
              await this.delay(config.retryDelay);
            }
          }

        } catch (error) {
          console.error(`❌ 处理 ${dialogType} 异常:`, error);
          if (attempt === config.retryAttempts) {
            return {
              success: false,
              error: `处理 ${dialogType} 异常: ${String(error)}`,
              timestamp: Date.now()
            };
          }
          await this.delay(config.retryDelay);
        }
      }

      return {
        success: false,
        error: `${dialogType} 处理失败，已用尽所有重试次数`,
        timestamp: Date.now()
      };
    };
  }

  /**
   * 捕获设备UI界面
   */
  private async captureUI(deviceId: string): Promise<string> {
    try {
      const result = await invokeCompat('fast_ui_dump', { deviceId }) as any;
      return result?.xmlContent || '';
    } catch (error) {
      console.error('UI捕获失败:', error);
      throw new Error(`UI捕获失败: ${String(error)}`);
    }
  }

  /**
   * 执行点击操作
   */
  private async performClick(deviceId: string, element: UIElement): Promise<ClickResult> {
    try {
      // 优先使用bounds坐标点击
      if (element.bounds) {
        const coords = this.parseBounds(element.bounds);
        if (coords) {
          const result = await invokeCompat('adb_tap', {
            deviceId,
            x: coords.centerX,
            y: coords.centerY
          }) as any;

          return {
            success: result?.success || false,
            element,
            error: result?.success ? undefined : result?.message,
            timestamp: Date.now()
          };
        }
      }

      // 备选方案：使用文本点击
      if (element.text) {
        const result = await invokeCompat('adb_tap_by_text', {
          deviceId,
          text: element.text
        }) as any;

        return {
          success: result?.success || false,
          element,
          error: result?.success ? undefined : result?.message,
          timestamp: Date.now()
        };
      }

      throw new Error('无法确定点击目标');

    } catch (error) {
      return {
        success: false,
        element,
        error: `点击操作失败: ${String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 解析bounds坐标
   */
  private parseBounds(bounds: string): { centerX: number; centerY: number } | null {
    try {
      // bounds格式: [left,top][right,bottom]
      const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (match) {
        const [, left, top, right, bottom] = match.map(Number);
        return {
          centerX: Math.round((left + right) / 2),
          centerY: Math.round((top + bottom) / 2)
        };
      }
    } catch (error) {
      console.error('bounds解析失败:', error);
    }
    return null;
  }

  /**
   * 带超时的任务执行
   */
  private async executeWithTimeout<T>(
    task: () => Promise<T>, 
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`任务超时 (${timeout}ms)`));
      }, timeout);

      task()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 评估处理成功性
   */
  private evaluateSuccess(
    processedDialogs: DialogType[],
    config: ParallelProcessingConfig
  ): boolean {
    switch (config.successCondition) {
      case 'any':
        return processedDialogs.length > 0;
      
      case 'all':
        return processedDialogs.length === 2; // 两种对话框都成功
      
      case 'specific':
        return config.requiredSuccessTypes?.every(type => 
          processedDialogs.includes(type)
        ) || false;
      
      default:
        return false;
    }
  }

  /**
   * 生成错误消息
   */
  private generateErrorMessage(
    clickResults: ClickResult[],
    config: ParallelProcessingConfig
  ): string {
    const errors = clickResults
      .filter(result => !result.success)
      .map(result => result.error)
      .filter(Boolean);

    if (errors.length === 0) {
      return '未满足成功条件';
    }

    return `处理失败: ${errors.join('; ')}`;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ParallelProcessingConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ParallelProcessingConfig {
    return { ...this.defaultConfig };
  }
}