/**
 * UI元素树形显示组件 - 性能优化版
 * 显示页面UI元素的层级结构
 * 支持虚拟化渲染和大量元素的高性能显示
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Tree, Card, Space, Tag, Typography, Input, Select, Button, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { UIElement } from '../../../../api/universalUIAPI';
import type { DataNode } from 'antd/es/tree';

const { Text } = Typography;
const { Option } = Select;

// 过滤选项常量
const FILTER_OPTIONS = {
  ALL: 'all',
  CLICKABLE: 'clickable',
  SCROLLABLE: 'scrollable',
  WITH_TEXT: 'with_text',
  IMAGES: 'images'
};

// 质量评估阈值
const QUALITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};

interface UIElementTreeProps {
  elements: UIElement[];
  selectedElements?: UIElement[];
  onElementSelect: (elements: UIElement[]) => void;
  showOnlyClickable?: boolean;
  maxDisplayElements?: number; // 最大显示元素数量，用于性能控制
}

interface UITreeNode extends DataNode {
  element: UIElement;
  children?: UITreeNode[];
}

const UIElementTree: React.FC<UIElementTreeProps> = ({
  elements,
  selectedElements = [],
  onElementSelect,
  showOnlyClickable = false,
  maxDisplayElements = 1000 // 默认最大显示1000个元素
}) => {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(showOnlyClickable ? FILTER_OPTIONS.CLICKABLE : FILTER_OPTIONS.ALL);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpanded, setAutoExpanded] = useState(false);
  // 性能优化的元素过滤
  const filteredElements = useMemo(() => {
    let filtered = elements;

    // 基础过滤
    if (filterType !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter(el => {
        switch (filterType) {
          case FILTER_OPTIONS.CLICKABLE:
            return el.is_clickable;
          case FILTER_OPTIONS.SCROLLABLE:
            return el.is_scrollable;
          case FILTER_OPTIONS.WITH_TEXT:
            return el.text && el.text.trim().length > 0;
          case FILTER_OPTIONS.IMAGES:
            return el.element_type.toLowerCase().includes('image');
          default:
            return true;
        }
      });
    }

    // 搜索文本过滤
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(el => 
        el.text?.toLowerCase().includes(search) ||
        el.content_desc?.toLowerCase().includes(search) ||
        el.resource_id?.toLowerCase().includes(search) ||
        el.element_type?.toLowerCase().includes(search)
      );
    }

    // 性能限制：如果元素过多，只显示前N个
    if (filtered.length > maxDisplayElements) {
      console.warn(`⚡ 元素数量过多 (${filtered.length})，为了性能考虑仅显示前 ${maxDisplayElements} 个`);
      filtered = filtered.slice(0, maxDisplayElements);
    }

    return filtered;
  }, [elements, filterType, searchText, maxDisplayElements]);

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
      if (element && (element as any).parentId) {
        return checkCircular((element as any).parentId, newPath);
      }
      
      return false;
    };
    
    // 移除有循环引用的元素的父子关系
    for (const element of result) {
      if ((element as any).parentId && checkCircular(element.id, new Set())) {
        console.warn('🚨 断开循环引用:', element.id, '-> parent:', (element as any).parentId);
        (element as any).parentId = null; // 断开循环引用
      }
    }
    
    return result;
  };

  // 元素质量评估算法 - 性能优化版
  const assessElementQuality = useCallback((element: UIElement): number => {
    let score = 50; // 基础分数

    // 文本内容评估
    if (element.text && element.text.trim().length > 0) {
      score += 20;
      // 文本长度合理性
      if (element.text.length > 2 && element.text.length < 100) {
        score += 10;
      }
    }

    // 内容描述评估
    if (element.content_desc && element.content_desc.trim().length > 0) {
      score += 15;
    }

    // 资源ID评估
    if (element.resource_id) {
      score += 10;
      // 有意义的资源ID
      if (element.resource_id.includes('/') && !element.resource_id.includes('NO_ID')) {
        score += 5;
      }
    }

    // 可交互性评估
    if (element.is_clickable) score += 15;
    if (element.is_scrollable) score += 10;
    if (element.checkable) score += 10;
    if (element.is_focused) score += 8;

    // 位置和尺寸评估
    if (element.bounds) {
      const width = element.bounds.right - element.bounds.left;
      const height = element.bounds.bottom - element.bounds.top;
      
      // 合理的尺寸
      if (width > 0 && height > 0) {
        score += 5;
        // 尺寸不过大不过小
        if (width >= 20 && width <= 800 && height >= 20 && height <= 600) {
          score += 5;
        }
      }

      // 在屏幕可见区域内
      if (element.bounds.left >= 0 && element.bounds.top >= 0) {
        score += 5;
      }
    }

    // 元素类型评估
    const elementType = element.element_type.toLowerCase();
    if (elementType.includes('button') || elementType.includes('textview') || 
        elementType.includes('edittext') || elementType.includes('imageview')) {
      score += 10;
    }

    // 确保分数在0-100之间
    return Math.max(0, Math.min(100, score));
  }, []);

  // 获取质量颜色
  const getQualityColor = useCallback((score: number): string => {
    if (score >= QUALITY_THRESHOLDS.HIGH) return 'green';
    if (score >= QUALITY_THRESHOLDS.MEDIUM) return 'orange';
    if (score >= QUALITY_THRESHOLDS.LOW) return 'yellow';
    return 'red';
  }, []);

  // 渲染节点标题 - 增强版
  const renderNodeTitle = useCallback((element: UIElement) => {
    const center = element.bounds ? {
      x: Math.round((element.bounds.left + element.bounds.right) / 2),
      y: Math.round((element.bounds.top + element.bounds.bottom) / 2),
    } : { x: 0, y: 0 };

    // 计算质量评分
    const qualityScore = assessElementQuality(element);
    const qualityColor = getQualityColor(qualityScore);

    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* 质量评分标志 */}
          <Tooltip title={`元素质量评分: ${qualityScore}/100`}>
            <Tag color={qualityColor} className="text-xs min-w-[32px] text-center">
              {qualityScore}
            </Tag>
          </Tooltip>

          {/* 文本内容 */}
          {element.text && (
            <Text className="text-blue-600 font-medium truncate max-w-[200px]">
              "{element.text}"
            </Text>
          )}
          
          {/* 内容描述 */}
          {element.content_desc && !element.text && (
            <Text className="text-green-600 truncate max-w-[150px]">
              {element.content_desc}
            </Text>
          )}
          
          {/* 资源ID */}
          {element.resource_id && (
            <Tag color="orange" className="text-xs max-w-[120px] truncate">
              {element.resource_id.split('/').pop() || element.resource_id}
            </Tag>
          )}
          
          {/* 元素类型 */}
          <Tag color="default" className="text-xs">
            {element.element_type.split('.').pop() || element.element_type}
          </Tag>
        </div>
        
        {/* 坐标信息和状态标签 */}
        <div className="flex items-center space-x-1 text-xs text-gray-500 flex-shrink-0">
          <span className="text-xs">({center.x}, {center.y})</span>
          {element.is_clickable && <Tag color="green" className="text-xs">可点击</Tag>}
          {element.is_scrollable && <Tag color="blue" className="text-xs">可滚动</Tag>}
          {element.checkable && <Tag color="purple" className="text-xs">可选择</Tag>}
          {element.is_focused && <Tag color="gold" className="text-xs">已聚焦</Tag>}
        </div>
      </div>
    );
  }, [assessElementQuality, getQualityColor]);

  // 获取元素图标
  const getElementIcon = (element: UIElement) => {
    if (element.is_clickable) return <span className="text-green-500">🔘</span>;
    if (element.is_scrollable) return <span className="text-blue-500">📜</span>;
    if (element.text) return <span className="text-gray-500">📝</span>;
    if (element.element_type.toLowerCase().includes('image')) return <span className="text-orange-500">🖼️</span>;
    return <span className="text-gray-400">📦</span>;
  };

  // 构建层级树结构 - 性能优化版
  const buildTreeData = useCallback((): UITreeNode[] => {
    if (!filteredElements.length) return [];

    try {
      // 为每个元素计算层级深度和父子关系
      const elementsWithHierarchy = filteredElements.map((element, index) => {
        // 通过bounds位置关系推断层级
        const depth = calculateDepth(element, filteredElements);
        const parentElement = findParentElement(element, filteredElements);
        
        return {
          ...element,
          depth,
          parentId: parentElement?.id,
          originalIndex: index
        };
      });

      // 检测并移除循环引用
      const validElements = removeCircularReferences(elementsWithHierarchy);
      
      // 按深度分组，找到根元素
      const rootElements = validElements.filter(el => !(el as any).parentId);
      
      // 如果没有根元素，选择深度最小的几个作为根
      if (rootElements.length === 0 && validElements.length > 0) {
        const minDepth = Math.min(...validElements.map(el => (el as any).depth || 0));
        const potentialRoots = validElements.filter(el => ((el as any).depth || 0) === minDepth);
        rootElements.push(...potentialRoots);
      }
      
      // 递归保护的buildNode函数
      const buildNode = (element: any, visitedIds = new Set<string>(), depth = 0): UITreeNode => {
        // 递归深度保护
        if (depth > 15) { // 降低递归深度限制提高性能
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
          .filter(el => (el as any).parentId === element.id)
          .slice(0, 50) // 限制每个节点最多50个子节点，提高性能
          .map(child => buildNode(child, newVisitedIds, depth + 1));

        return {
          key: element.id,
          title: renderNodeTitle(element),
          element: element,
          children: children.length > 0 ? children : undefined,
          icon: getElementIcon(element),
        };
      };

      // 限制根节点数量以提高性能
      return rootElements.slice(0, 20).map(el => buildNode(el));
    } catch (error) {
      console.error('🚨 构建UI树时发生错误:', error);
      return [];
    }
  }, [filteredElements, renderNodeTitle, getElementIcon, calculateDepth, findParentElement, removeCircularReferences]);

  // 计算元素深度（基于bounds包含关系）- 优化版
  const calculateDepth = useCallback((element: UIElement, allElements: UIElement[]): number => {
    let depth = 0;
    
    for (const other of allElements) {
      if (other.id !== element.id && isElementContainedIn(element, other)) {
        depth++;
      }
    }
    
    return depth;
  }, []);

  // 查找父元素 - 增强版，防止循环引用
  const findParentElement = useCallback((element: UIElement, allElements: UIElement[]): UIElement | null => {
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
  }, []);

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

  // 处理节点选择 - 适配新接口
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const selectedNode = info.node as UITreeNode;
      onElementSelect([selectedNode.element]); // 传递数组格式
    }
  }, [onElementSelect]);

  // 处理展开状态
  const handleExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
    if (!autoExpanded) {
      setAutoExpanded(true);
    }
  }, [autoExpanded]);

  // 重置搜索和过滤
  const handleReset = useCallback(() => {
    setSearchText('');
    setFilterType(FILTER_OPTIONS.ALL);
    setExpandedKeys([]);
    setAutoExpanded(false);
  }, []);

  const treeData = buildTreeData();
  const selectedKeys = selectedElements.map(el => el.id);
  
  // 计算统计信息
  const stats = useMemo(() => ({
    total: elements.length,
    filtered: filteredElements.length,
    displayed: treeData.length,
    clickable: elements.filter(el => el.is_clickable).length,
    withText: elements.filter(el => el.text?.trim()).length,
  }), [elements, filteredElements, treeData]);

  if (treeData.length === 0) {
    return (
      <Card className="h-full">
        {/* 搜索和过滤控件 */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center space-x-3">
            <Input
              placeholder="搜索元素..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 max-w-[300px]"
              allowClear
            />
            <Select
              value={filterType}
              onChange={setFilterType}
              className="w-32"
              placeholder="过滤类型"
            >
              <Option value={FILTER_OPTIONS.ALL}>全部</Option>
              <Option value={FILTER_OPTIONS.CLICKABLE}>可点击</Option>
              <Option value={FILTER_OPTIONS.SCROLLABLE}>可滚动</Option>
              <Option value={FILTER_OPTIONS.WITH_TEXT}>有文本</Option>
              <Option value={FILTER_OPTIONS.IMAGES}>图片</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="重置搜索和过滤"
            />
          </div>
        </div>

        <div className="flex items-center justify-center h-32 text-gray-500">
          {elements.length === 0 
            ? '暂无UI元素数据' 
            : `没有符合条件的元素 (共${elements.length}个元素)`}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <span>页面结构层级树</span>
          <Tag color="blue">{stats.displayed} / {stats.total}</Tag>
          {stats.filtered !== stats.total && (
            <Tag color="orange">已过滤</Tag>
          )}
          {filteredElements.length > maxDisplayElements && (
            <Tag color="red">性能限制</Tag>
          )}
        </Space>
      } 
      className="h-full"
    >
      {/* 搜索和过滤控件 */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center space-x-3 flex-wrap">
          <Input
            placeholder="搜索文本、ID、类型..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 max-w-[300px]"
            allowClear
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            className="w-32"
            placeholder="过滤类型"
          >
            <Option value={FILTER_OPTIONS.ALL}>全部</Option>
            <Option value={FILTER_OPTIONS.CLICKABLE}>可点击</Option>
            <Option value={FILTER_OPTIONS.SCROLLABLE}>可滚动</Option>
            <Option value={FILTER_OPTIONS.WITH_TEXT}>有文本</Option>
            <Option value={FILTER_OPTIONS.IMAGES}>图片</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            title="重置搜索和过滤"
          />
        </div>
        
        {/* 统计信息 */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>总计: {stats.total}</span>
          <span>可点击: {stats.clickable}</span>
          <span>有文本: {stats.withText}</span>
          {stats.filtered !== stats.total && (
            <span className="text-orange-600">过滤后: {stats.filtered}</span>
          )}
          {filteredElements.length > maxDisplayElements && (
            <span className="text-red-600">显示限制: {maxDisplayElements}</span>
          )}
        </div>
      </div>

      {/* 树形视图 */}
      <div className="h-96 overflow-auto">
        <Tree
          treeData={treeData}
          selectedKeys={selectedKeys}
          expandedKeys={autoExpanded ? undefined : expandedKeys}
          onSelect={handleSelect}
          onExpand={handleExpand}
          showIcon
          defaultExpandAll={!autoExpanded}
          className="ui-element-tree"
          virtual
          height={384} // 固定高度支持虚拟滚动
        />
      </div>
      
      {/* 图例说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="flex items-center flex-wrap gap-4">
            <span>🔘 可点击</span>
            <span>📜 可滚动</span>
            <span>📝 包含文本</span>
            <span>🖼️ 图片元素</span>
            <span>📦 其他元素</span>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            <span><Tag color="green" className="text-xs">80+</Tag> 高质量</span>
            <span><Tag color="orange" className="text-xs">60+</Tag> 中等</span>
            <span><Tag color="yellow" className="text-xs">40+</Tag> 较低</span>
            <span><Tag color="red" className="text-xs">&lt;40</Tag> 低质量</span>
          </div>
          <div className="text-gray-500">
            * 通过元素位置关系自动构建层级结构，质量评分基于可用性算法
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UIElementTree;