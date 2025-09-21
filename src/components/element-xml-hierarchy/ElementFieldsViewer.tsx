/**
 * 元素字段查看器 - 显示UI元素的详细字段信息
 * 用于树形结构最底层节点的字段展示
 */

import React, { useMemo } from 'react';
import { 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col, 
  Descriptions, 
  Badge,
  Tooltip,
  Card,
  Divider
} from 'antd';
import {
  InfoCircleOutlined,
  EditOutlined,
  EyeOutlined,
  InteractionOutlined,
  BorderOutlined,
  FormatPainterOutlined,
  IdcardOutlined,
  FontSizeOutlined,
  SettingOutlined
} from '@ant-design/icons';

import type { UIElement } from '../../api/universalUIAPI';

const { Text, Paragraph } = Typography;

interface ElementFieldsViewerProps {
  /** UI元素数据 */
  element: UIElement;
  /** 是否显示为紧凑模式 */
  compact?: boolean;
  /** 是否显示边框 */
  bordered?: boolean;
}

interface FieldInfo {
  key: string;
  label: string;
  value: any;
  type: 'string' | 'boolean' | 'number' | 'object' | 'array';
  icon?: React.ReactNode;
  color?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 格式化字段值显示
 */
const formatFieldValue = (value: any, type: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <Text type="secondary">null</Text>;
  }

  switch (type) {
    case 'boolean':
      return (
        <Badge 
          status={value ? "success" : "default"} 
          text={value ? "true" : "false"}
        />
      );
    
    case 'object':
      if (typeof value === 'object') {
        return (
          <Tooltip title={JSON.stringify(value, null, 2)}>
            <Text code style={{ fontSize: '11px' }}>
              {JSON.stringify(value)}
            </Text>
          </Tooltip>
        );
      }
      return <Text>{String(value)}</Text>;
    
    case 'string':
      if (!value || value.trim() === '') {
        return <Text type="secondary" italic>空字符串</Text>;
      }
      return (
        <Text style={{ fontSize: '12px' }}>
          {value.length > 50 ? (
            <Tooltip title={value}>
              {value.substring(0, 50)}...
            </Tooltip>
          ) : (
            value
          )}
        </Text>
      );
    
    case 'number':
      return <Text strong>{value}</Text>;
    
    default:
      return <Text>{String(value)}</Text>;
  }
};

/**
 * 获取字段的颜色标识
 */
const getFieldColor = (key: string, value: any): string => {
  if (key === 'text' && value) return 'blue';
  if (key === 'resource_id' && value) return 'green';
  if (key === 'class_name' && value) return 'purple';
  if (key.includes('clickable') && value) return 'orange';
  if (key.includes('bounds') && value) return 'cyan';
  if (key.includes('enabled') && value) return 'lime';
  if (key.includes('visible') && value) return 'magenta';
  return 'default';
};

export const ElementFieldsViewer: React.FC<ElementFieldsViewerProps> = ({
  element,
  compact = false,
  bordered = true
}) => {
  // 解析元素字段信息
  const fieldsList = useMemo(() => {
    const fields: FieldInfo[] = [];

    // 定义字段映射和优先级
    const fieldConfigs = [
      // 高优先级字段
      { key: 'text', label: '文本内容', icon: <FontSizeOutlined />, priority: 'high' as const },
      { key: 'resource_id', label: '资源ID', icon: <IdcardOutlined />, priority: 'high' as const },
      { key: 'class_name', label: '类名', icon: <FormatPainterOutlined />, priority: 'high' as const },
      { key: 'element_type', label: '元素类型', icon: <SettingOutlined />, priority: 'high' as const },
      
      // 中优先级字段
      { key: 'bounds', label: '边界位置', icon: <BorderOutlined />, priority: 'medium' as const },
      { key: 'is_clickable', label: '可点击', icon: <InteractionOutlined />, priority: 'medium' as const },
      { key: 'is_enabled', label: '已启用', icon: <EyeOutlined />, priority: 'medium' as const },
      { key: 'is_scrollable', label: '可滚动', icon: <InteractionOutlined />, priority: 'medium' as const },
      { key: 'content_desc', label: '内容描述', icon: <InfoCircleOutlined />, priority: 'medium' as const },
      
      // 低优先级字段
      { key: 'xpath', label: 'XPath路径', icon: <EditOutlined />, priority: 'low' as const },
      { key: 'is_focused', label: '已聚焦', icon: <EyeOutlined />, priority: 'low' as const },
      { key: 'checkable', label: '可选中', icon: <InteractionOutlined />, priority: 'low' as const },
      { key: 'checked', label: '已选中', icon: <InteractionOutlined />, priority: 'low' as const },
      { key: 'selected', label: '已选择', icon: <InteractionOutlined />, priority: 'low' as const },
      { key: 'password', label: '密码字段', icon: <EditOutlined />, priority: 'low' as const },
      { key: 'id', label: '元素ID', icon: <IdcardOutlined />, priority: 'low' as const }
    ];

    // 处理每个字段配置
    fieldConfigs.forEach(config => {
      const value = (element as any)[config.key];
      
      // 判断字段类型
      let type: FieldInfo['type'] = 'string';
      if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'object' && value !== null) type = 'object';
      else if (Array.isArray(value)) type = 'array';

      fields.push({
        key: config.key,
        label: config.label,
        value,
        type,
        icon: config.icon,
        color: getFieldColor(config.key, value),
        priority: config.priority
      });
    });

    // 按优先级排序
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    return fields.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同优先级按字段名排序
      return a.label.localeCompare(b.label);
    });
  }, [element]);

  // 过滤有值的字段（紧凑模式）
  const visibleFields = useMemo(() => {
    if (compact) {
      return fieldsList.filter(field => {
        const value = field.value;
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (typeof value === 'boolean' && !value) return false;
        return true;
      });
    }
    return fieldsList;
  }, [fieldsList, compact]);

  // 高优先级字段（始终显示）
  const highPriorityFields = visibleFields.filter(f => f.priority === 'high');
  const mediumPriorityFields = visibleFields.filter(f => f.priority === 'medium');
  const lowPriorityFields = visibleFields.filter(f => f.priority === 'low');

  const renderFieldItem = (field: FieldInfo) => (
    <Descriptions.Item
      key={field.key}
      label={
        <Space size={4}>
          {field.icon}
          <Text strong style={{ fontSize: '11px' }}>
            {field.label}
          </Text>
        </Space>
      }
      span={compact ? 1 : field.priority === 'high' ? 2 : 1}
    >
      <Space size={4}>
        <Tag 
          color={field.color} 
          style={{ fontSize: '9px', margin: 0 }}
        >
          {field.type}
        </Tag>
        {formatFieldValue(field.value, field.type)}
      </Space>
    </Descriptions.Item>
  );

  return (
    <div className="element-fields-viewer">
      {/* 核心字段信息 */}
      {highPriorityFields.length > 0 && (
        <Card 
          size="small" 
          bordered={bordered}
          title={
            <Space size={4}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: '12px' }}>
                核心属性
              </Text>
              <Badge count={highPriorityFields.length} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          }
          style={{ marginBottom: compact ? 8 : 12 }}
        >
          <Descriptions 
            size="small" 
            column={compact ? 1 : 2}
            bordered={false}
          >
            {highPriorityFields.map(renderFieldItem)}
          </Descriptions>
        </Card>
      )}

      {/* 交互属性 */}
      {mediumPriorityFields.length > 0 && (
        <Card 
          size="small" 
          bordered={bordered}
          title={
            <Space size={4}>
              <InteractionOutlined style={{ color: '#fa8c16' }} />
              <Text strong style={{ fontSize: '12px' }}>
                交互属性
              </Text>
              <Badge count={mediumPriorityFields.length} style={{ backgroundColor: '#fa8c16' }} />
            </Space>
          }
          style={{ marginBottom: compact ? 8 : 12 }}
        >
          <Descriptions 
            size="small" 
            column={compact ? 1 : 3}
            bordered={false}
          >
            {mediumPriorityFields.map(renderFieldItem)}
          </Descriptions>
        </Card>
      )}

      {/* 扩展信息（非紧凑模式下显示） */}
      {!compact && lowPriorityFields.length > 0 && (
        <Card 
          size="small" 
          bordered={bordered}
          title={
            <Space size={4}>
              <SettingOutlined style={{ color: '#722ed1' }} />
              <Text strong style={{ fontSize: '12px' }}>
                扩展信息
              </Text>
              <Badge count={lowPriorityFields.length} style={{ backgroundColor: '#722ed1' }} />
            </Space>
          }
        >
          <Descriptions 
            size="small" 
            column={2}
            bordered={false}
          >
            {lowPriorityFields.map(renderFieldItem)}
          </Descriptions>
        </Card>
      )}

      {/* 元素统计信息 */}
      <Divider style={{ margin: '8px 0' }} />
      <Row gutter={8}>
        <Col span={8}>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            字段总数: <Text strong>{fieldsList.length}</Text>
          </Text>
        </Col>
        <Col span={8}>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            有值字段: <Text strong>{visibleFields.length}</Text>
          </Text>
        </Col>
        <Col span={8}>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            核心字段: <Text strong>{highPriorityFields.length}</Text>
          </Text>
        </Col>
      </Row>
    </div>
  );
};

export default ElementFieldsViewer;