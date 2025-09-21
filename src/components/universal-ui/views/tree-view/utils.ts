/**
 * 树形视图工具函数
 */

import type { VisualUIElement } from '../../types';
import type { DataNode } from 'antd/es/tree';

export interface UITreeNode extends DataNode {
  element: VisualUIElement;
  children?: UITreeNode[];
}

/**
 * 移除循环引用
 */
export const removeCircularReferences = (elements: any[]): any[] => {
  const result = [...elements];
  const visited = new Set<string>();
  
  // 检测并断开循环引用
  const checkCircular = (elementId: string, path: Set<string>): boolean => {
    if (path.has(elementId)) {
      return true; // 发现循环
    }
    
    if (visited.has(elementId)) {
      return false; // 已经检查过，安全
    }
    
    visited.add(elementId);
    return false;
  };

  // 遍历所有元素，检测循环引用
  for (const element of result) {
    if (element.parentId) {
      const path = new Set<string>();
      path.add(element.id);
      
      if (checkCircular(element.parentId, path)) {
        console.warn('🚨 断开循环引用:', element.id, '-> parent:', element.parentId);
        element.parentId = null; // 断开循环引用
      }
    }
  }
  
  return result;
};

/**
 * 计算元素深度（基于position包含关系）
 */
export const calculateDepth = (element: VisualUIElement, allElements: VisualUIElement[]): number => {
  let depth = 0;
  
  // 找到所有包含当前元素的元素
  const containers = allElements.filter(other => {
    if (other.id === element.id) return false;
    
    // 检查other是否包含element（使用position属性）
    const otherRight = other.position.x + other.position.width;
    const otherBottom = other.position.y + other.position.height;
    const elementRight = element.position.x + element.position.width;
    const elementBottom = element.position.y + element.position.height;
    
    return (
      other.position.x <= element.position.x &&
      other.position.y <= element.position.y &&
      otherRight >= elementRight &&
      otherBottom >= elementBottom
    );
  });
  
  depth = containers.length;
  return Math.min(depth, 10); // 限制最大深度
};

/**
 * 找到父元素
 */
export const findParentElement = (element: VisualUIElement, allElements: VisualUIElement[]): VisualUIElement | null => {
  // 找到所有包含当前元素的元素
  let potentialParents = allElements.filter(other => {
    if (other.id === element.id) return false;
    
    // 检查other是否包含element（使用position属性）
    const otherRight = other.position.x + other.position.width;
    const otherBottom = other.position.y + other.position.height;
    const elementRight = element.position.x + element.position.width;
    const elementBottom = element.position.y + element.position.height;
    
    return (
      other.position.x <= element.position.x &&
      other.position.y <= element.position.y &&
      otherRight >= elementRight &&
      otherBottom >= elementBottom
    );
  });
  
  if (potentialParents.length === 0) return null;
  
  // 选择最小的包含元素作为直接父元素
  potentialParents.sort((a, b) => {
    const aArea = a.position.width * a.position.height;
    const bArea = b.position.width * b.position.height;
    return aArea - bArea;
  });
  
  return potentialParents[0];
};

/**
 * 获取元素显示名称
 */
export const getElementDisplayName = (element: VisualUIElement): string => {
  if (element.text && element.text.trim()) {
    return `"${element.text}"`;
  }
  if (element.description && element.description.trim()) {
    return element.description;
  }
  // 使用userFriendlyName作为后备方案
  if (element.userFriendlyName) {
    return element.userFriendlyName;
  }
  return element.type || '未知元素';
};

/**
 * 获取元素图标
 */
export const getElementIcon = (element: VisualUIElement): string => {
  if (element.clickable) return '🔘';
  if (element.text && element.text.trim()) return '�';
  if (element.type?.toLowerCase().includes('image')) return '�️';
  if (element.type?.toLowerCase().includes('button')) return '�';
  return '📦';
};

/**
 * 构建树形数据
 */
export const buildTreeData = (elements: VisualUIElement[]): UITreeNode[] => {
  if (!elements.length) return [];

  try {
    // 为每个元素计算层级深度和父子关系
    const elementsWithHierarchy = elements.map((element, index) => {
      const depth = calculateDepth(element, elements);
      const parentElement = findParentElement(element, elements);
      
      return {
        ...element,
        depth,
        parentId: parentElement?.id,
        originalIndex: index
      };
    });

    // 检测并移除循环引用
    const validElements = removeCircularReferences(elementsWithHierarchy);

    // 按深度分组
    const rootElements = validElements.filter(el => !el.parentId);
    
    // 递归保护的buildNode函数
    const buildNode = (element: any, visitedIds = new Set<string>(), depth = 0): UITreeNode => {
      // 递归深度保护
      if (depth > 20) {
        console.warn('🚨 递归深度超限，停止构建:', element.id);
        return {
          key: element.id,
          title: renderNodeTitle(element),
          element: element,
          children: undefined,
          icon: getElementIcon(element),
        };
      }

      // 循环引用检测
      if (visitedIds.has(element.id)) {
        console.warn('🚨 检测到循环引用，跳过:', element.id);
        return {
          key: element.id,
          title: renderNodeTitle(element),
          element: element,
          children: undefined,
          icon: getElementIcon(element),
        };
      }

      // 标记当前节点为已访问
      const newVisitedIds = new Set(visitedIds);
      newVisitedIds.add(element.id);

      // 安全地构建子节点
      const children = validElements
        .filter(el => el.parentId === element.id)
        .map(child => buildNode(child, newVisitedIds, depth + 1));

      return {
        key: element.id,
        title: renderNodeTitle(element),
        element: element,
        children: children.length > 0 ? children : undefined,
        icon: getElementIcon(element),
      };
    };

    return rootElements.map(el => buildNode(el));
  } catch (error) {
    console.error('🚨 构建UI树时发生错误:', error);
    return [];
  }
};

/**
 * 渲染节点标题
 */
export const renderNodeTitle = (element: VisualUIElement): string => {
  const displayName = getElementDisplayName(element);
  const position = {
    x: Math.round(element.position.x + element.position.width / 2),
    y: Math.round(element.position.y + element.position.height / 2),
  };

  // 组合标题文本
  let title = displayName;
  
  // 添加状态信息
  const status = [];
  if (element.clickable) status.push('可点击');
  if (element.importance === 'high') status.push('重要');
  
  if (status.length > 0) {
    title += ` [${status.join(', ')}]`;
  }
  
  title += ` (${position.x}, ${position.y})`;
  
  return title;
};