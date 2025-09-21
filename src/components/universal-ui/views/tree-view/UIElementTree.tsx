/**
 * UI元素树形显示组件
 * 显示页面UI元素的层级结构
 */

import React from 'react';
import { Tree, Card, Space, Tag, Typography } from 'antd';
import type { VisualUIElement } from '../../types';
import { 
  buildTreeData, 
  renderNodeTitle,
  getElementIcon
} from './utils';
import type { UITreeNode } from './utils';
import './UIElementTree.css';

const { Text } = Typography;

interface UIElementTreeProps {
  elements: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
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

  // 构建树形数据
  const treeData = buildTreeData(elements);

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && onElementSelect) {
      const selectedNode = info.node as UITreeNode;
      onElementSelect(selectedNode.element);
    }
  };

  if (treeData.length === 0) {
    return (
      <Card className="h-full">
        <div className="tree-empty">
          <span className="tree-empty-icon">🌲</span>
          <div className="tree-empty-text">暂无UI元素数据</div>
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
      className="h-full ui-element-tree"
    >
      <div className="h-96 overflow-auto">
        <Tree
          treeData={treeData}
          selectedKeys={selectedElementId ? [selectedElementId] : []}
          onSelect={handleSelect}
          showIcon
          defaultExpandAll
          blockNode
          className="ui-element-tree"
        />
      </div>
      
      {/* 图例说明 */}
      <div className="tree-stats">
        <div className="tree-legend">
          <div className="tree-legend-item">
            <span className="element-icon icon-clickable">🔘</span>
            <span>可点击</span>
          </div>
          <div className="tree-legend-item">
            <span className="element-icon icon-scrollable">📜</span>
            <span>可滚动</span>
          </div>
          <div className="tree-legend-item">
            <span className="element-icon icon-text">📝</span>
            <span>包含文本</span>
          </div>
          <div className="tree-legend-item">
            <span className="element-icon icon-image">🖼️</span>
            <span>图片元素</span>
          </div>
          <div className="tree-legend-item">
            <span className="element-icon icon-default">📦</span>
            <span>其他元素</span>
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
          * 通过元素位置关系自动构建层级结构
        </div>
      </div>
    </Card>
  );
};

