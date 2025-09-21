/**
 * XML层级树查看器组件
 * 显示UnifiedViewData的树形结构，支持元素高亮和详情查看
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Tree, Card, Space, Tag, Typography, Row, Col, Button, Input, Tooltip, Alert } from 'antd';
import { 
  SearchOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  EyeOutlined,
  AimOutlined,
  BranchesOutlined,
  LoadingOutlined
} from '@ant-design/icons';

import type { TreeDataNode } from 'antd';
import type { UnifiedViewData, EnhancedUIElement } from '../../types/UniversalUITypes';

const { Text } = Typography;
const { Search } = Input;

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
    if (element.attributes?.['resource-id'] && target.attributes?.['resource-id']) {
      if (element.attributes['resource-id'] === target.attributes['resource-id']) score += 30;
    }
    
    // class 匹配 (20%)
    if (element.elementType && target.elementType) {
      if (element.elementType === target.elementType) score += 20;
      else if (element.elementType.includes(target.elementType) || target.elementType.includes(element.elementType)) score += 10;
    }
    
    // content-desc 匹配 (10%)
    if (element.attributes?.['content-desc'] && target.attributes?.['content-desc']) {
      if (element.attributes['content-desc'] === target.attributes['content-desc']) score += 10;
    }
    
    // clickable 属性 (5%)
    if (element.attributes?.clickable && target.attributes?.clickable) {
      if (element.attributes.clickable === target.attributes.clickable) score += 5;
    }
    
    return score;
  };

  // 生成树形数据结构
  const treeData = useMemo(() => {
    if (!viewData?.treeView?.hierarchyMap) return [];

    const buildTreeNodes = (elementMap: Map<string, EnhancedUIElement>, parentId?: string): TreeNodeData[] => {
      const children: TreeNodeData[] = [];
      
      for (const [id, element] of elementMap.entries()) {
        const elementParentId = element.parentId || (element.bounds?.parent ? 'root' : undefined);
        
        if (elementParentId === parentId) {
          const matchScore = calculateMatchScore(element, targetElement);
          const isHighMatch = matchScore > 70;
          const isTarget = targetElement && (
            element.id === targetElement.id ||
            (element.attributes?.['resource-id'] && 
             element.attributes['resource-id'] === targetElement.attributes?.['resource-id'])
          );

          // 构建节点标题
          const nodeTitle = (
            <div className="flex items-center justify-between group">
              <Space size={4}>
                {/* 元素类型图标 */}
                <Tag 
                  color={isTarget ? 'red' : isHighMatch ? 'green' : 'blue'} 
                  style={{ fontSize: '10px', margin: 0 }}
                >
                  {element.elementType?.split('.').pop() || 'Unknown'}
                </Tag>
                
                {/* 元素文本 */}
                <Text 
                  style={{ 
                    fontSize: '12px',
                    fontWeight: isTarget ? 'bold' : isHighMatch ? '500' : 'normal',
                    color: isTarget ? '#f5222d' : isHighMatch ? '#52c41a' : '#333'
                  }}
                >
                  {element.text || element.attributes?.['content-desc'] || '无文本'}
                </Text>

                {/* resource-id 显示 */}
                {element.attributes?.['resource-id'] && (
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '10px' }}
                    code
                  >
                    #{element.attributes['resource-id'].split('/').pop()}
                  </Text>
                )}

                {/* 匹配分数显示 */}
                {matchScore > 0 && (
                  <Tag 
                    color={matchScore > 70 ? 'green' : matchScore > 40 ? 'orange' : 'default'}
                    style={{ fontSize: '9px', margin: 0 }}
                  >
                    {matchScore}%
                  </Tag>
                )}
              </Space>

              {/* 操作按钮（悬停显示） */}
              <Space size={2} className="opacity-0 group-hover:opacity-100 transition-opacity">
                {element.attributes?.clickable === 'true' && (
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

          const childNodes = buildTreeNodes(elementMap, id);
          
          const treeNode: TreeNodeData = {
            key: id,
            title: nodeTitle,
            element: element,
            matchScore,
            isTarget,
            children: childNodes.length > 0 ? childNodes : undefined
          };

          children.push(treeNode);
        }
      }

      // 按匹配度排序，高匹配度的排在前面
      return children.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    };

    return buildTreeNodes(viewData.treeView.hierarchyMap);
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
          node.element.attributes?.['resource-id']?.toLowerCase().includes(searchValue.toLowerCase()) ||
          node.element.elementType?.toLowerCase().includes(searchValue.toLowerCase());

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

  if (!viewData.treeView?.hierarchyMap || viewData.treeView.hierarchyMap.size === 0) {
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
                {viewData.treeView.hierarchyMap.size}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">可点击元素</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                {Array.from(viewData.treeView.hierarchyMap.values())
                  .filter(el => el.attributes?.clickable === 'true').length}
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">有文本元素</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                {Array.from(viewData.treeView.hierarchyMap.values())
                  .filter(el => el.text && el.text.trim()).length}
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