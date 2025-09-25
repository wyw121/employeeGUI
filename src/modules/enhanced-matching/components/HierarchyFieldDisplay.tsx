/**
 * enhanced-matching/components/HierarchyFieldDisplay.tsx
 * 字段层级显示组件 - 为用户展示清晰的字段层级关系
 */

import React from 'react';
import { Tag, Tooltip, Card, Space, Typography, Divider } from 'antd';
import { 
  EnhancedMatchField, 
  NodeHierarchyAnalysis, 
  NodeLevel 
} from '../types';

const { Text } = Typography;

interface HierarchyFieldDisplayProps {
  fields: EnhancedMatchField[];
  analysis: NodeHierarchyAnalysis;
  onFieldSelect?: (field: EnhancedMatchField) => void;
  selectedFields?: string[];
  showConfidence?: boolean;
}

/**
 * 字段层级显示组件
 * 解决用户无法理解字段来源的问题
 */
export const HierarchyFieldDisplay: React.FC<HierarchyFieldDisplayProps> = ({
  fields,
  analysis,
  onFieldSelect,
  selectedFields = [],
  showConfidence = true
}) => {
  // 按层级分组字段
  const fieldsByLevel = React.useMemo(() => {
    const groups: Record<NodeLevel, EnhancedMatchField[]> = {
      self: [],
      parent: [],
      child: [],
      descendant: [],
      ancestor: [],
      sibling: []
    };

    fields.forEach(field => {
      groups[field.level].push(field);
    });

    return groups;
  }, [fields]);

  // 获取层级颜色
  const getLevelColor = (level: NodeLevel): string => {
    const colors: Record<NodeLevel, string> = {
      self: 'blue',
      parent: 'purple',
      child: 'green',
      descendant: 'cyan',
      ancestor: 'orange',
      sibling: 'gold'
    };
    return colors[level];
  };

  // 获取层级图标
  const getLevelIcon = (level: NodeLevel): string => {
    const icons: Record<NodeLevel, string> = {
      self: '●',
      parent: '↑',
      child: '↓',
      descendant: '⇊',
      ancestor: '⇈',
      sibling: '↔'
    };
    return icons[level];
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'default';
  };

  // 渲染字段组
  const renderFieldGroup = (level: NodeLevel, groupFields: EnhancedMatchField[]) => {
    if (groupFields.length === 0) return null;

    const levelNames: Record<NodeLevel, string> = {
      self: '当前节点',
      parent: '父节点',
      child: '子节点',
      descendant: '后代节点',
      ancestor: '祖先节点',
      sibling: '兄弟节点'
    };

    return (
      <div key={level} className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-lg mr-2">{getLevelIcon(level)}</span>
          <Text strong className="text-base">
            {levelNames[level]}
          </Text>
          <Text type="secondary" className="ml-2">
            ({groupFields.length} 个字段)
          </Text>
        </div>
        
        <div className="ml-6">
          <Space wrap>
            {groupFields.map((field, index) => (
              <Tooltip
                key={`${field.level}-${field.fieldName}-${index}`}
                title={
                  <div>
                    <div><strong>字段:</strong> {field.fieldName}</div>
                    <div><strong>值:</strong> {field.value}</div>
                    <div><strong>描述:</strong> {field.description}</div>
                    {showConfidence && (
                      <div><strong>置信度:</strong> {(field.confidence * 100).toFixed(1)}%</div>
                    )}
                    {field.depth !== undefined && (
                      <div><strong>深度:</strong> {field.depth}</div>
                    )}
                  </div>
                }
              >
                <Tag
                  color={getLevelColor(level)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onFieldSelect?.(field)}
                  style={{
                    opacity: selectedFields.includes(field.fieldName) ? 1 : 0.8,
                    border: selectedFields.includes(field.fieldName) ? '2px solid #1890ff' : undefined
                  }}
                >
                  <Space size={4}>
                    <span>{field.fieldName}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      = {field.value.length > 10 ? `${field.value.slice(0, 10)}...` : field.value}
                    </Text>
                    {showConfidence && (
                      <Tag 
                        color={getConfidenceColor(field.confidence)}
                        style={{ margin: 0, fontSize: '10px' }}
                      >
                        {(field.confidence * 100).toFixed(0)}%
                      </Tag>
                    )}
                  </Space>
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </div>
      </div>
    );
  };

  return (
    <Card 
      title="字段层级关系" 
      size="small"
      className="w-full"
      extra={
        showConfidence && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            点击字段查看详情 | 数字表示置信度
          </Text>
        )
      }
    >
      <div className="space-y-2">
        {/* 渲染各层级字段组 */}
        {(['self', 'parent', 'child', 'descendant', 'ancestor', 'sibling'] as NodeLevel[])
          .map(level => renderFieldGroup(level, fieldsByLevel[level]))}
        
        {fields.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            暂无字段数据
          </div>
        )}
        
        {/* 显示分析摘要 */}
        <Divider />
        <div className="text-sm text-gray-600">
          <Space split={<Divider type="vertical" />}>
            <Text>XPath: {analysis.path}</Text>
            <Text>深度: {analysis.depth}</Text>
            <Text>子节点: {analysis.children.length}</Text>
            <Text>后代节点: {analysis.descendants.length}</Text>
          </Space>
        </div>
      </div>
    </Card>
  );
};

/**
 * 简化版字段芯片显示
 * 用于步骤卡等空间受限的场景
 */
interface FieldChipsProps {
  fields: EnhancedMatchField[];
  maxDisplay?: number;
  size?: 'small' | 'default';
  showLevel?: boolean;
}

export const HierarchyFieldChips: React.FC<FieldChipsProps> = ({
  fields,
  maxDisplay = 5,
  size = 'small',
  showLevel = true
}) => {
  const displayFields = fields.slice(0, maxDisplay);
  const remainingCount = fields.length - maxDisplay;

  return (
    <Space wrap>
      {displayFields.map((field, index) => (
        <Tag
          key={`chip-${field.level}-${field.fieldName}-${index}`}
          color="default"
          className="text-xs"
        >
          {showLevel && (
            <span className="opacity-60 mr-1">
              {field.level === 'self' ? '' : `${field.level}.`}
            </span>
          )}
          {field.fieldName}
        </Tag>
      ))}
      
      {remainingCount > 0 && (
        <Tag color="default" className="text-xs">
          +{remainingCount}
        </Tag>
      )}
    </Space>
  );
};