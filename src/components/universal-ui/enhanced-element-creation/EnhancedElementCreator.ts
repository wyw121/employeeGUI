/**
 * 增强元素创建器
 * 在用户选择UI元素时，创建包含完整XML上下文信息的增强元素
 */

import { UIElement } from '../../../api/universalUIAPI';
import { VisualUIElement } from '../xml-parser/types';
import { 
  EnhancedUIElement,
  XmlContextInfo,
  XmlNodePath,
  XmlNodeDetails,
  XmlNodeSummary,
  SmartAnalysisResult
} from '../../../modules/enhanced-element-info/types';
import { 
  UniversalElementAnalyzer,
  ElementAnalysisResult
} from '../UniversalElementAnalyzer';
import { ElementContextCreator } from '../data-transform/ElementContextCreator';

export interface EnhancedElementCreationOptions {
  /** 完整的XML源码内容 */
  xmlContent: string;
  /** 设备信息 */
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    resolution: { width: number; height: number };
  };
  /** XML缓存ID */
  xmlCacheId?: string;
  /** 应用包名 */
  packageName?: string;
  /** 页面信息 */
  pageInfo?: {
    appName: string;
    pageName: string;
  };
  /** 是否启用智能分析 */
  enableSmartAnalysis?: boolean;
}

export class EnhancedElementCreator {

  /**
   * 从UIElement创建增强元素信息
   * @param element 基础UI元素
   * @param options 创建选项
   * @returns 增强的UI元素
   */
  static async createEnhancedElement(
    element: UIElement,
    options: EnhancedElementCreationOptions
  ): Promise<EnhancedUIElement> {
    
    console.log('🎯 开始创建增强元素信息:', {
      elementId: element.id,
      elementText: element.text,
      xmlContentLength: options.xmlContent?.length || 0,
      xmlCacheId: options.xmlCacheId
    });

    // 1. 创建XML上下文信息
    const xmlContext = this.createXmlContext(element, options);

    // 2. 分析节点路径
    const nodePath = this.analyzeNodePath(element, options.xmlContent);

    // 3. 提取节点详细信息
    const nodeDetails = this.extractNodeDetails(element, options.xmlContent);

    // 4. 执行智能分析（可选）
    let smartAnalysis: SmartAnalysisResult | undefined;
    let smartDescription: string | undefined;
    
    if (options.enableSmartAnalysis !== false) {
      try {
        const analysisResult = await this.performSmartAnalysis(element, options);
        smartAnalysis = analysisResult.smartAnalysis;
        smartDescription = analysisResult.smartDescription;
      } catch (error) {
        console.warn('🔥 智能分析失败，跳过:', error);
      }
    }

    // 5. 构建增强元素
    const enhancedElement: EnhancedUIElement = {
      id: element.id,
      text: element.text,
      element_type: element.element_type,
      resource_id: element.resource_id,
      content_desc: element.content_desc,
      xmlContext,
      nodePath,
      nodeDetails,
      smartAnalysis,
      smartDescription,
      generatedAt: Date.now()
    };

    console.log('✅ 增强元素信息创建完成:', {
      elementId: element.id,
      hasXmlContext: !!enhancedElement.xmlContext,
      hasNodePath: !!enhancedElement.nodePath,
      hasNodeDetails: !!enhancedElement.nodeDetails,
      hasSmartAnalysis: !!enhancedElement.smartAnalysis
    });

    return enhancedElement;
  }

  /**
   * 批量创建增强元素
   * @param elements 基础UI元素数组
   * @param options 创建选项
   * @returns 增强的UI元素数组
   */
  static async createEnhancedElementsBatch(
    elements: UIElement[],
    options: EnhancedElementCreationOptions
  ): Promise<EnhancedUIElement[]> {
    
    console.log(`🚀 批量创建增强元素信息: ${elements.length} 个元素`);
    
    const enhancedElements: EnhancedUIElement[] = [];
    
    for (const element of elements) {
      try {
        const enhanced = await this.createEnhancedElement(element, options);
        enhancedElements.push(enhanced);
      } catch (error) {
        console.error(`❌ 创建增强元素失败: ${element.id}`, error);
        // 继续处理其他元素
      }
    }

    console.log(`✅ 批量创建完成: ${enhancedElements.length}/${elements.length} 个成功`);
    return enhancedElements;
  }

  /**
   * 创建XML上下文信息
   * @private
   */
  private static createXmlContext(
    element: UIElement,
    options: EnhancedElementCreationOptions
  ): XmlContextInfo {
    
    return {
      xmlCacheId: options.xmlCacheId || `xml_${Date.now()}`,
      timestamp: Date.now(),
      xmlSourceContent: options.xmlContent,
      deviceInfo: options.deviceInfo,
      packageName: options.packageName || 'unknown.package',
      pageInfo: options.pageInfo || {
        appName: '未知应用',
        pageName: '当前页面'
      }
    };
  }

  /**
   * 分析节点路径
   * @private
   */
  private static analyzeNodePath(
    element: UIElement,
    xmlContent: string
  ): XmlNodePath {
    
    // 简化的XPath生成逻辑
    // TODO: 实现更完整的XPath解析
    const xpath = this.generateSimpleXPath(element);
    const nodeIndex = this.findNodeIndexInXml(element, xmlContent);

    return {
      xpath,
      nodeIndex,
      depth: this.calculateNodeDepth(xpath),
      parentPath: this.getParentXPath(xpath)
    };
  }

  /**
   * 提取节点详细信息
   * @private
   */
  private static extractNodeDetails(
    element: UIElement,
    xmlContent: string
  ): XmlNodeDetails {
    
    // 从XML中提取更详细的属性信息
    const attributes = this.extractNodeAttributes(element, xmlContent);

    return {
      attributes,
      text: element.text,
      contentDesc: element.content_desc,
      resourceId: element.resource_id,
      className: element.element_type,
      bounds: {
        left: element.bounds.left,
        top: element.bounds.top,
        right: element.bounds.right,
        bottom: element.bounds.bottom
      },
      interactionStates: {
        clickable: element.is_clickable,
        scrollable: element.is_scrollable,
        enabled: element.is_enabled,
        focused: (element as any).focused || false,
        selected: (element as any).selected || false,
        checkable: (element as any).checkable || false,
        checked: (element as any).checked || false
      },
      relationships: {
        parent: undefined, // TODO: 实现父子关系分析
        children: [],
        siblings: []
      }
    };
  }

  /**
   * 执行智能分析
   * @private
   */
  private static async performSmartAnalysis(
    element: UIElement,
    options: EnhancedElementCreationOptions
  ): Promise<{ smartAnalysis: SmartAnalysisResult; smartDescription: string }> {
    
    // 创建元素上下文用于分析
    const context = ElementContextCreator.createContextFromUIElement(element);
    
    // 执行智能分析
    const analysisResult: ElementAnalysisResult = await UniversalElementAnalyzer.analyzeElement(context);

    // 转换为我们的格式
    const smartAnalysis: SmartAnalysisResult = {
      confidence: analysisResult.confidence,
      elementType: analysisResult.elementType,
      userDescription: analysisResult.userDescription,
      actionSuggestion: analysisResult.actionSuggestion,
      businessContext: analysisResult.analysisDetails?.contextAnalysis,
      riskLevel: this.assessRiskLevel(analysisResult)
    };

    return {
      smartAnalysis,
      smartDescription: analysisResult.userDescription
    };
  }

  /**
   * 生成简化的XPath
   * @private
   */
  private static generateSimpleXPath(element: UIElement): string {
    // 简化的XPath生成
    const className = element.element_type || 'View';
    const text = element.text ? `[contains(@text,'${element.text.slice(0, 10)}')]` : '';
    return `//${className}${text}`;
  }

  /**
   * 在XML中查找节点索引
   * @private
   */
  private static findNodeIndexInXml(element: UIElement, xmlContent: string): number {
    // 简化实现：基于边界坐标匹配
    const boundsStr = `[${element.bounds.left},${element.bounds.top}][${element.bounds.right},${element.bounds.bottom}]`;
    const index = xmlContent.indexOf(boundsStr);
    return index > -1 ? Math.floor(index / 100) : 0; // 粗略估算
  }

  /**
   * 计算节点深度
   * @private
   */
  private static calculateNodeDepth(xpath: string): number {
    return (xpath.match(/\//g) || []).length;
  }

  /**
   * 获取父节点XPath
   * @private
   */
  private static getParentXPath(xpath: string): string | undefined {
    const lastSlash = xpath.lastIndexOf('/');
    return lastSlash > 0 ? xpath.substring(0, lastSlash) : undefined;
  }

  /**
   * 从XML中提取节点属性
   * @private
   */
  private static extractNodeAttributes(element: UIElement, xmlContent: string): Record<string, string> {
    // 简化实现：基于已知属性构建
    const attributes: Record<string, string> = {};
    
    if (element.text) attributes['text'] = element.text;
    if (element.content_desc) attributes['content-desc'] = element.content_desc;
    if (element.resource_id) attributes['resource-id'] = element.resource_id;
    if (element.element_type) attributes['class'] = element.element_type;
    
    attributes['bounds'] = `[${element.bounds.left},${element.bounds.top}][${element.bounds.right},${element.bounds.bottom}]`;
    attributes['clickable'] = element.is_clickable.toString();
    attributes['scrollable'] = element.is_scrollable.toString();
    attributes['enabled'] = element.is_enabled.toString();

    return attributes;
  }

  /**
   * 评估风险级别
   * @private
   */
  private static assessRiskLevel(analysisResult: ElementAnalysisResult): 'low' | 'medium' | 'high' {
    if (analysisResult.confidence > 0.8) return 'low';
    if (analysisResult.confidence > 0.6) return 'medium';
    return 'high';
  }
}