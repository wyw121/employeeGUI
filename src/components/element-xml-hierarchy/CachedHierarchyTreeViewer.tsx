/**
 * XML层级树查看器 - 基于Universal UI缓存数据
 * 显示缓存XML页面的UI元素层级结构，支持展开/收缩
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Tree, Card, Input, Tag, Typography, Space, Button, Empty, Alert } from 'antd';
import { SearchOutlined, ExpandAltOutlined, CompressOutlined, AimOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { UIElement } from '../../api/universalUIAPI';

const { Text } = Typography;
const { Search } = Input;

interface HierarchyTreeViewerProps {
  /** 缓存的XML页面元素数据 */
  elements: UIElement[];
  /** 目标元素（高亮匹配） */
  targetElement?: UIElement;
  /** 元素选择回调 */
  onElementSelect?: (element: UIElement) => void;
  /** 当前选中的元素ID */
  selectedElementId?: string;
  /** 页面标题 */
  pageTitle?: string;
}

interface TreeNodeData extends DataNode {
  key: string;
  title: React.ReactNode;
  element: UIElement;
  children?: TreeNodeData[];
  depth: number;
  matchScore?: number;
}

const HierarchyTreeViewer: React.FC<HierarchyTreeViewerProps> = ({
  elements,
  targetElement,
  onElementSelect,
  selectedElementId,
  pageTitle = '未知页面'
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpanded, setAutoExpanded] = useState(false);

  // 计算元素匹配分数
  const calculateMatchScore = (element: UIElement, target?: UIElement): number => {
    if (!target) return 0;
    
    let score = 0;
    
    // 文本相似度 (35%)
    if (element.text && target.text) {
      if (element.text === target.text) score += 35;
      else if (element.text.includes(target.text) || target.text.includes(element.text)) score += 20;
    }
    
    // resource-id 匹配 (30%)
    if (element.resource_id && target.resource_id) {
      if (element.resource_id === target.resource_id) score += 30;
    }
    
    // class 匹配 (20%)
    if (element.class_name && target.class_name) {
      if (element.class_name === target.class_name) score += 20;
      else if (element.class_name.includes(target.class_name) || target.class_name.includes(element.class_name)) score += 10;
    }
    
    // content-desc 匹配 (10%)
    if (element.content_desc && target.content_desc) {
      if (element.content_desc === target.content_desc) score += 10;
    }
    
    // clickable 属性 (5%)
    if (element.is_clickable !== undefined && target.is_clickable !== undefined) {
      if (element.is_clickable === target.is_clickable) score += 5;
    }
    
    return score;
  };

  // 找到父元素
  const findParentElement = (element: UIElement, allElements: UIElement[]): UIElement | null => {
    if (!element.bounds) return null;
    
    const { left, top, right, bottom } = element.bounds;
    let bestParent: UIElement | null = null;
    let smallestArea = Infinity;

    for (const candidate of allElements) {
      if (candidate === element || !candidate.bounds) continue;

      const cb = candidate.bounds;
      // 检查候选元素是否完全包含当前元素
      if (cb.left <= left && cb.top <= top && cb.right >= right && cb.bottom >= bottom) {
        const area = (cb.right - cb.left) * (cb.bottom - cb.top);
        // 选择包含面积最小的作为直接父元素
        if (area < smallestArea) {
          smallestArea = area;
          bestParent = candidate;
        }
      }
    }

    return bestParent;
  };

  // 构建真正的树形数据
  const buildTreeData = (elements: UIElement[]): TreeNodeData[] => {
    if (!elements || elements.length === 0) return [];

    console.log('🌳 构建树形结构，元素总数:', elements.length);

    // 构建父子关系映射
    const parentChildMap = new Map<UIElement, UIElement[]>();
    const elementParentMap = new Map<UIElement, UIElement | null>();

    // 初始化映射
    elements.forEach(element => {
      parentChildMap.set(element, []);
      elementParentMap.set(element, findParentElement(element, elements));
    });

    // 构建父子关系
    elements.forEach(element => {
      const parent = elementParentMap.get(element);
      if (parent && parentChildMap.has(parent)) {
        parentChildMap.get(parent)!.push(element);
      }
    });

    // 构建树节点的递归函数
    const buildTreeNode = (element: UIElement, depth: number): TreeNodeData => {
      const children = parentChildMap.get(element) || [];
      const matchScore = calculateMatchScore(element, targetElement);
      const displayText = element.text || element.content_desc || element.resource_id || element.class_name || 'Unknown';
      const isHighMatch = matchScore > 70;
      const isTarget = targetElement && (
        element.id === targetElement.id ||
        (element.resource_id && element.resource_id === targetElement.resource_id) ||
        (element.text && targetElement.text && element.text === targetElement.text)
      );

      const nodeKey = `${element.id || element.resource_id || Math.random()}-${depth}`;

      return {
        key: nodeKey,
        element,
        depth,
        matchScore,
        title: (
          <div className="flex items-center justify-between group w-full">
            <Space size={4} className="flex-1">
              {/* 层级深度指示器 */}
              <Tag color="cyan" style={{ fontSize: '8px', margin: 0, minWidth: '20px' }}>
                L{depth}
              </Tag>
              
              {/* 元素类型标签 */}
              <Tag color={element.class_name ? "blue" : "default"} style={{ fontSize: '10px', margin: 0 }}>
                {element.class_name?.split('.').pop() || element.element_type?.split('.').pop() || 'Unknown'}
              </Tag>

              {/* 元素文本 */}
              <Text 
                ellipsis={{ 
                  tooltip: displayText
                }}
                style={{ 
                  maxWidth: '150px',
                  fontSize: '12px',
                  color: isTarget ? '#1890ff' : (isHighMatch ? '#52c41a' : '#666')
                }}
              >
                {displayText}
              </Text>

              {/* resource-id 显示 */}
              {element.resource_id && (
                <Text 
                  type="secondary" 
                  style={{ fontSize: '10px' }}
                  code
                >
                  #{element.resource_id.split('/').pop()}
                </Text>
              )}

              {/* 匹配分数显示 */}
              {matchScore && matchScore > 30 && (
                <Tag color="green" style={{ fontSize: '8px', margin: 0 }}>
                  {matchScore.toFixed(0)}%
                </Tag>
              )}

              {/* 可点击标识 */}
              {element.is_clickable && (
                <Tag color="orange" style={{ fontSize: '8px', margin: 0 }}>
                  可点击
                </Tag>
              )}
              
              {/* 子元素数量 */}
              {children.length > 0 && (
                <Tag color="purple" style={{ fontSize: '8px', margin: 0 }}>
                  {children.length}子
                </Tag>
              )}
            </Space>

            {/* 目标标识 */}
            {isTarget && (
              <AimOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
            )}
          </div>
        ),
        children: children.map(child => buildTreeNode(child, depth + 1))
      };
    };

    // 找到根节点（没有父元素的元素）
    const rootElements = elements.filter(element => {
      const parent = elementParentMap.get(element);
      return parent === null;
    });

    console.log('🌿 找到根元素数量:', rootElements.length);
    console.log('📊 父子关系统计:', {
      总元素: elements.length,
      根元素: rootElements.length,
      有子元素的元素: Array.from(parentChildMap.entries()).filter(([_, children]) => children.length > 0).length
    });

    // 如果没有找到明确的根元素，可能是所有元素都在同一层级
    if (rootElements.length === 0) {
      console.log('⚠️ 未找到根元素，将所有元素作为根级处理');
      return elements.map((element, index) => buildTreeNode(element, 0));
    }

    return rootElements.map((element, index) => buildTreeNode(element, 0));
  };

  // 生成树形数据
  const treeData = useMemo(() => {
    const result = buildTreeData(elements);
    console.log('🌳 构建的树形数据:', {
      元素总数: elements.length,
      根节点数: result.length,
      树结构: result.map(node => ({
        key: node.key,
        text: node.element.text,
        children: node.children?.length || 0
      }))
    });
    return result;
  }, [elements, targetElement]);

  // 自动展开多层
  useEffect(() => {
    if (treeData.length > 0 && expandedKeys.length === 0 && !autoExpanded) {
      const keysToExpand: React.Key[] = [];
      
      const collectExpandableKeys = (nodes: TreeNodeData[], maxDepth: number = 2, currentDepth: number = 0) => {
        if (currentDepth >= maxDepth) return;
        
        for (const node of nodes) {
          if (node.children && node.children.length > 0) {
            keysToExpand.push(node.key);
            collectExpandableKeys(node.children, maxDepth, currentDepth + 1);
          }
        }
      };
      
      collectExpandableKeys(treeData, 3); // 展开前3层
      
      if (keysToExpand.length > 0) {
        console.log('🔄 自动展开多层节点:', keysToExpand.length, '个节点');
        setExpandedKeys(keysToExpand);
        setAutoExpanded(true);
      } else {
        console.log('⚠️ 没有找到可展开的节点');
      }
    }
  }, [treeData, expandedKeys.length, autoExpanded]);

  // 过滤树数据（搜索功能）
  const filteredTreeData = useMemo(() => {
    if (!searchValue.trim()) return treeData;

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      const filtered: TreeNodeData[] = [];
      
      for (const node of nodes) {
        const element = node.element;
        const matches = 
          element.text?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.resource_id?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.class_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.content_desc?.toLowerCase().includes(searchValue.toLowerCase());

        if (matches) {
          // 如果节点匹配，包含整个子树
          filtered.push(node);
        } else {
          // 如果节点不匹配，但子节点可能匹配，递归过滤
          const filteredChildren = filterNodes(node.children || []);
          if (filteredChildren.length > 0) {
            filtered.push({
              ...node,
              children: filteredChildren
            });
          }
        }
      }
      
      return filtered;
    };

    return filterNodes(treeData);
  }, [treeData, searchValue]);

  // 自动展开匹配节点
  const autoExpandMatching = () => {
    const keysToExpand: React.Key[] = [];
    
    const collectKeys = (nodes: TreeNodeData[]) => {
      for (const node of nodes) {
        if (node.matchScore && node.matchScore > 50) {
          keysToExpand.push(node.key);
        }
        if (node.children && node.children.length > 0) {
          keysToExpand.push(node.key);
          collectKeys(node.children);
        }
      }
    };

    collectKeys(filteredTreeData);
    setExpandedKeys(keysToExpand);
    setAutoExpanded(true);
  };

  // 全部展开/收缩
  const toggleExpandAll = () => {
    if (expandedKeys.length > 0) {
      console.log('🔽 收缩所有节点');
      setExpandedKeys([]);
    } else {
      const allKeys: React.Key[] = [];
      const collectKeys = (nodes: TreeNodeData[]) => {
        for (const node of nodes) {
          if (node.children && node.children.length > 0) {
            allKeys.push(node.key);
            collectKeys(node.children);
          }
        }
      };
      collectKeys(filteredTreeData);
      console.log('🔼 展开所有节点:', allKeys.length, '个节点');
      setExpandedKeys(allKeys);
    }
  };

  // 处理节点选择
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node?.element) {
      setSelectedKeys(selectedKeys);
      onElementSelect?.(info.node.element);
    }
  };

  // 处理展开/收缩
  const onExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  // 数据为空的处理
  if (!elements || elements.length === 0) {
    return (
      <Card className="h-full">
        <Empty 
          description="暂无XML层级数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card 
      className="h-full flex flex-col"
      styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Text strong style={{ fontSize: '14px' }}>
              XML层级结构
            </Text>
            <Tag color="blue" style={{ fontSize: '10px' }}>
              {pageTitle}
            </Tag>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="small"
              icon={<AimOutlined />}
              onClick={autoExpandMatching}
              disabled={!targetElement}
              title="展开匹配项"
            >
              匹配
            </Button>
            <Button
              size="small"
              icon={expandedKeys.length > 0 ? <CompressOutlined /> : <ExpandAltOutlined />}
              onClick={toggleExpandAll}
              title={expandedKeys.length > 0 ? "收缩全部" : "展开全部"}
            >
              {expandedKeys.length > 0 ? "收缩" : "展开"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 搜索栏 */}
        <div className="px-4 py-2 border-b">
          <Search
            placeholder="搜索元素..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            style={{ width: '100%' }}
            size="small"
          />
        </div>

        {/* 统计信息 */}
        <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-600">
          <Space split={<span className="text-gray-300">|</span>}>
            <span>
              总元素: <Text className="text-blue-600 font-medium">{elements.length}</Text>
            </span>
            <span>
              可点击: <Text className="text-green-600 font-medium">
                {elements.filter(el => el.is_clickable).length}
              </Text>
            </span>
            <span>
              根节点: <Text className="text-purple-600 font-medium">{filteredTreeData.length}</Text>
            </span>
            <span>
              已展开: <Text className="text-orange-600 font-medium">{expandedKeys.length}</Text>
            </span>
          </Space>
        </div>

        {/* 树形视图 */}
        <div className="flex-1 overflow-auto p-2">
          {filteredTreeData.length > 0 ? (
            <Tree
              treeData={filteredTreeData}
              expandedKeys={expandedKeys}
              selectedKeys={selectedKeys}
              onSelect={onSelect}
              onExpand={onExpand}
              showLine={{ showLeafIcon: false }}
              blockNode
              className="custom-hierarchy-tree"
            />
          ) : (
            <Empty 
              description={searchValue ? "无匹配结果" : "无层级数据"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: '20px' }}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

export default HierarchyTreeViewer;