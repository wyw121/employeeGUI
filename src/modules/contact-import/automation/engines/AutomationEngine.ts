import { 
  DialogDetectionConfig, 
  DialogDetectionResult, 
  AutomationResult,
  ClickResult,
  DialogType,
  DEFAULT_DIALOG_CONFIG 
} from '../types/DialogTypes';
import { DialogDetectorFactory } from '../detectors/DialogDetectorFactory';
import { ParallelClickHandler } from '../handlers/ParallelClickHandler';
import invokeCompat from '../../../../api/core/tauriInvoke';

/**
 * 联系人导入自动化执行引擎
 * 
 * 统一协调对话框检测、点击处理和结果汇总
 */
export class AutomationEngine {
  private config: DialogDetectionConfig;
  private detectorFactory: DialogDetectorFactory;
  private clickHandler: ParallelClickHandler;
  private deviceId: string;

  constructor(deviceId: string, config?: Partial<DialogDetectionConfig>) {
    this.deviceId = deviceId;
    this.config = { ...DEFAULT_DIALOG_CONFIG, ...config };
    this.detectorFactory = new DialogDetectorFactory(this.config);
    this.clickHandler = new ParallelClickHandler(
      this.config.timeout,
      undefined // 使用默认重试处理器
    );
  }

  /**
   * 执行完整的对话框自动化处理流程
   */
  public async executeAutomation(): Promise<AutomationResult> {
    const startTime = Date.now();
    const completedDialogs: ClickResult[] = [];
    let totalAttempts = 0;
    let vCardConfirmed = false;

    try {
      // 验证检测器配置
      const validation = this.detectorFactory.validateAllDetectors();
      if (!validation.valid) {
        throw new Error(`Detector validation failed: ${validation.errors.join(', ')}`);
      }

      // 并行执行检测和点击循环
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        totalAttempts++;
        
        // 抓取当前页面XML
        const xmlContent = await this.capturePageXml();
        if (!xmlContent) {
          await this.sleep(this.config.retryInterval);
          continue;
        }

        // 检测所有可能的对话框
        const detections = await this.detectAllDialogs(xmlContent);
        
        if (detections.length === 0) {
          await this.sleep(this.config.retryInterval);
          continue;
        }

        // 准备并行点击操作
        const clickOperations = await this.prepareClickOperations(detections);
        
        if (clickOperations.length > 0) {
          // 执行并行点击
          const clickResults = await this.clickHandler.executeParallelClicks(clickOperations);
          completedDialogs.push(...clickResults);

          // 检查是否成功点击了vCard确定按钮
          const vCardSuccess = clickResults.some(
            result => result.success && result.dialogType === DialogType.VCARD_CONFIRM
          );
          if (vCardSuccess) {
            vCardConfirmed = true;
          }

          // 如果已经成功处理了vCard确认，可以提前结束
          if (vCardConfirmed) {
            break;
          }
        }

        await this.sleep(this.config.retryInterval);
      }

      return {
        success: vCardConfirmed,
        completedDialogs,
        totalAttempts,
        duration: Date.now() - startTime,
        vCardConfirmed,
        message: vCardConfirmed 
          ? '联系人导入对话框处理成功，vCard已确认导入'
          : '未能成功处理vCard确认对话框，可能需要手动操作'
      };

    } catch (error) {
      return {
        success: false,
        completedDialogs,
        totalAttempts,
        duration: Date.now() - startTime,
        vCardConfirmed: false,
        message: `自动化执行失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 抓取当前页面XML内容
   */
  private async capturePageXml(): Promise<string | null> {
    try {
      const result = await invokeCompat<string>('adb_dump_ui_xml', {
        deviceId: this.deviceId
      });
      return result || null;
    } catch (error) {
      console.warn(`Failed to capture XML: ${error}`);
      return null;
    }
  }

  /**
   * 检测所有可能的对话框
   */
  private async detectAllDialogs(xmlContent: string): Promise<DialogDetectionResult[]> {
    const detections: DialogDetectionResult[] = [];

    try {
      // 检测应用选择器对话框
      const appSelectorResult = this.detectorFactory
        .getAppSelectorDetector()
        .detect(xmlContent);
      
      if (appSelectorResult.detected) {
        detections.push(appSelectorResult);
      }

      // 检测vCard确认对话框
      const vCardResult = this.detectorFactory
        .getVCardConfirmDetector()
        .detect(xmlContent);
      
      if (vCardResult.detected) {
        detections.push(vCardResult);
      }

    } catch (error) {
      console.error(`Dialog detection error: ${error}`);
    }

    return detections;
  }

  /**
   * 准备并行点击操作
   */
  private async prepareClickOperations(
    detections: DialogDetectionResult[]
  ): Promise<Array<{
    dialogType: DialogType;
    elementMatch: any;
    deviceId: string;
    operation: () => Promise<boolean>;
  }>> {
    const operations = [];

    for (const detection of detections) {
      if (!detection.targetElement) continue;

      operations.push({
        dialogType: detection.type,
        elementMatch: detection.targetElement,
        deviceId: this.deviceId,
        operation: () => this.performElementClick(detection.targetElement!)
      });
    }

    return operations;
  }

  /**
   * 执行元素点击操作
   */
  private async performElementClick(elementMatch: any): Promise<boolean> {
    try {
      // 通过resource-id点击
      if (elementMatch.resourceId) {
        const result = await invokeCompat('adb_click_element', {
          deviceId: this.deviceId,
          resourceId: elementMatch.resourceId
        });
        return result === true;
      }

      // 通过坐标点击（备用方案）
      if (elementMatch.bounds) {
        const bounds = this.parseBounds(elementMatch.bounds);
        if (bounds) {
          const result = await invokeCompat('adb_tap_coordinate', {
            deviceId: this.deviceId,
            x: bounds.centerX,
            y: bounds.centerY
          });
          return result === true;
        }
      }

      return false;
    } catch (error) {
      console.error(`Click operation failed: ${error}`);
      return false;
    }
  }

  /**
   * 解析bounds字符串为坐标对象
   */
  private parseBounds(bounds: string): { centerX: number; centerY: number } | null {
    try {
      // bounds格式: "[left,top][right,bottom]"
      const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!match) return null;

      const left = parseInt(match[1]);
      const top = parseInt(match[2]);
      const right = parseInt(match[3]);
      const bottom = parseInt(match[4]);

      return {
        centerX: Math.floor((left + right) / 2),
        centerY: Math.floor((top + bottom) / 2)
      };
    } catch {
      return null;
    }
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重新配置自动化引擎
   */
  public reconfigure(newConfig: Partial<DialogDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detectorFactory.reconfigure(this.config);
    this.clickHandler.setTimeout(this.config.timeout);
  }

  /**
   * 获取当前配置
   */
  public getConfig(): DialogDetectionConfig {
    return { ...this.config };
  }
}