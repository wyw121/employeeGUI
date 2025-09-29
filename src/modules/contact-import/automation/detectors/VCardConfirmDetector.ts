import { DialogType, DialogDetectionResult, VCardConfirmDialog, ElementMatch } from '../types/DialogTypes';

/**
 * vCard确认对话框检测器
 * 
 * 专门检测"是否从vCard导入联系人？"对话框
 * 基于XML分析: ui_dump_...090516.xml
 */
export class VCardConfirmDetector {
  private config: VCardConfirmDialog;

  constructor(config: VCardConfirmDialog) {
    this.config = config;
  }

  /**
   * 检测XML中是否存在vCard确认对话框
   */
  public detect(xmlContent: string): DialogDetectionResult {
    try {
      // 1. 检测包名特征
      const hasCorrectPackage = xmlContent.includes(`package="${this.config.package}"`);
      if (!hasCorrectPackage) {
        return this.createNegativeResult('Package not matched');
      }

      // 2. 检测关键消息文本（不区分大小写）
      const hasVCardMessage = this.detectVCardMessage(xmlContent);
      if (!hasVCardMessage) {
        return this.createNegativeResult('vCard message not found');
      }

      // 3. 检测确定按钮
      const confirmButton = this.extractConfirmButton(xmlContent);
      if (!confirmButton) {
        return this.createNegativeResult('Confirm button not found');
      }

      // 4. 检测取消按钮存在性（验证对话框完整性）
      const hasCancelButton = xmlContent.includes(`resource-id="${this.config.cancelButtonId}"`);
      if (!hasCancelButton) {
        return this.createNegativeResult('Cancel button not found - dialog incomplete');
      }

      return {
        detected: true,
        type: DialogType.VCARD_CONFIRM,
        targetElement: confirmButton,
        confidence: 0.95,
        message: 'vCard confirmation dialog detected successfully'
      };

    } catch (error) {
      return this.createNegativeResult(`Detection error: ${error}`);
    }
  }

  /**
   * 检测vCard相关消息文本（模糊匹配，不区分大小写）
   */
  private detectVCardMessage(xmlContent: string): boolean {
    const vCardKeywords = [
      'vcard',
      'vCard', 
      'VCard',
      'VCARD',
      '导入联系人',
      '导入通讯录'
    ];

    const lowerXml = xmlContent.toLowerCase();
    return vCardKeywords.some(keyword => 
      lowerXml.includes(keyword.toLowerCase())
    );
  }

  /**
   * 提取确定按钮元素信息
   */
  private extractConfirmButton(xmlContent: string): ElementMatch | null {
    // 匹配确定按钮节点
    const buttonRegex = new RegExp(
      `<node[^>]*resource-id="${this.config.confirmButtonId}"[^>]*text="确定"[^>]*bounds="([^"]*)"[^>]*class="([^"]*)"[^>]*clickable="true"[^>]*>`,
      'i'
    );

    const match = xmlContent.match(buttonRegex);
    if (!match) return null;

    return {
      resourceId: this.config.confirmButtonId,
      text: "确定",
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
      type: DialogType.VCARD_CONFIRM,
      confidence: 0,
      message: reason
    };
  }

  /**
   * 验证检测器配置的有效性
   */
  public validateConfig(): boolean {
    return !!(
      this.config.messageText &&
      this.config.package &&
      this.config.confirmButtonId &&
      this.config.cancelButtonId &&
      this.config.targetButtonText
    );
  }
}
