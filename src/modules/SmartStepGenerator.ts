/**
 * 智能步骤生成器模块
 * 根据元素分析结果生成合理的步骤名称和描述
 */

interface UIElement {
  id?: string;
  text?: string;
  element_type?: string;
  resource_id?: string;
  content_desc?: string;
  smartDescription?: string;
  smartAnalysis?: any;
}

interface StepInfo {
  name: string;
  description: string;
  searchCriteria: string;
}

/**
 * 智能步骤生成器类
 */
export class SmartStepGenerator {
  
  /**
   * 从智能分析描述中提取关键信息
   */
  private static extractKeyInfo(smartDescription: string): {
    appName?: string;
    pageName?: string;
    elementName?: string;
    action?: string;
    confidence?: number;
  } {
    const info: any = {};
    
    // 提取应用名称
    const appMatch = smartDescription.match(/应用[：:]\s*([^\s📱💡]+)/);
    if (appMatch) {
      info.appName = appMatch[1];
    }
    
    // 提取页面名称
    const pageMatch = smartDescription.match(/🏠\s*([^📱💡\s]+)/);
    if (pageMatch) {
      info.pageName = pageMatch[1].trim();
    }
    
    // 提取元素名称（从位置描述中）
    const elementMatch = smartDescription.match(/[""]([^""]+)[""]按钮|位于[^的]*的[""]([^""]+)[""]|点击[""]([^""]+)[""]/) || 
                        smartDescription.match(/"([^"]+)"按钮|位于[^的]*的"([^"]+)"|点击"([^"]+)"/);
    if (elementMatch) {
      info.elementName = elementMatch[1] || elementMatch[2] || elementMatch[3];
    }
    
    // 提取置信度
    const confidenceMatch = smartDescription.match(/置信度[：:]?\s*(\d+)%/);
    if (confidenceMatch) {
      info.confidence = parseInt(confidenceMatch[1]);
    }
    
    // 推断操作类型
    if (smartDescription.includes('点击') || smartDescription.includes('跳转')) {
      info.action = '点击';
    } else if (smartDescription.includes('输入') || smartDescription.includes('填写')) {
      info.action = '输入';
    } else if (smartDescription.includes('滑动') || smartDescription.includes('滚动')) {
      info.action = '滑动';
    } else {
      info.action = '操作';
    }
    
    return info;
  }

  /**
   * 生成简洁的步骤名称
   */
  private static generateStepName(element: UIElement, keyInfo: any): string {
    // 优先级: 智能分析结果 > 元素文本 > 元素类型
    
    // 1. 如果有智能分析结果，提取关键信息
    if (keyInfo.elementName && keyInfo.appName) {
      return `${keyInfo.action}${keyInfo.appName}${keyInfo.elementName}`;
    }
    
    // 2. 如果有元素文本，使用简洁描述
    if (element.text?.trim()) {
      const action = keyInfo.action || '点击';
      return `${action}"${element.text.trim()}"`;
    }
    
    // 3. 使用内容描述
    if (element.content_desc?.trim()) {
      const action = keyInfo.action || '点击';
      return `${action}"${element.content_desc.trim()}"`;
    }
    
    // 4. 根据元素类型生成通用名称
    const elementType = element.element_type || '元素';
    const action = keyInfo.action || '操作';
    
    if (elementType.includes('Button')) {
      return `${action}按钮`;
    } else if (elementType.includes('Text')) {
      return `${action}文本`;
    } else if (elementType.includes('Edit')) {
      return '输入文字';
    } else if (elementType.includes('Image')) {
      return `${action}图片`;
    } else {
      return `${action}${elementType}`;
    }
  }

  /**
   * 生成用户友好的步骤描述
   */
  private static generateStepDescription(element: UIElement, keyInfo: any): string {
    const smartDescription = element.smartDescription;
    
    // 如果没有智能分析结果，使用简单描述
    if (!smartDescription) {
      const elementDesc = element.text || element.element_type || '元素';
      return `自动查找并点击"${elementDesc}"元素`;
    }
    
    // 从智能分析结果中提取有用信息，重新组织
    let description = '';
    
    // 1. 操作说明（主要部分）
    if (keyInfo.appName && keyInfo.elementName) {
      description += `在${keyInfo.appName}中${keyInfo.action}"${keyInfo.elementName}"`;
    } else if (element.text) {
      description += `${keyInfo.action || '点击'}"${element.text}"`;
    } else {
      description += `${keyInfo.action || '操作'}目标元素`;
    }
    
    // 2. 功能说明（如果有）
    const functionMatch = smartDescription.match(/💡\s*功能说明[：:]([^📍🎯✅🔍]+)/);
    if (functionMatch) {
      const functionDesc = functionMatch[1].trim();
      description += `\n功能：${functionDesc}`;
    }
    
    // 3. 位置信息（简化版）
    const locationMatch = smartDescription.match(/📍\s*元素位置[：:]([^✅🔍]+)/);
    if (locationMatch) {
      const locationDesc = locationMatch[1].trim();
      // 简化位置描述
      const simplifiedLocation = locationDesc
        .replace(/位于[^的]*的/g, '')
        .replace(/，[^，]*导航入口/g, '')
        .trim();
      
      if (simplifiedLocation.length < 50) {
        description += `\n位置：${simplifiedLocation}`;
      }
    }
    
    // 4. 置信度（如果很高才显示）
    if (keyInfo.confidence && keyInfo.confidence >= 95) {
      description += `\n(识别置信度: ${keyInfo.confidence}%)`;
    }
    
    return description;
  }

  /**
   * 生成搜索条件
   */
  private static generateSearchCriteria(element: UIElement): string {
    let criteria = '';
    
    if (element.text?.trim()) {
      criteria += `文本: "${element.text.trim()}"`;
    }
    
    if (element.element_type) {
      criteria += criteria ? ` | 类型: ${element.element_type}` : `类型: ${element.element_type}`;
    }
    
    if (element.resource_id) {
      criteria += criteria ? ` | ID: ${element.resource_id}` : `ID: ${element.resource_id}`;
    }
    
    if (element.content_desc?.trim()) {
      criteria += criteria ? ` | 描述: ${element.content_desc.trim()}` : `描述: ${element.content_desc.trim()}`;
    }
    
    return criteria || '自动识别元素特征';
  }

  /**
   * 主要接口：生成智能步骤信息
   */
  static generateStepInfo(element: UIElement): StepInfo {
    console.log('🤖 开始生成智能步骤信息:', element);
    
    // 提取关键信息
    const keyInfo = this.extractKeyInfo(element.smartDescription || '');
    console.log('🔍 提取的关键信息:', keyInfo);
    
    // 生成步骤信息
    const stepInfo: StepInfo = {
      name: this.generateStepName(element, keyInfo),
      description: this.generateStepDescription(element, keyInfo),
      searchCriteria: this.generateSearchCriteria(element)
    };
    
    console.log('✨ 生成的步骤信息:', stepInfo);
    
    return stepInfo;
  }

  /**
   * 预览生成结果（用于调试）
   */
  static previewStepInfo(element: UIElement): void {
    const stepInfo = this.generateStepInfo(element);
    
    console.group('📋 智能步骤生成预览');
    console.log('🏷️  步骤名称:', stepInfo.name);
    console.log('📝 步骤描述:', stepInfo.description);
    console.log('🔍 搜索条件:', stepInfo.searchCriteria);
    console.log('🎯 原始元素:', element);
    console.groupEnd();
  }
}

/**
 * 便捷函数：快速生成步骤信息
 */
export const generateSmartStep = (element: UIElement): StepInfo => {
  return SmartStepGenerator.generateStepInfo(element);
};

/**
 * 便捷函数：预览步骤信息
 */
export const previewSmartStep = (element: UIElement): void => {
  SmartStepGenerator.previewStepInfo(element);
};

export default SmartStepGenerator;