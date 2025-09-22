/**
 * 元素分类器
 * 负责对XML节点进行智能分类
 */

import React from 'react';
import { 
  AppstoreOutlined, 
  SearchOutlined,
  UserOutlined,
  MessageOutlined,
  HomeOutlined,
  FileTextOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { RawXmlNode, VisualElementCategory, ElementCategorizerOptions } from './types';

export class ElementCategorizer {
  
  /**
   * 根据XML节点信息判断元素类别
   * @param node XML节点
   * @returns 元素类别字符串
   */
  static categorizeElement(node: RawXmlNode): string {
    const contentDesc = node.getAttribute?.('content-desc') || '';
    const text = node.getAttribute?.('text') || '';
    const className = node.getAttribute?.('class') || '';
    const resourceId = node.getAttribute?.('resource-id') || '';
    
    // 底部导航判断
    if (this.isNavigationElement(contentDesc, text, resourceId)) {
      return 'navigation';
    }
    
    // 顶部标签判断
    if (this.isTabElement(contentDesc, text, className)) {
      return 'tabs';
    }
    
    // 搜索功能判断
    if (this.isSearchElement(contentDesc, className, resourceId)) {
      return 'search';
    }
    
    // 内容卡片判断
    if (this.isContentElement(contentDesc, node)) {
      return 'content';
    }
    
    // 按钮控件判断
    if (this.isButtonElement(className, node)) {
      return 'buttons';
    }
    
    // 文本内容判断
    if (this.isTextElement(className, text)) {
      return 'text';
    }
    
    // 图片内容判断
    if (this.isImageElement(className)) {
      return 'images';
    }
    
    return 'others';
  }

  /**
   * 获取元素的用户友好名称
   * @param node XML节点
   * @returns 用户友好的元素名称
   */
  static getUserFriendlyName(node: RawXmlNode): string {
    const contentDesc = node.getAttribute?.('content-desc') || '';
    const text = node.getAttribute?.('text') || '';
    
    // 优先使用 content-desc
    if (contentDesc && contentDesc.trim()) {
      return contentDesc.trim();
    }
    
    // 其次使用 text
    if (text && text.trim()) {
      return text.trim();
    }
    
    // 根据class名称推断
    const className = node.getAttribute?.('class') || '';
    return this.getNameFromClassName(className);
  }

  /**
   * 获取元素重要性级别
   * @param node XML节点
   * @returns 重要性级别
   */
  static getElementImportance(node: RawXmlNode): 'high' | 'medium' | 'low' {
    const contentDesc = node.getAttribute?.('content-desc') || '';
    const resourceId = node.getAttribute?.('resource-id') || '';
    const clickable = node.getAttribute?.('clickable') === 'true';
    
    // 高重要性：主要导航和核心功能
    if (this.isHighImportanceElement(contentDesc, resourceId)) {
      return 'high';
    }
    
    // 中等重要性：可点击元素和次要功能
    if (this.isMediumImportanceElement(contentDesc, clickable)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 创建默认的元素分类配置
   * @returns 分类配置对象
   */
  static createDefaultCategories(): { [key: string]: VisualElementCategory } {
    return {
      navigation: { 
        name: '底部导航', 
        icon: React.createElement(HomeOutlined), 
        color: '#1890ff', 
        description: '应用主要导航按钮', 
        elements: [] 
      },
      tabs: { 
        name: '顶部标签', 
        icon: React.createElement(AppstoreOutlined), 
        color: '#722ed1', 
        description: '页面切换标签', 
        elements: [] 
      },
      search: { 
        name: '搜索功能', 
        icon: React.createElement(SearchOutlined), 
        color: '#13c2c2', 
        description: '搜索相关功能', 
        elements: [] 
      },
      content: { 
        name: '内容卡片', 
        icon: React.createElement(FileTextOutlined), 
        color: '#52c41a', 
        description: '主要内容区域', 
        elements: [] 
      },
      buttons: { 
        name: '按钮控件', 
        icon: React.createElement(AppstoreOutlined), 
        color: '#fa8c16', 
        description: '可点击的按钮', 
        elements: [] 
      },
      text: { 
        name: '文本内容', 
        icon: React.createElement(FileTextOutlined), 
        color: '#eb2f96', 
        description: '文本信息显示', 
        elements: [] 
      },
      images: { 
        name: '图片内容', 
        icon: React.createElement(PictureOutlined), 
        color: '#f5222d', 
        description: '图片和图标', 
        elements: [] 
      },
      others: { 
        name: '其他元素', 
        icon: React.createElement(AppstoreOutlined), 
        color: '#8c8c8c', 
        description: '其他UI元素', 
        elements: [] 
      }
    };
  }

  // 私有辅助方法
  private static isNavigationElement(contentDesc: string, text: string, resourceId: string): boolean {
    const navKeywords = ['首页', '消息', '我', '市集', '发布', '个人', '主页'];
    const navIds = ['tab_home', 'tab_message', 'tab_profile', 'nav_'];
    
    return navKeywords.some(keyword => 
      contentDesc.includes(keyword) || text.includes(keyword)
    ) || navIds.some(id => resourceId.includes(id));
  }

  private static isTabElement(contentDesc: string, text: string, className: string): boolean {
    const tabKeywords = ['关注', '发现', '视频', '推荐', '同城'];
    return tabKeywords.some(keyword => 
      contentDesc.includes(keyword) || text.includes(keyword)
    ) || className.includes('Tab');
  }

  private static isSearchElement(contentDesc: string, className: string, resourceId: string): boolean {
    return contentDesc.includes('搜索') || 
           className.includes('search') || 
           resourceId.includes('search');
  }

  private static isContentElement(contentDesc: string, node: RawXmlNode): boolean {
    const contentKeywords = ['笔记', '视频', '来自'];
    const clickable = node.getAttribute?.('clickable') === 'true';
    
    return contentKeywords.some(keyword => contentDesc.includes(keyword)) ||
           (clickable && contentDesc.includes('来自'));
  }

  private static isButtonElement(className: string, node: RawXmlNode): boolean {
    const clickable = node.getAttribute?.('clickable') === 'true';
    return className.includes('Button') || 
           (clickable && !className.includes('TextView'));
  }

  private static isTextElement(className: string, text: string): boolean {
    return className.includes('TextView') && text.trim().length > 0;
  }

  private static isImageElement(className: string): boolean {
    return className.includes('ImageView');
  }

  private static getNameFromClassName(className: string): string {
    if (className.includes('Button')) return '按钮';
    if (className.includes('TextView')) return '文本';
    if (className.includes('ImageView')) return '图片';
    if (className.includes('EditText')) return '输入框';
    if (className.includes('RecyclerView')) return '列表';
    if (className.includes('ViewPager')) return '滑动页面';
    if (className.includes('Tab')) return '标签页';
    return '未知元素';
  }

  private static isHighImportanceElement(contentDesc: string, resourceId: string): boolean {
    const highImportanceKeywords = ['首页', '搜索', '笔记', '视频', '发布'];
    const highImportanceIds = ['main_', 'primary_', 'action_'];
    
    return highImportanceKeywords.some(keyword => contentDesc.includes(keyword)) ||
           highImportanceIds.some(id => resourceId.includes(id));
  }

  private static isMediumImportanceElement(contentDesc: string, clickable: boolean): boolean {
    const mediumImportanceKeywords = ['关注', '发现', '消息'];
    return mediumImportanceKeywords.some(keyword => contentDesc.includes(keyword)) ||
           clickable;
  }
}