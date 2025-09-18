/**
 * 页面分析领域实体 - 页面分析结果
 */

import { PageInfoEntity } from './PageInfo';
import { UIElementEntity, UIElement } from './UIElement';

export interface ElementStatistics {
  totalElements: number;
  uniqueElements: number;
  duplicateGroups: number;
  typeDistribution: Record<string, number>;
  actionableElements: number;
  regionDistribution: {
    top: number;
    middle: number;
    bottom: number;
  };
}

export interface PageAnalysisConfig {
  includeNonClickable?: boolean;
  enableDeduplication?: boolean;
  maxElements?: number;
  minSimilarityThreshold?: number;
  includeInvisibleElements?: boolean;
  elementTypeFilters?: string[];
  screenshotElements?: boolean;
}

export interface PageAnalysis {
  readonly id: string;
  readonly pageInfo: PageInfoEntity;
  readonly elements: UIElementEntity[];
  readonly statistics: ElementStatistics;
  readonly config: PageAnalysisConfig;
  readonly analysisTime: number;
  readonly success: boolean;
  readonly errorMessage?: string;
}

export class PageAnalysisEntity implements PageAnalysis {
  public readonly id: string;
  public readonly pageInfo: PageInfoEntity;
  public readonly elements: UIElementEntity[];
  public readonly statistics: ElementStatistics;
  public readonly config: PageAnalysisConfig;
  public readonly analysisTime: number;
  public readonly success: boolean;
  public readonly errorMessage?: string;

  constructor(params: {
    pageInfo: PageInfoEntity;
    elements: UIElementEntity[];
    config: PageAnalysisConfig;
    analysisTime: number;
    success: boolean;
    errorMessage?: string;
  }) {
    this.id = this.generateId();
    this.pageInfo = params.pageInfo;
    this.elements = params.elements;
    this.config = params.config;
    this.analysisTime = params.analysisTime;
    this.success = params.success;
    this.errorMessage = params.errorMessage;
    this.statistics = this.calculateStatistics();
  }

  private generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private calculateStatistics(): ElementStatistics {
    const typeDistribution: Record<string, number> = {};
    const regionDistribution = { top: 0, middle: 0, bottom: 0 };
    
    let actionableCount = 0;
    let duplicateGroups = 0;
    const groupKeys = new Set<string>();

    for (const element of this.elements) {
      // 统计元素类型
      const typeKey = element.elementType;
      typeDistribution[typeKey] = (typeDistribution[typeKey] || 0) + 1;

      // 统计可操作元素
      if (element.supportedActions.length > 0) {
        actionableCount++;
      }

      // 统计区域分布
      const centerY = element.getCenterPoint().y;
      if (centerY < 600) {
        regionDistribution.top++;
      } else if (centerY < 1800) {
        regionDistribution.middle++;
      } else {
        regionDistribution.bottom++;
      }

      // 统计重复分组
      if (element.groupInfo.groupTotal > 1) {
        groupKeys.add(element.groupInfo.groupKey);
      }
    }

    duplicateGroups = groupKeys.size;

    return {
      totalElements: this.elements.length,
      uniqueElements: this.elements.filter(e => e.groupInfo.isRepresentative).length,
      duplicateGroups,
      typeDistribution,
      actionableElements: actionableCount,
      regionDistribution,
    };
  }

  /**
   * 获取代表性元素（去重后的元素）
   */
  getRepresentativeElements(): UIElementEntity[] {
    return this.elements.filter(element => element.groupInfo.isRepresentative);
  }

  /**
   * 按元素类型分组
   */
  getElementsByType(elementType: string): UIElementEntity[] {
    return this.elements.filter(element => element.elementType === elementType);
  }

  /**
   * 获取导航按钮
   */
  getNavigationButtons(): UIElementEntity[] {
    return this.elements.filter(element => element.isNavigationButton());
  }

  /**
   * 获取可点击元素
   */
  getClickableElements(): UIElementEntity[] {
    return this.elements.filter(element => element.isClickable);
  }

  /**
   * 获取可编辑元素
   */
  getEditableElements(): UIElementEntity[] {
    return this.elements.filter(element => element.isEditable);
  }

  /**
   * 按区域获取元素
   */
  getElementsByRegion(region: 'top' | 'middle' | 'bottom'): UIElementEntity[] {
    return this.elements.filter(element => {
      const centerY = element.getCenterPoint().y;
      switch (region) {
        case 'top':
          return centerY < 600;
        case 'middle':
          return centerY >= 600 && centerY < 1800;
        case 'bottom':
          return centerY >= 1800;
        default:
          return false;
      }
    });
  }

  /**
   * 搜索元素
   */
  searchElements(query: string): UIElementEntity[] {
    const lowerQuery = query.toLowerCase();
    return this.elements.filter(element =>
      element.text.toLowerCase().includes(lowerQuery) ||
      element.description.toLowerCase().includes(lowerQuery) ||
      (element.resourceId && element.resourceId.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 获取元素层次结构树
   */
  getElementHierarchy(): ElementHierarchyNode[] {
    // 按照位置和类型构建层次结构
    const topElements = this.getElementsByRegion('top');
    const middleElements = this.getElementsByRegion('middle');
    const bottomElements = this.getElementsByRegion('bottom');

    return [
      {
        region: 'top',
        elements: this.groupElementsByType(topElements),
      },
      {
        region: 'middle',
        elements: this.groupElementsByType(middleElements),
      },
      {
        region: 'bottom',
        elements: this.groupElementsByType(bottomElements),
      },
    ];
  }

  private groupElementsByType(elements: UIElementEntity[]): ElementTypeGroup[] {
    const groups: Record<string, UIElementEntity[]> = {};
    
    for (const element of elements) {
      const key = element.elementType;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(element);
    }

    return Object.entries(groups).map(([type, elements]) => ({
      type,
      elements,
      count: elements.length,
    }));
  }

  /**
   * 转换为普通对象
   */
  toPlainObject(): Omit<PageAnalysis, 'elements'> & { elements: UIElement[] } {
    return {
      id: this.id,
      pageInfo: this.pageInfo,
      elements: this.elements.map(e => e.toPlainObject()),
      statistics: this.statistics,
      config: this.config,
      analysisTime: this.analysisTime,
      success: this.success,
      errorMessage: this.errorMessage,
    };
  }
}

export interface ElementHierarchyNode {
  region: string;
  elements: ElementTypeGroup[];
}

export interface ElementTypeGroup {
  type: string;
  elements: UIElementEntity[];
  count: number;
}