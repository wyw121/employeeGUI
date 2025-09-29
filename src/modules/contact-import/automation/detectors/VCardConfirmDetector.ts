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
    // 最通用的匹配方式：分步查找并提取信息
    console.log(`🔍 VCardConfirm: 查找"确定"按钮...`);
    
    // 第一步：找到包含目标resource-id和text的node  
    const nodePattern = `<node[^>]*resource-id="${this.config.confirmButtonId}"[^>]*text="确定"[^>]*>`;
    const altNodePattern = `<node[^>]*text="确定"[^>]*resource-id="${this.config.confirmButtonId}"[^>]*>`;
    
    let nodeMatch = xmlContent.match(new RegExp(nodePattern, 'i'));
    if (!nodeMatch) {
      nodeMatch = xmlContent.match(new RegExp(altNodePattern, 'i'));
    }
    
    if (!nodeMatch) {
      console.log(`❌ VCardConfirm: 未找到匹配的节点`);
      return null;
    }
    
    const fullNode = nodeMatch[0];
    console.log(`✅ VCardConfirm: 找到节点: ${fullNode.substring(0, 100)}...`);
    
    // 第二步：从找到的节点中提取各个属性
    const boundsMatch = fullNode.match(/bounds="([^"]*)"/i);
    const classMatch = fullNode.match(/class="([^"]*)"/i);
    const clickableMatch = fullNode.match(/clickable="([^"]*)"/i);
    
    if (!boundsMatch) {
      console.log(`❌ VCardConfirm: 未找到bounds属性`);
      return null;
    }
    
    if (!clickableMatch || clickableMatch[1] !== 'true') {
      console.log(`❌ VCardConfirm: 按钮不可点击`);
      return null;
    }
    
    const result = {
      resourceId: this.config.confirmButtonId,
      text: "确定",
      bounds: boundsMatch[1],
      className: classMatch ? classMatch[1] : "android.widget.Button",
      clickable: true
    };
    
    console.log(`✅ VCardConfirm: 成功提取按钮信息:`, result);
    return result;
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
