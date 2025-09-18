/**
 * 元素层次结构树组件
 * 以层次结构的方式展示页面元素，支持去重、搜索、过滤
 */

import React, { useMemo, useState } from 'react';
import {
  Tree,
  Space,
  Typography,
  Tag,
  Tooltip,
  Button,
  Badge,
  Empty,
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import {
  NodeExpandOutlined,
  NodeCollapseOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  EditOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { TreeProps, TreeDataNode } from 'antd';

import { 
  PageAnalysisEntity, 
  UIElementEntity, 
  ElementType,
  ElementGroupType,
} from '../../domain/page-analysis';
import { usePageAnalysis, usePageAnalysisConfig } from '../../application/page-analysis';

const { Text } = Typography;
const { Option } = Select;

export interface ElementHierarchyTreeProps {
  analysis: PageAnalysisEntity;
  onElementSelect?: (element: UIElementEntity) => void;
}

export const ElementHierarchyTree: React.FC<ElementHierarchyTreeProps> = ({
  analysis,
  onElementSelect,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['top', 'middle', 'bottom']);
  const [searchText, setSearchText] = useState('');
  const [selectedElementTypes, setSelectedElementTypes] = useState<ElementType[]>([]);
  
  const { 
    selectElement, 
    isElementSelected, 
    selectedElements,
  } = usePageAnalysis();
  
  const { filterConfig } = usePageAnalysisConfig();

  // 获取元素类型的显示信息
  const getElementTypeInfo = (elementType: ElementType) => {
    const typeMap = {
      [ElementType.BUTTON]: { color: '#1890ff', icon: <PlayCircleOutlined />, text: '按钮' },
      [ElementType.EDIT_TEXT]: { color: '#52c41a', icon: <EditOutlined />, text: '输入框' },
      [ElementType.TEXT_VIEW]: { color: '#722ed1', icon: <EyeOutlined />, text: '文本' },
      [ElementType.IMAGE_VIEW]: { color: '#fa8c16', icon: <EyeOutlined />, text: '图片' },
      [ElementType.NAVIGATION_BUTTON]: { color: '#eb2f96', icon: <PlayCircleOutlined />, text: '导航' },
      [ElementType.TAB_BUTTON]: { color: '#13c2c2', icon: <PlayCircleOutlined />, text: '选项卡' },
      [ElementType.LIST_ITEM]: { color: '#a0d911', icon: <NodeExpandOutlined />, text: '列表项' },
      [ElementType.SWITCH]: { color: '#f5222d', icon: <ThunderboltOutlined />, text: '开关' },
      [ElementType.CHECKBOX]: { color: '#faad14', icon: <ThunderboltOutlined />, text: '复选框' },
      [ElementType.SPINNER]: { color: '#2f54eb', icon: <FilterOutlined />, text: '下拉框' },
      [ElementType.WEB_VIEW]: { color: '#531dab', icon: <EyeOutlined />, text: 'WebView' },
      [ElementType.OTHER]: { color: '#8c8c8c', icon: <EyeOutlined />, text: '其他' },
    };

    return typeMap[elementType] || typeMap[ElementType.OTHER];
  };

  // 获取分组类型的显示信息
  const getGroupTypeInfo = (groupType: ElementGroupType) => {
    const groupMap = {
      [ElementGroupType.NAVIGATION_BUTTONS]: { icon: <PlayCircleOutlined />, text: '导航按钮组' },
      [ElementGroupType.ACTION_BUTTONS]: { icon: <ThunderboltOutlined />, text: '操作按钮组' },
      [ElementGroupType.LIST_ITEMS]: { icon: <NodeExpandOutlined />, text: '列表项组' },
      [ElementGroupType.TAB_ITEMS]: { icon: <NodeCollapseOutlined />, text: '选项卡组' },
      [ElementGroupType.SOCIAL_BUTTONS]: { icon: <PlayCircleOutlined />, text: '社交按钮组' },
      [ElementGroupType.INPUT_FIELDS]: { icon: <EditOutlined />, text: '输入框组' },
      [ElementGroupType.INDIVIDUAL]: { icon: <EyeOutlined />, text: '独立元素' },
    };

    return groupMap[groupType] || groupMap[ElementGroupType.INDIVIDUAL];
  };

  // 构建树形数据
  const treeData = useMemo(() => {
    if (!analysis) return [];

    const hierarchy = analysis.getElementHierarchy();
    const representativeElements = analysis.getRepresentativeElements();
    
    // 过滤元素
    const filteredElements = representativeElements.filter(element => {
      // 搜索过滤
      if (searchText && !element.text.toLowerCase().includes(searchText.toLowerCase()) &&
          !element.description.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }

      // 元素类型过滤
      if (selectedElementTypes.length > 0 && !selectedElementTypes.includes(element.elementType)) {
        return false;
      }

      // 其他过滤条件
      if (filterConfig.showOnlyClickable && !element.isClickable) {
        return false;
      }

      if (filterConfig.showOnlyVisible && !element.isVisible()) {
        return false;
      }

      return true;
    });

    return hierarchy.map(regionNode => {
      const regionElements = filteredElements.filter(element => {
        const centerY = element.getCenterPoint().y;
        const region = centerY < 600 ? 'top' : centerY < 1800 ? 'middle' : 'bottom';
        return region === regionNode.region;
      });

      const regionChildren = regionNode.elements
        .filter(typeGroup => typeGroup.elements.some(e => regionElements.includes(e)))
        .map(typeGroup => {
          const groupElements = typeGroup.elements.filter(e => regionElements.includes(e));
          const typeInfo = getElementTypeInfo(groupElements[0]?.elementType);

          return {
            key: `${regionNode.region}-${typeGroup.type}`,
            title: (
              <Space>
                {typeInfo.icon}
                <Text strong>{typeInfo.text}</Text>
                <Badge count={groupElements.length} size="small" />
              </Space>
            ),
            children: groupElements.map(element => {
              const isSelected = isElementSelected(element.id);
              const groupInfo = getGroupTypeInfo(element.groupInfo.groupType);

              return {
                key: element.id,
                title: (
                  <div 
                    style={{ 
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: isSelected ? '1px solid #1890ff' : '1px solid transparent',
                      backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(element);
                      onElementSelect?.(element);
                    }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col flex="auto">
                        <Space>
                          <Text 
                            strong={isSelected} 
                            style={{ 
                              color: isSelected ? '#1890ff' : undefined,
                              fontSize: '12px'
                            }}
                          >
                            {element.text || '无文本'}
                          </Text>
                          
                          {element.groupInfo.groupTotal > 1 && (
                            <Tooltip title={`${groupInfo.text} (${element.groupInfo.groupIndex + 1}/${element.groupInfo.groupTotal})`}>
                              <Tag style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }} color="blue">
                                {element.groupInfo.groupTotal}个
                              </Tag>
                            </Tooltip>
                          )}
                        </Space>
                      </Col>
                      
                      <Col>
                        <Space size="small">
                          {element.isClickable && (
                            <Tag color="green" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>可点击</Tag>
                          )}
                          {element.isEditable && (
                            <Tag color="orange" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>可编辑</Tag>
                          )}
                          {element.isScrollable && (
                            <Tag color="purple" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>可滚动</Tag>
                          )}
                        </Space>
                      </Col>
                    </Row>
                    
                    <div style={{ marginTop: '4px' }}>
                      <Text 
                        type="secondary" 
                        style={{ fontSize: '11px' }}
                        ellipsis={{ tooltip: element.description }}
                      >
                        {element.description}
                      </Text>
                    </div>
                  </div>
                ),
                isLeaf: true,
                data: element,
              };
            }),
          };
        });

      const regionName = {
        'top': '顶部区域',
        'middle': '中部区域', 
        'bottom': '底部区域',
      }[regionNode.region] || regionNode.region;

      const regionElementCount = regionElements.length;

      return {
        key: regionNode.region,
        title: (
          <Space>
            <Text strong style={{ fontSize: '14px' }}>
              {regionName}
            </Text>
            <Badge count={regionElementCount} showZero />
          </Space>
        ),
        children: regionChildren,
      };
    }).filter(regionNode => regionNode.children.length > 0);
  }, [
    analysis, 
    searchText, 
    selectedElementTypes, 
    filterConfig,
    isElementSelected,
    selectElement,
    onElementSelect
  ]);

  // 获取可用的元素类型列表
  const availableElementTypes = useMemo(() => {
    if (!analysis) return [];
    
    const types = new Set<ElementType>();
    analysis.getRepresentativeElements().forEach(element => {
      types.add(element.elementType);
    });
    
    return Array.from(types);
  }, [analysis]);

  const onExpand = (expandedKeys: string[]) => {
    setExpandedKeys(expandedKeys);
  };

  if (!analysis) {
    return <Empty description="暂无分析数据" />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 搜索和过滤控件 */}
      <div style={{ marginBottom: 16, padding: '0 8px' }}>
        <Row gutter={[8, 8]}>
          <Col span={24}>
            <Input
              placeholder="搜索元素文本或描述..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col span={24}>
            <Select
              mode="multiple"
              placeholder="筛选元素类型"
              value={selectedElementTypes}
              onChange={setSelectedElementTypes}
              size="small"
              style={{ width: '100%' }}
            >
              {availableElementTypes.map(type => {
                const typeInfo = getElementTypeInfo(type);
                return (
                  <Option key={type} value={type}>
                    <Space>
                      {typeInfo.icon}
                      {typeInfo.text}
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Col>
        </Row>
      </div>

      {/* 选中元素提示 */}
      {selectedElements.length > 0 && (
        <div style={{ marginBottom: 8, padding: '0 8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选择 {selectedElements.length} 个元素
          </Text>
        </div>
      )}

      {/* 树形结构 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        {treeData.length > 0 ? (
          <Tree
            showLine={{ showLeafIcon: false }}
            expandedKeys={expandedKeys}
            onExpand={onExpand}
            treeData={treeData}
            blockNode
            style={{ fontSize: '12px' }}
          />
        ) : (
          <Empty 
            description="没有找到匹配的元素" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  );
};