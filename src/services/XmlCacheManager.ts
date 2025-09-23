/**
 * XML缓存管理器
 * 统一管理XML页面的缓存、关联和加载
 */

export interface XmlCacheEntry {
  /** 缓存ID */
  cacheId: string;
  /** XML内容 */
  xmlContent: string;
  /** 设备ID */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 页面标识信息 */
  pageInfo: {
    appPackage: string;
    activityName: string;
    pageTitle: string;
    pageType: string;
    elementCount: number;
  };
  /** 解析后的UI元素（缓存） */
  parsedElements?: any[];
  /** 页面截图（可选） */
  screenshot?: string;
}

export interface StepXmlContext {
  /** 步骤ID */
  stepId: string;
  /** 关联的XML缓存ID */
  xmlCacheId: string;
  /** 元素在XML中的路径/标识 */
  elementPath?: string;
  /** 元素选择时的上下文信息 */
  selectionContext?: {
    selectedBounds: any;
    searchCriteria: string;
    confidence: number;
  };
}

class XmlCacheManager {
  private static instance: XmlCacheManager;
  private cache: Map<string, XmlCacheEntry> = new Map();
  private stepXmlMapping: Map<string, StepXmlContext> = new Map();

  static getInstance(): XmlCacheManager {
    if (!this.instance) {
      this.instance = new XmlCacheManager();
    }
    return this.instance;
  }

  /**
   * 缓存XML页面数据
   */
  cacheXmlPage(entry: XmlCacheEntry): string {
    const cacheId = entry.cacheId || this.generateCacheId();
    const completeEntry = { ...entry, cacheId };
    
    this.cache.set(cacheId, completeEntry);
    console.log(`📦 XML页面已缓存: ${cacheId}`, {
      deviceId: entry.deviceId,
      elementCount: entry.pageInfo.elementCount,
      contentLength: entry.xmlContent.length
    });
    
    return cacheId;
  }

  /**
   * 获取缓存的XML数据
   */
  getCachedXml(cacheId: string): XmlCacheEntry | null {
    const entry = this.cache.get(cacheId);
    if (!entry) {
      console.warn(`⚠️ 未找到XML缓存: ${cacheId}`);
      return null;
    }
    return entry;
  }

  /**
   * 关联步骤与XML源
   */
  linkStepToXml(stepId: string, xmlCacheId: string, context?: Partial<StepXmlContext>): void {
    const stepContext: StepXmlContext = {
      stepId,
      xmlCacheId,
      ...context
    };
    
    this.stepXmlMapping.set(stepId, stepContext);
    console.log(`🔗 步骤与XML已关联:`, { stepId, xmlCacheId });
  }

  /**
   * 获取步骤关联的XML数据
   */
  getStepXmlContext(stepId: string): { xmlData: XmlCacheEntry; context: StepXmlContext } | null {
    const stepContext = this.stepXmlMapping.get(stepId);
    if (!stepContext) {
      console.warn(`⚠️ 步骤未关联XML源: ${stepId}`);
      return null;
    }

    const xmlData = this.getCachedXml(stepContext.xmlCacheId);
    if (!xmlData) {
      console.warn(`⚠️ 步骤关联的XML缓存不存在: ${stepContext.xmlCacheId}`);
      return null;
    }

    return { xmlData, context: stepContext };
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [cacheId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAgeMs) {
        this.cache.delete(cacheId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 已清理 ${cleanedCount} 个过期XML缓存`);
    }
  }

  /**
   * 获取所有缓存信息（用于调试）
   */
  getCacheStats(): { 
    totalCacheCount: number; 
    totalStepMappings: number; 
    cacheIds: string[]; 
    recentCaches: Array<{ cacheId: string; timestamp: number; elementCount: number }>;
  } {
    return {
      totalCacheCount: this.cache.size,
      totalStepMappings: this.stepXmlMapping.size,
      cacheIds: Array.from(this.cache.keys()),
      recentCaches: Array.from(this.cache.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(entry => ({
          cacheId: entry.cacheId,
          timestamp: entry.timestamp,
          elementCount: entry.pageInfo.elementCount
        }))
    };
  }

  private generateCacheId(): string {
    return `xml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default XmlCacheManager;