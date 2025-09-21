/**
 * XML层级树查看器组件 - 修复版本
 * 显示UnifiedViewData的树形结构，支持元素高亮和详情查看
 * 🔧 新增：用户可控制的节点类型和属性过滤
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

// 节点类型过滤定义
interface NodeTypeFilter {
  containers: boolean;    // 容器元素 (Layout, ViewGroup 等)
  interactive: boolean;   // 交互元素 (clickable, scrollable)
  textual: boolean;      // 文本元素 (有文本内容的)
  media: boolean;        // 媒体元素 (ImageView, VideoView 等)
  input: boolean;        // 输入元素 (EditText, CheckBox 等)
  decorative: boolean;   // 装饰性元素 (无内容的View等)
}

// 节点属性过滤定义
interface NodeAttributeFilter {
  hasText: boolean;       // 有文本
  hasContentDesc: boolean; // 有内容描述
  hasResourceId: boolean;  // 有资源ID
  isClickable: boolean;    // 可点击
  isScrollable: boolean;   // 可滚动
  isEnabled: boolean;      // 已启用
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

export const HierarchyTreeViewerFixed: React.FC<HierarchyTreeViewerProps> = ({
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
    ];
    
    // 如果有任何属性过滤器启用了
    const enabledFilters = attributeFilters.filter(f => f.enabled);
    if (enabledFilters.length > 0) {
      // 元素必须满足所有启用的属性过滤条件
      return enabledFilters.every(f => f.check());
    }
    
    return true;
  };

  // 计算元素匹配分数
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

  // 生成树形数据结构（应用过滤器）
  const treeData = useMemo(() => {
    if (!viewData?.treeViewData?.hierarchyMap) return [];

    const buildFilteredTreeNodes = (elementMap: Map<string, any>, parentId?: string): TreeNodeData[] => {
      const children: TreeNodeData[] = [];
      
      for (const [id, treeNode] of elementMap.entries()) {
        const element = treeNode.element;
        
        // 检查父级关系
        if ((parentId && element.parentId !== parentId) || (!parentId && element.parentId)) {
          continue;
        }
        
        // 🔧 应用过滤器
        if (!shouldShowNode(element)) {
          continue;
        }
        
        // 计算匹配分数
        const matchScore = calculateMatchScore(element, targetElement);
        const isTarget = targetElement && element.id === targetElement.id;
        
        // 递归获取子节点（也会被过滤）
        const childNodes = buildFilteredTreeNodes(elementMap, id);
        
        // 生成显示标签
        const nodeTitle = (
          <Space size={4}>
            <Tag color={classifyNodeType(element) === 'interactive' ? 'blue' : classifyNodeType(element) === 'textual' ? 'green' : 'default'}>
              {classifyNodeType(element)}
            </Tag>
            {element.text && <Text strong>{element.text}</Text>}
            {element.content_desc && !element.text && <Text type="secondary">{element.content_desc}</Text>}
            {!element.text && !element.content_desc && <Text type="secondary">{element.element_type}</Text>}
            {element.is_clickable && <Tag color="orange" size="small">可点击</Tag>}
            {element.resource_id && <Tag color="cyan" size="small">ID:{element.resource_id.split('/').pop()}</Tag>}
            {isTarget && <Tag color="red">目标元素</Tag>}
            {matchScore > 0 && <Tag color="purple">匹配:{matchScore}%</Tag>}
          </Space>
        );

        const nodeData: TreeNodeData = {
          title: nodeTitle,
          key: id,
          element,
          matchScore,
          isTarget,
          children: childNodes
        };
        
        children.push(nodeData);
      }
      
      return children.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    };

    const rootNodes = buildFilteredTreeNodes(viewData.treeViewData.hierarchyMap, undefined);
    console.log(`🎯 过滤后的根节点数量: ${rootNodes.length}`);
    return rootNodes;
  }, [viewData, targetElement, nodeTypeFilter, nodeAttributeFilter]);

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchValue.trim()) return treeData;

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.filter(node => {
        const element = node.element;
        const matchesSearch = 
          element.text?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.content_desc?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.resource_id?.toLowerCase().includes(searchValue.toLowerCase()) ||
          element.element_type?.toLowerCase().includes(searchValue.toLowerCase());

        return matchesSearch;
      }).map(node => ({
        ...node,
        children: filterNodes(node.children as TreeNodeData[] || [])
      }));
    };

    return filterNodes(treeData);
  }, [treeData, searchValue]);

  // 渲染节点类型过滤控制面板
  const renderNodeTypeFilters = () => (
    <Card size="small" title={<Space><FilterOutlined />节点类型过滤</Space>} style={{ marginBottom: 8 }}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.interactive}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, interactive: e.target.checked }))}
          >
            交互元素
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.textual}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, textual: e.target.checked }))}
          >
            文本元素
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.containers}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, containers: e.target.checked }))}
          >
            容器元素
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.media}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, media: e.target.checked }))}
          >
            媒体元素
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.input}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, input: e.target.checked }))}
          >
            输入元素
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeTypeFilter.decorative}
            onChange={(e) => setNodeTypeFilter(prev => ({ ...prev, decorative: e.target.checked }))}
          >
            装饰元素
          </Checkbox>
        </Col>
      </Row>
    </Card>
  );

  // 渲染节点属性过滤控制面板
  const renderNodeAttributeFilters = () => (
    <Card size="small" title={<Space><SettingOutlined />节点属性过滤</Space>} style={{ marginBottom: 8 }}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.hasText}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, hasText: e.target.checked }))}
          >
            有文本
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.hasContentDesc}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, hasContentDesc: e.target.checked }))}
          >
            有描述
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.hasResourceId}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, hasResourceId: e.target.checked }))}
          >
            有资源ID
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.isClickable}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, isClickable: e.target.checked }))}
          >
            可点击
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.isScrollable}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, isScrollable: e.target.checked }))}
          >
            可滚动
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox
            checked={nodeAttributeFilter.isEnabled}
            onChange={(e) => setNodeAttributeFilter(prev => ({ ...prev, isEnabled: e.target.checked }))}
          >
            已启用
          </Checkbox>
        </Col>
      </Row>
    </Card>
  );

  // 快速过滤预设
  const renderQuickFilters = () => (
    <Space style={{ marginBottom: 8 }}>
      <Button
        size="small"
        onClick={() => {
          setNodeTypeFilter({
            containers: false,
            interactive: true,
            textual: true,
            media: true,
            input: true,
            decorative: false,
          });
        }}
      >
        只看交互元素
      </Button>
      <Button
        size="small"
        onClick={() => {
          setNodeTypeFilter({
            containers: true,
            interactive: true,
            textual: true,
            media: true,
            input: true,
            decorative: true,
          });
        }}
      >
        显示全部
      </Button>
      <Button
        size="small"
        onClick={() => {
          setNodeTypeFilter({
            containers: false,
            interactive: false,
            textual: true,
            media: false,
            input: false,
            decorative: false,
          });
        }}
      >
        只看文本
      </Button>
    </Space>
  );

  // 处理树节点选择
  const handleNodeSelect = (selectedKeysValue: React.Key[], info: any) => {
    setSelectedKeys(selectedKeysValue);
    if (info.selected && info.node) {
      const nodeData = info.node as TreeNodeData;
      onNodeSelect?.(nodeData.element, info.node);
    }
  };

  // 渲染无数据状态
  if (!viewData) {
    return (
      <Alert
        message="暂无数据"
        description="请先加载XML层级数据"
        type="info"
        showIcon
      />
    );
  }

  // 渲染空层级状态
  if (!viewData.treeViewData?.hierarchyMap || viewData.treeViewData.hierarchyMap.size === 0) {
    return (
      <Alert
        message="无层级数据"
        description="XML数据中没有找到有效的元素层级结构"
        type="warning"
        showIcon
      />
    );
  }

  const visibleNodesCount = filteredTreeData.length;
  const totalNodesCount = viewData.treeViewData.hierarchyMap.size;

  return (
    <div className="hierarchy-tree-viewer">
      {/* 搜索框 */}
      <Search
        placeholder="搜索节点（文本、ID、类型、描述）"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ marginBottom: 8 }}
        allowClear
      />

      {/* 过滤控制面板 */}
      <Collapse size="small" style={{ marginBottom: 8 }}>
        <Panel header="显示控制" key="filters">
          {renderQuickFilters()}
          <Divider style={{ margin: '8px 0' }} />
          {renderNodeTypeFilters()}
          {renderNodeAttributeFilters()}
        </Panel>
      </Collapse>

      {/* 统计信息 */}
      {showDetails && (
        <Card size="small" style={{ marginBottom: 8 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Text type="secondary">显示节点: </Text>
              <Text strong>{visibleNodesCount}/{totalNodesCount}</Text>
            </Col>
            <Col span={8}>
              <Text type="secondary">交互元素: </Text>
              <Text strong>
                {Array.from(viewData.treeViewData.hierarchyMap.values())
                  .filter(node => node.element.is_clickable).length}
              </Text>
            </Col>
            <Col span={8}>
              <Text type="secondary">文本元素: </Text>
              <Text strong>
                {Array.from(viewData.treeViewData.hierarchyMap.values())
                  .filter(node => node.element.text && node.element.text.trim()).length}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* 树形视图 */}
      <Tree
        treeData={filteredTreeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onExpand={setExpandedKeys}
        onSelect={handleNodeSelect}
        showLine={{ showLeafIcon: false }}
        blockNode
      />

      {/* 无搜索结果提示 */}
      {searchValue && filteredTreeData.length === 0 && (
        <Alert
          message="无搜索结果"
          description={`未找到包含 "${searchValue}" 的节点`}
          type="info"
          showIcon
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
};

export default HierarchyTreeViewerFixed;