/**
 * 统一元素选择处理器
 * 
 * 核心模块：负责统一处理所有视图的元素选择，确保完整记录元素信息
 * 支持：可视化视图、节点树、屏幕预览、匹配结果等所有选择路径
 */

import type { UiNode } from '../../components/universal-ui/views/grid-view/types';
import type { MatchCriteria } from '../../components/universal-ui/views/grid-view/panels/node-detail/types';
import type { XmlSnapshot, ElementLocator } from '../../types/selfContainedScript';
import type { 
  CompleteElementContext, 
  ElementSelectionEvent, 
  ElementSelectionListener, 
  ElementSelectionSource 
} from './types';
import { elementFingerprintGenerator } from './ElementFingerprintGenerator';
import { enhancedElementRelocator } from './EnhancedElementRelocator';
import { buildDefaultMatchingFromElement } from '../grid-inspector/DefaultMatchingBuilder';
import { createXmlSnapshot } from '../../types/selfContainedScript';

/**
 * 统一元素选择处理器类
 */
export class UnifiedElementSelectionHandler {
  private listeners: ElementSelectionListener[] = [];
  private currentXmlContent: string = '';
  private currentXmlSnapshot: XmlSnapshot | null = null;
  private deviceInfo: any = null;
  private pageInfo: any = null;

  /**
   * 添加选择监听器
   */
  addListener(listener: ElementSelectionListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除选择监听器
   */
  removeListener(listener: ElementSelectionListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 设置当前XML上下文
   * 必须在元素选择前调用，确保能构建完整的快照
   */
  setXmlContext(xmlContent: string, deviceInfo?: any, pageInfo?: any, xmlSnapshot?: XmlSnapshot): void {
    this.currentXmlContent = xmlContent;
    this.deviceInfo = deviceInfo;
    this.pageInfo = pageInfo;
    
    // 如果提供了现成的快照则直接使用，否则构建新快照
    if (xmlSnapshot) {
      this.currentXmlSnapshot = xmlSnapshot;
    } else {
      try {
        this.currentXmlSnapshot = createXmlSnapshot(
          xmlContent,
          deviceInfo || {
            deviceId: 'unknown',
            deviceName: 'unknown',
            appPackage: 'com.xingin.xhs',
            activityName: 'unknown',
          },
          pageInfo || {
            pageTitle: '未知页面',
            pageType: 'unknown',
            elementCount: 0,
          }
        );
      } catch (error) {
        console.warn('Failed to create XML snapshot:', error);
        this.currentXmlSnapshot = null;
      }
    }
  }

  /**
   * 处理元素选择（统一入口）
   * 所有视图的元素选择都应通过此方法处理
   */
  async handleElementSelection(
    node: UiNode,
    source: ElementSelectionSource,
    metadata?: ElementSelectionEvent['metadata']
  ): Promise<CompleteElementContext> {
    try {
      // 构建完整的元素上下文
      const context = this.buildCompleteContext(node, source);
      
      // 创建选择事件
      const event: ElementSelectionEvent = {
        context,
        source,
        metadata,
      };
      
      // 通知所有监听器
      await this.notifyListeners(event);
      
      return context;
    } catch (error) {
      console.error('Failed to handle element selection:', error);
      throw error;
    }
  }

  /**
   * 重定位元素（用于"修改参数"场景）
   * 根据之前保存的完整上下文，在新的XML树中找到对应元素
   */
  relocateElement(context: CompleteElementContext, rootNode: UiNode) {
    return enhancedElementRelocator.relocateElement(context, rootNode);
  }

  /**
   * 从步骤参数重建元素上下文
   * 用于"修改参数"时从步骤数据恢复完整上下文
   */
  rebuildContextFromStepParameters(stepParams: any): CompleteElementContext | null {
    try {
      // 优先使用新的自包含数据结构
      if (stepParams.xmlSnapshot && stepParams.elementLocator) {
        return this.rebuildFromSelfContainedData(stepParams);
      }
      
      // 回退到传统参数重建（兼容性）
      return this.rebuildFromLegacyParameters(stepParams);
    } catch (error) {
      console.warn('Failed to rebuild context from step parameters:', error);
      return null;
    }
  }

  /**
   * 构建完整的元素上下文
   */
  private buildCompleteContext(node: UiNode, source: ElementSelectionSource): CompleteElementContext {
    // 生成唯一元素ID
    const elementId = elementFingerprintGenerator.generateFingerprint(node, this.currentXmlContent);
    
    // 构建ElementLocator
    const locator = this.buildElementLocator(node);
    
    // 构建匹配条件
    const matching = this.buildMatchingCriteria(node);
    
    // 确保有XML快照
    const xmlSnapshot = this.currentXmlSnapshot || this.buildFallbackSnapshot();
    
    const timestamp = Date.now();
    
    return {
      elementId,
      node,
      locator,
      matching,
      xmlSnapshot,
      selectionSource: source,
      selectedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * 构建ElementLocator
   */
  private buildElementLocator(node: UiNode): ElementLocator {
    const attrs = node.attrs || {};
    
    // 解析bounds
    let selectedBounds = { left: 0, top: 0, right: 0, bottom: 0 };
    if (attrs.bounds) {
      const match = attrs.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (match) {
        selectedBounds = {
          left: parseInt(match[1]),
          top: parseInt(match[2]),
          right: parseInt(match[3]),
          bottom: parseInt(match[4]),
        };
      }
    }
    
    // 计算XPath
    const elementPath = this.calculateXPath(node);
    
    return {
      selectedBounds,
      elementPath,
      confidence: 0.9, // 直接选择的置信度较高
      additionalInfo: {
        xpath: elementPath,
        resourceId: attrs['resource-id'],
        text: attrs['text'],
        contentDesc: attrs['content-desc'],
        className: attrs['class'],
      },
    };
  }

  /**
   * 构建匹配条件
   */
  private buildMatchingCriteria(node: UiNode): MatchCriteria {
    try {
      // 使用现有的默认匹配构建器
      const built = buildDefaultMatchingFromElement({
        resource_id: node.attrs?.['resource-id'],
        text: node.attrs?.['text'],
        content_desc: node.attrs?.['content-desc'],
        class_name: node.attrs?.['class'],
        bounds: node.attrs?.['bounds'],
      });
      
      return {
        strategy: built.strategy as any,
        fields: built.fields,
        values: built.values,
        includes: {},
        excludes: {},
      };
    } catch (error) {
      console.warn('Failed to build matching criteria:', error);
      
      // 回退到基础匹配条件
      return {
        strategy: 'standard',
        fields: ['resource-id', 'text', 'class'],
        values: {
          'resource-id': node.attrs?.['resource-id'] || '',
          'text': node.attrs?.['text'] || '',
          'class': node.attrs?.['class'] || '',
        },
        includes: {},
        excludes: {},
      };
    }
  }

  /**
   * 计算XPath
   */
  private calculateXPath(node: UiNode): string {
    try {
      const path: string[] = [];
      let current: UiNode | null = node;
      
      while (current && current.parent) {
        const parent = current.parent;
        const siblings = parent.children.filter(child => 
          child.attrs?.['class'] === current!.attrs?.['class']
        );
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${current.attrs?.['class'] || '*'}[${index}]`);
        } else {
          path.unshift(current.attrs?.['class'] || '*');
        }
        
        current = parent;
      }
      
      return path.length > 0 ? `//${path.join('/')}` : '//*';
    } catch (error) {
      console.warn('Failed to calculate XPath:', error);
      return '//*';
    }
  }

  /**
   * 构建回退快照
   */
  private buildFallbackSnapshot(): XmlSnapshot {
    return createXmlSnapshot(
      this.currentXmlContent || '<hierarchy></hierarchy>',
      this.deviceInfo || {
        deviceId: 'unknown',
        deviceName: 'unknown',
        appPackage: 'com.xingin.xhs',
        activityName: 'unknown',
      },
      this.pageInfo || {
        pageTitle: '未知页面',
        pageType: 'unknown',
        elementCount: 0,
      }
    );
  }

  /**
   * 从自包含数据重建上下文
   */
  private rebuildFromSelfContainedData(stepParams: any): CompleteElementContext | null {
    const xmlSnapshot = stepParams.xmlSnapshot as XmlSnapshot;
    const elementLocator = stepParams.elementLocator as ElementLocator;
    const matching = stepParams.matching as MatchCriteria;
    
    if (!xmlSnapshot || !elementLocator) {
      return null;
    }
    
    // 创建虚拟节点（用于重定位）
    const virtualNode: UiNode = {
      tag: 'android.widget.View', // 默认标签
      attrs: {
        'resource-id': elementLocator.additionalInfo?.resourceId || '',
        'text': elementLocator.additionalInfo?.text || '',
        'content-desc': elementLocator.additionalInfo?.contentDesc || '',
        'class': elementLocator.additionalInfo?.className || '',
        'bounds': `[${elementLocator.selectedBounds.left},${elementLocator.selectedBounds.top}][${elementLocator.selectedBounds.right},${elementLocator.selectedBounds.bottom}]`,
      },
      children: [],
      parent: null,
    };
    
    const elementId = elementFingerprintGenerator.generateFingerprint(virtualNode, xmlSnapshot.xmlContent);
    
    return {
      elementId,
      node: virtualNode,
      locator: elementLocator,
      matching: matching || this.buildMatchingCriteria(virtualNode),
      xmlSnapshot,
      selectionSource: 'programmatic',
      selectedAt: xmlSnapshot.timestamp,
      updatedAt: Date.now(),
    };
  }

  /**
   * 从传统参数重建上下文（兼容性）
   */
  private rebuildFromLegacyParameters(stepParams: any): CompleteElementContext | null {
    // 构建虚拟节点
    const virtualNode: UiNode = {
      tag: stepParams.element_type || 'android.widget.View', // 使用步骤中的元素类型或默认
      attrs: {
        'resource-id': stepParams.resource_id || '',
        'text': stepParams.text || stepParams.element_text || '',
        'content-desc': stepParams.content_desc || '',
        'class': stepParams.class_name || '',
        'bounds': stepParams.bounds || '',
      },
      children: [],
      parent: null,
    };
    
    // 构建XML快照（如果有XML内容）
    let xmlSnapshot: XmlSnapshot;
    if (stepParams.xmlContent) {
      xmlSnapshot = createXmlSnapshot(
        stepParams.xmlContent,
        {
          deviceId: stepParams.deviceId || 'unknown',
          deviceName: stepParams.deviceName || 'unknown',
          appPackage: 'com.xingin.xhs',
          activityName: 'unknown',
        },
        {
          pageTitle: '传统参数页面',
          pageType: 'unknown',
          elementCount: 0,
        }
      );
    } else {
      xmlSnapshot = this.buildFallbackSnapshot();
    }
    
    const elementId = elementFingerprintGenerator.generateFingerprint(virtualNode, xmlSnapshot.xmlContent);
    
    return {
      elementId,
      node: virtualNode,
      locator: this.buildElementLocator(virtualNode),
      matching: this.buildMatchingCriteria(virtualNode),
      xmlSnapshot,
      selectionSource: 'programmatic',
      selectedAt: stepParams.xmlTimestamp || Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * 通知所有监听器
   */
  private async notifyListeners(event: ElementSelectionEvent): Promise<void> {
    const promises = this.listeners.map(async (listener) => {
      try {
        await listener(event);
      } catch (error) {
        console.error('Element selection listener error:', error);
      }
    });
    
    await Promise.all(promises);
  }
}

/**
 * 默认导出单例
 */
export const unifiedElementSelectionHandler = new UnifiedElementSelectionHandler();