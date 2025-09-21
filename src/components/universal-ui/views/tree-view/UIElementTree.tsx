import React from 'react';
import { Tree, Typography, Space, Empty } from 'antd';
import { 
  FileTextOutlined, 
  InteractionOutlined 
} from '@ant-design/icons';
import type { UIElement } from '../../../../api/universalUIAPI';
import { buildTreeData, TreeNodeData } from './utils';

const { Text } = Typography;

interface UIElementTreeProps {
  elements: UIElement[];
  selectedElements: UIElement[];
  onElementSelect: (elements: UIElement[]) => void;
  showOnlyClickable: boolean;
}

const UIElementTree: React.FC<UIElementTreeProps> = ({
  elements,
  selectedElements,
  onElementSelect,
  showOnlyClickable
}) => {
  const treeData = buildTreeData(elements, showOnlyClickable);

  if (!treeData || treeData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty 
          description={
            showOnlyClickable 
              ? "没有找到可点击的UI元素"
              : "没有找到UI元素"
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const selectedKeys = selectedElements.map((el, index) => `element-${elements.indexOf(el)}`);

  const renderTreeTitle = (nodeData: TreeNodeData) => {
    const element = nodeData.element;
    const displayText = element.text || element.content_desc || 'Unknown';
    const resourceId = element.resource_id;
    
    return (
      <Space size={4}>
        {element.is_clickable ? (
          <InteractionOutlined style={{ color: '#1890ff' }} />
        ) : (
          <FileTextOutlined style={{ color: '#666' }} />
        )}
        <Text strong={element.is_clickable}>
          {displayText}
        </Text>
        {resourceId && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            [{resourceId}]
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: '11px' }}>
          ({element.class_name})
        </Text>
      </Space>
    );
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const selectedNodes = info.selectedNodes as TreeNodeData[];
    const selectedEls = selectedNodes.map(node => node.element);
    onElementSelect(selectedEls);
  };

  const expandTreeData = (nodes: TreeNodeData[]): TreeNodeData[] => {
    return nodes.map(node => ({
      ...node,
      title: renderTreeTitle(node),
      children: node.children ? expandTreeData(node.children) : undefined
    }));
  };

  const expandedTreeData = expandTreeData(treeData);

  return (
    <div className="h-full overflow-auto p-4">
      <Tree
        treeData={expandedTreeData}
        selectedKeys={selectedKeys}
        onSelect={handleSelect}
        showLine
        showIcon
        defaultExpandAll
        className="bg-white"
      />
    </div>
  );
};

export default UIElementTree;