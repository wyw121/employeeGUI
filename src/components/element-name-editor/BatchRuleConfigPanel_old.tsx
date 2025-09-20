/**
 * 批量规则配置面板组件
 * 专门用于配置自定义匹配规则，界面简洁清晰，支持实时预览
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  Select,
  Input,
  InputNumber,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
  Alert,
  Button,
  Tooltip,
  message,
  Radio,
  List,
  Spin,
  Progress,
  Badge,
  Empty
} from 'antd';
import {
  SettingOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  GroupOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { BatchMatchingEngine, ExecutionStrategy, MatchPreview } from '../../services/batchMatchingEngine';
import { MATCHING_TEMPLATES } from '../../services/customMatchingEngine';
import FieldMatchingController from './FieldMatchingController';
import { CustomMatchingRule } from '../../types/customMatching';

const { Title, Text } = Typography;
const { Option } = Select;

// ========== 类型定义 ==========
type MatchingMode = 'exact' | 'wildcard' | 'regex' | 'contains' | 'position' | 'attributes';
type BatchExecutionMode = 'sequential' | 'parallel' | 'first_only' | 'random_one';

// ========== 简化的规则结构 ==========
interface SimplifiedRule {
  id: string;
  name: string;
  enabled: boolean;
  mode: MatchingMode;
  textCondition: string;
  positionCondition?: {
    x?: string;
    y?: string;
  };
  attributeCondition?: string;
  batchExecution: {
    mode: BatchExecutionMode;
    maxConcurrency: number;
    delayBetweenActions: number;
  };
}

// ========== 接口定义 ==========
interface BatchRuleConfigPanelProps {
  /** 配置变更回调 */
  onChange?: (rule: SimplifiedRule) => void;
  /** 是否显示测试功能 */
  showTesting?: boolean;
}

// ========== 配置选项定义 ==========
const MATCHING_MODES = [
  {
    value: 'exact' as MatchingMode,
    label: '精确匹配',
    description: '完全匹配指定文本',
    icon: '🎯',
    example: '关注'
  },
  {
    value: 'wildcard' as MatchingMode,
    label: '通配符匹配',
    description: '支持 * 和 ? 通配符',
    icon: '🌟',
    example: '关注*'
  },
  {
    value: 'regex' as MatchingMode,
    label: '正则表达式',
    description: '灵活的模式匹配',
    icon: '🔍',
    example: '^关注\\d*$'
  },
  {
    value: 'contains' as MatchingMode,
    label: '包含匹配',
    description: '文本包含指定内容',
    icon: '📄',
    example: '关注'
  },
  {
    value: 'position' as MatchingMode,
    label: '位置匹配',
    description: '根据坐标范围匹配',
    icon: '📍',
    example: 'x: 100-200, y: 300-400'
  },
  {
    value: 'attributes' as MatchingMode,
    label: '属性匹配',
    description: '基于元素属性匹配',
    icon: '🏷️',
    example: 'clickable: true'
  }
];

const BATCH_EXECUTION_MODES = [
  {
    value: 'sequential' as BatchExecutionMode,
    label: '顺序执行',
    description: '逐个执行，有延迟间隔',
    icon: '🔄',
    recommended: true
  },
  {
    value: 'parallel' as BatchExecutionMode,
    label: '并行执行',
    description: '同时执行多个操作',
    icon: '⚡',
    warning: '可能会导致界面响应异常'
  },
  {
    value: 'first_only' as BatchExecutionMode,
    label: '仅执行第一个',
    description: '只执行匹配到的第一个元素',
    icon: '🥇'
  },
  {
    value: 'random_one' as BatchExecutionMode,
    label: '随机执行一个',
    description: '随机选择一个匹配元素执行',
    icon: '🎲'
  }
];

// ========== 主组件 ==========
const BatchRuleConfigPanel: React.FC<BatchRuleConfigPanelProps> = ({
  onChange,
  showTesting = true
}) => {
  const [form] = Form.useForm();
  
  // ========== 批量匹配引擎 ==========
  const [batchEngine] = useState(() => new BatchMatchingEngine());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [templateMode, setTemplateMode] = useState<keyof typeof MATCHING_TEMPLATES | 'custom'>('xiaohongshu_follow');
  
  const [rule, setRule] = useState<SimplifiedRule>({
    id: `rule_${Date.now()}`,
    name: '小红书关注按钮批量操作',
    enabled: true,
    mode: 'contains',
    textCondition: '关注',
    batchExecution: {
      mode: 'sequential',
      maxConcurrency: 1,
      delayBetweenActions: 1500
    }
  });

  // ========== 事件处理 ==========
  
  // 转换简化规则为完整规则
  const convertToCustomRule = (simplified: SimplifiedRule): CustomMatchingRule => {
    let baseRule;
    if (templateMode !== 'custom' && MATCHING_TEMPLATES[templateMode]) {
      baseRule = { ...MATCHING_TEMPLATES[templateMode].rules[0] };
    } else {
      baseRule = {
        id: simplified.id,
        name: simplified.name,
        enabled: simplified.enabled,
        conditions: {},
        options: {
          maxMatches: 10,
          order: 'document' as const,
          deduplicate: true
        }
      };
    }

    // 根据匹配模式调整条件
    switch (simplified.mode) {
      case 'exact':
        baseRule.conditions.text = {
          mode: 'exact' as const,
          value: simplified.textCondition || '',
          caseSensitive: false
        };
        break;
      case 'contains':
        baseRule.conditions.text = {
          mode: 'contains' as const,
          value: simplified.textCondition || '',
          caseSensitive: false
        };
        break;
      case 'wildcard':
        baseRule.conditions.text = {
          mode: 'wildcard' as const,
          value: simplified.textCondition || '',
          caseSensitive: false
        };
        break;
      case 'regex':
        baseRule.conditions.text = {
          mode: 'regex' as const,
          value: simplified.textCondition || '',
          caseSensitive: false
        };
        break;
      case 'position':
        if (simplified.positionCondition) {
          const xRange = simplified.positionCondition.x?.split('-').map(n => parseInt(n.trim()));
          const yRange = simplified.positionCondition.y?.split('-').map(n => parseInt(n.trim()));
          if (xRange && xRange.length === 2) {
            baseRule.conditions.bounds = baseRule.conditions.bounds || {};
            baseRule.conditions.bounds.x = { min: xRange[0], max: xRange[1] };
          }
          if (yRange && yRange.length === 2) {
            baseRule.conditions.bounds = baseRule.conditions.bounds || {};
            baseRule.conditions.bounds.y = { min: yRange[0], max: yRange[1] };
          }
        }
        break;
      case 'attributes':
        baseRule.conditions.attributes = {
          clickable: true,
          enabled: true
        };
        break;
    }

    return baseRule as CustomMatchingRule;
  };

  // 实时预览匹配结果
  const handlePreview = async () => {
    if (!rule.textCondition && rule.mode !== 'position' && rule.mode !== 'attributes') {
      setPreview(null);
      return;
    }

    try {
      setPreviewLoading(true);
      const customRule = convertToCustomRule(rule);
      const previewResult = await batchEngine.previewMatches(customRule);
      setPreview(previewResult);
      console.log('🔍 预览结果:', previewResult);
    } catch (error) {
      console.error('❌ 预览失败:', error);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 执行批量操作
  const handleExecute = async () => {
    try {
      setExecutionLoading(true);
      const customRule = convertToCustomRule(rule);
      const result = await batchEngine.executeBatchActions(
        customRule,
        { type: 'click' },
        {
          mode: rule.batchExecution.mode,
          delayBetweenActions: rule.batchExecution.delayBetweenActions,
          maxConcurrency: rule.batchExecution.maxConcurrency,
          continueOnError: true
        }
      );
      setExecutionResult(result);
      message.success(`执行完成: 成功 ${result.successfulOperations}/${result.totalElements}`);
    } catch (error) {
      console.error('❌ 执行失败:', error);
      message.error('执行失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setExecutionLoading(false);
    }
  };

  // 模板选择变更
  const handleTemplateChange = (templateKey: keyof typeof MATCHING_TEMPLATES | 'custom') => {
    setTemplateMode(templateKey);
    if (templateKey !== 'custom' && MATCHING_TEMPLATES[templateKey]) {
      const template = MATCHING_TEMPLATES[templateKey];
      const updatedRule = {
        ...rule,
        name: template.name,
        textCondition: (template.rules[0] as any)?.textMatch?.value || rule.textCondition
      };
      setRule(updatedRule);
      form.setFieldsValue(updatedRule);
    }
  };

  // 自动预览效果
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rule.textCondition || rule.mode === 'position' || rule.mode === 'attributes') {
        handlePreview();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [rule.textCondition, rule.mode, templateMode]);

  const handleFormChange = (changedValues: any, allValues: any) => {
    const newRule: SimplifiedRule = {
      ...rule,
      name: allValues.name || rule.name,
      enabled: allValues.enabled !== undefined ? allValues.enabled : rule.enabled,
      mode: allValues.mode || rule.mode,
      textCondition: allValues.textCondition || '',
      positionCondition: rule.mode === 'position' ? {
        x: allValues.positionX,
        y: allValues.positionY
      } : undefined,
      attributeCondition: rule.mode === 'attributes' ? allValues.attributeCondition : undefined,
      batchExecution: {
        mode: allValues.batchMode || rule.batchExecution.mode,
        maxConcurrency: allValues.maxConcurrency || rule.batchExecution.maxConcurrency,
        delayBetweenActions: allValues.delayBetweenActions || rule.batchExecution.delayBetweenActions
      }
    };

    setRule(newRule);
    onChange?.(newRule);
  };

  const handleTestRule = () => {
    message.info('测试功能开发中...');
    // TODO: 集成到测试系统
  };

  // ========== 获取当前模式配置 ==========
  const getCurrentMode = () => {
    return MATCHING_MODES.find(m => m.value === rule.mode) || MATCHING_MODES[0];
  };

  const getCurrentBatchMode = () => {
    return BATCH_EXECUTION_MODES.find(m => m.value === rule.batchExecution.mode) || BATCH_EXECUTION_MODES[0];
  };

  // ========== 渲染方法 ==========
  // 渲染模板选择器
  const renderTemplateSelector = () => (
    <Card size="small" className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BulbOutlined className="text-yellow-500" />
        <Text strong>快速模板</Text>
        <Tooltip title="选择预设模板快速配置匹配规则">
          <InfoCircleOutlined className="text-gray-400" />
        </Tooltip>
      </div>
      <Select
        value={templateMode}
        onChange={handleTemplateChange}
        className="w-full"
        placeholder="选择预设模板"
      >
        {Object.entries(MATCHING_TEMPLATES).map(([key, template]) => (
          <Option key={key} value={key}>
            <div>
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-gray-500">{template.description}</div>
            </div>
          </Option>
        ))}
        <Option value="custom">
          <div>
            <div className="font-medium">自定义规则</div>
            <div className="text-xs text-gray-500">完全自定义匹配条件</div>
          </div>
        </Option>
      </Select>
    </Card>
  );

  // 渲染实时预览面板
  const renderPreviewPanel = () => (
    <Card size="small" className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <EyeOutlined className="text-green-500" />
          <Text strong>实时预览</Text>
          {preview && (
            <Badge 
              count={preview.matchCount} 
              style={{ backgroundColor: preview.matchCount > 0 ? '#52c41a' : '#d9d9d9' }}
            />
          )}
        </div>
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={handlePreview}
          loading={previewLoading}
        >
          刷新
        </Button>
      </div>

      {previewLoading ? (
        <div className="text-center py-8">
          <Spin size="large" />
          <div className="mt-2 text-gray-500">正在分析页面元素...</div>
        </div>
      ) : preview ? (
        <div>
          {preview.matchCount > 0 ? (
            <>
              <div className="mb-3">
                <Progress 
                  percent={Math.min(preview.confidence * 100, 100)} 
                  size="small"
                  status={preview.confidence > 0.8 ? 'success' : 'active'}
                  format={() => `置信度 ${(preview.confidence * 100).toFixed(1)}%`}
                />
              </div>
              <List
                size="small"
                dataSource={preview.previewElements.slice(0, 5)}
                renderItem={(item, index) => (
                  <List.Item className="py-2">
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <Text strong className="text-blue-600">#{index + 1} {item.text || '(无文本)'}</Text>
                        <Tag color="blue" className="text-xs">
                          {(item.confidence * 100).toFixed(0)}%
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>类型: {item.elementType}</div>
                        <div>位置: {item.bounds}</div>
                        <div>匹配: {item.matchedConditions.join(', ')}</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
              {preview.previewElements.length > 5 && (
                <div className="text-center text-gray-500 mt-2">
                  还有 {preview.previewElements.length - 5} 个匹配元素...
                </div>
              )}
            </>
          ) : (
            <Empty 
              description="未找到匹配的元素"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-4"
            >
              <Text type="secondary" className="text-sm">
                请调整匹配条件或检查页面内容
              </Text>
            </Empty>
          )}
        </div>
      ) : (
        <Alert
          message="点击刷新按钮开始预览"
          type="info"
          showIcon
          className="text-center"
        />
      )}
    </Card>
  );

  // 渲染增强的测试区域
  const renderEnhancedTestArea = () => (
    <Card
      size="small"
      title={
        <Space>
          <ThunderboltOutlined />
          批量执行
        </Space>
      }
      className="mt-4"
    >
      <Space className="w-full justify-between">
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleExecute}
            loading={executionLoading}
            disabled={!rule.enabled || !preview || preview.matchCount === 0}
          >
            执行批量操作
          </Button>
          <Button 
            icon={<EyeOutlined />}
            onClick={handlePreview}
            loading={previewLoading}
          >
            预览匹配
          </Button>
        </Space>
        <Button 
          icon={<SaveOutlined />}
          onClick={() => message.success('规则已保存')}
        >
          保存规则
        </Button>
      </Space>

      {executionResult && (
        <Alert
          className="mt-3"
          message={`执行完成: 成功 ${executionResult.successfulOperations}/${executionResult.totalElements}`}
          description={`耗时 ${executionResult.executionTime}ms, 策略: ${executionResult.strategy.mode}`}
          type={executionResult.success ? 'success' : 'warning'}
          showIcon
          closable
          onClose={() => setExecutionResult(null)}
        />
      )}
    </Card>
  );

  const renderConditionConfig = () => (
    <Card size="small" title={
      <Space>
        <BulbOutlined />
        匹配条件配置
      </Space>
    }>
      <Form.Item
        name="textCondition"
        label="文本条件"
        rules={[{ required: true, message: '请输入匹配条件' }]}
      >
        <Input
          placeholder="请输入匹配条件"
          suffix={
            <Tooltip title="配置元素匹配的基本条件">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
      </Form.Item>
    </Card>
  );

  const renderFieldMatchingConfig = () => (
    <Card size="small" title={
      <Space>
        <FieldTimeOutlined />
        字段匹配配置
      </Space>
    }>
      <FieldMatchingController
        fields={fields}
        onChange={(updatedFields) => {
          setFields(updatedFields);
          // 通知父组件更新
          onChange?.({
            ...rule,
            matchingFields: updatedFields
          });
        }}
      />
    </Card>
  );

  const renderPositionConfig = () => (
    <Card size="small" title={
      <Space>
        <AimOutlined />
        位置配置
      </Space>
    }>
      <div>
        <Row gutter={16}>
          <Col span={12}>
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="positionX" label="X坐标范围">
                <Input placeholder="例如: 100-200" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="positionY" label="Y坐标范围">
                <Input placeholder="例如: 300-400" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ) : rule.mode === 'attributes' ? (
        <div>
          <Form.Item name="attributeCondition" label="属性条件">
            <Input placeholder="例如: clickable=true,enabled=true" />
          </Form.Item>
        </div>
      ) : null}

      {/* 条件预览 */}
      <div style={{ marginTop: '12px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          💡 匹配预览：将匹配包含 "<Text code>{rule.textCondition || '(未设置)'}</Text>" 的元素
        </Text>
      </div>
    </Card>
  );

  const renderBatchConfig = () => (
    <Card size="small" title={
      <Space>
        <GroupOutlined />
        批量执行配置
      </Space>
    }>
      <Form.Item
        name="batchMode"
        label="执行模式"
        tooltip="当匹配到多个元素时的处理策略"
      >
        <Radio.Group>
          {BATCH_EXECUTION_MODES.map(mode => (
            <Radio.Button key={mode.value} value={mode.value}>
              <Space>
                <span>{mode.icon}</span>
                {mode.label}
                {mode.recommended && <Tag color="green" style={{ fontSize: '10px' }}>推荐</Tag>}
              </Space>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <Alert
        message={getCurrentBatchMode().label}
        description={getCurrentBatchMode().description}
        type={getCurrentBatchMode().warning ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {(rule.batchExecution.mode === 'sequential' || rule.batchExecution.mode === 'parallel') && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="delayBetweenActions"
              label="操作间隔 (毫秒)"
              tooltip="两次操作之间的等待时间"
            >
              <InputNumber
                min={0}
                max={10000}
                step={100}
                placeholder="1000"
                addonAfter="ms"
              />
            </Form.Item>
          </Col>
          {rule.batchExecution.mode === 'parallel' && (
            <Col span={12}>
              <Form.Item
                name="maxConcurrency"
                label="最大并发数"
                tooltip="同时执行的最大操作数量"
              >
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="3"
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      )}
    </Card>
  );

  // ========== 主渲染 ==========
  return (
    <div className="batch-rule-config-panel">
      {/* 标题和状态 */}
      <div style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <Space>
                <SettingOutlined />
                批量规则配置
              </Space>
            </Title>
            <Text type="secondary">
              配置自定义匹配规则，实现"一键多目标"操作
            </Text>
          </Col>
          <Col>
            <Switch
              checked={rule.enabled}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              size="default"
              onChange={(checked) => {
                setRule({ ...rule, enabled: checked });
              }}
            />
          </Col>
        </Row>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={{
          name: rule.name,
          enabled: rule.enabled,
          mode: rule.mode,
          textCondition: rule.textCondition,
          batchMode: rule.batchExecution.mode,
          maxConcurrency: rule.batchExecution.maxConcurrency,
          delayBetweenActions: rule.batchExecution.delayBetweenActions
        }}
      >
        {/* 基本信息 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="name"
            label="规则名称"
            rules={[
              { required: true, message: '请输入规则名称' },
              { max: 30, message: '名称不能超过30个字符' }
            ]}
          >
            <Input
              placeholder="例如：批量关注用户、批量点赞"
              prefix={<SettingOutlined />}
            />
          </Form.Item>
        </Card>

        {/* 字段匹配控制器 */}
        <Card 
          size="small" 
          style={{ marginBottom: '16px' }}
          title="字段匹配配置"
          extra={
            <Tooltip title="配置元素字段的匹配规则和权重">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <FieldMatchingController
            onConfigChange={(config) => {
              console.log('字段匹配配置变更:', config);
            }}
          />
        </Card>

        {/* 配置区域 */}
        <div className="space-y-4">
          {renderTemplateSelector()}
          {renderConditionConfig()}
          {renderPreviewPanel()}
          {renderBatchConfig()}
        </div>

        {/* 增强的测试区域 */}
        {showTesting && renderEnhancedTestArea()}
      </Form>

      {/* 状态信息 */}
      <Alert
        message={
          <Space>
            <CheckCircleOutlined />
            配置状态
          </Space>
        }
        description={
          <div style={{ fontSize: '12px' }}>
            <Space direction="vertical" size={2}>
              <Text>规则名称：{rule.name}</Text>
              <Text>启用状态：{rule.enabled ? '✅ 已启用' : '❌ 已禁用'}</Text>
              <Text>匹配模式：{getCurrentMode().label}</Text>
              <Text>执行模式：{getCurrentBatchMode().label}</Text>
            </Space>
          </div>
        }
        type="success"
        showIcon={false}
        style={{ marginTop: '16px', background: '#f6ffed' }}
      />
    </div>
  );
};

export default BatchRuleConfigPanel;