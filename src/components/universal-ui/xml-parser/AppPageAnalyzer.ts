/**
 * 应用页面分析器
 * 负责分析XML内容，识别应用名称和当前页面
 */

import { AppPageInfo } from './types';

export class AppPageAnalyzer {
  
  /**
   * 分析XML字符串，提取应用和页面信息
   * @param xmlString XML字符串内容
   * @returns 应用页面信息
   */
  static analyzeAppAndPageInfo(xmlString: string): AppPageInfo {
    if (!xmlString) {
      return this.createDefaultInfo();
    }
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      const appInfo = this.analyzeAppName(xmlDoc);
      const pageInfo = this.analyzePageName(xmlDoc);
      
      return {
        ...appInfo,
        ...pageInfo
      };
    } catch (error) {
      console.error('XML分析失败:', error);
      return this.createDefaultInfo();
    }
  }

  /**
   * 分析应用名称
   * @param xmlDoc 解析后的XML文档
   * @returns 应用信息
   */
  private static analyzeAppName(xmlDoc: Document): Pick<AppPageInfo, 'appName' | 'packageName'> {
    let appName = '未知应用';
    let packageName = '';
    
    // 从根节点获取包名
    const rootNode = xmlDoc.querySelector('hierarchy node');
    if (rootNode) {
      packageName = rootNode.getAttribute('package') || '';
      
      // 根据包名映射应用名称
      appName = this.getAppNameFromPackage(packageName);
    }
    
    return { appName, packageName };
  }

  /**
   * 分析当前页面名称
   * @param xmlDoc 解析后的XML文档
   * @returns 页面信息
   */
  private static analyzePageName(xmlDoc: Document): Pick<AppPageInfo, 'pageName' | 'navigationTexts' | 'selectedTabs'> {
    let pageName = '未知页面';
    const navigationTexts: string[] = [];
    const selectedTabs: string[] = [];
    
    const allNodes = xmlDoc.querySelectorAll('node');
    
    allNodes.forEach(node => {
      const text = node.getAttribute('text') || '';
      const contentDesc = node.getAttribute('content-desc') || '';
      const selected = node.getAttribute('selected') === 'true';
      
      // 检查底部导航
      if (this.isNavigationElement(contentDesc, text)) {
        navigationTexts.push(text || contentDesc);
        if (selected) {
          selectedTabs.push(text || contentDesc);
        }
      }
      
      // 检查顶部标签
      if (this.isTopTabElement(contentDesc, text)) {
        if (selected) {
          selectedTabs.push(text || contentDesc);
        }
      }
    });
    
    // 根据选中的标签确定页面名称
    pageName = this.determinePageName(selectedTabs, navigationTexts);
    
    return { pageName, navigationTexts, selectedTabs };
  }

  /**
   * 根据包名获取应用名称
   * @param packageName 包名
   * @returns 应用名称
   */
  private static getAppNameFromPackage(packageName: string): string {
    const appMappings: { [key: string]: string } = {
      'com.xingin.xhs': '小红书',
      'com.tencent.mm': '微信',
      'com.taobao.taobao': '淘宝',
      'com.jingdong.app.mall': '京东',
      'com.tmall.wireless': '天猫',
      'com.sina.weibo': '微博',
      'com.ss.android.ugc.aweme': '抖音',
      'com.tencent.mobileqq': 'QQ',
      'com.alibaba.android.rimet': '钉钉',
      'com.autonavi.minimap': '高德地图',
      'com.baidu.BaiduMap': '百度地图',
      'com.netease.cloudmusic': '网易云音乐',
      'com.tencent.qqmusic': 'QQ音乐',
      'com.zhihu.android': '知乎',
      'com.tencent.wework': '企业微信',
      'com.eg.android.AlipayGphone': '支付宝'
    };
    
    // 优先匹配完整包名
    if (appMappings[packageName]) {
      return appMappings[packageName];
    }
    
    // 部分匹配
    for (const [pkg, name] of Object.entries(appMappings)) {
      if (packageName.includes(pkg)) {
        return name;
      }
    }
    
    // 从包名推断
    const parts = packageName.split('.');
    return parts[parts.length - 1] || '未知应用';
  }

  /**
   * 判断是否为导航元素
   * @param contentDesc 内容描述
   * @param text 文本内容
   * @returns 是否为导航元素
   */
  private static isNavigationElement(contentDesc: string, text: string): boolean {
    const navKeywords = ['首页', '市集', '发布', '消息', '我', '个人', '主页'];
    return navKeywords.some(keyword => 
      contentDesc.includes(keyword) || text === keyword
    );
  }

  /**
   * 判断是否为顶部标签元素
   * @param contentDesc 内容描述
   * @param text 文本内容
   * @returns 是否为顶部标签元素
   */
  private static isTopTabElement(contentDesc: string, text: string): boolean {
    const tabKeywords = ['关注', '发现', '视频', '推荐', '同城', '附近'];
    return tabKeywords.some(keyword => 
      contentDesc.includes(keyword) || text === keyword
    );
  }

  /**
   * 根据选中的标签确定页面名称
   * @param selectedTabs 选中的标签
   * @param navigationTexts 导航文本
   * @returns 页面名称
   */
  private static determinePageName(selectedTabs: string[], navigationTexts: string[]): string {
    if (selectedTabs.length === 0) {
      return '未知页面';
    }
    
    // 优先使用底部导航的选中状态
    const bottomNavSelected = selectedTabs.find(tab => 
      ['首页', '市集', '发布', '消息', '我'].includes(tab)
    );
    
    if (bottomNavSelected) {
      // 如果在首页，进一步判断顶部标签
      if (bottomNavSelected === '首页') {
        const topTabSelected = selectedTabs.find(tab => 
          ['关注', '发现', '视频', '推荐', '同城'].includes(tab)
        );
        return topTabSelected ? `首页-${topTabSelected}` : '首页';
      }
      return bottomNavSelected;
    }
    
    // 如果没有底部导航选中，使用第一个选中的标签
    return selectedTabs[0];
  }

  /**
   * 创建默认的应用页面信息
   * @returns 默认信息
   */
  private static createDefaultInfo(): AppPageInfo {
    return {
      appName: '未知应用',
      pageName: '未知页面',
      packageName: '',
      navigationTexts: [],
      selectedTabs: []
    };
  }

  /**
   * 获取简化的页面信息（兼容旧接口）
   * @param xmlString XML字符串
   * @returns 简化的页面信息
   */
  static getSimpleAppAndPageInfo(xmlString: string): { appName: string; pageName: string } {
    const fullInfo = this.analyzeAppAndPageInfo(xmlString);
    return {
      appName: fullInfo.appName,
      pageName: fullInfo.pageName
    };
  }
}