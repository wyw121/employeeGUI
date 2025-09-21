/**
 * 增强的层级树查看器 - 支持最底层元素字段展开
 * 基于 CachedHierarchyTreeViewer，增加了元素字段详情展示功能
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Tree, 
  Space, 
  Tag, 
  Typography, 
  Button, 
  Input, 
  Alert,
  Card,
  Spin,
  Row,
  Col
} from 'antd';
import {
  SearchOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  AimOutlined,
  BranchesOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

import type { UIElement } from '../../api/universalUIAPI';
import { ElementFieldsViewer } from './ElementFieldsViewer';

const { Text } = Typography;
const { Search } = Input;

// 树节点数据接口
interface TreeNodeData {
  key: React.Key;
  element: UIElement;
  depth?: number;
  matchScore?: number;
  title: React.ReactNode;
  children?: TreeNodeData[];
  isField?: boolean; // 标识是否为字段展示节点
}

interface EnhancedHierarchyTreeViewerProps {
  /** XML页面中的UI元素列表 */
  elements: UIElement[];
  /** 目标元素（用于高亮匹配） */
  targetElement?: UIElement | null;
  /** 加载状态 */
  loading?: boolean;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 计算匹配分数
 */
const calculateMatchScore = (element: UIElement, target?: UIElement | null): number => {
  if (!target) return 0;

  let score = 0;
  const maxScore = 100;

  // 文本匹配 (30分)
  if (element.text && target.text && element.text === target.text) {
    score += 30;
  } else if (element.text && target.text && element.text.includes(target.text)) {
    score += 15;
  }

  // resource-id 匹配 (25分)
  if (element.resource_id && target.resource_id && element.resource_id === target.resource_id) {
    score += 25;
  }

  // class_name 匹配 (20分)
  if (element.class_name && target.class_name && element.class_name === target.class_name) {
    score += 20;
  }

  // 位置匹配 (15分)
  if (element.bounds && target.bounds) {
    const distance = Math.sqrt(
      Math.pow(element.bounds.left - target.bounds.left, 2) +
      Math.pow(element.bounds.top - target.bounds.top, 2)
    );
    if (distance < 10) score += 15;
    else if (distance < 50) score += 10;
    else if (distance < 100) score += 5;
  }

  // 内容描述匹配 (10分)
  if (element.content_desc && target.content_desc && element.content_desc === target.content_desc) {
    score += 10;
  }

  return Math.min(score, maxScore);
};

export const EnhancedHierarchyTreeViewer: React.FC<EnhancedHierarchyTreeViewerProps> = ({
  elements,
  targetElement,
  loading = false,
  showSearch = true,
  className = ''
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpanded, setAutoExpanded] = useState(false);

  // 构建增强的层级树结构
  const buildEnhancedTreeData = (elements: UIElement[]): TreeNodeData[] => {
    if (!elements || elements.length === 0) return [];

    console.log('🌳 构建增强层级树，元素总数:', elements.length);

    // 按位置和大小对元素进行排序
    const sortedElements = [...elements].sort((a, b) => {
      if (!a.bounds || !b.bounds) return 0;
      const areaA = (a.bounds.right - a.bounds.left) * (a.bounds.bottom - a.bounds.top);
      const areaB = (b.bounds.right - b.bounds.left) * (b.bounds.bottom - b.bounds.top);
      return areaB - areaA;
    });

    // 构建带字段展开功能的元素节点
    const buildElementNode = (element: UIElement, index: number): TreeNodeData => {
      const matchScore = calculateMatchScore(element, targetElement);
      const displayText = element.text || element.content_desc || element.resource_id || element.class_name || 'Unknown';
      const isHighMatch = matchScore > 70;
      const isTarget = targetElement && (
        element.id === targetElement.id ||
        (element.resource_id && element.resource_id === targetElement.resource_id) ||
        (element.text && targetElement.text && element.text === targetElement.text)
      );

      // 计算相对深度
      let depth = 0;
      if (element.bounds) {
        const { left, top, right, bottom } = element.bounds;
        const area = (right - left) * (bottom - top);
        
        for (const other of elements) {
          if (other === element || !other.bounds) continue;
          const otherBounds = other.bounds;
          const otherArea = (otherBounds.right - otherBounds.left) * (otherBounds.bottom - otherBounds.top);
          
          if (otherBounds.left <= left && 
              otherBounds.top <= top && 
              otherBounds.right >= right && 
              otherBounds.bottom >= bottom &&
              otherArea > area) {
            depth++;
          }
        }
      }

      // 创建字段详情子节点
      const fieldNode: TreeNodeData = {
        key: `fields-${index}-${element.id || element.resource_id || Math.random()}`,
        element,
        depth: depth + 1,
        isField: true,
        title: (
          <div style={{ padding: '8px 0' }}>
            <ElementFieldsViewer 
              element={element}
              compact={true}
              bordered={false}
            />
          </div>
        ),
        children: []
      };

      return {
        key: `element-${index}-${element.id || element.resource_id || Math.random()}`,
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
                  maxWidth: '180px',
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
                  点击
                </Tag>
              )}

              {/* 位置信息 */}
              {element.bounds && (
                <Text type="secondary" style={{ fontSize: '9px' }}>
                  ({element.bounds.left},{element.bounds.top})
                </Text>
              )}
            </Space>

            {/* 目标标识 */}
            {isTarget && (
              <AimOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
            )}
          </div>
        ),
        children: [fieldNode] // 每个元素都包含一个字段详情子节点
      };
    };

    // 构建所有元素节点
    const allNodes = sortedElements.map((element, index) => buildElementNode(element, index));

    // 按深度分组并构建层级结构
    const depthGroups = new Map<number, TreeNodeData[]>();
    allNodes.forEach(node => {
      const depth = node.depth || 0;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node);
    });

    // 构建按深度分组的树
    const result: TreeNodeData[] = [];
    const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
    
    sortedDepths.forEach(depth => {
      const depthNodes = depthGroups.get(depth) || [];
      
      if (depthNodes.length > 0) {
        const groupNode: TreeNodeData = {
          key: `depth-group-${depth}`,
          element: depthNodes[0].element,
          depth,
          title: (
            <div className="flex items-center gap-2">
              <Tag color="purple" style={{ fontSize: '10px' }}>
                深度层级 {depth}
              </Tag>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {depthNodes.length} 个UI元素
              </Text>
              <Tag color="geekblue" style={{ fontSize: '9px' }}>
                可展开查看字段
              </Tag>
            </div>
          ),
          children: depthNodes.sort((a, b) => {
            if (!a.element.bounds || !b.element.bounds) return 0;
            const topDiff = a.element.bounds.top - b.element.bounds.top;
            if (Math.abs(topDiff) > 5) return topDiff;
            return a.element.bounds.left - b.element.bounds.left;
          })
        };
        
        result.push(groupNode);
      }
    });

    console.log('🌿 构建完成，层级统计:', {
      总层数: result.length,
      各层分布: sortedDepths.map(d => ({ 深度: d, 元素: depthGroups.get(d)?.length || 0 })),
      最大深度: Math.max(...sortedDepths),
      最小深度: Math.min(...sortedDepths)
    });

    return result;
  };

  // 生成树形数据
  const treeData = useMemo(() => {
    const result = buildEnhancedTreeData(elements);
    console.log('🌳 构建的增强树形数据:', {
      元素总数: elements.length,
      根节点数: result.length,
      树结构: result.map(node => ({
        key: node.key,
        children: node.children?.length || 0
      }))
    });
    return result;
  }, [elements, targetElement]);

  // 自动展开逻辑
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
      
      collectExpandableKeys(treeData, 2); // 只展开前2层，避免展开字段详情
      
      if (keysToExpand.length > 0) {
        console.log('🔄 自动展开分组节点:', keysToExpand.length, '个节点');
        setExpandedKeys(keysToExpand);
        setAutoExpanded(true);
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
          filtered.push(node);
        } else {
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
    setAutoExpanded(true);
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <Spin size="large">
          <div>正在加载XML层级结构...</div>
        </Spin>
      </div>
    );
  }

  if (!elements || elements.length === 0) {
    return (
      <Alert
        message="暂无元素数据"
        description="当前页面没有找到UI元素，请检查XML页面是否正确加载。"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div className={`enhanced-hierarchy-tree-viewer ${className}`}>
      {/* 工具栏 */}
      <Card size="small" className="mb-3">
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            {showSearch && (
              <Search
                placeholder="搜索元素（文本、资源ID、类名、描述）"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
                allowClear
              />
            )}
          </Col>
          <Col>
            <Space size={4}>
              <Button
                size="small"
                icon={expandedKeys.length > 0 ? <CompressOutlined /> : <ExpandAltOutlined />}
                onClick={toggleExpandAll}
              >
                {expandedKeys.length > 0 ? '收缩' : '展开'}全部
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计信息 */}
      <Card size="small" className="mb-3">
        <Row gutter={16}>
          <Col span={6}>
            <Text type="secondary">
              总元素: <Text strong>{elements.length}</Text>
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary">
              层级数: <Text strong>{treeData.length}</Text>
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary">
              已展开: <Text strong>{expandedKeys.length}</Text>
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary">
              <InfoCircleOutlined /> 每个元素可展开查看详细字段
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 树形结构 */}
      <Card>
        <Tree
          treeData={filteredTreeData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => {
            console.log('🔄 用户手动展开/收缩:', keys.length, '个节点');
            setExpandedKeys(keys);
          }}
          showLine={{ showLeafIcon: false }}
          blockNode
          height={600}
          style={{ fontSize: '12px' }}
        />
      </Card>
    </div>
  );
};

export default EnhancedHierarchyTreeViewer;