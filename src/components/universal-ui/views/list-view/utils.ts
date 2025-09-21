/**
 * 列表视图工具函数
 */

import { VisualUIElement } from '../../types';

/**
 * 排序选项
 */
export enum SortBy {
  NAME = 'name',
  TYPE = 'type',
  IMPORTANCE = 'importance',
  POSITION = 'position'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * 元素品质等级
 */
export enum ElementQuality {
  LEGENDARY = 'legendary', // 传奇 - 有文本且可点击
  EPIC = 'epic',          // 史诗 - 可点击
  RARE = 'rare',          // 稀有 - 有文本
  UNCOMMON = 'uncommon',  // 非凡 - 可滚动
  COMMON = 'common'       // 普通
}

/**
 * 品质颜色配置
 */
export const QUALITY_COLORS = {
  [ElementQuality.LEGENDARY]: {
    bg: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
    border: '#ff4757',
    glow: '#ff6b6b'
  },
  [ElementQuality.EPIC]: {
    bg: 'linear-gradient(135deg, #a55eea, #26de81)',
    border: '#8854d0',
    glow: '#a55eea'
  },
  [ElementQuality.RARE]: {
    bg: 'linear-gradient(135deg, #3742fa, #2f3542)',
    border: '#2f3093',
    glow: '#3742fa'
  },
  [ElementQuality.UNCOMMON]: {
    bg: 'linear-gradient(135deg, #2ed573, #1e90ff)',
    border: '#20bf6b',
    glow: '#2ed573'
  },
  [ElementQuality.COMMON]: {
    bg: 'linear-gradient(135deg, #747d8c, #57606f)',
    border: '#5f6368',
    glow: '#747d8c'
  }
};

/**
 * 获取元素品质等级
 */
export const getElementQuality = (element: VisualUIElement): ElementQuality => {
  const hasText = element.text && element.text.trim();
  const isClickable = element.clickable;
  const isScrollable = element.scrollable;
  
  if (hasText && isClickable) return ElementQuality.LEGENDARY;
  if (isClickable) return ElementQuality.EPIC;
  if (hasText) return ElementQuality.RARE;
  if (isScrollable) return ElementQuality.UNCOMMON;
  return ElementQuality.COMMON;
};

/**
 * 获取元素图标
 */
export const getElementIcon = (element: VisualUIElement): string => {
  if (element.clickable) return '🔘';
  if (element.scrollable) return '📜';
  if (element.text && element.text.trim()) return '📝';
  if (element.type.toLowerCase().includes('image')) return '🖼️';
  return '📦';
};

/**
 * 格式化位置信息
 */
export const formatPosition = (position: { x: number; y: number; width: number; height: number }): string => {
  return `(${position.x}, ${position.y}) ${position.width}×${position.height}`;
};

/**
 * 排序元素
 */
export const sortElements = (
  elements: VisualUIElement[], 
  sortBy: SortBy, 
  sortOrder: SortOrder
): VisualUIElement[] => {
  return [...elements].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case SortBy.NAME:
        compareValue = a.userFriendlyName.localeCompare(b.userFriendlyName);
        break;
      case SortBy.TYPE:
        compareValue = a.type.localeCompare(b.type);
        break;
      case SortBy.IMPORTANCE:
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        compareValue = importanceOrder[a.importance] - importanceOrder[b.importance];
        break;
      case SortBy.POSITION:
        compareValue = a.position.y - b.position.y || a.position.x - b.position.x;
        break;
      default:
        compareValue = 0;
    }
    
    return sortOrder === SortOrder.DESC ? -compareValue : compareValue;
  });
};

/**
 * 过滤元素
 */
export const filterElements = (
  elements: VisualUIElement[],
  filters: {
    searchText?: string;
    selectedCategory?: string;
    showOnlyClickable?: boolean;
    selectedTab?: string;
  }
): VisualUIElement[] => {
  const { searchText, selectedCategory, showOnlyClickable, selectedTab } = filters;
  
  return elements.filter(element => {
    // 分类过滤
    if (selectedCategory && selectedCategory !== 'all' && element.category !== selectedCategory) {
      return false;
    }
    
    // 可点击过滤
    if (showOnlyClickable && !element.clickable) {
      return false;
    }
    
    // 搜索过滤
    if (searchText && searchText.trim()) {
      const text = searchText.toLowerCase();
      if (!(
        element.text.toLowerCase().includes(text) ||
        element.description.toLowerCase().includes(text) ||
        element.userFriendlyName.toLowerCase().includes(text) ||
        element.type.toLowerCase().includes(text)
      )) {
        return false;
      }
    }

    // 标签页过滤
    if (selectedTab) {
      if (selectedTab === 'interactive' && !element.clickable) {
        return false;
      }
      if (selectedTab !== 'all' && selectedTab !== 'interactive' && element.category !== selectedTab) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * 分页元素
 */
export const paginateElements = (
  elements: VisualUIElement[], 
  currentPage: number, 
  pageSize: number
): { paginatedElements: VisualUIElement[]; totalCount: number } => {
  const totalCount = elements.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedElements = elements.slice(startIndex, startIndex + pageSize);
  
  return {
    paginatedElements,
    totalCount
  };
};

/**
 * 创建标签页数据
 */
export const createTabsData = (
  elements: VisualUIElement[], 
  stats?: { total: number; interactive: number; grouped: Record<string, VisualUIElement[]> }
) => {
  const baseStats = stats || {
    total: elements.length,
    interactive: elements.filter(e => e.clickable).length,
    grouped: elements.reduce((acc, element) => {
      if (!acc[element.type]) {
        acc[element.type] = [];
      }
      acc[element.type].push(element);
      return acc;
    }, {} as Record<string, VisualUIElement[]>)
  };

  return [
    { 
      key: 'all', 
      label: '全部', 
      count: baseStats.total, 
      color: '#667eea', 
      icon: '📱' 
    },
    { 
      key: 'interactive', 
      label: '可交互', 
      count: baseStats.interactive, 
      color: '#26de81', 
      icon: '🎯' 
    },
    ...Object.entries(baseStats.grouped).map(([type, items]) => ({
      key: type,
      label: type,
      count: Array.isArray(items) ? items.length : 0,
      color: '#a55eea',
      icon: '📦'
    }))
  ];
};

/**
 * 获取品质显示名称
 */
export const getQualityDisplayName = (quality: ElementQuality): string => {
  const names = {
    [ElementQuality.LEGENDARY]: '传奇',
    [ElementQuality.EPIC]: '史诗',
    [ElementQuality.RARE]: '稀有',
    [ElementQuality.UNCOMMON]: '非凡',
    [ElementQuality.COMMON]: '普通'
  };
  
  return names[quality];
};