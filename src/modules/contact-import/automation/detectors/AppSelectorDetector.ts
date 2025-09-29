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
    // 最通用的匹配方式：分步查找并提取信息
    console.log(`🔍 AppSelector: 查找"仅此一次"按钮...`);
    
    // 第一步：找到包含目标resource-id和text的node
    const nodePattern = `<node[^>]*resource-id="${this.config.onceButtonId}"[^>]*text="仅此一次"[^>]*>`;
    const altNodePattern = `<node[^>]*text="仅此一次"[^>]*resource-id="${this.config.onceButtonId}"[^>]*>`;
    
    let nodeMatch = xmlContent.match(new RegExp(nodePattern, 'i'));
    if (!nodeMatch) {
      nodeMatch = xmlContent.match(new RegExp(altNodePattern, 'i'));
    }
    
    if (!nodeMatch) {
      console.log(`❌ AppSelector: 未找到匹配的节点`);
      return null;
    }
    
    const fullNode = nodeMatch[0];
    console.log(`✅ AppSelector: 找到节点: ${fullNode.substring(0, 100)}...`);
    
    // 第二步：从找到的节点中提取各个属性
    const boundsMatch = fullNode.match(/bounds="([^"]*)"/i);
    const classMatch = fullNode.match(/class="([^"]*)"/i);
    const clickableMatch = fullNode.match(/clickable="([^"]*)"/i);
    
    if (!boundsMatch) {
      console.log(`❌ AppSelector: 未找到bounds属性`);
      return null;
    }
    
    if (!clickableMatch || clickableMatch[1] !== 'true') {
      console.log(`❌ AppSelector: 按钮不可点击`);
      return null;
    }
    
    const result = {
      resourceId: this.config.onceButtonId,
      text: "仅此一次",
      bounds: boundsMatch[1],
      className: classMatch ? classMatch[1] : "android.widget.Button",
      clickable: true
    };
    
    console.log(`✅ AppSelector: 成功提取按钮信息:`, result);
    return result;
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