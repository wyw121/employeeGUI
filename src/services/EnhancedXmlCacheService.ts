/**
 * 增强的XML页面缓存服务
 * 支持保存和加载完整的视图数据，避免重复计算
 */

import { invoke } from '@tauri-apps/api/core';
import { UnifiedViewData, UnifiedViewDataManager } from './UnifiedViewDataManager';
import { CachedXmlPage } from './XmlPageCacheService';

export interface EnhancedCachedPage extends CachedXmlPage {
  // 是否已计算完整视图数据
  hasEnhancedData: boolean;
  // 数据版本（用于兼容性检查）
  dataVersion: string;
  // 缓存的数据大小（字节）
  enhancedDataSize: number;
}

export interface CachedViewData {
  // 页面信息
  pageInfo: EnhancedCachedPage;
  // 完整的统一视图数据
  unifiedData: UnifiedViewData;
  // 缓存时间
  cachedAt: Date;
}

/**
 * 增强的XML页面缓存服务
 */
export class EnhancedXmlCacheService {
  private static readonly ENHANCED_CACHE_DIR = 'enhanced_cache';
  private static readonly DATA_VERSION = '1.0.0';
  private static memoryCache = new Map<string, CachedViewData>();
  private static readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5分钟内存缓存

  /**
   * 加载页面的完整视图数据
   */
  static async loadEnhancedPageData(
    cachedPage: CachedXmlPage,
    forceRegenerate: boolean = false
  ): Promise<CachedViewData> {
    const cacheKey = this.generateCacheKey(cachedPage);
    
    // 检查内存缓存
    if (!forceRegenerate) {
      const memoryData = this.memoryCache.get(cacheKey);
      if (memoryData && this.isMemoryCacheValid(memoryData)) {
        console.log('🎯 使用内存缓存的增强数据');
        return memoryData;
      }
    }

    try {
      // 尝试加载持久化的增强数据
      if (!forceRegenerate) {
        const diskData = await this.loadFromDisk(cachedPage);
        if (diskData) {
          console.log('💾 加载磁盘缓存的增强数据');
          this.memoryCache.set(cacheKey, diskData);
          return diskData;
        }
      }

      console.log('🔄 生成新的增强视图数据...');
      
      // 读取原始XML
      const xmlContent = await this.loadXmlContent(cachedPage.fileName);
      
      // 生成统一视图数据
      const unifiedData = await UnifiedViewDataManager.generateUnifiedData(
        xmlContent,
        cachedPage.deviceId,
        { 
          forceReanalyze: forceRegenerate,
          verbose: forceRegenerate 
        }
      );

      // 创建增强的缓存数据
      const enhancedPage: EnhancedCachedPage = {
        ...cachedPage,
        hasEnhancedData: true,
        dataVersion: this.DATA_VERSION,
        enhancedDataSize: this.calculateDataSize(unifiedData)
      };

      const cachedViewData: CachedViewData = {
        pageInfo: enhancedPage,
        unifiedData,
        cachedAt: new Date()
      };

      // 保存到磁盘缓存
      await this.saveToDisk(cachedViewData);
      
      // 保存到内存缓存
      this.memoryCache.set(cacheKey, cachedViewData);

      console.log(`✅ 增强视图数据生成完成: ${unifiedData.enhancedElements.length} 个增强元素`);
      return cachedViewData;

    } catch (error) {
      console.error('❌ 加载增强页面数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量预加载增强数据
   */
  static async preloadEnhancedData(cachedPages: CachedXmlPage[]): Promise<void> {
    console.log(`🚀 开始预加载 ${cachedPages.length} 个页面的增强数据...`);
    
    const batchSize = 3; // 并发处理3个页面
    for (let i = 0; i < cachedPages.length; i += batchSize) {
      const batch = cachedPages.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (page) => {
          try {
            await this.loadEnhancedPageData(page);
            console.log(`✅ 预加载完成: ${page.pageTitle}`);
          } catch (error) {
            console.warn(`⚠️ 预加载失败: ${page.pageTitle}`, error);
          }
        })
      );
    }
    
    console.log('🎉 批量预加载完成');
  }

  /**
   * 检查页面是否有增强数据缓存
   */
  static async hasEnhancedCache(cachedPage: CachedXmlPage): Promise<boolean> {
    try {
      const fileName = this.getEnhancedFileName(cachedPage);
      const exists: boolean = await invoke('enhanced_cache_file_exists', { fileName });
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取增强缓存统计信息
   */
  static async getEnhancedCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    memorySize: number;
    oldestCache: Date | null;
    newestCache: Date | null;
  }> {
    try {
      const stats = await invoke('get_enhanced_cache_stats') as any;
      return {
        totalFiles: stats.totalFiles || 0,
        totalSize: stats.totalSize || 0,
        memorySize: this.memoryCache.size,
        oldestCache: stats.oldestCache ? new Date(stats.oldestCache) : null,
        newestCache: stats.newestCache ? new Date(stats.newestCache) : null
      };
    } catch (error) {
      console.error('获取增强缓存统计失败:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        memorySize: this.memoryCache.size,
        oldestCache: null,
        newestCache: null
      };
    }
  }

  /**
   * 清理过期的增强缓存
   */
  static async cleanupExpiredCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const deletedCount: number = await invoke('cleanup_enhanced_cache', { maxAge });
      
      // 清理内存缓存
      const now = Date.now();
      let memoryDeleted = 0;
      
      for (const [key, data] of this.memoryCache.entries()) {
        if (now - data.cachedAt.getTime() > maxAge) {
          this.memoryCache.delete(key);
          memoryDeleted++;
        }
      }
      
      console.log(`🧹 清理完成: 磁盘 ${deletedCount} 个, 内存 ${memoryDeleted} 个`);
      return deletedCount + memoryDeleted;
    } catch (error) {
      console.error('清理增强缓存失败:', error);
      return 0;
    }
  }

  /**
   * 完全清除所有增强缓存
   */
  static async clearAllEnhancedCache(): Promise<void> {
    try {
      await invoke('clear_all_enhanced_cache');
      this.memoryCache.clear();
      UnifiedViewDataManager.clearCache();
      console.log('🗑️ 所有增强缓存已清除');
    } catch (error) {
      console.error('清除增强缓存失败:', error);
      throw error;
    }
  }

  // 私有方法

  private static async loadXmlContent(fileName: string): Promise<string> {
    return await invoke('read_xml_cache_file', { fileName });
  }

  private static async loadFromDisk(cachedPage: CachedXmlPage): Promise<CachedViewData | null> {
    try {
      const fileName = this.getEnhancedFileName(cachedPage);
      const exists: boolean = await invoke('enhanced_cache_file_exists', { fileName });
      
      if (!exists) return null;

      const data: string = await invoke('read_enhanced_cache_file', { fileName });
      const parsed = JSON.parse(data);
      
      // 检查数据版本兼容性
      if (parsed.pageInfo.dataVersion !== this.DATA_VERSION) {
        console.warn(`⚠️ 数据版本不匹配: ${parsed.pageInfo.dataVersion} vs ${this.DATA_VERSION}`);
        return null;
      }

      // 恢复Date对象
      parsed.cachedAt = new Date(parsed.cachedAt);
      parsed.unifiedData.metadata.generatedAt = new Date(parsed.unifiedData.metadata.generatedAt);

      return parsed as CachedViewData;
    } catch (error) {
      console.warn('加载磁盘增强缓存失败:', error);
      return null;
    }
  }

  private static async saveToDisk(cachedViewData: CachedViewData): Promise<void> {
    try {
      const fileName = this.getEnhancedFileName(cachedViewData.pageInfo);
      const data = JSON.stringify(cachedViewData, null, 2);
      
      await invoke('save_enhanced_cache_file', { 
        fileName, 
        content: data,
        metadata: {
          size: data.length,
          elementCount: cachedViewData.unifiedData.enhancedElements.length,
          pageTitle: cachedViewData.pageInfo.pageTitle
        }
      });
      
      console.log(`💾 增强数据已保存: ${fileName}`);
    } catch (error) {
      console.error('保存增强缓存失败:', error);
      // 不抛出错误，允许继续使用内存数据
    }
  }

  private static generateCacheKey(cachedPage: CachedXmlPage): string {
    return `enhanced_${cachedPage.fileName}_${cachedPage.timestamp}`;
  }

  private static getEnhancedFileName(cachedPage: CachedXmlPage): string {
    return cachedPage.fileName.replace('.xml', '.enhanced.json');
  }

  private static isMemoryCacheValid(data: CachedViewData): boolean {
    const now = Date.now();
    const cacheTime = data.cachedAt.getTime();
    return (now - cacheTime) < this.MEMORY_CACHE_TTL;
  }

  private static calculateDataSize(unifiedData: UnifiedViewData): number {
    return JSON.stringify(unifiedData).length;
  }

  /**
   * 获取页面的快速预览数据（不包含完整计算）
   */
  static async getQuickPreview(cachedPage: CachedXmlPage): Promise<{
    elementCount: number;
    clickableCount: number;
    hasEnhancedCache: boolean;
    lastCacheTime?: Date;
  }> {
    const hasCache = await this.hasEnhancedCache(cachedPage);
    
    let lastCacheTime: Date | undefined;
    if (hasCache) {
      try {
        const fileName = this.getEnhancedFileName(cachedPage);
        const metadata = await invoke('get_enhanced_cache_metadata', { fileName }) as any;
        lastCacheTime = new Date(metadata.lastModified);
      } catch (error) {
        console.warn('获取缓存元数据失败:', error);
      }
    }

    return {
      elementCount: cachedPage.elementCount,
      clickableCount: cachedPage.clickableCount,
      hasEnhancedCache: hasCache,
      lastCacheTime
    };
  }

  /**
   * 异步更新增强缓存（后台处理）
   */
  static async updateEnhancedCacheInBackground(cachedPages: CachedXmlPage[]): Promise<void> {
    // 在后台异步处理，不阻塞主线程
    setTimeout(async () => {
      try {
        await this.preloadEnhancedData(cachedPages);
      } catch (error) {
        console.error('后台更新增强缓存失败:', error);
      }
    }, 100);
  }

  /**
   * 清除所有缓存（内存 + 磁盘）
   */
  static async clearAllCache(): Promise<void> {
    try {
      // 清除内存缓存
      this.memoryCache.clear();
      console.log('🗑️ 内存缓存已清除');

      // 清除统一视图数据管理器缓存
      UnifiedViewDataManager.clearCache();

      // 清除磁盘缓存
      await invoke('clear_enhanced_cache_directory');
      console.log('🗑️ 磁盘缓存已清除');

      console.log('✅ 所有增强缓存已清除');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
      throw error;
    }
  }

  /**
   * 强制重新分析指定页面
   */
  static async forceReanalyze(cachedPage: CachedXmlPage): Promise<CachedViewData> {
    console.log(`🔄 强制重新分析页面: ${cachedPage.pageTitle}`);
    
    // 清除该页面的缓存
    const cacheKey = this.generateCacheKey(cachedPage);
    this.memoryCache.delete(cacheKey);

    try {
      // 删除磁盘缓存文件
      const fileName = this.getEnhancedFileName(cachedPage);
      await invoke('delete_enhanced_cache_file', { fileName });
    } catch (error) {
      // 文件可能不存在，忽略错误
      console.warn('删除磁盘缓存文件失败:', error);
    }

    // 重新生成数据
    return await this.loadEnhancedPageData(cachedPage, true);
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    memoryCache: { size: number; keys: string[] };
    unifiedViewCache: { size: number; keys: string[] };
  } {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      unifiedViewCache: UnifiedViewDataManager.getCacheStats()
    };
  }
}