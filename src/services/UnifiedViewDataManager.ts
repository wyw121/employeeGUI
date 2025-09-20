/**
 * 统一视图数据管理器
 * 中心化管理三个视图的数据，避免重复计算
 */

import { UIElement } from '../api/universalUIAPI';
import UniversalUIAPI from '../api/universalUIAPI';

// 统一视图数据结构
export interface UnifiedViewData {
  // 基础数据
  xmlContent: string;
  rawElements: UIElement[];
  
  // 增强数据（一次性计算，多处复用）
  enhancedElements: EnhancedUIElement[];
  
  // 视图特定数据
  treeViewData: TreeViewData;
  visualViewData: VisualViewData;
  listViewData: ListViewData;
  
  // 元数据
  metadata: ViewDataMetadata;
}

// 增强的UI元素（包含所有增强信息）
export interface EnhancedUIElement extends UIElement {
  // 层级树视图需要的数据
  depth: number;
  parentId?: string;
  childIds: string[];
  spatialArea: number;
  
  // 可视化视图需要的数据
  cssPosition: CSSPosition;
  visualCategory: string;
  interactionType: 'clickable' | 'scrollable' | 'input' | 'display';
  
  // 列表视图需要的数据
  displayName: string;
  importance: 'high' | 'medium' | 'low';
  searchKeywords: string[];
}

// 层级树视图数据
export interface TreeViewData {
  treeNodes: TreeNode[];
  rootNodes: TreeNode[];
  maxDepth: number;
  hierarchyMap: Map<string, TreeNode>;
}

// 可视化视图数据
export interface VisualViewData {
  screenDimensions: { width: number; height: number };
  elementOverlays: ElementOverlay[];
  interactionZones: InteractionZone[];
  visualCategories: VisualCategory[];
}

// 列表视图数据
export interface ListViewData {
  groupedElements: Record<string, EnhancedUIElement[]>;
  filteredElements: EnhancedUIElement[];
  statistics: ElementStatistics;
  searchIndex: SearchIndex;
}

// 支持类型定义
interface CSSPosition {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface TreeNode {
  id: string;
  element: EnhancedUIElement;
  children: TreeNode[];
  parent?: TreeNode;
  depth: number;
}

interface ElementOverlay {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  className: string;
  isVisible: boolean;
}

interface InteractionZone {
  type: string;
  elements: string[];
  bounds: { x: number; y: number; width: number; height: number };
}

interface VisualCategory {
  name: string;
  elements: string[];
  color: string;
  icon: string;
}

interface ElementStatistics {
  total: number;
  byType: Record<string, number>;
  byInteraction: Record<string, number>;
  clickableCount: number;
  scrollableCount: number;
}

interface SearchIndex {
  textIndex: Map<string, string[]>;
  typeIndex: Map<string, string[]>;
  resourceIdIndex: Map<string, string[]>;
}

interface ViewDataMetadata {
  generatedAt: Date;
  xmlSource: string;
  deviceId: string;
  appPackage: string;
  dataVersion: string;
  /** 是否强制重新分析 */
  forceReanalyzed?: boolean;
  /** 处理选项 */
  processingOptions?: ProcessingOptions;
}

export interface ProcessingOptions {
  /** 强制重新分析，忽略缓存 */
  forceReanalyze?: boolean;
  /** 详细日志输出 */
  verbose?: boolean;
  /** 自定义处理器配置 */
  customConfig?: Record<string, any>;
}

/**
 * 统一视图数据管理器类
 */
export class UnifiedViewDataManager {
  private static cache = new Map<string, UnifiedViewData>();
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

  /**
   * 从XML生成统一视图数据
   */
  static async generateUnifiedData(
    xmlContent: string, 
    deviceId: string = 'unknown',
    options: ProcessingOptions = {}
  ): Promise<UnifiedViewData> {
    const cacheKey = this.generateCacheKey(xmlContent);
    
    // 检查缓存（除非强制重新分析）
    if (!options.forceReanalyze) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        if (options.verbose) {
          console.log('🎯 使用缓存的统一视图数据');
        }
        return cached;
      }
    } else {
      if (options.verbose) {
        console.log('🔄 强制重新分析，忽略缓存');
      }
      // 清除相关缓存
      this.cache.delete(cacheKey);
    }

    console.log('🔄 生成新的统一视图数据...');

    // 1. 解析基础UI元素（包含上下文指纹）
    const rawElements = await UniversalUIAPI.extractPageElements(xmlContent);
    
    // 2. 生成增强元素
    const enhancedElements = await this.enhanceElements(rawElements);
    
    // 3. 并行计算各视图的特定数据
    const [treeViewData, visualViewData, listViewData] = await Promise.all([
      this.generateTreeViewData(enhancedElements),
      this.generateVisualViewData(enhancedElements),
      this.generateListViewData(enhancedElements)
    ]);

    const unifiedData: UnifiedViewData = {
      xmlContent,
      rawElements,
      enhancedElements,
      treeViewData,
      visualViewData,
      listViewData,
      metadata: {
        generatedAt: new Date(),
        xmlSource: xmlContent.substring(0, 100) + '...',
        deviceId,
        appPackage: this.detectAppPackage(xmlContent),
        dataVersion: '1.0.0'
      }
    };

    // 缓存数据
    this.cache.set(cacheKey, unifiedData);
    
    console.log(`✅ 统一视图数据生成完成: ${enhancedElements.length} 个增强元素`);
    return unifiedData;
  }

  /**
   * 增强UI元素
   */
  private static async enhanceElements(rawElements: UIElement[]): Promise<EnhancedUIElement[]> {
    return rawElements.map((element, index) => {
      // 计算层级深度
      const depth = this.calculateDepth(element, rawElements);
      
      // 查找父子关系
      const parentId = this.findParentElementId(element, rawElements);
      const childIds = this.findChildElementIds(element, rawElements);
      
      // 计算空间面积
      const spatialArea = (element.bounds.right - element.bounds.left) * 
                         (element.bounds.bottom - element.bounds.top);
      
      // 生成CSS位置
      const cssPosition = this.generateCSSPosition(element.bounds);
      
      // 确定视觉类别
      const visualCategory = this.determineVisualCategory(element);
      
      // 确定交互类型
      const interactionType = this.determineInteractionType(element);
      
      // 生成显示名称
      const displayName = this.generateDisplayName(element);
      
      // 计算重要性
      const importance = this.calculateImportance(element);
      
      // 生成搜索关键词
      const searchKeywords = this.generateSearchKeywords(element);

      return {
        ...element,
        depth,
        parentId,
        childIds,
        spatialArea,
        cssPosition,
        visualCategory,
        interactionType,
        displayName,
        importance,
        searchKeywords
      };
    });
  }

  /**
   * 生成层级树视图数据
   */
  private static async generateTreeViewData(elements: EnhancedUIElement[]): Promise<TreeViewData> {
    const hierarchyMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    
    // 创建所有节点
    elements.forEach(element => {
      const node: TreeNode = {
        id: element.id,
        element,
        children: [],
        depth: element.depth
      };
      hierarchyMap.set(element.id, node);
    });
    
    // 建立父子关系
    hierarchyMap.forEach(node => {
      if (node.element.parentId) {
        const parent = hierarchyMap.get(node.element.parentId);
        if (parent) {
          parent.children.push(node);
          node.parent = parent;
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    const maxDepth = Math.max(...elements.map(e => e.depth));
    
    return {
      treeNodes: Array.from(hierarchyMap.values()),
      rootNodes,
      maxDepth,
      hierarchyMap
    };
  }

  /**
   * 生成可视化视图数据
   */
  private static async generateVisualViewData(elements: EnhancedUIElement[]): Promise<VisualViewData> {
    const screenDimensions = { width: 1080, height: 1920 };
    
    const elementOverlays = elements.map(element => ({
      id: element.id,
      bounds: {
        x: element.bounds.left,
        y: element.bounds.top,
        width: element.bounds.right - element.bounds.left,
        height: element.bounds.bottom - element.bounds.top
      },
      className: element.is_clickable ? 'clickable-element' : 'non-clickable-element',
      isVisible: true
    }));
    
    // 生成交互区域
    const interactionZones = this.generateInteractionZones(elements);
    
    // 生成视觉分类
    const visualCategories = this.generateVisualCategories(elements);
    
    return {
      screenDimensions,
      elementOverlays,
      interactionZones,
      visualCategories
    };
  }

  /**
   * 生成列表视图数据
   */
  private static async generateListViewData(elements: EnhancedUIElement[]): Promise<ListViewData> {
    // 按类型分组
    const groupedElements = elements.reduce((acc, element) => {
      const type = element.element_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(element);
      return acc;
    }, {} as Record<string, EnhancedUIElement[]>);
    
    // 生成统计信息
    const statistics: ElementStatistics = {
      total: elements.length,
      byType: Object.keys(groupedElements).reduce((acc, type) => {
        acc[type] = groupedElements[type].length;
        return acc;
      }, {} as Record<string, number>),
      byInteraction: {
        clickable: elements.filter(e => e.is_clickable).length,
        scrollable: elements.filter(e => e.is_scrollable).length,
        input: elements.filter(e => e.element_type.includes('EditText')).length,
        display: elements.filter(e => !e.is_clickable && !e.is_scrollable).length
      },
      clickableCount: elements.filter(e => e.is_clickable).length,
      scrollableCount: elements.filter(e => e.is_scrollable).length
    };
    
    // 生成搜索索引
    const searchIndex = this.generateSearchIndex(elements);
    
    return {
      groupedElements,
      filteredElements: elements, // 默认显示所有元素
      statistics,
      searchIndex
    };
  }

  // 工具方法
  private static generateCacheKey(xmlContent: string): string {
    return `unified_${xmlContent.length}_${xmlContent.substring(0, 50).replace(/\s/g, '')}`;
  }

  private static isCacheValid(data: UnifiedViewData): boolean {
    const now = Date.now();
    const dataTime = data.metadata.generatedAt.getTime();
    return (now - dataTime) < this.CACHE_TTL;
  }

  private static calculateDepth(element: UIElement, allElements: UIElement[]): number {
    let depth = 0;
    for (const other of allElements) {
      if (other.id !== element.id && this.isElementContainedIn(element, other)) {
        depth++;
      }
    }
    return depth;
  }

  private static isElementContainedIn(elementA: UIElement, elementB: UIElement): boolean {
    const a = elementA.bounds;
    const b = elementB.bounds;
    return (
      a.left >= b.left &&
      a.top >= b.top &&
      a.right <= b.right &&
      a.bottom <= b.bottom &&
      !(a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom)
    );
  }

  private static findParentElementId(element: UIElement, allElements: UIElement[]): string | undefined {
    let bestParent: UIElement | null = null;
    let minArea = Infinity;

    for (const potential of allElements) {
      if (potential.id !== element.id && this.isElementContainedIn(element, potential)) {
        const area = (potential.bounds.right - potential.bounds.left) * 
                    (potential.bounds.bottom - potential.bounds.top);
        if (area < minArea) {
          minArea = area;
          bestParent = potential;
        }
      }
    }

    return bestParent?.id;
  }

  private static findChildElementIds(element: UIElement, allElements: UIElement[]): string[] {
    return allElements
      .filter(other => other.id !== element.id && this.isElementContainedIn(other, element))
      .map(child => child.id);
  }

  private static generateCSSPosition(bounds: any): CSSPosition {
    return {
      left: `${(bounds.left / 1080) * 100}%`,
      top: `${(bounds.top / 1920) * 100}%`,
      width: `${((bounds.right - bounds.left) / 1080) * 100}%`,
      height: `${((bounds.bottom - bounds.top) / 1920) * 100}%`
    };
  }

  private static determineVisualCategory(element: UIElement): string {
    if (element.is_clickable) return 'interactive';
    if (element.is_scrollable) return 'scrollable';
    if (element.text) return 'text';
    if (element.element_type.includes('Image')) return 'image';
    return 'container';
  }

  private static determineInteractionType(element: UIElement): 'clickable' | 'scrollable' | 'input' | 'display' {
    if (element.element_type.includes('EditText')) return 'input';
    if (element.is_clickable) return 'clickable';
    if (element.is_scrollable) return 'scrollable';
    return 'display';
  }

  private static generateDisplayName(element: UIElement): string {
    if (element.text) return element.text;
    if (element.content_desc) return element.content_desc;
    if (element.resource_id) {
      const parts = element.resource_id.split('/');
      return parts[parts.length - 1] || element.resource_id;
    }
    return element.element_type.split('.').pop() || element.element_type;
  }

  private static calculateImportance(element: UIElement): 'high' | 'medium' | 'low' {
    if (element.is_clickable && element.text) return 'high';
    if (element.is_clickable || element.is_scrollable) return 'medium';
    return 'low';
  }

  private static generateSearchKeywords(element: UIElement): string[] {
    const keywords: string[] = [];
    if (element.text) keywords.push(element.text.toLowerCase());
    if (element.content_desc) keywords.push(element.content_desc.toLowerCase());
    if (element.resource_id) keywords.push(element.resource_id.toLowerCase());
    if (element.class_name) keywords.push(element.class_name.toLowerCase());
    return keywords;
  }

  private static detectAppPackage(xmlContent: string): string {
    if (xmlContent.includes('com.xingin.xhs')) return 'com.xingin.xhs';
    if (xmlContent.includes('com.tencent.mm')) return 'com.tencent.mm';
    return 'unknown';
  }

  private static generateInteractionZones(elements: EnhancedUIElement[]): InteractionZone[] {
    // 生成交互区域的逻辑
    const clickableElements = elements.filter(e => e.is_clickable);
    const scrollableElements = elements.filter(e => e.is_scrollable);
    
    const zones: InteractionZone[] = [];
    
    if (clickableElements.length > 0) {
      zones.push({
        type: 'clickable',
        elements: clickableElements.map(e => e.id),
        bounds: this.calculateBoundingBox(clickableElements.map(e => e.bounds))
      });
    }
    
    if (scrollableElements.length > 0) {
      zones.push({
        type: 'scrollable',
        elements: scrollableElements.map(e => e.id),
        bounds: this.calculateBoundingBox(scrollableElements.map(e => e.bounds))
      });
    }
    
    return zones;
  }

  private static generateVisualCategories(elements: EnhancedUIElement[]): VisualCategory[] {
    const categories: VisualCategory[] = [];
    
    const grouped = elements.reduce((acc, element) => {
      const category = element.visualCategory;
      if (!acc[category]) acc[category] = [];
      acc[category].push(element.id);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(grouped).forEach(([name, elementIds]) => {
      categories.push({
        name,
        elements: elementIds,
        color: this.getCategoryColor(name),
        icon: this.getCategoryIcon(name)
      });
    });
    
    return categories;
  }

  private static calculateBoundingBox(bounds: any[]): { x: number; y: number; width: number; height: number } {
    if (bounds.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    const left = Math.min(...bounds.map(b => b.left));
    const top = Math.min(...bounds.map(b => b.top));
    const right = Math.max(...bounds.map(b => b.right));
    const bottom = Math.max(...bounds.map(b => b.bottom));
    
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  }

  private static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'interactive': '#1890ff',
      'scrollable': '#52c41a',
      'text': '#722ed1',
      'image': '#fa8c16',
      'container': '#8c8c8c'
    };
    return colors[category] || '#8c8c8c';
  }

  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'interactive': '🔘',
      'scrollable': '📜',
      'text': '📝',
      'image': '🖼️',
      'container': '📦'
    };
    return icons[category] || '📦';
  }

  private static generateSearchIndex(elements: EnhancedUIElement[]): SearchIndex {
    const textIndex = new Map<string, string[]>();
    const typeIndex = new Map<string, string[]>();
    const resourceIdIndex = new Map<string, string[]>();
    
    elements.forEach(element => {
      // 文本索引
      element.searchKeywords.forEach(keyword => {
        if (!textIndex.has(keyword)) textIndex.set(keyword, []);
        textIndex.get(keyword)!.push(element.id);
      });
      
      // 类型索引
      const type = element.element_type.toLowerCase();
      if (!typeIndex.has(type)) typeIndex.set(type, []);
      typeIndex.get(type)!.push(element.id);
      
      // 资源ID索引
      if (element.resource_id) {
        const resourceId = element.resource_id.toLowerCase();
        if (!resourceIdIndex.has(resourceId)) resourceIdIndex.set(resourceId, []);
        resourceIdIndex.get(resourceId)!.push(element.id);
      }
    });
    
    return {
      textIndex,
      typeIndex,
      resourceIdIndex
    };
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ 统一视图数据缓存已清除');
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}