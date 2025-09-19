/**
 * 约束字段编辑器
 * 允许用户查看和编辑元素的原始匹配值，支持开启/关闭约束
 */

import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Switch, 
  Input, 
  Tag, 
  Space, 
  Typography, 
  Tooltip, 
  Row, 
  Col,
  Button,
  Alert,
  Divider
} from 'antd';
import { 
  EditOutlined, 
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  AndroidXMLFields, 
  FieldConfig, 
  ANDROID_XML_FIELD_CONFIG,
  formatFieldValue,
  getFieldImportanceColor,
  getDefaultEnabledFields
} from './AndroidXMLFieldAnalyzer';

const { Text } = Typography;

// 匹配约束接口
interface MatchingConstraints {
  [key: string]: boolean;
}

// 元素值数据接口
interface ElementFieldData {
  fieldKey: keyof AndroidXMLFields;
  config: FieldConfig;
  originalValue: string;
  editedValue?: string;
  enabled: boolean;
  hasValue: boolean;
}

interface ConstraintFieldEditorProps {
  /** 当前元素的原始XML数据 */
  elementData: Partial<AndroidXMLFields>;
  /** 当前约束配置 */
  constraints: MatchingConstraints;
  /** 约束配置变更回调 */
  onConstraintChange: (key: string, enabled: boolean) => void;
  /** 字段值变更回调 */
  onFieldValueChange?: (fieldKey: keyof AndroidXMLFields, value: string) => void;
  /** 是否只读模式 */
  readonly?: boolean;
}

export const ConstraintFieldEditor: React.FC<ConstraintFieldEditorProps> = ({
  elementData,
  constraints,
  onConstraintChange,
  onFieldValueChange,
  readonly = false
}) => {
  const [editingField, setEditingField] = useState<keyof AndroidXMLFields | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  
  // 构建表格数据
  const buildTableData = (): ElementFieldData[] => {
    return ANDROID_XML_FIELD_CONFIG.map(config => {
      const fieldKey = config.key;
      const originalValue = elementData[fieldKey] || '';
      const enabled = constraints[`enable${fieldKey.replace(/-/g, '_')}Match`] || constraints[`enable${fieldKey}Match`] || false;
      const hasValue = originalValue !== undefined && originalValue !== null && originalValue !== '';
      
      return {
        fieldKey,
        config,
        originalValue,
        editedValue: tempValues[fieldKey],
        enabled,
        hasValue
      };
    });
  };

  // 处理约束开关变更
  const handleConstraintToggle = (fieldKey: keyof AndroidXMLFields, enabled: boolean) => {
    const constraintKey = `enable${fieldKey.replace(/-/g, '_')}Match`;
    onConstraintChange(constraintKey, enabled);
  };

  // 处理字段值编辑
  const handleFieldEdit = (fieldKey: keyof AndroidXMLFields, value: string) => {
    setTempValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  // 保存字段值
  const handleSaveField = (fieldKey: keyof AndroidXMLFields) => {
    const newValue = tempValues[fieldKey];
    if (newValue !== undefined && onFieldValueChange) {
      onFieldValueChange(fieldKey, newValue);
    }
    setEditingField(null);
    setTempValues(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValues({});
  };

  // 批量启用推荐字段
  const handleEnableRecommended = () => {
    const recommendedFields = getDefaultEnabledFields();
    recommendedFields.forEach(fieldKey => {
      const constraintKey = `enable${fieldKey.replace(/-/g, '_')}Match`;
      onConstraintChange(constraintKey, true);
    });
  };

  // 表格列定义
  const columns: ColumnsType<ElementFieldData> = [
    {
      title: '字段信息',
      key: 'fieldInfo',
      width: 280,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Text strong className="text-sm">
              {record.config.label}
            </Text>
            <Tag color="blue" className="text-xs">
              {record.config.englishLabel}
            </Tag>
            <Tag color={getFieldImportanceColor(record.config.importance)} className="text-xs">
              {record.config.importance === 'high' ? '高' : 
               record.config.importance === 'medium' ? '中' : '低'}
            </Tag>
            {record.config.matchWeight >= 15 && (
              <Tag color="gold" className="text-xs">推荐</Tag>
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {record.config.description}
          </Text>
          <div className="flex items-center space-x-2">
            <Text type="secondary" className="text-xs">权重:</Text>
            <Tag color="default" className="text-xs">{record.config.matchWeight}%</Tag>
            {record.config.isIdentifier && (
              <Tag color="purple" className="text-xs">标识符</Tag>
            )}
            {record.config.isInteractive && (
              <Tag color="cyan" className="text-xs">交互</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '原始值',
      key: 'originalValue',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          {record.hasValue ? (
            <div>
              <Text className="text-sm break-all">
                {formatFieldValue(record.config, record.originalValue)}
              </Text>
              {record.originalValue !== formatFieldValue(record.config, record.originalValue) && (
                <Tooltip title={record.originalValue}>
                  <InfoCircleOutlined className="ml-1 text-gray-400" />
                </Tooltip>
              )}
            </div>
          ) : (
            <Text type="secondary" className="text-xs">无值</Text>
          )}
          
          {/* 显示常见值示例 */}
          {record.config.commonValues && record.config.commonValues.length > 0 && (
            <div className="mt-1">
              <Text type="secondary" className="text-xs">常见值: </Text>
              {record.config.commonValues.slice(0, 2).map((example, idx) => (
                <Tag key={idx} color="default" className="text-xs mr-1">
                  {formatFieldValue(record.config, example)}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '编辑值',
      key: 'editValue',
      width: 180,
      render: (_, record) => {
        const isEditing = editingField === record.fieldKey;
        const currentValue = record.editedValue ?? record.originalValue;
        
        if (readonly || !record.enabled) {
          return (
            <Text type="secondary" className="text-xs">
              {record.enabled ? '约束已启用' : '约束已关闭'}
            </Text>
          );
        }
        
        return (
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  size="small"
                  value={tempValues[record.fieldKey] || currentValue}
                  onChange={(e) => handleFieldEdit(record.fieldKey, e.target.value)}
                  placeholder={`输入${record.config.label}`}
                />
                <div className="flex space-x-1">
                  <Button 
                    size="small" 
                    type="primary" 
                    onClick={() => handleSaveField(record.fieldKey)}
                  >
                    保存
                  </Button>
                  <Button size="small" onClick={handleCancelEdit}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Text className="text-sm flex-1 break-all">
                  {currentValue || '空值'}
                </Text>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setEditingField(record.fieldKey)}
                  disabled={!record.enabled}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '启用约束',
      key: 'enabled',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div className="flex flex-col items-center space-y-1">
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(enabled) => handleConstraintToggle(record.fieldKey, enabled)}
            disabled={readonly}
          />
          {!record.hasValue && record.enabled && (
            <Tooltip title="此字段无值，启用后可能影响匹配">
              <ExclamationCircleOutlined className="text-orange-400 text-xs" />
            </Tooltip>
          )}
          {record.hasValue && record.enabled && (
            <CheckCircleOutlined className="text-green-500 text-xs" />
          )}
        </div>
      ),
    },
  ];

  const tableData = buildTableData();
  const enabledCount = tableData.filter(item => item.enabled).length;
  const hasValueCount = tableData.filter(item => item.hasValue && item.enabled).length;

  return (
    <Card 
      title={
        <Space>
          <EyeOutlined />
          <span>约束字段配置</span>
          <Tag color="blue">{enabledCount} 项启用</Tag>
          <Tag color="green">{hasValueCount} 项有效</Tag>
        </Space>
      }
      size="small"
      extra={
        !readonly && (
          <Button
            size="small"
            type="primary"
            onClick={handleEnableRecommended}
            icon={<CheckCircleOutlined />}
          >
            启用推荐字段
          </Button>
        )
      }
    >
      {/* 配置提示 */}
      <Alert
        message="字段匹配规则"
        description={
          <div className="text-sm space-y-1">
            <div>• 高权重字段 (15%+) 建议启用，提供精确匹配</div>
            <div>• 可编辑字段值以适应不同的匹配需求</div>
            <div>• 无值字段启用后可能导致匹配失败</div>
            <div>• 标识符字段提供唯一性识别，交互字段确认操作性</div>
          </div>
        }
        type="info"
        showIcon
        className="mb-4"
      />

      {/* 统计信息 */}
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{enabledCount}</div>
              <div className="text-xs text-gray-500">启用约束</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{hasValueCount}</div>
              <div className="text-xs text-gray-500">有效字段</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {ANDROID_XML_FIELD_CONFIG.filter(c => c.importance === 'high').length}
              </div>
              <div className="text-xs text-gray-500">高权重字段</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Divider orientation="left" orientationMargin="0">
        <Text type="secondary" className="text-sm">字段详细配置</Text>
      </Divider>

      {/* 字段配置表格 */}
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey="fieldKey"
        pagination={false}
        size="small"
        scroll={{ y: 400 }}
        rowClassName={(record) => {
          if (record.enabled && record.hasValue) return 'bg-green-50';
          if (record.enabled && !record.hasValue) return 'bg-orange-50';
          return '';
        }}
      />
    </Card>
  );
};

export default ConstraintFieldEditor;