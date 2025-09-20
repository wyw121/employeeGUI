/**
 * UI元素树形显示组件
 * 使用统一架构的数据和组件，不再进行独立的数据处理
 */

import React from 'react';
import { Tree, Card, Space, Tag, Typography, Empty } from 'antd';
import { 
  NodeIndexOutlined, 
  AppstoreOutlined, 
  SelectOutlined,
  InteractionOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { ProcessedElement } from '../../domain/unified/types/UnifiedViewTypes';

const { Text } = Typography;

interface UIElementTreeProps {
  /**
   * 已处理的元素数据 - 来自统一数据管理器
   */
  elements: ProcessedElement[];
  
  /**
   * 元素选择回调
   */
  onElementSelect?: (element: ProcessedElement) => void;
  
  /**
   * 当前选中的元素
   */
  selectedElement?: ProcessedElement | null;
  
  /**
   * 加载状态
   */
  loading?: boolean;
  
  /**
   * 树的高度
   */
  height?: number;
}

interface UITreeNode extends DataNode {
  element: ProcessedElement;
  children?: UITreeNode[];
}

export const UIElementTree: React.FC<UIElementTreeProps> = ({
  elements,
  onElementSelect,
  selectedElement,
  loading = false,
  height = 400
}) => {
  // 构建树形结构 - 使用统一架构提供的hierarchy数据
  const buildTreeData = React.useMemo((): UITreeNode[] => {
    if (!elements.length) return [];

    // 构建元素映射表
    const elementMap = new Map<string, ProcessedElement>();
    elements.forEach(element => {
      elementMap.set(element.id, element);
    });

    // 找到根元素
    const rootElements = elements.filter(element => 
      !element.parentId || !elementMap.has(element.parentId)
    );

    // 递归构建节点
    const buildNode = (element: ProcessedElement): UITreeNode => {
      const children = elements
        .filter(child => child.parentId === element.id)
        .map(buildNode)
        .sort((a, b) => (a.element.bounds?.top || 0) - (b.element.bounds?.top || 0));

      return {
        key: element.id,
        title: renderNodeTitle(element),
        element: element,
        children: children.length > 0 ? children : undefined,
        icon: getElementIcon(element),
        isLeaf: children.length === 0,
      };
    };

    return rootElements
      .map(buildNode)
      .sort((a, b) => (a.element.bounds?.top || 0) - (b.element.bounds?.top || 0));
  }, [elements]);

  // 渲染节点标题
  const renderNodeTitle = (element: ProcessedElement): React.ReactNode => {
    const displayText = element.text || element.className || element.resourceId || '未知元素';
    
    return (
      <div className="tree-node-title">
        <Space size="small">
          <Text 
            strong={!!element.text}
            className={`element-text ${element.isInteractive ? 'interactive' : ''}`}
          >
            {displayText.length > 30 ? `${displayText.substring(0, 30)}...` : displayText}
          </Text>
          
          {/* 元素属性标签 */}
          <Space size={2}>
            {element.isClickable && <Tag color="blue" size="small">点击</Tag>}
            {element.isScrollable && <Tag color="purple" size="small">滚动</Tag>}
            {element.isCheckable && <Tag color="green" size="small">选择</Tag>}
            {element.isEditable && <Tag color="orange" size="small">编辑</Tag>}
          </Space>
        </Space>
        
        {/* 元素类型信息 */}
        <div className="tree-node-meta">
          <Text type="secondary" className="element-type">
            {element.className}
          </Text>
          {element.resourceId && (
            <Text type="secondary" className="element-resource-id">
              ID: {element.resourceId}
            </Text>
          )}
        </div>
      </div>
    );
  };

  // 获取元素图标
  const getElementIcon = (element: ProcessedElement): React.ReactNode => {
    if (element.isInteractive) {
      return <InteractionOutlined style={{ color: '#1890ff' }} />;
    }
    
    if (element.isClickable) {
      return <SelectOutlined style={{ color: '#52c41a' }} />;
    }
    
    if (element.children && element.children.length > 0) {
      return <AppstoreOutlined style={{ color: '#faad14' }} />;
    }
    
    return <NodeIndexOutlined style={{ color: '#d9d9d9' }} />;
  };

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && onElementSelect) {
      const node = info.node as UITreeNode;
      onElementSelect(node.element);
    }
  };

  // 处理节点展开
  const [expandedKeys, setExpandedKeys] = React.useState<React.Key[]>([]);

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  // 自动展开到选中元素
  React.useEffect(() => {
    if (selectedElement) {
      const newExpandedKeys = new Set(expandedKeys);
      
      // 找到选中元素的路径并展开
      const findPath = (nodes: UITreeNode[], targetId: string): string[] => {
        for (const node of nodes) {
          if (node.element.id === targetId) {
            return [node.key as string];
          }
          
          if (node.children) {
            const childPath = findPath(node.children, targetId);
            if (childPath.length > 0) {
              return [node.key as string, ...childPath];
            }
          }
        }
        return [];
      };

      const path = findPath(buildTreeData, selectedElement.id);
      path.forEach(key => newExpandedKeys.add(key));
      setExpandedKeys(Array.from(newExpandedKeys));
    }
  }, [selectedElement, buildTreeData]);

  if (!elements.length) {
    return (
      <Card>
        <Empty
          description="暂无元素数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <NodeIndexOutlined />
          <span>UI层级树</span>
          <Tag color="blue">{elements.length} 个元素</Tag>
        </Space>
      }
      size="small"
      className="ui-element-tree"
    >
      <div 
        className="tree-container" 
        style={{ height, overflow: 'auto' }}
      >
        <Tree
          treeData={buildTreeData}
          onSelect={handleSelect}
          onExpand={handleExpand}
          expandedKeys={expandedKeys}
          selectedKeys={selectedElement ? [selectedElement.id] : []}
          showIcon
          showLine
          blockNode
          virtual
          height={height - 20}
          className="element-tree"
        />
      </div>
    </Card>
  );
};

export default UIElementTree;