/**
 * XML层级树查看器组件
 * 显示UnifiedViewData的树形结构，支持元素高亮和详情查看
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Tree, Card, Space, Tag, Typography, Row, Col, Button, Input, Tooltip, Alert, Checkbox, Divider, Collapse } from 'antd';
import { 
  SearchOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  EyeOutlined,
  AimOutlined,
  BranchesOutlined,
  LoadingOutlined,
  FilterOutlined,
  SettingOutlined
} from '@ant-design/icons';

import type { TreeDataNode } from 'antd';
import type { UnifiedViewData, EnhancedUIElement } from '../../services/UnifiedViewDataManager';

const { Text } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

// 节点类型定义
interface NodeTypeFilter {
  containers: boolean;    // 容器元素 (Layout, ViewGroup 等)
  interactive: boolean;   // 交互元素 (clickable, scrollable)
  textual: boolean;      // 文本元素 (有文本内容的)
  media: boolean;        // 媒体元素 (ImageView, VideoView 等)
  input: boolean;        // 输入元素 (EditText, CheckBox 等)
  decorative: boolean;   // 装饰性元素 (无内容的View等)
}

// 节点属性过滤
interface NodeAttributeFilter {
  hasText: boolean;       // 有文本
  hasContentDesc: boolean; // 有内容描述
  hasResourceId: boolean;  // 有资源ID
  isClickable: boolean;    // 可点击
  isScrollable: boolean;   // 可滚动
  isEnabled: boolean;      // 已启用
  isVisible: boolean;      // 可见
}

interface HierarchyTreeViewerProps {
  /** 统一视图数据 */
  viewData: UnifiedViewData | null;
  /** 当前要匹配的元素（用于高亮） */
  targetElement?: EnhancedUIElement;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 树节点选择回调 */
  onNodeSelect?: (element: EnhancedUIElement, node: TreeDataNode) => void;
  /** 元素高亮回调 */
  onElementHighlight?: (element: EnhancedUIElement) => void;
}

interface TreeNodeData extends TreeDataNode {
  element: EnhancedUIElement;
  matchScore?: number;
  isTarget?: boolean;
}

export const HierarchyTreeViewer: React.FC<HierarchyTreeViewerProps> = ({
  viewData,
  targetElement,
  showDetails = true,
  onNodeSelect,
  onElementHighlight
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpanded, setAutoExpanded] = useState(false);
  
  // 🔧 节点类型过滤控制
  const [nodeTypeFilter, setNodeTypeFilter] = useState<NodeTypeFilter>({
    containers: true,
    interactive: true,
    textual: true,
    media: true,
    input: true,
    decorative: false, // 默认隐藏装饰性元素
  });
  
  // 🔧 节点属性过滤控制
  const [nodeAttributeFilter, setNodeAttributeFilter] = useState<NodeAttributeFilter>({
    hasText: false,
    hasContentDesc: false,
    hasResourceId: false,
    isClickable: false,
    isScrollable: false,
    isEnabled: false,
    isVisible: false,
  });

  // 🔧 分类节点类型
  const classifyNodeType = (element: EnhancedUIElement): keyof NodeTypeFilter => {
    const elementType = element.element_type?.toLowerCase() || '';
    
    // 交互元素
    if (element.is_clickable || element.is_scrollable) {
      return 'interactive';
    }
    
    // 输入元素
    if (elementType.includes('edit') || elementType.includes('input') || 
        elementType.includes('checkbox') || elementType.includes('radio')) {
      return 'input';
    }
    
    // 文本元素
    if (element.text && element.text.trim()) {
      return 'textual';
    }
    
    // 媒体元素
    if (elementType.includes('image') || elementType.includes('video') || 
        elementType.includes('media')) {
      return 'media';
    }
    
    // 容器元素
    if (elementType.includes('layout') || elementType.includes('group') ||
        elementType.includes('container') || elementType.includes('frame')) {
      return 'containers';
    }
    
    // 装饰性元素 - 没有文本、描述或交互功能的元素
    return 'decorative';
  };
  
  // 🔧 检查节点是否应该显示
  const shouldShowNode = (element: EnhancedUIElement): boolean => {
    // 类型过滤
    const nodeType = classifyNodeType(element);
    if (!nodeTypeFilter[nodeType]) {
      return false;
    }
    
    // 属性过滤 - 如果任何属性过滤器启用了，元素必须满足对应条件
    const attributeFilters = [
      { enabled: nodeAttributeFilter.hasText, check: () => Boolean(element.text?.trim()) },
      { enabled: nodeAttributeFilter.hasContentDesc, check: () => Boolean(element.content_desc?.trim()) },
      { enabled: nodeAttributeFilter.hasResourceId, check: () => Boolean(element.resource_id?.trim()) },
      { enabled: nodeAttributeFilter.isClickable, check: () => Boolean(element.is_clickable) },
      { enabled: nodeAttributeFilter.isScrollable, check: () => Boolean(element.is_scrollable) },
      { enabled: nodeAttributeFilter.isEnabled, check: () => Boolean(element.is_enabled) },
      { enabled: nodeAttributeFilter.isVisible, check: () => true }, // 所有解析出的元素都是可见的
    ];
    
    // 如果有任何属性过滤器启用了
    const enabledFilters = attributeFilters.filter(f => f.enabled);
    if (enabledFilters.length > 0) {
      // 元素必须满足所有启用的属性过滤条件
      return enabledFilters.every(f => f.check());
    }
    
    return true;
  };
  const calculateMatchScore = (element: EnhancedUIElement, target?: EnhancedUIElement): number => {
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
    if (element.element_type && target.element_type) {
      if (element.element_type === target.element_type) score += 20;
      else if (element.element_type.includes(target.element_type) || target.element_type.includes(element.element_type)) score += 10;
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

  // 生成树形数据结构
  const treeData = useMemo(() => {
    if (!viewData?.treeViewData) return [];

    const toAntdNode = (node: any): TreeNodeData => {
      const element: EnhancedUIElement = node.element;
      const matchScore = calculateMatchScore(element, targetElement);
      const isHighMatch = matchScore > 70;
      const isTarget = Boolean(
        targetElement && (
          element.id === targetElement.id ||
          (element.resource_id && element.resource_id === targetElement.resource_id) ||
          (element.text && targetElement.text && element.text === targetElement.text)
        )
      );

      const nodeTitle = (
        <div className="flex items-center justify-between group w-full">
          <Space size={4} className="flex-1">
            <Tag color="cyan" style={{ fontSize: '8px', margin: 0, minWidth: '20px' }}>
              L{element.depth || 0}
            </Tag>

            <Tag
              color={isTarget ? 'red' : isHighMatch ? 'green' : 'blue'}
              style={{ fontSize: '10px', margin: 0 }}
            >
              {element.element_type?.split('.').pop() || 'Unknown'}
            </Tag>

            <Text
              style={{
                fontSize: '12px',
                fontWeight: isTarget ? 'bold' : isHighMatch ? '500' : 'normal',
                color: isTarget ? '#f5222d' : isHighMatch ? '#52c41a' : '#333',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={element.text || element.content_desc || '无文本'}
            >
              {element.text || element.content_desc || '无文本'}
            </Text>

            {element.resource_id && (
              <Text type="secondary" style={{ fontSize: '10px' }} code>
                #{element.resource_id.split('/').pop()}
              </Text>
            )}

            {matchScore > 0 && (
              <Tag
                color={matchScore > 70 ? 'green' : matchScore > 40 ? 'orange' : 'default'}
                style={{ fontSize: '9px', margin: 0 }}
              >
                {matchScore}%
              </Tag>
            )}
          </Space>

          <Space size={2} className="opacity-0 group-hover:opacity-100 transition-opacity">
            {element.is_clickable && (
              <Tooltip title="可点击元素">
                <AimOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
              </Tooltip>
            )}

            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined style={{ fontSize: '10px' }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onElementHighlight?.(element);
                }}
                style={{ padding: '2px 4px', height: 'auto' }}
              />
            </Tooltip>
          </Space>
        </div>
      );

      const children = Array.isArray(node.children)
        ? (node.children as any[]).map(toAntdNode)
        : undefined;

      return {
        key: node.id,
        title: nodeTitle,
        element,
        matchScore,
        isTarget,
        children,
        isLeaf: !children || children.length === 0,
      };
    };

    const roots = Array.isArray(viewData.treeViewData.rootNodes)
      ? (viewData.treeViewData.rootNodes as any[]).map(toAntdNode)
      : [];

    if (roots.length === 0 && viewData.treeViewData.hierarchyMap?.size) {
      const flatNodes: TreeNodeData[] = [];
      (Array.from(viewData.treeViewData.hierarchyMap.values()) as any[]).forEach((n: any) => {
        const el: EnhancedUIElement = n.element;
        const matchScore = calculateMatchScore(el, targetElement);
        const isTarget = Boolean(targetElement && el.id === targetElement.id);
        flatNodes.push({
          key: el.id,
          title: `[深度${el.depth || 0}] ${el.text || el.content_desc || 'Unknown'}`,
          element: el,
          matchScore,
          isTarget,
          isLeaf: true,
        });
      });
      return flatNodes.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return roots;
  }, [viewData, targetElement]);

  // 自动展开高匹配度的节点
  useEffect(() => {
    if (targetElement && treeData.length > 0 && !autoExpanded) {
      const keysToExpand: React.Key[] = [];
      
      const findHighMatchNodes = (nodes: TreeNodeData[]) => {
        nodes.forEach(node => {
          if ((node.matchScore || 0) > 50 || node.isTarget) {
            keysToExpand.push(node.key);
          }
          if (node.children) {
            findHighMatchNodes(node.children as TreeNodeData[]);
          }
        });
      };
      
      findHighMatchNodes(treeData);
      
      if (keysToExpand.length > 0) {
        setExpandedKeys(keysToExpand);
        setAutoExpanded(true);
      }
    }
  }, [targetElement, treeData, autoExpanded]);

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchValue) return treeData;

    const filterTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.reduce((acc, node) => {
        const matchesSearch = 
          node.element.text?.toLowerCase().includes(searchValue.toLowerCase()) ||
          node.element.resource_id?.toLowerCase().includes(searchValue.toLowerCase()) ||
          node.element.element_type?.toLowerCase().includes(searchValue.toLowerCase());

        const filteredChildren = node.children ? filterTree(node.children as TreeNodeData[]) : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }

        return acc;
      }, [] as TreeNodeData[]);
    };

    return filterTree(treeData);
  }, [treeData, searchValue]);

  // 处理节点选择
  const handleNodeSelect = (selectedKeys: React.Key[], { node }: any) => {
    setSelectedKeys(selectedKeys);
    const treeNode = node as TreeNodeData;
    onNodeSelect?.(treeNode.element, treeNode);
  };

  // 展开/折叠所有节点
  const handleExpandAll = () => {
    const getAllKeys = (nodes: TreeNodeData[]): React.Key[] => {
      let keys: React.Key[] = [];
      nodes.forEach(node => {
        keys.push(node.key);
        if (node.children) {
          keys = keys.concat(getAllKeys(node.children as TreeNodeData[]));
        }
      });
      return keys;
    };

    const allKeys = getAllKeys(treeData);
    const isExpanded = expandedKeys.length === allKeys.length;
    setExpandedKeys(isExpanded ? [] : allKeys);
  };

  if (!viewData) {
    return (
      <Card>
        <div className="text-center py-8">
          <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <div className="mt-2 text-gray-500">加载XML层级数据...</div>
        </div>
      </Card>
    );
  }

  if (!viewData.treeViewData?.hierarchyMap || viewData.treeViewData.hierarchyMap.size === 0) {
    return (
      <Alert
        message="无层级数据"
        description="当前页面没有可用的XML层级结构数据"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <Card size="small">
        <Row justify="space-between" align="middle">
          <Col span={12}>
            <Search
              placeholder="搜索元素（文本、ID、类型...）"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col>
            <Space>
              <Button 
                size="small" 
                icon={expandedKeys.length > 0 ? <CompressOutlined /> : <ExpandAltOutlined />}
                onClick={handleExpandAll}
              >
                {expandedKeys.length > 0 ? '折叠全部' : '展开全部'}
              </Button>
              
              <Tag color="blue" style={{ margin: 0 }}>
                <BranchesOutlined style={{ marginRight: 4 }} />
                {treeData.length} 根节点
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 树形结构 */}
      <Card>
        <Tree
          treeData={filteredTreeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          onExpand={setExpandedKeys}
          onSelect={handleNodeSelect}
          showLine={{ showLeafIcon: false }}
          height={400}
          virtual
          style={{ fontSize: '12px' }}
        />
        
        {filteredTreeData.length === 0 && searchValue && (
          <div className="text-center py-8 text-gray-500">
            <SearchOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>没有找到匹配 "{searchValue}" 的元素</div>
          </div>
        )}
      </Card>

      {/* 统计信息 */}
      {showDetails && (
        <Card size="small" title="层级统计">
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">总元素数</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                {viewData.treeViewData.hierarchyMap.size}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">可点击元素</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                {viewData.enhancedElements.filter(el => el.is_clickable).length}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">有文本元素</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                {viewData.enhancedElements.filter(el => Boolean(el.text && el.text.trim())).length}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">匹配元素</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f5222d' }}>
                {treeData.filter(node => (node.matchScore || 0) > 50).length}
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default HierarchyTreeViewer;