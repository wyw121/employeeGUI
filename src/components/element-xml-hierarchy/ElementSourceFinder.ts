/**
 * 元素来源查找器
 * 智能查找元素在缓存页面中的最佳匹配
 */

import type { UIElement } from '../../api/universalUIAPI';
import type { CachedXmlPage } from '../../services/XmlPageCacheService';
import { EnhancedXmlCacheService, type CachedViewData } from '../../services/EnhancedXmlCacheService';
import type { UnifiedViewData, EnhancedUIElement } from '../../services/UnifiedViewDataManager';

interface ElementSourceResult {
  /** 匹配的缓存页面 */
  cachedPage?: CachedXmlPage;
  /** 增强的视图数据 */
  cachedViewData?: CachedViewData;
  /** 匹配的元素索引 */
  matchedElementIndex?: number;
  /** 匹配置信度 (0-1) */
  matchConfidence?: number;
  /** 匹配的增强元素 */
  matchedEnhancedElement?: EnhancedUIElement;
}

interface ElementMatchResult {
  elementIndex: number;
  confidence: number;
  enhancedElement?: EnhancedUIElement;
}

export class ElementSourceFinder {
  /**
   * 在多个缓存页面中查找元素的最佳来源页面
   */
  static async findBestSourcePage(
    targetElement: UIElement,
    cachedPages: CachedXmlPage[]
  ): Promise<ElementSourceResult> {
    let bestMatch: ElementSourceResult = {};
    let bestScore = 0;

    console.log(`🔍 开始在 ${cachedPages.length} 个页面中查找元素...`);

    // 遍历缓存页面，查找最佳匹配（限制检查前5个页面以提高性能）
    for (let i = 0; i < Math.min(cachedPages.length, 5); i++) {
      const page = cachedPages[i];
      
      try {
        console.log(`📄 检查页面: ${page.pageTitle} (${page.fileName})`);
        
        // 加载页面的增强数据
        const cachedViewData = await EnhancedXmlCacheService.loadEnhancedPageData(page);
        
        // 在统一数据中查找匹配元素
        const matchResult = this.findElementInUnifiedData(targetElement, cachedViewData.unifiedData);
        
        if (matchResult.confidence > bestScore) {
          bestScore = matchResult.confidence;
          bestMatch = {
            cachedPage: page,
            cachedViewData,
            matchedElementIndex: matchResult.elementIndex,
            matchConfidence: matchResult.confidence,
            matchedEnhancedElement: matchResult.enhancedElement
          };
          
          console.log(`✅ 找到更好的匹配: ${page.pageTitle} (置信度: ${Math.round(matchResult.confidence * 100)}%)`);
        }
        
        // 如果找到高置信度匹配，提前结束
        if (matchResult.confidence > 0.85) {
          console.log('🎯 找到高置信度匹配，停止搜索');
          break;
        }
        
      } catch (error) {
        console.warn(`⚠️ 检查页面 ${page.fileName} 时出错:`, error);
      }
    }

    // 如果没有找到好的匹配，使用第一个页面作为默认
    if (bestScore === 0 && cachedPages.length > 0) {
      console.log('📄 未找到匹配元素，使用最新页面作为参考');
      try {
        const defaultPage = cachedPages[0];
        const defaultData = await EnhancedXmlCacheService.loadEnhancedPageData(defaultPage);
        
        bestMatch = {
          cachedPage: defaultPage,
          cachedViewData: defaultData,
          matchConfidence: 0
        };
      } catch (error) {
        console.error('❌ 加载默认页面失败:', error);
      }
    }

    console.log(`🏁 查找完成，最佳匹配置信度: ${Math.round((bestMatch.matchConfidence || 0) * 100)}%`);
    return bestMatch;
  }

  /**
   * 在统一视图数据中查找匹配的元素
   */
  static findElementInUnifiedData(
    targetElement: UIElement, 
    unifiedData: UnifiedViewData
  ): ElementMatchResult {
    let bestMatch: ElementMatchResult = {
      elementIndex: -1,
      confidence: 0
    };

    // 在增强元素中查找最佳匹配
    unifiedData.enhancedElements.forEach((enhancedElement, index) => {
      const similarity = this.calculateElementSimilarity(targetElement, enhancedElement);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = {
          elementIndex: index,
          confidence: similarity,
          enhancedElement
        };
      }
    });

    return bestMatch;
  }

  /**
   * 计算两个元素的相似度
   */
  private static calculateElementSimilarity(element1: UIElement, element2: EnhancedUIElement): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 文本匹配 (权重: 35%)
    const textWeight = 0.35;
    totalWeight += textWeight;
    if (element1.text && element2.text) {
      if (element1.text === element2.text) {
        totalScore += textWeight;
      } else if (element1.text.includes(element2.text) || element2.text.includes(element1.text)) {
        totalScore += textWeight * 0.6;
      } else if (this.isSimilarText(element1.text, element2.text)) {
        totalScore += textWeight * 0.3;
      }
    }

    // resource_id 匹配 (权重: 30%) 
    const resourceIdWeight = 0.30;
    totalWeight += resourceIdWeight;
    if (element1.resource_id && element2.resource_id) {
      if (element1.resource_id === element2.resource_id) {
        totalScore += resourceIdWeight;
      } else if (this.isSimilarResourceId(element1.resource_id, element2.resource_id)) {
        totalScore += resourceIdWeight * 0.5;
      }
    }

    // 元素类型匹配 (权重: 20%)
    const typeWeight = 0.20;
    totalWeight += typeWeight;
    if (element1.element_type && element2.element_type) {
      if (element1.element_type === element2.element_type) {
        totalScore += typeWeight;
      } else if (this.isSimilarElementType(element1.element_type, element2.element_type)) {
        totalScore += typeWeight * 0.4;
      }
    }

    // 内容描述匹配 (权重: 10%)
    const contentDescWeight = 0.10;
    totalWeight += contentDescWeight;
    if (element1.content_desc && element2.content_desc) {
      if (element1.content_desc === element2.content_desc) {
        totalScore += contentDescWeight;
      } else if (element1.content_desc.includes(element2.content_desc) || 
                 element2.content_desc.includes(element1.content_desc)) {
        totalScore += contentDescWeight * 0.6;
      }
    }

    // 可点击性匹配 (权重: 5%)
    const clickableWeight = 0.05;
    totalWeight += clickableWeight;
    if (element1.is_clickable === element2.is_clickable) {
      totalScore += clickableWeight;
    }

    // 如果没有任何可比较的属性，返回0
    if (totalWeight === 0) return 0;

    // 计算最终相似度分数
    const finalScore = totalScore / totalWeight;
    
    return Math.min(1, Math.max(0, finalScore)); // 确保在0-1范围内
  }

  /**
   * 判断两个文本是否相似
   */
  private static isSimilarText(text1: string, text2: string): boolean {
    if (!text1 || !text2) return false;
    
    // 去除空格和特殊字符进行比较
    const normalize = (text: string) => text.replace(/\s+/g, '').toLowerCase();
    const normalized1 = normalize(text1);
    const normalized2 = normalize(text2);
    
    // 计算简单的相似度
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength === 0) return false;
    
    let commonChars = 0;
    for (let i = 0; i < minLength; i++) {
      if (normalized1[i] === normalized2[i]) {
        commonChars++;
      }
    }
    
    return commonChars / minLength > 0.6;
  }

  /**
   * 判断两个resource_id是否相似
   */
  private static isSimilarResourceId(id1: string, id2: string): boolean {
    if (!id1 || !id2) return false;
    
    // 提取最后一个部分进行比较 (例如: com.app.name/id:button -> button)
    const extractLastPart = (id: string) => {
      const parts = id.split(/[/:]/);
      return parts[parts.length - 1];
    };
    
    const part1 = extractLastPart(id1);
    const part2 = extractLastPart(id2);
    
    return part1 === part2;
  }

  /**
   * 判断两个元素类型是否相似
   */
  private static isSimilarElementType(type1: string, type2: string): boolean {
    if (!type1 || !type2) return false;
    
    // 提取基础类型名称
    const extractBaseType = (type: string) => {
      return type.split('.').pop()?.toLowerCase() || type.toLowerCase();
    };
    
    const base1 = extractBaseType(type1);
    const base2 = extractBaseType(type2);
    
    // 定义相似的类型组
    const similarTypes = [
      ['button', 'imagebutton', 'togglebutton'],
      ['textview', 'edittext', 'textinputlayout'],
      ['imageview', 'imagebutton'],
      ['recyclerview', 'listview', 'gridview'],
      ['linearlayout', 'relativelayout', 'constraintlayout', 'framelayout']
    ];
    
    // 检查是否在同一相似类型组中
    return similarTypes.some(group => 
      group.includes(base1) && group.includes(base2)
    );
  }
}

export default ElementSourceFinder;