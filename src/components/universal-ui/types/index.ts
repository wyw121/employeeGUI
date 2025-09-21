/**
 * Universal UI 组件共享类型定义
 * 为可视化视图、列表视图、树形视图提供统一的数据接口
 */

import React from 'react';
import { UIElement } from '../../../api/universalUIAPI';

// ========== 基础类型定义 ==========

/**
 * 视觉UI元素接口
 * 用于可视化视图和列表视图
 */
export interface VisualUIElement {
  /** 元素唯一标识 */
  id: string;
  /** 显示文本 */
  text: string;
  /** 元素描述 */
  description: string;
  /** 元素类型 */
  type: string;
  /** 元素分类 */
  category: string;
  /** 元素位置信息 */
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** 是否可点击 */
  clickable: boolean;
  /** 重要程度 */
  importance: 'high' | 'medium' | 'low';
  /** 用户友好名称 */
  userFriendlyName: string;
  /** 是否可滚动 */
  scrollable?: boolean;
  /** 是否启用 */
  enabled?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 是否聚焦 */
  focused?: boolean;
  /** 原始元素数据 */
  element_type?: string;
  /** 是否可点击 (兼容性) */
  is_clickable?: boolean;
  /** 内容描述 (兼容性) */
  content_desc?: string;
}

/**
 * 元素分类定义
 * 用于组织和展示不同类型的UI元素
 */
export interface VisualElementCategory {
  /** 分类名称 */
  name: string;
  /** 分类图标 */
  icon: React.ReactNode;
  /** 分类颜色 */
  color: string;
  /** 分类描述 */
  description: string;
  /** 该分类下的元素列表 */
  elements: VisualUIElement[];
}

/**
 * 元素统计信息
 * 用于显示页面元素的统计数据
 */
export interface ElementStatistics {
  /** 总元素数 */
  total: number;
  /** 可交互元素数 */
  interactive: number;
  /** 元素类型数 */
  types: number;
  /** 按类型分组的元素 */
  grouped: Record<string, VisualUIElement[]>;
}

// ========== 组件 Props 接口 ==========

/**
 * 基础视图组件 Props
 */
export interface BaseViewProps {
  /** UI元素列表 */
  elements: UIElement[];
  /** 元素选择回调 */
  onElementSelect?: (element: UIElement) => void;
  /** 当前选中的元素ID */
  selectedElementId?: string;
  /** 搜索关键词 */
  searchText?: string;
  /** 选中的分类 */
  selectedCategory?: string;
  /** 是否只显示可点击元素 */
  showOnlyClickable?: boolean;
  /** 元素分类列表 */
  categories?: VisualElementCategory[];
  /** 统计信息 */
  stats?: ElementStatistics;
}

/**
 * 可视化视图 Props
 */
export interface VisualViewProps extends BaseViewProps {
  /** 是否显示网格辅助线 */
  showGrid?: boolean;
  /** 缩放比例 */
  scale?: number;
  /** 设备尺寸 */
  deviceSize?: {
    width: number;
    height: number;
  };
}

/**
 * 列表视图 Props
 */
export interface ListViewProps extends BaseViewProps {
  /** 每页显示数量 */
  pageSize?: number;
  /** 当前页码 */
  currentPage?: number;
  /** 排序方式 */
  sortBy?: 'name' | 'type' | 'importance' | 'position';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 树形视图 Props
 */
export interface TreeViewProps {
  /** UI元素列表 */
  elements: UIElement[];
  /** 元素选择回调 */
  onElementSelect?: (element: UIElement) => void;
  /** 选中的元素ID */
  selectedElementId?: string;
  /** 是否展开所有节点 */
  defaultExpandAll?: boolean;
}

// ========== 视图模式枚举 ==========

/**
 * 视图模式
 */
export enum ViewMode {
  /** 可视化视图 */
  VISUAL = 'visual',
  /** 列表视图 */
  LIST = 'list',
  /** 树形视图 */
  TREE = 'tree'
}

// ========== 工具类型 ==========

/**
 * 元素转换函数类型
 */
export type ElementTransformer = (element: UIElement) => VisualUIElement;

/**
 * 元素过滤函数类型
 */
export type ElementFilter = (element: UIElement) => boolean;

/**
 * 元素分类函数类型
 */
export type ElementCategorizer = (element: UIElement) => string;

/**
 * UIElement转换为VisualUIElement的工具函数
 */
export const transformUIElement = (element: UIElement): VisualUIElement => {
  return {
    id: element.id,
    text: element.text || '',
    description: element.content_desc || element.resource_id || element.class_name || '',
    type: element.element_type || element.class_name || 'Unknown',
    category: categorizeElement(element),
    position: {
      x: element.bounds.left,
      y: element.bounds.top,
      width: element.bounds.right - element.bounds.left,
      height: element.bounds.bottom - element.bounds.top,
    },
    clickable: element.is_clickable || false,
    scrollable: element.is_scrollable || false,
    importance: element.is_clickable ? 'high' : element.text ? 'medium' : 'low',
    userFriendlyName: element.text || element.content_desc || element.resource_id || '未命名元素',
    enabled: element.is_enabled || true,
    selected: element.selected || false,
    element_type: element.element_type,
    is_clickable: element.is_clickable,
    content_desc: element.content_desc
  };
};

/**
 * 元素分类函数
 */
export const categorizeElement = (element: UIElement): string => {
  if (element.is_clickable) return 'interactive';
  if (element.text && element.text.trim()) return 'text';
  if (element.element_type.toLowerCase().includes('image')) return 'image';
  if (element.is_scrollable) return 'scrollable';
  return 'container';
};
