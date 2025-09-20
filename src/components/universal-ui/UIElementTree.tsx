/**
 * UI元素树形显示组件
 * 显示页面UI元素的层级结构
 */

import React from 'react';
import { Tree, Card, Space, Tag, Typography } from 'antd';
import { UIElement } from '../../api/universalUIAPI';
import type { DataNode } from 'antd/es/tree';

const { Text } = Typography;

interface UIElementTreeProps {
  elements: UIElement[];
  onElementSelect?: (element: UIElement) => void;
  selectedElementId?: string;
}

interface UITreeNode extends DataNode {
  element: UIElement;
  children?: UITreeNode[];
}

export const UIElementTree: React.FC<UIElementTreeProps> = ({
  elements,
  onElementSelect,
  selectedElementId
}) => {
  // 🔍 调试日志：检查elements数组状态
  console.log('🌲 UIElementTree 渲染:', {
    elementsCount: elements?.length || 0,
    elements: elements?.slice(0, 3), // 只显示前3个避免日志过长
    selectedElementId
  });

  // 移除循环引用的函数
  const removeCircularReferences = (elements: any[]): any[] => {
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
      const newPath = new Set(path);
      newPath.add(elementId);
      
      const element = result.find(el => el.id === elementId);
      if (element && element.parentId) {
        return checkCircular(element.parentId, newPath);
      }
      
      return false;
    };
    
    // 移除有循环引用的元素的父子关系
    for (const element of result) {
      if (element.parentId && checkCircular(element.id, new Set())) {
        console.warn('🚨 断开循环引用:', element.id, '-> parent:', element.parentId);
        element.parentId = null; // 断开循环引用
      }
    }
    
    return result;
  };

  // 构建层级树结构
  const buildTreeData = (): UITreeNode[] => {
    if (!elements.length) return [];

    try {
      // 为每个元素计算层级深度和父子关系
      const elementsWithHierarchy = elements.map((element, index) => {
        // 通过bounds位置关系推断层级
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

  // 计算元素深度（基于bounds包含关系）
  const calculateDepth = (element: UIElement, allElements: UIElement[]): number => {
    let depth = 0;
    
    for (const other of allElements) {
      if (other.id !== element.id && isElementContainedIn(element, other)) {
        depth++;
      }
    }
    
    return depth;
  };

  // 查找父元素 - 增强版，防止循环引用
  const findParentElement = (element: UIElement, allElements: UIElement[]): UIElement | null => {
    try {
      let bestParent: UIElement | null = null;
      let minArea = Infinity;

      for (const potential of allElements) {
        // 基本排除条件
        if (potential.id === element.id) continue;
        
        // 验证bounds有效性
        if (!potential.bounds || !element.bounds) continue;
        
        // 检查是否被包含
        if (isElementContainedIn(element, potential)) {
          const area = calculateBoundsArea(potential.bounds);
          
          // 确保面积计算有效
          if (area > 0 && area < minArea) {
            // 防止选择自己作为父元素
            if (potential.id !== element.id) {
              minArea = area;
              bestParent = potential;
            }
          }
        }
      }

      return bestParent;
    } catch (error) {
      console.warn('🚨 查找父元素时出错:', element.id, error);
      return null;
    }
  };

  // 判断元素A是否被元素B包含 - 增强版边界检查
  const isElementContainedIn = (elementA: UIElement, elementB: UIElement): boolean => {
    try {
      const a = elementA.bounds;
      const b = elementB.bounds;
      
      // 验证bounds存在性
      if (!a || !b) return false;
      
      // 验证bounds数值有效性
      if (typeof a.left !== 'number' || typeof a.top !== 'number' || 
          typeof a.right !== 'number' || typeof a.bottom !== 'number' ||
          typeof b.left !== 'number' || typeof b.top !== 'number' || 
          typeof b.right !== 'number' || typeof b.bottom !== 'number') {
        return false;
      }
      
      // 验证bounds逻辑一致性
      if (a.left >= a.right || a.top >= a.bottom || 
          b.left >= b.right || b.top >= b.bottom) {
        return false;
      }
      
      // 检查包含关系
      const isContained = (
        a.left >= b.left &&
        a.top >= b.top &&
        a.right <= b.right &&
        a.bottom <= b.bottom
      );
      
      // 排除完全重叠的情况
      const isIdentical = (
        a.left === b.left && 
        a.top === b.top && 
        a.right === b.right && 
        a.bottom === b.bottom
      );
      
      return isContained && !isIdentical;
    } catch (error) {
      console.warn('🚨 边界检查时出错:', elementA.id, elementB.id, error);
      return false;
    }
  };

  // 计算bounds面积 - 增强版验证
  const calculateBoundsArea = (bounds: any): number => {
    try {
      if (!bounds) return 0;
      
      const width = bounds.right - bounds.left;
      const height = bounds.bottom - bounds.top;
      
      // 验证尺寸有效性
      if (width <= 0 || height <= 0) return 0;
      if (!isFinite(width) || !isFinite(height)) return 0;
      
      return width * height;
    } catch (error) {
      console.warn('🚨 计算面积时出错:', bounds, error);
      return 0;
    }
  };

  // 渲染节点标题
  const renderNodeTitle = (element: UIElement) => {
    const center = {
      x: Math.round((element.bounds.left + element.bounds.right) / 2),
      y: Math.round((element.bounds.top + element.bounds.bottom) / 2),
    };

    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* 文本内容 */}
          {element.text && (
            <Text className="text-blue-600 font-medium truncate">
              "{element.text}"
            </Text>
          )}
          
          {/* 内容描述 */}
          {element.content_desc && !element.text && (
            <Text className="text-green-600 truncate">
              {element.content_desc}
            </Text>
          )}
          
          {/* 资源ID */}
          {element.resource_id && (
            <Tag color="orange" className="text-xs">
              {element.resource_id.split('/').pop() || element.resource_id}
            </Tag>
          )}
          
          {/* 元素类型 */}
          <Tag color="default" className="text-xs">
            {element.element_type.split('.').pop() || element.element_type}
          </Tag>
        </div>
        
        {/* 坐标信息 */}
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>({center.x}, {center.y})</span>
          {element.is_clickable && <Tag color="green" className="text-xs">可点击</Tag>}
          {element.is_scrollable && <Tag color="blue" className="text-xs">可滚动</Tag>}
        </div>
      </div>
    );
  };

  // 获取元素图标
  const getElementIcon = (element: UIElement) => {
    if (element.is_clickable) return <span className="text-green-500">🔘</span>;
    if (element.is_scrollable) return <span className="text-blue-500">📜</span>;
    if (element.text) return <span className="text-gray-500">📝</span>;
    if (element.element_type.toLowerCase().includes('image')) return <span className="text-orange-500">🖼️</span>;
    return <span className="text-gray-400">📦</span>;
  };

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && onElementSelect) {
      const selectedNode = info.node as UITreeNode;
      onElementSelect(selectedNode.element);
    }
  };

  const treeData = buildTreeData();

  if (treeData.length === 0) {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-32 text-gray-500">
          暂无UI元素数据
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <span>页面结构层级树</span>
          <Tag color="blue">{elements.length} 个元素</Tag>
        </Space>
      } 
      className="h-full"
    >
      <div className="h-96 overflow-auto">
        <Tree
          treeData={treeData}
          selectedKeys={selectedElementId ? [selectedElementId] : []}
          onSelect={handleSelect}
          showIcon
          defaultExpandAll
          className="ui-element-tree"
        />
      </div>
      
      {/* 图例说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-4">
            <span>🔘 可点击</span>
            <span>📜 可滚动</span>
            <span>📝 包含文本</span>
            <span>🖼️ 图片元素</span>
            <span>📦 其他元素</span>
          </div>
          <div className="text-gray-500">
            * 通过元素位置关系自动构建层级结构
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UIElementTree;