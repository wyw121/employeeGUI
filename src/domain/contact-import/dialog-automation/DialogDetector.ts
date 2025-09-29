/**
 * 对话框检测器
 * 负责检测和识别联系人导入过程中的各种对话框
 */

import { 
  DialogType, 
  TargetButton, 
  DialogDetectionRule, 
  DialogDetectionResult, 
  ElementPattern,
  UIElement 
} from './types';

export class DialogDetector {
  private detectionRules: DialogDetectionRule[];

  constructor() {
    this.detectionRules = this.initializeDetectionRules();
  }

  /**
   * 初始化检测规则
   */
  private initializeDetectionRules(): DialogDetectionRule[] {
    return [
      // 应用选择对话框规则
      {
        type: DialogType.APP_SELECTION,
        requiredElements: [
          {
            text: ['仅此一次', '始终', '选择应用', '打开方式'],
            textRegex: [/选择.*应用/, /打开方式/, /选择.*程序/]
          }
        ],
        targetButton: TargetButton.JUST_ONCE,
        buttonPattern: {
          text: ['仅此一次', '仅一次', 'Just once'],
          textRegex: [/仅.*一次/, /just.*once/i]
        },
        priority: 1,
        timeout: 3000
      },
      
      // vCard确认对话框规则
      {
        type: DialogType.VCARD_CONFIRMATION,
        requiredElements: [
          {
            text: ['vCard', 'VCARD', 'vcard', 'VCard'],
            textRegex: [/v?card/i, /联系人.*导入/, /导入.*联系人/]
          },
          {
            text: ['确定', '取消', 'OK', 'Cancel'],
            textRegex: [/确定|OK/i, /取消|Cancel/i]
          }
        ],
        targetButton: TargetButton.CONFIRM,
        buttonPattern: {
          text: ['确定', 'OK', '好的', '是'],
          textRegex: [/确定|OK|好的|是/i]
        },
        priority: 2,
        timeout: 5000
      }
    ];
  }

  /**
   * 检测页面中的对话框
   */
  async detectDialog(xmlContent: string): Promise<DialogDetectionResult> {
    const uiElements = this.parseXMLToElements(xmlContent);
    
    // 按优先级排序检测规则
    const sortedRules = this.detectionRules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      const result = await this.checkDialogRule(rule, uiElements);
      if (result.found) {
        return result;
      }
    }

    return {
      found: false,
      confidence: 0,
      message: '未检测到目标对话框'
    };
  }

  /**
   * 检查特定对话框规则
   */
  private async checkDialogRule(
    rule: DialogDetectionRule, 
    elements: UIElement[]
  ): Promise<DialogDetectionResult> {
    let confidence = 0;
    let targetElement: UIElement | undefined;

    // 检查必需元素是否存在
    const requiredMatches = rule.requiredElements.map(pattern => 
      this.findMatchingElements(pattern, elements)
    );

    const allRequiredFound = requiredMatches.every(matches => matches.length > 0);
    
    if (!allRequiredFound) {
      return {
        found: false,
        confidence: 0,
        message: `对话框 ${rule.type} 的必需元素未找到`
      };
    }

    // 查找目标按钮
    const targetButtons = this.findMatchingElements(rule.buttonPattern, elements);
    
    if (targetButtons.length === 0) {
      return {
        found: false,
        confidence: 0.3,
        message: `对话框 ${rule.type} 的目标按钮未找到`
      };
    }

    // 选择最佳匹配的按钮
    targetElement = this.selectBestButton(targetButtons, rule.buttonPattern);
    confidence = this.calculateConfidence(rule, requiredMatches, targetButtons);

    return {
      found: true,
      type: rule.type,
      targetElement,
      confidence,
      message: `检测到 ${rule.type} 对话框，置信度: ${confidence.toFixed(2)}`
    };
  }

  /**
   * 查找匹配指定模式的元素
   */
  private findMatchingElements(pattern: ElementPattern, elements: UIElement[]): UIElement[] {
    return elements.filter(element => {
      // 文本匹配
      if (pattern.text) {
        const textMatch = pattern.text.some(text => 
          element.text.includes(text) || element.contentDesc.includes(text)
        );
        if (textMatch) return true;
      }

      // 正则表达式匹配
      if (pattern.textRegex) {
        const regexMatch = pattern.textRegex.some(regex =>
          regex.test(element.text) || regex.test(element.contentDesc)
        );
        if (regexMatch) return true;
      }

      // 资源ID匹配
      if (pattern.resourceId) {
        const idMatch = pattern.resourceId.some(id => element.resourceId.includes(id));
        if (idMatch) return true;
      }

      // 类名匹配
      if (pattern.className) {
        const classMatch = pattern.className.some(cls => element.className.includes(cls));
        if (classMatch) return true;
      }

      return false;
    });
  }

  /**
   * 选择最佳按钮
   */
  private selectBestButton(buttons: UIElement[], pattern: ElementPattern): UIElement {
    // 优先选择可点击且启用的按钮
    const clickableButtons = buttons.filter(btn => btn.clickable && btn.enabled);
    if (clickableButtons.length > 0) {
      return clickableButtons[0];
    }
    
    return buttons[0];
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    rule: DialogDetectionRule, 
    requiredMatches: UIElement[][], 
    targetButtons: UIElement[]
  ): number {
    let confidence = 0.5; // 基础置信度

    // 必需元素匹配度
    const totalRequiredElements = rule.requiredElements.length;
    const foundRequiredElements = requiredMatches.filter(matches => matches.length > 0).length;
    confidence += (foundRequiredElements / totalRequiredElements) * 0.3;

    // 目标按钮质量
    if (targetButtons.length > 0) {
      const bestButton = targetButtons[0];
      if (bestButton.clickable && bestButton.enabled) {
        confidence += 0.2;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 解析XML内容为UI元素列表
   */
  private parseXMLToElements(xmlContent: string): UIElement[] {
    const elements: UIElement[] = [];
    
    // 使用正则表达式解析node元素（简化版本）
    const nodeRegex = /<node[^>]*>/g;
    let match;

    while ((match = nodeRegex.exec(xmlContent)) !== null) {
      const nodeStr = match[0];
      
      const element: UIElement = {
        text: this.extractAttribute(nodeStr, 'text') || '',
        resourceId: this.extractAttribute(nodeStr, 'resource-id') || '',
        className: this.extractAttribute(nodeStr, 'class') || '',
        contentDesc: this.extractAttribute(nodeStr, 'content-desc') || '',
        bounds: this.extractAttribute(nodeStr, 'bounds') || '',
        clickable: this.extractAttribute(nodeStr, 'clickable') === 'true',
        enabled: this.extractAttribute(nodeStr, 'enabled') === 'true'
      };

      // 过滤掉空的或不重要的元素
      if (element.text || element.contentDesc || element.resourceId) {
        elements.push(element);
      }
    }

    return elements;
  }

  /**
   * 从XML节点字符串中提取属性值
   */
  private extractAttribute(nodeStr: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
    const match = nodeStr.match(regex);
    return match ? match[1] : null;
  }

  /**
   * 获取所有检测规则
   */
  getDetectionRules(): DialogDetectionRule[] {
    return [...this.detectionRules];
  }

  /**
   * 添加自定义检测规则
   */
  addDetectionRule(rule: DialogDetectionRule): void {
    this.detectionRules.push(rule);
  }
}