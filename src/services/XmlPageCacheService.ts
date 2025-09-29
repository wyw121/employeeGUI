/**
 * XML页面缓存管理服务
 * 用于管理和重用历史分析过的XML页面数据
 */

import { invoke } from '@tauri-apps/api/core';
import { RealXMLAnalysisService } from './RealXMLAnalysisService';

export interface CachedXmlPage {
  /** 文件路径 */
  filePath: string;
  /** 文件绝对路径 */
  absoluteFilePath: string;
  /** 文件名 */
  fileName: string;
  /** 设备ID */
  deviceId: string;
  /** 时间戳 */
  timestamp: string;
  /** 页面标题（通过智能识别生成） */
  pageTitle: string;
  /** 应用包名 */
  appPackage: string;
  /** 页面类型 */
  pageType: string;
  /** 元素数量 */
  elementCount: number;
  /** 可点击元素数量 */
  clickableCount: number;
  /** 文件大小（字节） */
  fileSize: number;
  /** 创建时间 */
  createdAt: Date;
  /** 页面描述 */
  description: string;
  /** 预览信息 */
  preview: {
    /** 主要文本内容 */
    mainTexts: string[];
    /** 主要按钮 */
    mainButtons: string[];
    /** 输入框数量 */
    inputCount: number;
  };
}

export interface XmlPageContent {
  /** XML原始内容 */
  xmlContent: string;
  /** 解析后的UI元素 */
  elements: any[];
  /** 页面信息 */
  pageInfo: CachedXmlPage;
}

export class XmlPageCacheService {
  private static readonly DEBUG_XML_DIR = 'debug_xml';
  private static cachedPages: CachedXmlPage[] | null = null;

  /**
   * 获取所有缓存的XML页面
   */
  static async getCachedPages(): Promise<CachedXmlPage[]> {
    if (this.cachedPages === null) {
      await this.loadCachedPages();
    }
    return this.cachedPages || [];
  }

  /**
   * 清除内存缓存，强制重新加载
   */
  static clearCache(): void {
    this.cachedPages = null;
    console.log('🔄 已清除XML页面缓存');
  }

  /**
   * 在文件管理器中打开指定的缓存页面文件
   */
  static async revealCachedPage(cachedPage: CachedXmlPage): Promise<void> {
    const targetPath = cachedPage.absoluteFilePath || cachedPage.filePath;

    try {
      console.log('📂 打开缓存文件所在位置:', targetPath);
      await invoke('reveal_in_file_manager', { path: targetPath });
    } catch (error) {
      console.error('❌ 打开文件管理器失败:', error);
      throw error;
    }
  }

  /**
   * 加载所有缓存页面的元数据
   */
  private static async loadCachedPages(): Promise<void> {
    try {
      console.log('🔍 开始扫描XML缓存页面...');
      
      // 调用Tauri命令获取debug_xml目录中的所有XML文件
      const xmlFiles: string[] = await invoke('list_xml_cache_files');
      
      const pages: CachedXmlPage[] = [];
      
      for (const fileName of xmlFiles) {
        try {
          const pageInfo = await this.analyzeXmlFile(fileName);
          if (pageInfo) {
            pages.push(pageInfo);
          }
        } catch (error) {
          console.warn(`❌ 分析XML文件失败: ${fileName}`, error);
        }
      }
      
      // 按时间戳降序排序（最新的在前面）
      pages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      this.cachedPages = pages;
      console.log(`✅ 成功加载 ${pages.length} 个缓存页面`);
      
    } catch (error) {
      console.error('❌ 加载XML缓存页面失败:', error);
      this.cachedPages = [];
    }
  }

  /**
   * 分析单个XML文件并提取页面信息
   */
  private static async analyzeXmlFile(fileName: string): Promise<CachedXmlPage | null> {
    try {
      // 解析文件名获取基础信息
      const fileInfo = this.parseFileName(fileName);
      if (!fileInfo) {
        return null;
      }

      // 读取XML文件内容
      const xmlContent: string = await invoke('read_xml_cache_file', { fileName });
      
      // 获取文件大小
      const fileSize: number = await invoke('get_xml_file_size', { fileName });
      
      // 使用RealXMLAnalysisService进行智能分析
      const appPackage = this.detectAppPackage(xmlContent);
      const pageAnalysis = this.analyzePageContent(xmlContent, appPackage);
      const absoluteFilePath: string = await invoke('get_xml_file_absolute_path', { fileName });
      
      // 生成页面标题
      const pageTitle = this.generatePageTitle(xmlContent, appPackage, fileInfo.timestamp);
      
      const cachedPage: CachedXmlPage = {
        filePath: `${this.DEBUG_XML_DIR}/${fileName}`,
        absoluteFilePath,
        fileName,
        deviceId: fileInfo.deviceId,
        timestamp: fileInfo.timestamp,
        pageTitle,
        appPackage,
        pageType: pageAnalysis.pageType,
        elementCount: pageAnalysis.elementCount,
        clickableCount: pageAnalysis.clickableCount,
        fileSize,
        createdAt: this.parseTimestampToDate(fileInfo.timestamp),
        description: pageAnalysis.description,
        preview: pageAnalysis.preview
      };

      return cachedPage;
      
    } catch (error) {
      console.error(`❌ 分析XML文件失败: ${fileName}`, error);
      return null;
    }
  }

  /**
   * 解析文件名获取设备ID和时间戳
   * 格式: ui_dump_emulator-5554_20250918_164711.xml
   */
  private static parseFileName(fileName: string): { deviceId: string; timestamp: string } | null {
    const match = fileName.match(/ui_dump_([^_]+)_(\d{8}_\d{6})\.xml$/);
    if (!match) {
      return null;
    }
    return {
      deviceId: match[1],
      timestamp: match[2]
    };
  }

  /**
   * 将时间戳转换为Date对象
   * 注意：Rust后端生成的时间戳是UTC时间，需要正确解析
   */
  private static parseTimestampToDate(timestamp: string): Date {
    // 格式: 20250918_164711 (UTC时间)
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1; // 月份从0开始
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(9, 11));
    const minute = parseInt(timestamp.substring(11, 13));
    const second = parseInt(timestamp.substring(13, 15));
    
    // 创建UTC时间对象，避免时区转换问题
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));
    
    // 调试日志：验证时间解析是否正确
    console.log(`🕐 时间戳解析: ${timestamp} -> UTC: ${utcDate.toUTCString()} -> 本地: ${utcDate.toLocaleString('zh-CN')}`);
    
    return utcDate;
  }

  /**
   * 检测应用包名
   */
  private static detectAppPackage(xmlContent: string): string {
    if (xmlContent.includes('com.xingin.xhs')) {
      return 'com.xingin.xhs';
    } else if (xmlContent.includes('com.tencent.mm')) {
      return 'com.tencent.mm';
    } else if (xmlContent.includes('com.android.contacts')) {
      return 'com.android.contacts';
    }
    return 'unknown';
  }

  /**
   * 分析页面内容
   */
  private static analyzePageContent(xmlContent: string, appPackage: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    // 统计元素
    const allElements = doc.querySelectorAll('*');
    const clickableElements = doc.querySelectorAll('[clickable="true"]');
    const inputElements = doc.querySelectorAll('EditText');
    
    // 提取主要文本内容
    const textElements = Array.from(doc.querySelectorAll('*'))
      .map(el => el.getAttribute('text'))
      .filter(text => text && text.trim().length > 0 && text.trim().length < 20)
      .slice(0, 10); // 取前10个

    // 提取主要按钮
    const buttonTexts = Array.from(clickableElements)
      .map(el => el.getAttribute('text'))
      .filter(text => text && text.trim().length > 0 && text.trim().length < 15)
      .slice(0, 8); // 取前8个

    // 识别页面类型
    const pageType = this.identifyPageType(xmlContent, appPackage);
    const description = this.generatePageDescription(xmlContent, appPackage, pageType);

    return {
      elementCount: allElements.length,
      clickableCount: clickableElements.length,
      pageType,
      description,
      preview: {
        mainTexts: textElements,
        mainButtons: buttonTexts,
        inputCount: inputElements.length
      }
    };
  }

  /**
   * 识别页面类型
   */
  private static identifyPageType(xmlContent: string, appPackage: string): string {
    if (appPackage === 'com.xingin.xhs') {
      if (xmlContent.includes('发现') && xmlContent.includes('首页')) {
        return '小红书首页';
      } else if (xmlContent.includes('搜索')) {
        return '小红书搜索页';
      } else if (xmlContent.includes('消息') || xmlContent.includes('聊天')) {
        return '小红书消息页';
      } else if (xmlContent.includes('我') && (xmlContent.includes('关注') || xmlContent.includes('粉丝'))) {
        return '小红书个人中心';
      } else if (xmlContent.includes('笔记详情') || xmlContent.includes('评论')) {
        return '小红书详情页';
      } else {
        return '小红书页面';
      }
    } else if (appPackage === 'com.tencent.mm') {
      return '微信页面';
    } else if (appPackage === 'com.android.contacts') {
      return '系统通讯录';
    }
    return '未知页面';
  }

  /**
   * 生成页面标题
   */
  private static generatePageTitle(xmlContent: string, appPackage: string, timestamp: string): string {
    const pageType = this.identifyPageType(xmlContent, appPackage);
    const timeStr = this.formatTimestamp(timestamp);
    return `${pageType} - ${timeStr}`;
  }

  /**
   * 生成页面描述
   */
  private static generatePageDescription(xmlContent: string, appPackage: string, pageType: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const clickableCount = doc.querySelectorAll('[clickable="true"]').length;
    const inputCount = doc.querySelectorAll('EditText').length;
    
    let description = `${pageType}`;
    
    if (clickableCount > 0) {
      description += ` • ${clickableCount}个可点击元素`;
    }
    if (inputCount > 0) {
      description += ` • ${inputCount}个输入框`;
    }
    
    return description;
  }

  /**
   * 格式化时间戳显示
   */
  private static formatTimestamp(timestamp: string): string {
    // 20250918_164711 => 09-18 16:47
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    return `${month}-${day} ${hour}:${minute}`;
  }

  /**
   * 加载指定缓存页面的完整内容
   */
  static async loadPageContent(cachedPage: CachedXmlPage): Promise<XmlPageContent> {
    try {
      console.log(`🔄 加载缓存页面: ${cachedPage.pageTitle}`);
      
      // 读取XML内容
      const xmlContent: string = await invoke('read_xml_cache_file', { 
        fileName: cachedPage.fileName 
      });
      
      // 解析XML为UI元素
      const elements = await this.parseXmlToElements(xmlContent);
      
      return {
        xmlContent,
        elements,
        pageInfo: cachedPage
      };
      
    } catch (error) {
      console.error(`❌ 加载缓存页面失败: ${cachedPage.fileName}`, error);
      throw error;
    }
  }

  /**
   * 解析XML内容为UI元素数组
   */
  private static async parseXmlToElements(xmlContent: string): Promise<any[]> {
    try {
      // 调用Rust后端解析XML
      const elements = await invoke('parse_cached_xml_to_elements', { xmlContent });
      return elements as any[];
    } catch (error) {
      console.error('❌ XML解析失败，使用前端备用解析器:', error);
      
      // 前端备用解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const elements: any[] = [];
      
      doc.querySelectorAll('*').forEach((el, index) => {
        const bounds = el.getAttribute('bounds');
        const text = el.getAttribute('text');
        const resourceId = el.getAttribute('resource-id');
        const className = el.getAttribute('class');
        const clickable = el.getAttribute('clickable') === 'true';
        
        if (bounds) {
          elements.push({
            id: `element_${index}`,
            text: text || '',
            element_type: className || 'View',
            resource_id: resourceId || '',
            bounds: this.parseBounds(bounds),
            is_clickable: clickable,
            is_scrollable: el.getAttribute('scrollable') === 'true',
            is_enabled: el.getAttribute('enabled') !== 'false',
            checkable: el.getAttribute('checkable') === 'true',
            checked: el.getAttribute('checked') === 'true',
            selected: el.getAttribute('selected') === 'true',
            password: el.getAttribute('password') === 'true',
            content_desc: el.getAttribute('content-desc') || ''
          });
        }
      });
      
      return elements;
    }
  }

  /**
   * 解析bounds字符串
   */
  private static parseBounds(boundsStr: string) {
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return { left: 0, top: 0, right: 0, bottom: 0 };
    
    const [, left, top, right, bottom] = match.map(Number);
    return { left, top, right, bottom };
  }

  /**
   * 刷新缓存页面列表
   */
  static async refreshCache(): Promise<void> {
    this.cachedPages = null;
    await this.loadCachedPages();
  }

  /**
   * 删除指定的缓存页面
   */
  static async deleteCachedPage(fileName: string): Promise<void> {
    try {
      await invoke('delete_xml_cache_file', { fileName });
      
      // 更新本地缓存
      if (this.cachedPages) {
        this.cachedPages = this.cachedPages.filter(page => page.fileName !== fileName);
      }
      
      console.log(`✅ 已删除缓存页面: ${fileName}`);
    } catch (error) {
      console.error(`❌ 删除缓存页面失败: ${fileName}`, error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{
    totalPages: number;
    totalSize: number;
    appPackages: { [key: string]: number };
    oldestPage?: Date;
    newestPage?: Date;
  }> {
    const pages = await this.getCachedPages();
    
    const stats = {
      totalPages: pages.length,
      totalSize: pages.reduce((sum, page) => sum + page.fileSize, 0),
      appPackages: {},
      oldestPage: pages.length > 0 ? new Date(Math.min(...pages.map(p => p.createdAt.getTime()))) : undefined,
      newestPage: pages.length > 0 ? new Date(Math.max(...pages.map(p => p.createdAt.getTime()))) : undefined
    };

    // 统计应用分布
    pages.forEach(page => {
      const app = page.appPackage;
      stats.appPackages[app] = (stats.appPackages[app] || 0) + 1;
    });

    return stats;
  }
}