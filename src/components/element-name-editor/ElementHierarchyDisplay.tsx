/**
 * 元素层级显示组件
 * 类似于智能页面查找模态框的层级树，显示匹配项目的层级关系
 */

import React from 'react';
import { Tree, Card, Space, Tag, Typography, Tooltip } from 'antd';
import { 
  BranchesOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { UIElement } from '../../domain/page-analysis/entities/UIElement';
import { ElementNameMapper } from '../../modules/ElementNameMapper';

const { Text } = Typography;

// 扩展的UI元素接口，支持层级结构
interface HierarchicalUIElement extends UIElement {
  parent?: HierarchicalUIElement;
  children?: HierarchicalUIElement[];
  // 兼容旧的属性名称
  content_desc?: string;
  resource_id?: string;
  element_type?: string;
  clickable?: boolean;
  scrollable?: boolean;
  focusable?: boolean;
  enabled?: boolean;
}

interface ElementHierarchyDisplayProps {
  /** 当前元素 */
  element: HierarchicalUIElement;
  /** 候选匹配元素列表 */
  candidates?: HierarchicalUIElement[];
  /** 选中的元素ID */
  selectedElementId?: string;
  /** 元素选择回调 */
  onElementSelect?: (element: HierarchicalUIElement) => void;
}

interface ElementTreeNode extends DataNode {
  element: HierarchicalUIElement;
  isTarget?: boolean;
  isCandidate?: boolean;
  matchScore?: number;
  children?: ElementTreeNode[];
}

export const ElementHierarchyDisplay: React.FC<ElementHierarchyDisplayProps> = ({
  element,
  candidates = [],
  selectedElementId,
  onElementSelect
}) => {
  
  // ========== 智能显示名称获取 ==========
  
  /**
   * 获取元素的智能显示名称
   * 优先级：自定义名称 → XML字段 → 智能生成名称
   */
  const getElementDisplayName = (el: HierarchicalUIElement): string => {
    // 1. 优先使用 ElementNameMapper 的显示名称（包含自定义名称）
    const displayName = ElementNameMapper.getDisplayName(el);
    return displayName;
  };

  /**
   * 获取元素的所有XML字段信息（用于悬停提示）
   */
  const getElementXMLFields = (el: HierarchicalUIElement): string[] => {
    const fields: string[] = [];
    
  if (el.text) fields.push(`text: "${el.text}"`);
  if (el.resourceId) fields.push(`resource_id: "${el.resourceId}"`);
  if (el.className) fields.push(`class_name: "${el.className}"`);
  // 仅当真实 XML 提供 content_desc 时展示；避免用友好描述混淆
  if ((el as any).content_desc) fields.push(`content_desc: "${(el as any).content_desc}"`);
  // 将友好描述以独立字段展示，避免污染 content_desc 语义
  if (el.description) fields.push(`description: "${el.description}"`);
    if (el.elementType) fields.push(`element_type: "${el.elementType}"`);
    if (el.bounds) {
      const { left, top, right, bottom } = el.bounds;
      fields.push(`bounds: [${left}, ${top}][${right}, ${bottom}]`);
    }
    
    // 交互属性
    if (el.isClickable) fields.push('clickable: true');
    if (el.isScrollable) fields.push('scrollable: true');
    if (el.isEditable) fields.push('editable: true');
    if (!el.isEnabled) fields.push('enabled: false');
    
    return fields;
  };

  // ========== 树形结构构建 ==========

  const buildHierarchyTree = (): ElementTreeNode[] => {
    const allElements = [element, ...candidates];
    const elementMap = new Map<string, HierarchicalUIElement>();
    allElements.forEach(el => elementMap.set(el.id, el));

    // 找到根元素（没有父元素的元素）
    const rootElements = allElements.filter(el => !el.parent || !elementMap.has(el.parent.id));

    const buildNode = (currentElement: HierarchicalUIElement): ElementTreeNode => {
      const isTarget = currentElement.id === element.id;
      const isCandidate = candidates.some(c => c.id === currentElement.id);
      
      // 查找子元素
      const childElements = allElements.filter(el => 
        el.parent && el.parent.id === currentElement.id
      );
      
      const children = childElements.length > 0 
        ? childElements.map(buildNode)
        : undefined;

      return {
        key: currentElement.id,
        title: renderElementNode(currentElement, isTarget, isCandidate),
        element: currentElement,
        isTarget,
        isCandidate,
        children,
        icon: getElementIcon(currentElement, isTarget, isCandidate)
      };
    };

    return rootElements.map(buildNode);
  };

  // 渲染元素节点内容
  const renderElementNode = (el: HierarchicalUIElement, isTarget: boolean, isCandidate: boolean) => {
    const center = el.bounds ? {
      x: Math.round((el.bounds.left + el.bounds.right) / 2),
      y: Math.round((el.bounds.top + el.bounds.bottom) / 2),
    } : { x: 0, y: 0 };

    // 获取智能显示名称（自定义名称优先，XML字段后备）
    const displayName = getElementDisplayName(el);
    
    // 获取所有XML字段信息用于悬停提示
    const xmlFields = getElementXMLFields(el);
    const xmlTooltipContent = (
      <div className="max-w-md">
        <div className="font-semibold mb-2">XML字段信息:</div>
        {xmlFields.map((field, index) => (
          <div key={index} className="text-xs text-gray-600 mb-1">{field}</div>
        ))}
      </div>
    );

    return (
      <Tooltip title={xmlTooltipContent} placement="right">
        <div 
          className={`flex items-center justify-between w-full pr-2 py-1 ${
            isTarget ? 'bg-blue-50 border-l-4 border-blue-500 pl-2' :
            isCandidate ? 'bg-green-50 border-l-4 border-green-400 pl-2' :
            'hover:bg-gray-50'
          }`}
          style={{ minHeight: '32px' }}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* 状态标识 */}
            {isTarget && (
              <Tooltip title="当前目标元素">
                <Tag color="blue" className="text-xs">目标</Tag>
              </Tooltip>
            )}
            {isCandidate && (
              <Tooltip title="候选匹配元素">
                <Tag color="green" className="text-xs">候选</Tag>
              </Tooltip>
            )}
            
            {/* 🎯 核心显示名称（自定义名称优先） */}
            <Text className={`font-medium truncate max-w-48 ${
              isTarget ? 'text-blue-700' : isCandidate ? 'text-green-700' : 'text-gray-700'
            }`}>
              {displayName}
            </Text>
            
            {/* 资源ID（简化显示） */}
            {el.resourceId && (
              <Tag color="orange" className="text-xs max-w-24 truncate">
                {el.resourceId.split('/').pop() || el.resourceId}
              </Tag>
            )}
            
            {/* 元素类型（简化显示） */}
            <Tag color="default" className="text-xs">
              {el.elementType?.toString().split('.').pop() || el.elementType}
            </Tag>
          </div>
          
          {/* 右侧信息 */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {/* 坐标信息 */}
            {el.bounds && (
              <span className="whitespace-nowrap">
                ({center.x}, {center.y})
              </span>
            )}
            
            {/* 交互属性 */}
            <div className="flex space-x-1">
              {el.isClickable && <Tag color="green" className="text-xs">可点击</Tag>}
              {el.isScrollable && <Tag color="blue" className="text-xs">可滚动</Tag>}
              {el.isEditable && <Tag color="purple" className="text-xs">可编辑</Tag>}
              {!el.isEnabled && <Tag color="red" className="text-xs">已禁用</Tag>}
            </div>
          </div>
        </div>
      </Tooltip>
    );
  };

  // 获取元素图标
  const getElementIcon = (el: HierarchicalUIElement, isTarget: boolean, isCandidate: boolean) => {
    if (isTarget) return <CheckCircleOutlined className="text-blue-500" />;
    if (isCandidate) return <QuestionCircleOutlined className="text-green-500" />;
    if (el.isClickable) return <span className="text-green-500">🔘</span>;
    if (el.isScrollable) return <span className="text-blue-500">📜</span>;
    if (el.text) return <span className="text-gray-500">📝</span>;
    if (el.elementType?.toString().toLowerCase().includes('image')) return <span className="text-orange-500">🖼️</span>;
    return <span className="text-gray-400">📦</span>;
  };

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && onElementSelect) {
      const selectedNode = info.node as ElementTreeNode;
      onElementSelect(selectedNode.element);
    }
  };

  // 获取默认展开的节点
  const getDefaultExpandedKeys = (): string[] => {
    const expandedKeys: string[] = [];
    
    // 展开目标元素和候选元素的所有祖先节点
    const elementsToExpand = [element, ...candidates];
    
    elementsToExpand.forEach(el => {
      let current = el.parent;
      while (current) {
        expandedKeys.push(current.id);
        current = current.parent;
      }
    });
    
    return [...new Set(expandedKeys)]; // 去重
  };

  const treeData = buildHierarchyTree();

  if (treeData.length === 0) {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <Space direction="vertical" align="center">
            <BranchesOutlined style={{ fontSize: '24px' }} />
            <Text type="secondary">暂无层级结构数据</Text>
          </Space>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <BranchesOutlined />
          <span>元素层级结构</span>
          <Tag color="blue">目标元素</Tag>
          {candidates.length > 0 && (
            <Tag color="green">候选元素 {candidates.length}</Tag>
          )}
        </Space>
      } 
      className="h-full"
      size="small"
    >
      <div className="max-h-96 overflow-auto">
        <Tree
          treeData={treeData}
          selectedKeys={selectedElementId ? [selectedElementId] : []}
          defaultExpandedKeys={getDefaultExpandedKeys()}
          onSelect={handleSelect}
          showIcon
          className="element-hierarchy-tree"
          blockNode
        />
      </div>
      
      {/* 说明信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-4 flex-wrap">
            <span><CheckCircleOutlined className="text-blue-500" /> 目标元素</span>
            <span><QuestionCircleOutlined className="text-green-500" /> 候选元素</span>
            <span>🔘 可点击</span>
            <span>📜 可滚动</span>
            <span>📝 包含文本</span>
            <span>🖼️ 图片</span>
          </div>
          <div className="text-gray-500">
            * 展示目标元素与候选匹配元素的层级关系结构
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ElementHierarchyDisplay;