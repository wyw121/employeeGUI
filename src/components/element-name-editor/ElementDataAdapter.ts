/**
 * 元素数据适配器
 * 将不同格式的元素数据转换为AndroidXMLFields格式
 */

import { AndroidXMLFields } from './AndroidXMLFieldAnalyzer';

// 扩展的UI元素接口，包含层级关系
export interface ExtendedUIElement {
  id: string;
  text?: string;
  elementType?: string;
  element_type?: string;
  resourceId?: string;
  resource_id?: string;
  className?: string;
  class?: string;
  content_desc?: string;
  clickable?: boolean | string;
  enabled?: boolean | string;
  focusable?: boolean | string;
  scrollable?: boolean | string;
  selected?: boolean | string;
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | string;
  index?: number | string;
  package?: string;
  checkable?: boolean | string;
  checked?: boolean | string;
  password?: boolean | string;
  focused?: boolean | string;
  'long-clickable'?: boolean | string;
  
  // 层级关系
  parent?: ExtendedUIElement;
  children?: ExtendedUIElement[];
  siblings?: ExtendedUIElement[];
}

/**
 * 将布尔值或字符串转换为Android XML格式的字符串
 */
const toBooleanString = (value: boolean | string | undefined): 'true' | 'false' => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' ? 'true' : 'false';
  }
  return value ? 'true' : 'false';
};

/**
 * 将bounds对象转换为Android XML格式的字符串
 */
const boundsToString = (bounds: any): string => {
  if (typeof bounds === 'string') return bounds;
  if (!bounds) return '';
  
  return `[${bounds.left},${bounds.top}][${bounds.right},${bounds.bottom}]`;
};

/**
 * 将ExtendedUIElement转换为AndroidXMLFields格式
 */
export const adaptToAndroidXMLFields = (element: ExtendedUIElement): Partial<AndroidXMLFields> => {
  return {
    // 基础文本信息
    text: element.text || '',
    'content-desc': element.content_desc || '',
    
    // 标识和类型
    'resource-id': element.resourceId || element.resource_id || '',
    class: element.className || element.class || element.elementType || element.element_type || '',
    package: element.package || '',
    
    // 位置和尺寸
    bounds: boundsToString(element.bounds),
    index: String(element.index || ''),
    
    // 交互属性
    clickable: toBooleanString(element.clickable),
    'long-clickable': toBooleanString(element['long-clickable']),
    scrollable: toBooleanString(element.scrollable),
    focusable: toBooleanString(element.focusable),
    enabled: toBooleanString(element.enabled),
    selected: toBooleanString(element.selected),
    
    // 表单属性
    checkable: toBooleanString(element.checkable),
    checked: toBooleanString(element.checked),
    password: toBooleanString(element.password),
    
    // 状态属性
    focused: toBooleanString(element.focused),
  };
};

/**
 * 从Android XML节点对象创建ExtendedUIElement
 */
export const createElementFromXMLNode = (node: any, parent?: ExtendedUIElement): ExtendedUIElement => {
  const element: ExtendedUIElement = {
    id: generateElementId(node),
    text: node.text || node['@text'] || '',
    elementType: node.class || node['@class'] || '',
    element_type: node.class || node['@class'] || '',
    resourceId: node['resource-id'] || node['@resource-id'] || '',
    resource_id: node['resource-id'] || node['@resource-id'] || '',
    className: node.class || node['@class'] || '',
    class: node.class || node['@class'] || '',
    content_desc: node['content-desc'] || node['@content-desc'] || '',
    clickable: node.clickable || node['@clickable'] || 'false',
    enabled: node.enabled || node['@enabled'] || 'true',
    focusable: node.focusable || node['@focusable'] || 'false',
    scrollable: node.scrollable || node['@scrollable'] || 'false',
    selected: node.selected || node['@selected'] || 'false',
    bounds: node.bounds || node['@bounds'] || '',
    index: node.index || node['@index'] || '0',
    package: node.package || node['@package'] || '',
    checkable: node.checkable || node['@checkable'] || 'false',
    checked: node.checked || node['@checked'] || 'false',
    password: node.password || node['@password'] || 'false',
    focused: node.focused || node['@focused'] || 'false',
    'long-clickable': node['long-clickable'] || node['@long-clickable'] || 'false',
    
    parent: parent
  };
  
  // 处理子元素
  if (node.children || node.node) {
    const childNodes = node.children || (Array.isArray(node.node) ? node.node : [node.node]);
    element.children = childNodes.map((child: any) => createElementFromXMLNode(child, element));
    
    // 设置兄弟元素关系
    if (element.children.length > 0) {
      element.children.forEach((child, index) => {
        child.siblings = element.children?.filter((_, i) => i !== index) || [];
      });
    }
  }
  
  return element;
};

/**
 * 生成元素唯一ID
 */
const generateElementId = (node: any): string => {
  const text = node.text || node['@text'] || '';
  const resourceId = node['resource-id'] || node['@resource-id'] || '';
  const className = node.class || node['@class'] || '';
  const bounds = node.bounds || node['@bounds'] || '';
  
  const key = `${className}_${resourceId}_${text}_${bounds}`;
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
};

/**
 * 示例：创建测试数据
 */
export const createSampleElement = (): ExtendedUIElement => {
  return {
    id: 'sample_element_001',
    text: '首页',
    elementType: 'android.view.ViewGroup',
    element_type: 'android.view.ViewGroup',
    resourceId: 'com.xingin.xhs:id/main_tab_home',
    resource_id: 'com.xingin.xhs:id/main_tab_home',
    className: 'android.view.ViewGroup',
    class: 'android.view.ViewGroup',
    content_desc: '首页',
    clickable: 'true',
    enabled: 'true',
    focusable: 'true',
    scrollable: 'false',
    selected: 'true',
    bounds: '[0,1785][216,1920]',
    index: '0',
    package: 'com.xingin.xhs',
    checkable: 'false',
    checked: 'false',
    password: 'false',
    focused: 'false',
    'long-clickable': 'false'
  };
};