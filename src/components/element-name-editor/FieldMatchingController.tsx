import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Switch, Select, InputNumber, Input, Tag, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { elementFieldAnalyzer, ElementFieldInfo } from '../../services/ElementFieldAnalyzer';

const { Text } = Typography;
const { Option } = Select;

interface FieldMatchingConfig {
  enabled: boolean;
  weight: number;
  required: boolean;
  matchTarget: string;
  matchMethod: string;
  customValue?: string;
}

interface FieldRowData {
  id: string;
  fieldName: string;
  fieldDisplayName: string;
  fieldType: string;
  description: string;
  examples?: string[];
  config: FieldMatchingConfig;
}

interface FieldMatchingControllerProps {
  visible?: boolean;
  onConfigChange?: (config: Record<string, FieldMatchingConfig>) => void;
  initialConfig?: Record<string, FieldMatchingConfig>;
  elementType?: string; // 指定要编辑的元素类型，如 'follow_button'
  elementData?: any; // 当前元素的实际数据
}

// 匹配目标选项
const MATCH_TARGETS = [
  { value: 'follow_button', label: '关注按钮', color: 'blue' },
  { value: 'username', label: '用户名', color: 'green' },
  { value: 'avatar', label: '头像', color: 'orange' },
  { value: 'like_button', label: '点赞按钮', color: 'red' },
  { value: 'comment_button', label: '评论按钮', color: 'purple' },
  { value: 'share_button', label: '分享按钮', color: 'cyan' },
  { value: 'custom', label: '自定义', color: 'gray' },
];

// 匹配方法选项
const MATCH_METHODS = [
  { value: 'exact', label: '精确匹配', description: '完全相等' },
  { value: 'contains', label: '包含匹配', description: '包含指定文本' },
  { value: 'regex', label: '正则匹配', description: '正则表达式匹配' },
  { value: 'startsWith', label: '开头匹配', description: '以指定文本开头' },
  { value: 'endsWith', label: '结尾匹配', description: '以指定文本结尾' },
  { value: 'fuzzy', label: '模糊匹配', description: '相似度匹配' },
];

export const FieldMatchingController: React.FC<FieldMatchingControllerProps> = ({
  visible = true,
  onConfigChange,
  initialConfig = {},
  elementType = 'follow_button', // 默认为关注按钮
  elementData = null
}) => {
  const [fieldRows, setFieldRows] = useState<FieldRowData[]>([]);

  // 使用 useMemo 来稳定 initialConfig 的引用
  const stableInitialConfig = useMemo(() => initialConfig, [JSON.stringify(initialConfig)]);
  
  // 使用 useMemo 来稳定 elementData 的引用
  const stableElementData = useMemo(() => elementData, [JSON.stringify(elementData)]);

  useEffect(() => {
    // 防抖处理，避免频繁更新
    const timeoutId = setTimeout(() => {
      try {
        // 只加载指定元素类型的字段数据，避免重复
        const allAnalysis = elementFieldAnalyzer.getAllElementAnalysis();
        const elementAnalysis = allAnalysis[elementType] || allAnalysis['follow_button']; // 回退到默认
        
        if (!elementAnalysis) {
          console.warn(`未找到元素类型 ${elementType} 的分析结果`);
          return;
        }

        const rows: FieldRowData[] = [];
        
        // 合并通用字段和特定字段，去除重复
        const allFields = [...elementAnalysis.commonFields, ...elementAnalysis.specificFields];
        const uniqueFields = allFields.filter((field, index, arr) => 
          arr.findIndex(f => f.field === field.field) === index
        );

        uniqueFields.forEach(field => {
          const id = field.field; // 简化ID，不再包含元素类型前缀
          const existingConfig = stableInitialConfig[id];
          
          rows.push({
            id,
            fieldName: field.field,
            fieldDisplayName: field.displayName,
            fieldType: field.type,
            description: field.description,
            examples: field.examples,
            config: existingConfig || {
              enabled: ['text', 'class', 'clickable'].includes(field.field),
              weight: field.field === 'text' ? 1.0 : 0.8,
              required: field.field === 'text',
              matchTarget: elementType,
              matchMethod: field.type === 'boolean' ? 'exact' : 'contains',
              customValue: stableElementData?.[field.field] || field.examples?.[0] || ''
            }
          });
        });

        setFieldRows(rows);
      } catch (error) {
        console.error('FieldMatchingController 渲染错误:', error);
        // 设置一个安全的默认状态
        setFieldRows([]);
      }
    }, 100); // 100ms 防抖

    return () => clearTimeout(timeoutId);
  }, [elementType, stableElementData, stableInitialConfig]);

  const updateFieldConfig = useCallback((id: string, updates: Partial<FieldMatchingConfig>) => {
    setFieldRows(prev => {
      const newRows = prev.map(row => 
        row.id === id 
          ? { ...row, config: { ...row.config, ...updates } }
          : row
      );
      
      // 通知父组件配置变化
      if (onConfigChange) {
        const config: Record<string, FieldMatchingConfig> = {};
        newRows.forEach(row => {
          config[row.id] = row.config;
        });
        onConfigChange(config);
      }
      
      return newRows;
    });
  }, [onConfigChange]);

  const columns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 60,
      render: (_: any, record: FieldRowData) => (
        <Switch
          size="small"
          checked={record.config.enabled}
          onChange={(checked) => updateFieldConfig(record.id, { enabled: checked })}
        />
      ),
    },
    {
      title: '字段信息',
      dataIndex: 'fieldInfo',
      key: 'fieldInfo',
      width: 200,
      render: (_: any, record: FieldRowData) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong>{record.fieldDisplayName}</Text>
            <Tag color="blue">{record.fieldType}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
          {record.examples && (
            <Text code style={{ fontSize: '11px' }}>
              示例: {record.examples[0]}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '匹配目标',
      dataIndex: 'matchTarget',
      key: 'matchTarget',
      width: 150,
      render: (_: any, record: FieldRowData) => (
        <Select
          size="small"
          value={record.config.matchTarget}
          onChange={(value) => updateFieldConfig(record.id, { matchTarget: value })}
          style={{ width: '100%' }}
          disabled={!record.config.enabled}
        >
          {MATCH_TARGETS.map(target => (
            <Option key={target.value} value={target.value}>
              <Tag color={target.color}>{target.label}</Tag>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '匹配方法',
      dataIndex: 'matchMethod',
      key: 'matchMethod',
      width: 150,
      render: (_: any, record: FieldRowData) => (
        <Select
          size="small"
          value={record.config.matchMethod}
          onChange={(value) => updateFieldConfig(record.id, { matchMethod: value })}
          style={{ width: '100%' }}
          disabled={!record.config.enabled}
        >
          {MATCH_METHODS.map(method => (
            <Option key={method.value} value={method.value}>
              <Tooltip title={method.description}>
                {method.label}
              </Tooltip>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '自定义值',
      dataIndex: 'customValue',
      key: 'customValue',
      width: 150,
      render: (_: any, record: FieldRowData) => (
        <Input
          size="small"
          placeholder="输入匹配值"
          value={record.config.customValue}
          onChange={(e) => updateFieldConfig(record.id, { customValue: e.target.value })}
          disabled={!record.config.enabled}
        />
      ),
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
      render: (_: any, record: FieldRowData) => (
        <InputNumber
          size="small"
          min={0}
          max={1}
          step={0.1}
          value={record.config.weight}
          onChange={(value) => updateFieldConfig(record.id, { weight: value || 0 })}
          disabled={!record.config.enabled}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '必需',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      render: (_: any, record: FieldRowData) => (
        <Switch
          size="small"
          checked={record.config.required}
          onChange={(checked) => updateFieldConfig(record.id, { required: checked })}
          disabled={!record.config.enabled}
        />
      ),
    },
  ];

  if (!visible) return null;

  return (
    <div style={{ padding: '8px 0' }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong>
            <InfoCircleOutlined style={{ marginRight: '8px' }} />
            字段匹配配置
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            总计 {fieldRows.length} 个字段，已启用 {fieldRows.filter(row => row.config.enabled).length} 个
          </Text>
        </div>
        
        <Table
          size="small"
          columns={columns}
          dataSource={fieldRows}
          rowKey="id"
          pagination={false}
          scroll={{ y: 400 }}
          bordered
          style={{ fontSize: '12px' }}
        />
      </Space>
    </div>
  );
};

export default FieldMatchingController;