/**
 * Universal UI页面分析器API
 * 封装与Tauri后端的Universal UI分析功能交互
 */

import { invoke } from '@tauri-apps/api/core';

// 类型定义
export interface UIElement {
  id: string;
  element_type: string;
  text: string;
  bounds: ElementBounds;
  xpath: string;
  resource_id?: string;
  class_name?: string;
  is_clickable: boolean;  // 修正字段名，匹配Rust后端
  is_scrollable: boolean; // 修正字段名，匹配Rust后端
  is_enabled: boolean;    // 修正字段名，匹配Rust后端
  checkable: boolean;
  checked: boolean;
  selected: boolean;
  password: boolean;
  content_desc?: string;
}

export interface ElementBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 智能导航相关类型定义
export interface SmartNavigationParams {
  navigation_type: string;
  target_button: string;
  click_action: string;
  app_name?: string;
  position_ratio?: {
    x_start: number;
    x_end: number;
    y_start: number;
    y_end: number;
  };
  custom_config?: any;
}

export interface UniversalClickResult {
  success: boolean;
  element_found: boolean;
  click_executed: boolean;
  execution_time_ms: number;
  mode: string;
  error_message?: string;
  found_element?: {
    text: string;
    position: string;
  };
}

export interface NavigationPresets {
  apps: string[];
  navigation_types: string[];
  common_buttons: string[];
}

/**
 * Universal UI页面分析API类
 */
export class UniversalUIAPI {
  
  /**
   * 分析Universal UI页面
   */
  static async analyzeUniversalUIPage(deviceId: string): Promise<string> {
    try {
      return await invoke<string>('analyze_universal_ui_page', { deviceId });
    } catch (error) {
      console.error('Failed to analyze universal UI page:', error);
      throw new Error(`Universal UI页面分析失败: ${error}`);
    }
  }

  /**
   * 提取页面元素（前端实现，避免Rust编译问题）
   */
  static async extractPageElements(xmlContent: string): Promise<UIElement[]> {
    try {
      // 优先尝试后端解析
      try {
        return await invoke<UIElement[]>('extract_page_elements_simple', { xml_content: xmlContent });
      } catch (backendError) {
        console.warn('后端解析失败，使用前端解析:', backendError);
        // 后端失败时使用前端解析
        return this.parseXMLToElements(xmlContent);
      }
    } catch (error) {
      console.error('Failed to extract page elements:', error);
      throw new Error(`提取页面元素失败: ${error}`);
    }
  }

  /**
   * 前端XML解析器 - 提取UI元素
   */
  private static parseXMLToElements(xmlContent: string): UIElement[] {
    const elements: UIElement[] = [];
    
    try {
      // 创建DOM解析器
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // 检查解析错误
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML解析错误: ${parseError.textContent}`);
      }
      
      // 递归遍历所有节点
      const traverseNode = (node: Element, depth: number = 0) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'node') {
          const bounds = this.parseBounds(node.getAttribute('bounds') || '');
          const text = node.getAttribute('text') || '';
          const contentDesc = node.getAttribute('content-desc') || '';
          const resourceId = node.getAttribute('resource-id') || '';
          const className = node.getAttribute('class') || '';
          const clickable = node.getAttribute('clickable') === 'true';
          const scrollable = node.getAttribute('scrollable') === 'true';
          const enabled = node.getAttribute('enabled') !== 'false';
          const checkable = node.getAttribute('checkable') === 'true';
          const checked = node.getAttribute('checked') === 'true';
          const selected = node.getAttribute('selected') === 'true';
          const password = node.getAttribute('password') === 'true';
          
          // 只保留有意义的元素
          if (text || contentDesc || resourceId || clickable) {
            elements.push({
              id: `element_${elements.length}`,
              element_type: className || 'unknown',
              text,
              bounds,
              xpath: this.generateXPath(node, depth),
              resource_id: resourceId,
              class_name: className,
              is_clickable: clickable,  // 使用正确的字段名
              is_scrollable: scrollable, // 修正字段名
              is_enabled: enabled,       // 修正字段名
              checkable,
              checked,
              selected,
              password,
              content_desc: contentDesc,
            });
          }
        }
        
        // 递归处理子节点
        for (let i = 0; i < node.children.length; i++) {
          traverseNode(node.children[i], depth + 1);
        }
      };
      
      // 从根节点开始遍历
      const rootNodes = xmlDoc.querySelectorAll('hierarchy > node');
      rootNodes.forEach(node => traverseNode(node, 0));
      
      console.log(`前端解析完成，提取到 ${elements.length} 个UI元素`);
      return elements;
      
    } catch (error) {
      console.error('前端XML解析失败:', error);
      throw new Error(`前端XML解析失败: ${error}`);
    }
  }

  /**
   * 解析bounds字符串为ElementBounds对象
   */
  private static parseBounds(boundsStr: string): ElementBounds {
    // bounds格式: [left,top][right,bottom]
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      return {
        left: parseInt(match[1]),
        top: parseInt(match[2]),
        right: parseInt(match[3]),
        bottom: parseInt(match[4]),
      };
    }
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  /**
   * 为节点生成简单的XPath
   */
  private static generateXPath(node: Element, depth: number): string {
    const className = node.getAttribute('class') || 'unknown';
    const resourceId = node.getAttribute('resource-id');
    
    if (resourceId) {
      return `//*[@resource-id='${resourceId}']`;
    }
    
    return `//*[@class='${className}'][${depth}]`;
  }

  /**
   * 去重元素
   */
  static async deduplicateElements(elements: UIElement[]): Promise<UIElement[]> {
    try {
      return await invoke<UIElement[]>('deduplicate_elements', { elements });
    } catch (error) {
      console.error('Failed to deduplicate elements:', error);
      throw new Error(`去重元素失败: ${error}`);
    }
  }

  /**
   * 获取元素的可读描述
   */
  static getElementDescription(element: UIElement): string {
    const parts: string[] = [];
    
    if (element.text.trim()) {
      parts.push(`文本: "${element.text}"`);
    }
    
    if (element.content_desc) {
      parts.push(`描述: "${element.content_desc}"`);
    }
    
    if (element.resource_id) {
      parts.push(`ID: ${element.resource_id}`);
    }
    
    parts.push(`类型: ${element.element_type}`);
    
    const states: string[] = [];
    if (element.is_clickable) states.push('可点击');
    if (element.is_scrollable) states.push('可滚动');
    if (element.is_enabled) states.push('启用');
    if (element.checkable) states.push('可选择');
    if (element.checked) states.push('已选择');
    
    if (states.length > 0) {
      parts.push(`状态: ${states.join(', ')}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * 计算元素中心点坐标
   */
  static getElementCenter(bounds: ElementBounds): { x: number; y: number } {
    return {
      x: Math.round((bounds.left + bounds.right) / 2),
      y: Math.round((bounds.top + bounds.bottom) / 2),
    };
  }

  /**
   * 过滤可交互的元素
   */
  static filterInteractiveElements(elements: UIElement[]): UIElement[] {
    return elements.filter(element => 
      element.is_clickable || 
      element.is_scrollable || 
      element.checkable ||
      element.element_type === 'EditText' ||
      element.element_type === 'Button'
    );
  }

  /**
   * 按类型分组元素
   */
  static groupElementsByType(elements: UIElement[]): Record<string, UIElement[]> {
    const grouped: Record<string, UIElement[]> = {};
    
    elements.forEach(element => {
      const type = element.element_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(element);
    });
    
    return grouped;
  }

  /**
   * 搜索包含指定文本的元素
   */
  static searchElementsByText(elements: UIElement[], searchText: string): UIElement[] {
    const lowerSearchText = searchText.toLowerCase();
    
    return elements.filter(element =>
      element.text.toLowerCase().includes(lowerSearchText) ||
      (element.content_desc && element.content_desc.toLowerCase().includes(lowerSearchText)) ||
      (element.resource_id && element.resource_id.toLowerCase().includes(lowerSearchText))
    );
  }
}

/**
 * Universal UI智能导航服务类
 * 提供智能导航和元素查找功能
 */
export class UniversalUIService {

  /**
   * 执行智能导航点击（统一入口）
   * 支持双模式：指定应用模式 vs 直接ADB模式
   */
  static async executeUIClick(
    deviceId: string,
    params: SmartNavigationParams
  ): Promise<UniversalClickResult> {
    try {
      return await invoke<UniversalClickResult>('execute_universal_ui_click', {
        deviceId: deviceId,
        params,
      });
    } catch (error) {
      console.error('Failed to execute UI click:', error);
      throw new Error(`智能导航执行失败: ${error}`);
    }
  }

  /**
   * 快速点击（简化接口）
   * 自动使用指定应用模式
   */
  static async quickClick(
    deviceId: string,
    appName: string,
    buttonText: string
  ): Promise<UniversalClickResult> {
    try {
      const params: SmartNavigationParams = {
        navigation_type: 'bottom',
        target_button: buttonText,
        click_action: 'single_tap',
        app_name: appName,
      };
      return await this.executeUIClick(deviceId, params);
    } catch (error) {
      console.error('Failed to execute quick click:', error);
      throw new Error(`快速点击执行失败: ${error}`);
    }
  }

  /**
   * 直接ADB点击（跳过应用检测）
   * 用于快速测试当前界面
   */
  static async directClick(
    deviceId: string,
    buttonText: string,
    positionHint?: string
  ): Promise<UniversalClickResult> {
    try {
      const params: SmartNavigationParams = {
        navigation_type: 'bottom',
        target_button: buttonText,
        click_action: 'single_tap',
        // 不指定 app_name，表示直接ADB模式
      };
      return await this.executeUIClick(deviceId, params);
    } catch (error) {
      console.error('Failed to execute direct click:', error);
      throw new Error(`直接点击执行失败: ${error}`);
    }
  }

  /**
   * 获取预设配置信息
   * 包含应用列表和导航类型定义
   */
  static async getNavigationPresets(): Promise<NavigationPresets> {
    try {
      // 暂时返回默认配置，后续可以通过后端命令获取
      return {
        apps: ['小红书', '微信', '抖音', '淘宝'],
        navigation_types: ['bottom', 'top', 'left', 'right'],
        common_buttons: ['我', '首页', '发现', '消息', '购物车', '个人中心']
      };
    } catch (error) {
      console.error('Failed to get navigation presets:', error);
      throw new Error(`获取导航预设失败: ${error}`);
    }
  }

  /**
   * 格式化执行结果信息
   */
  static formatResult(result: UniversalClickResult): {
    statusText: string;
    detailText: string;
    success: boolean;
  } {
    const { success, element_found, click_executed, execution_time_ms, mode, error_message } = result;

    let statusText = '';
    let detailText = '';

    if (success) {
      statusText = '✅ 执行成功';
      detailText = `模式: ${mode}, 执行时间: ${execution_time_ms}ms`;
    } else if (!element_found) {
      statusText = '❌ 未找到元素';
      detailText = error_message || '目标按钮未在指定区域找到';
    } else if (!click_executed) {
      statusText = '⚠️ 点击失败';
      detailText = error_message || '找到元素但点击操作失败';
    } else {
      statusText = '❌ 执行失败';
      detailText = error_message || '未知错误';
    }

    return { statusText, detailText, success };
  }
}

export default UniversalUIAPI;
