import { DialogType, DialogDetectionResult, AppSelectorDialog, ElementMatch } from '../types/DialogTypes';

/**
 * 应用选择器对话框检测器
 * 
 * 专门检测"使用以下方式打开"对话框
 * 基于XML分析: ui_dump_...090341.xml
 */
export class AppSelectorDetector {
  private config: AppSelectorDialog;

  constructor(config: AppSelectorDialog) {
    this.config = config;
  }

  /**
   * 检测XML中是否存在应用选择器对话框
   */
  public detect(xmlContent: string): DialogDetectionResult {
    try {
      // 1. 检测包名特征
      const hasCorrectPackage = xmlContent.includes(`package="${this.config.package}"`);
      if (!hasCorrectPackage) {
        return this.createNegativeResult('Package not matched');
      }

      // 2. 检测标题文本特征
      const hasTitleText = xmlContent.includes(this.config.titleText);
      if (!hasTitleText) {
        return this.createNegativeResult('Title text not found');
      }

      // 3. 检测"仅此一次"按钮
      const onceButton = this.extractOnceButton(xmlContent);
      if (!onceButton) {
        return this.createNegativeResult('Once button not found');
      }

      // 4. 检测"始终"按钮存在性（验证对话框完整性）
      const hasAlwaysButton = xmlContent.includes(`resource-id="${this.config.alwaysButtonId}"`);
      if (!hasAlwaysButton) {
        return this.createNegativeResult('Always button not found - dialog incomplete');
      }

      return {
        detected: true,
        type: DialogType.APP_SELECTOR,
        targetElement: onceButton,
        confidence: 0.95,
        message: 'App selector dialog detected successfully'
      };

    } catch (error) {
      return this.createNegativeResult(`Detection error: ${error}`);
    }
  }

  /**
   * 提取"仅此一次"按钮元素信息
   */
  private extractOnceButton(xmlContent: string): ElementMatch | null {
    // 匹配"仅此一次"按钮节点
    const buttonRegex = new RegExp(
      `<node[^>]*resource-id="${this.config.onceButtonId}"[^>]*text="仅此一次"[^>]*bounds="([^"]*)"[^>]*class="([^"]*)"[^>]*clickable="true"[^>]*>`,
      'i'
    );

    const match = xmlContent.match(buttonRegex);
    if (!match) return null;

    return {
      resourceId: this.config.onceButtonId,
      text: "仅此一次",
      bounds: match[1],
      className: match[2],
      clickable: true
    };
  }

  /**
   * 创建检测失败结果
   */
  private createNegativeResult(reason: string): DialogDetectionResult {
    return {
      detected: false,
      type: DialogType.APP_SELECTOR,
      confidence: 0,
      message: reason
    };
  }

  /**
   * 验证检测器配置的有效性
   */
  public validateConfig(): boolean {
    return !!(
      this.config.titleText &&
      this.config.package &&
      this.config.onceButtonId &&
      this.config.alwaysButtonId &&
      this.config.targetButtonText
    );
  }

  /**
   * 检测是否存在联系人应用图标（额外验证）
   */
  private hasContactsAppIcon(xmlContent: string): boolean {
    const contactsKeywords = [
      '联系人',
      'contacts',
      '通讯录'
    ];

    return contactsKeywords.some(keyword =>
      xmlContent.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}