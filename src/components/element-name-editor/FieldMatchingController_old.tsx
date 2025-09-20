import React, { useState, useEffect, useCallback } from 'react';
import { Table, Switch, Select, InputNumber, Input, Tag, Space, Typography, Tooltip, Button } from 'antd';
import { InfoCircleOutlined, SettingOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { elementFieldAnalyzer, ElementFieldInfo, ElementAnalysisResult } from '../../services/ElementFieldAnalyzer';

const { Text } = Typography;
const { Option } = Select;

interface FieldMatchingConfig {
  enabled: boolean;
  weight: number;
  required: boolean;
  matchTarget: string;  // 匹配目标：关注按钮、用户名、头像等
  matchMethod: string;  // 匹配方法：精确匹配、包含匹配、正则匹配等
  customValue?: string; // 自定义匹配值
}

interface FieldRowData {
  id: string;
  fieldName: string;
  fieldDisplayName: string;
  fieldType: string;
  description: string;
  example?: string;
  config: FieldMatchingConfig;
}

interface FieldMatchingControllerProps {
  visible?: boolean;
  onConfigChange?: (config: Record<string, FieldMatchingConfig>) => void;
  initialConfig?: Record<string, FieldMatchingConfig>;
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
  initialConfig = {}
}) => {
  const [fieldRows, setFieldRows] = useState<FieldRowData[]>([]);

  useEffect(() => {
    // 加载所有元素的字段数据，合并到一个表格中
    const analysis = elementFieldAnalyzer.getAllElementAnalysis();
    const rows: FieldRowData[] = [];

    Object.keys(analysis).forEach(elementType => {
      const result = analysis[elementType];
      [...result.commonFields, ...result.specificFields].forEach(field => {
        const id = `${elementType}_${field.field}`;
        const existingConfig = initialConfig[id];
        
        rows.push({
          id,
          fieldName: field.field,
          fieldDisplayName: field.displayName,
          fieldType: field.type,
          description: field.description,
          example: field.example,
          config: existingConfig || {
            enabled: ['text', 'class', 'clickable'].includes(field.field),
            weight: field.field === 'text' ? 1.0 : 0.8,
            required: field.field === 'text',
            matchTarget: elementType,
            matchMethod: field.type === 'boolean' ? 'exact' : 'contains',
            customValue: field.example || ''
          }
        });
      });
    });

    setFieldRows(rows);
  }, []);

  const updateFieldConfig = useCallback((id: string, updates: Partial<FieldMatchingConfig>) => {
    setFieldRows(prev => {
      const newRows = prev.map(row => 
        row.id === id 
          ? { ...row, config: { ...row.config, ...updates } }
          : row
      );
      
      // 通知配置变更
      const newConfig: Record<string, FieldMatchingConfig> = {};
      newRows.forEach(row => {
        newConfig[row.id] = row.config;
      });
      onConfigChange?.(newConfig);
      
      return newRows;
    });
  }, [onConfigChange]);

  const addCustomField = () => {
    const newId = `custom_${Date.now()}`;
    const newRow: FieldRowData = {
      id: newId,
      fieldName: 'custom',
      fieldDisplayName: '自定义字段',
      fieldType: 'string',
      description: '用户自定义的匹配字段',
      config: {
        enabled: true,
        weight: 1.0,
        required: false,
        matchTarget: 'custom',
        matchMethod: 'contains',
        customValue: ''
      }
    };
    
    setFieldRows(prev => [...prev, newRow]);
  };

  const removeField = (id: string) => {
    setFieldRows(prev => prev.filter(row => row.id !== id));
  };

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
          onChange={(enabled) => updateFieldConfig(record.id, { enabled })}
        />
      )
    },
    {
      title: '字段信息',
      key: 'fieldInfo',
      width: 200,
      render: (_: any, record: FieldRowData) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong>{record.fieldDisplayName}</Text>
            <Tag color="blue" size="small">{record.fieldType}</Tag>
            <Tooltip title={record.description}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.fieldName}
          </Text>
        </Space>
      )
    },
    {
      title: '匹配目标',
      key: 'matchTarget',
      width: 120,
      render: (_: any, record: FieldRowData) => (
        <Select
          size="small"
          value={record.config.matchTarget}
          onChange={(matchTarget) => updateFieldConfig(record.id, { matchTarget })}
          style={{ width: '100%' }}
        >
          {MATCH_TARGETS.map(target => (
            <Option key={target.value} value={target.value}>
              <Tag color={target.color} size="small">{target.label}</Tag>
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: '匹配方法',
      key: 'matchMethod',
      width: 120,
      render: (_: any, record: FieldRowData) => (
        <Select
          size="small"
          value={record.config.matchMethod}
          onChange={(matchMethod) => updateFieldConfig(record.id, { matchMethod })}
          style={{ width: '100%' }}
        >
          {MATCH_METHODS.map(method => (
            <Option key={method.value} value={method.value}>
              <Tooltip title={method.description}>
                {method.label}
              </Tooltip>
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: '匹配值',
      key: 'customValue',
      width: 150,
      render: (_: any, record: FieldRowData) => (
        <Input
          size="small"
          placeholder={record.example || '输入匹配值'}
          value={record.config.customValue}
          onChange={(e) => updateFieldConfig(record.id, { customValue: e.target.value })}
        />
      )
    },
    {
      title: '权重',
      key: 'weight',
      width: 80,
      render: (_: any, record: FieldRowData) => (
        <InputNumber
          size="small"
          min={0}
          max={2}
          step={0.1}
          value={record.config.weight}
          onChange={(weight) => weight !== null && updateFieldConfig(record.id, { weight })}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '必需',
      key: 'required',
      width: 60,
      render: (_: any, record: FieldRowData) => (
        <Switch
          size="small"
          checked={record.config.required}
          onChange={(required) => updateFieldConfig(record.id, { required, enabled: required || record.config.enabled })}
        />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: FieldRowData) => (
        <Space>
          {record.id.startsWith('custom_') && (
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeField(record.id)}
              danger
            />
          )}
        </Space>
      )
    }
  ];

  if (!visible) return null;

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space>
          <Text strong>字段匹配配置</Text>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={addCustomField}
          >
            添加自定义字段
          </Button>
        </Space>
        
        <Table
          dataSource={fieldRows}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 800 }}
          rowClassName={(record) => record.config.enabled ? '' : 'disabled-row'}
        />
      </Space>
      
      <style jsx>{`
        .disabled-row {
          opacity: 0.5;
          background-color: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default FieldMatchingController;

  const renderFieldTable = (elementType: string) => {
    const analysis = elementAnalysis[elementType];
    if (!analysis) return null;

    const allFields = [...analysis.commonFields, ...analysis.specificFields];
    const config = fieldConfigs[elementType] || {};

    const columns = [
      {
        title: '字段名称',
        dataIndex: 'displayName',
        key: 'displayName',
        width: 120,
        render: (text: string, record: ElementFieldInfo) => (
          <Space>
            <Text strong>{text}</Text>
            <Tooltip title={record.description}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </Space>
        )
      },
      {
        title: '字段类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: string) => {
          const colors = {
            string: 'blue',
            boolean: 'green',
            number: 'orange',
            coordinate: 'purple'
          };
          return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>;
        }
      },
      {
        title: '示例值',
        dataIndex: 'examples',
        key: 'examples',
        width: 180,
        render: (examples: string[]) => (
          <Space wrap>
            {examples.slice(0, 2).map((example, idx) => (
              <Tag key={idx} style={{ fontSize: '11px' }}>
                {example.length > 15 ? `${example.substring(0, 15)}...` : example}
              </Tag>
            ))}
          </Space>
        )
      },
      {
        title: '启用匹配',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 80,
        render: (_: any, record: ElementFieldInfo) => (
          <Switch
            checked={config[record.field]?.enabled || false}
            onChange={(checked) => handleFieldToggle(elementType, record.field, checked)}
            size="small"
          />
        )
      },
      {
        title: '必需字段',
        dataIndex: 'required',
        key: 'required',
        width: 80,
        render: (_: any, record: ElementFieldInfo) => (
          <Checkbox
            checked={config[record.field]?.required || false}
            onChange={(e) => handleRequiredToggle(elementType, record.field, e.target.checked)}
            disabled={!config[record.field]?.enabled}
          />
        )
      }
    ];

    return (
      <Table
        columns={columns}
        dataSource={allFields}
        rowKey="field"
        size="small"
        pagination={false}
        scroll={{ y: 300 }}
      />
    );
  };

  const renderSampleElements = (elementType: string) => {
    const analysis = elementAnalysis[elementType];
    if (!analysis) return null;

    return (
      <Collapse size="small">
        {analysis.sampleElements.map((element, idx) => (
          <Panel 
            header={`示例元素 ${idx + 1}: ${element.text || element.class || '未命名'}`} 
            key={idx}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {Object.entries(element).map(([key, value]) => (
                <div key={key} style={{ margin: '2px 0' }}>
                  <Text type="secondary">{key}:</Text> 
                  <Text code style={{ marginLeft: 8 }}>{String(value)}</Text>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </Collapse>
    );
  };

  const getEnabledFieldsCount = (elementType: string) => {
    const config = fieldConfigs[elementType] || {};
    return Object.values(config).filter(field => field.enabled).length;
  };

  const getRequiredFieldsCount = (elementType: string) => {
    const config = fieldConfigs[elementType] || {};
    return Object.values(config).filter(field => field.required).length;
  };

  if (!visible) return null;

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>元素字段匹配配置</span>
        </Space>
      }
      size="small"
      style={{ marginTop: 16 }}
    >
      <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 16 }}>
        配置不同元素类型的字段匹配规则。启用的字段将用于元素识别，必需字段必须匹配才能确定元素。
      </Paragraph>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="small"
        tabBarExtraContent={
          <Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已启用: {getEnabledFieldsCount(activeTab)} | 
              必需: {getRequiredFieldsCount(activeTab)}
            </Text>
          </Space>
        }
      >
        <TabPane 
          tab={
            <Space>
              <span>关注按钮</span>
              <Tag color="blue">{getEnabledFieldsCount('follow_button')}</Tag>
            </Space>
          } 
          key="follow_button"
        >
          <Tabs defaultActiveKey="config" size="small">
            <TabPane tab="字段配置" key="config">
              {renderFieldTable('follow_button')}
            </TabPane>
            <TabPane tab="示例数据" key="samples">
              {renderSampleElements('follow_button')}
            </TabPane>
          </Tabs>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <span>用户名</span>
              <Tag color="green">{getEnabledFieldsCount('username')}</Tag>
            </Space>
          } 
          key="username"
        >
          <Tabs defaultActiveKey="config" size="small">
            <TabPane tab="字段配置" key="config">
              {renderFieldTable('username')}
            </TabPane>
            <TabPane tab="示例数据" key="samples">
              {renderSampleElements('username')}
            </TabPane>
          </Tabs>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <span>头像图片</span>
              <Tag color="orange">{getEnabledFieldsCount('avatar')}</Tag>
            </Space>
          } 
          key="avatar"
        >
          <Tabs defaultActiveKey="config" size="small">
            <TabPane tab="字段配置" key="config">
              {renderFieldTable('avatar')}
            </TabPane>
            <TabPane tab="示例数据" key="samples">
              {renderSampleElements('avatar')}
            </TabPane>
          </Tabs>
        </TabPane>
      </Tabs>

      <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          💡 提示：文本字段通常是最重要的匹配标准，类名和可点击属性可以帮助进一步确认元素类型。
          坐标信息主要用于定位，不建议作为必需字段。
        </Text>
      </div>
    </Card>
  );
};

export default FieldMatchingController;