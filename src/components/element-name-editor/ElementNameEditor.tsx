/**
 * 元素名称编辑器组件
 * 提供用户友好的界面来修改元素名称和配置匹配规则
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
  Alert,
  Collapse,
  Tooltip,
  message,
  Tabs
} from 'antd';
import {
  EditOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  SaveOutlined,
  ReloadOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  GroupOutlined,
  BulbOutlined,
  BugOutlined
} from '@ant-design/icons';
import ElementNameMapper, { 
  UIElement, 
  MatchingConstraints, 
  DEFAULT_MATCHING_CONSTRAINTS,
  ElementNameMapping 
} from '../../modules/ElementNameMapper';
import { ConstraintFieldEditor } from './ConstraintFieldEditor';
import { ExtendedUIElement, adaptToAndroidXMLFields } from './ElementDataAdapter';
import { AdbPrecisionStrategy } from '../../services/AdbPrecisionStrategy';
import BatchRuleConfigPanel from './BatchRuleConfigPanel';
import ErrorBoundary from '../ErrorBoundary';
import CachedElementXmlHierarchyTab from '../element-xml-hierarchy/CachedElementXmlHierarchyTab';
import { AdbXmlInspector } from '../adb-xml-inspector';
import type { UIElement as UniversalUIElement } from '../../api/universalUIAPI';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// ========== 类型适配器函数 ==========

/**
 * 将ElementNameEditor的UIElement转换为Universal UI的UIElement
 */
const adaptElementToUniversalUIType = (element: UIElement): UniversalUIElement => {
  return {
    id: element.id || element.resource_id || element.text || 'unknown',
    text: element.text || '',
    element_type: element.element_type || '',
    class_name: element.element_type || '',
    resource_id: element.resource_id || '',
    content_desc: element.content_desc || '',
    bounds: element.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
    xpath: '',
    is_clickable: element.clickable || false,
    is_scrollable: false,
    is_enabled: true,
    is_focused: false,
    checkable: element.clickable || false,
    checked: false,
    selected: false,
    password: false
  } as UniversalUIElement;
};

// ========== 组件接口定义 ==========

interface ElementNameEditorProps {
  /** 是否显示模态框 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 要编辑的元素信息 */
  element: UIElement | null;
  /** 保存成功回调 */
  onSaved?: (newDisplayName: string) => void;
}

/**
 * 约束字段配置项
 */
const CONSTRAINT_CONFIG = [
  {
    key: 'enableTextMatch' as keyof MatchingConstraints,
    label: '文本匹配',
    englishLabel: 'text',
    description: '匹配元素的显示文本内容',
    icon: '📝',
    weight: 25
  },
  {
    key: 'enableResourceIdMatch' as keyof MatchingConstraints,
    label: '资源ID匹配',
    englishLabel: 'resource_id',
    description: '匹配元素的Android资源标识符',
    icon: '🆔',
    weight: 20
  },
  {
    key: 'enableClickableMatch' as keyof MatchingConstraints,
    label: '可点击属性匹配',
    englishLabel: 'clickable',
    description: '匹配元素是否可点击（重要：同类元素通常有相同可点击性）',
    icon: '👆',
    weight: 15,
    recommended: true
  },
  {
    key: 'enableContentDescMatch' as keyof MatchingConstraints,
    label: '内容描述匹配',
    englishLabel: 'content_desc',
    description: '匹配元素的内容描述（accessibility）',
    icon: '📋',
    weight: 15
  },
  {
    key: 'enableClassNameMatch' as keyof MatchingConstraints,
    label: '类名匹配',
    englishLabel: 'class_name',
    description: '匹配元素的CSS类名',
    icon: '🎯',
    weight: 10
  },
  {
    key: 'enableElementTypeMatch' as keyof MatchingConstraints,
    label: '元素类型匹配',
    englishLabel: 'element_type',
    description: '匹配元素的UI类型（Button、TextView等）',
    icon: '🏷️',
    weight: 10
  },
  {
    key: 'enableParentMatch' as keyof MatchingConstraints,
    label: '父元素匹配',
    englishLabel: 'parent',
    description: '匹配元素的父级容器信息（层级树）',
    icon: '�',
    weight: 5
  },
  {
    key: 'enableSiblingMatch' as keyof MatchingConstraints,
    label: '兄弟元素匹配',
    englishLabel: 'siblings',
    description: '匹配同级相邻元素信息',
    icon: '�',
    weight: 3
  },
  {
    key: 'enableBoundsMatch' as keyof MatchingConstraints,
    label: '坐标范围匹配',
    englishLabel: 'bounds',
    description: '匹配元素的屏幕坐标范围（不推荐，坐标易变动）',
    icon: '�',
    weight: 2
  }
];

// ========== 主组件 ==========

const ElementNameEditor: React.FC<ElementNameEditorProps> = ({
  visible,
  onClose,
  element,
  onSaved
}) => {
  // ========== 状态管理 ==========
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [constraints, setConstraints] = useState<MatchingConstraints>(DEFAULT_MATCHING_CONSTRAINTS);
  const [existingMapping, setExistingMapping] = useState<ElementNameMapping | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0); // 🆕 强制重新渲染的key

  // ========== 生命周期 ==========
  useEffect(() => {
    if (visible && element) {
      initializeFormData();
    }
  }, [visible, element]);

  // 🆕 监听表单变化，实时更新预览名称
  useEffect(() => {
    const subscription = form.getFieldsValue();
    const currentDisplayName = form.getFieldValue('displayName');
    if (currentDisplayName !== undefined) {
      setPreviewName(currentDisplayName || '未命名元素');
    }
  }, [form]);

  // 🆕 监听表单字段变化
  useEffect(() => {
    const unsubscribe = form.getFieldsError();
    // 这个effect确保表单变化时预览名称同步更新
  }, [form]);

  // ========== 初始化表单数据 ==========
  const initializeFormData = () => {
    if (!element) return;

    // 获取当前显示名称
    const currentDisplayName = ElementNameMapper.getDisplayName(element);
    console.log('🏷️ 初始化显示名称:', currentDisplayName);
    setPreviewName(currentDisplayName);

    // 查找是否有现有映射
    const mappings = ElementNameMapper.getAllMappings();
    const existing = mappings.find(m => {
      const score = calculateDisplayMatchScore(element, m);
      return score >= 0.8;
    });
    
    setExistingMapping(existing);

    // 设置表单初值
    if (existing) {
      const formValues = {
        displayName: existing.displayName,
        notes: existing.notes || ''
      };
      form.setFieldsValue(formValues);
      setConstraints(existing.fingerprint.constraints);
      setPreviewName(existing.displayName); // 🆕 确保预览名称同步
    } else {
      const formValues = {
        displayName: currentDisplayName,
        notes: ''
      };
      form.setFieldsValue(formValues);
      setConstraints(DEFAULT_MATCHING_CONSTRAINTS);
      setPreviewName(currentDisplayName); // 🆕 确保预览名称同步
    }

    // 🆕 强制更新
    setRefreshKey(prev => prev + 1);
    console.log('✅ 表单初始化完成:', form.getFieldsValue());
  };

  // ========== 简单的匹配度计算（用于查找现有映射）==========
  const calculateDisplayMatchScore = (element: UIElement, mapping: ElementNameMapping): number => {
    let matchCount = 0;
    let totalFields = 0;

    if (element.text && mapping.fingerprint.text) {
      totalFields++;
      if (element.text === mapping.fingerprint.text) matchCount++;
    }
    if (element.resource_id && mapping.fingerprint.resource_id) {
      totalFields++;
      if (element.resource_id === mapping.fingerprint.resource_id) matchCount++;
    }
    
    return totalFields > 0 ? matchCount / totalFields : 0;
  };

  // ========== 事件处理 ==========

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      if (!element) {
        message.error('元素信息缺失');
        return;
      }

      const { displayName, notes } = values;

      if (existingMapping) {
        // 更新现有映射
        ElementNameMapper.updateMapping(existingMapping.id, {
          displayName,
          notes,
          constraints
        });
      } else {
        // 创建新映射
        ElementNameMapper.createMapping(
          element,
          displayName,
          constraints,
          notes
        );
      }

      onSaved?.(displayName);
      onClose();
      message.success('元素名称映射保存成功！');

    } catch (error) {
      console.error('保存映射失败:', error);
      message.error('保存失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  const handleConstraintChange = (key: keyof MatchingConstraints, value: boolean) => {
    setConstraints(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetConstraints = () => {
    setConstraints(DEFAULT_MATCHING_CONSTRAINTS);
    message.info('已重置为默认约束配置');
  };

  const handlePreviewUpdate = (displayName: string) => {
    const newName = displayName || '未命名元素';
    console.log('🔄 更新预览名称:', newName);
    setPreviewName(newName);
    setRefreshKey(prev => prev + 1); // 🆕 触发重新渲染
  };

  // 🆕 实时获取表单中的显示名称
  const getCurrentDisplayName = () => {
    const formDisplayName = form.getFieldValue('displayName');
    return formDisplayName || previewName || '未命名元素';
  };

  // ========== 渲染辅助函数 ==========

  const renderElementInfo = () => {
    if (!element) return null;

    const elementInfo = [
      { label: '文本', value: element.text, show: !!element.text },
      { label: '资源ID', value: element.resource_id, show: !!element.resource_id },
      { label: '元素类型', value: element.element_type, show: !!element.element_type },
      { label: '内容描述', value: element.content_desc, show: !!element.content_desc },
      { label: '可点击', value: element.clickable ? '是' : '否', show: element.clickable !== undefined },
    ].filter(item => item.show);

    return (
      <Card size="small" title={<Space><InfoCircleOutlined />元素信息</Space>}>
        <div className="space-y-2">
          {elementInfo.map((item, index) => (
            <Row key={index}>
              <Col span={6}>
                <Text type="secondary">{item.label}:</Text>
              </Col>
              <Col span={18}>
                <Text code copyable={{ text: item.value }}>{item.value}</Text>
              </Col>
            </Row>
          ))}
          {element.bounds && (
            <Row>
              <Col span={6}>
                <Text type="secondary">坐标:</Text>
              </Col>
              <Col span={18}>
                <Text code>
                  ({element.bounds.left}, {element.bounds.top}) - 
                  ({element.bounds.right}, {element.bounds.bottom})
                </Text>
              </Col>
            </Row>
          )}
        </div>
      </Card>
    );
  };

  const renderConstraintsConfig = () => {
    const enabledCount = Object.values(constraints).filter(Boolean).length;
    const totalWeight = CONSTRAINT_CONFIG
      .filter(config => constraints[config.key])
      .reduce((sum, config) => sum + config.weight, 0);

    return (
      <Card 
        size="small" 
        title={
          <Space>
            <SettingOutlined />
            匹配约束配置
            <Tag color="blue">{enabledCount}/{CONSTRAINT_CONFIG.length}项启用</Tag>
            <Tag color="green">总权重: {totalWeight}%</Tag>
          </Space>
        }
        extra={
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={handleResetConstraints}
          >
            重置
          </Button>
        }
      >
        <Alert 
          message="匹配约束配置"
          description="选择哪些元素属性用于匹配识别。启用的约束越多，匹配精度越高，但可能影响灵活性。"
          type="info"
          showIcon
          className="mb-4"
        />
        
        <div className="space-y-3">
          {CONSTRAINT_CONFIG.map((config) => {
            const configKey = String(config.key);
            const fieldName = configKey.replace('enable', '').replace('Match', '').toLowerCase();
            const currentValue = element?.[fieldName as keyof UIElement];
            const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';
            
            return (
              <Row key={configKey} align="middle" className="py-2">
                <Col span={16}>
                  <Space>
                    <span>{config.icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Text strong>{config.label}</Text>
                        <Tag color="blue" style={{ fontSize: '10px' }}>
                          {config.englishLabel}
                        </Tag>
                        <Tag color="default" className="ml-2">权重{config.weight}%</Tag>
                        {(config as any).recommended && (
                          <Tag color="gold" style={{ fontSize: '10px' }}>推荐</Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {config.description}
                      </Text>
                      {hasValue && (
                        <div className="mt-1">
                          <Text type="success" style={{ fontSize: '11px' }}>
                            当前值: {String(currentValue).substring(0, 30)}
                            {String(currentValue).length > 30 ? '...' : ''}
                          </Text>
                        </div>
                      )}
                      {/* 🆕 显示父元素信息 */}
                      {config.key === 'enableParentMatch' && element?.parent && (
                        <div className="mt-1">
                          <Text type="success" style={{ fontSize: '11px' }}>
                            父元素: {element.parent.element_type} 
                            {element.parent.resource_id && ` (${element.parent.resource_id})`}
                          </Text>
                        </div>
                      )}
                      {/* 🆕 显示兄弟元素信息 */}
                      {config.key === 'enableSiblingMatch' && element?.siblings && element.siblings.length > 0 && (
                        <div className="mt-1">
                          <Text type="success" style={{ fontSize: '11px' }}>
                            兄弟元素: {element.siblings.length} 个
                          </Text>
                        </div>
                      )}
                    </div>
                  </Space>
                </Col>
                <Col span={8} className="text-right">
                  <Space>
                    {!hasValue && config.key !== 'enableParentMatch' && config.key !== 'enableSiblingMatch' && (
                      <Tooltip title="当前元素没有此属性值">
                        <Tag color="orange">无值</Tag>
                      </Tooltip>
                    )}
                    <Switch
                      checked={constraints[config.key]}
                      onChange={(checked) => handleConstraintChange(config.key, checked)}
                      size="small"
                    />
                  </Space>
                </Col>
              </Row>
            );
          })}
        </div>
      </Card>
    );
  };

  // ========== 字段详细配置渲染函数 ==========
  
  const renderFieldDetailConfig = () => {
    if (!element) return null;

    // 转换元素数据为Android XML格式
    const xmlData = adaptToAndroidXMLFields(element as ExtendedUIElement);
    
    // 执行精准度分析
    const precisionAnalysis = AdbPrecisionStrategy.evaluateElementPrecision(xmlData);
    const fieldStability = AdbPrecisionStrategy.getAllFieldStability();
    
    // 缓存的映射值（如果存在）
    const existingMapping = (ElementNameMapper as any).findBestMatch?.(element) || null;
    const cachedValues = existingMapping ? {
      displayName: existingMapping.displayName,
      lastUpdated: new Date(existingMapping.lastUsedAt).toLocaleTimeString(),
      usageCount: existingMapping.usageCount
    } : null;

    // 生成ADB命令
    const adbCommands = AdbPrecisionStrategy.generateAdbCommands(xmlData);

    // 按稳定性排序字段
    const sortedFields = Object.entries(xmlData)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => ({
        key,
        value,
        stability: AdbPrecisionStrategy.getFieldStability(key)
      }))
      .sort((a, b) => (b.stability?.score || 0) - (a.stability?.score || 0));

    return (
      <div style={{ 
        padding: '16px', 
        background: '#1a1a1a', 
        borderRadius: '8px',
        color: '#fff'
      }}>
        {/* 精准度总览 - 暗黑风格 */}
        <Alert
          message={
            <div style={{ color: '#fff' }}>
              <strong>🎯 ADB 自动化精准度: {precisionAnalysis.overallScore}%</strong>
            </div>
          }
          description={
            <div style={{ marginTop: '8px', color: '#e6e6e6' }}>
              <Text style={{ color: '#e6e6e6' }}>
                最佳策略: {precisionAnalysis.bestStrategy?.name || '暂无可用策略'}
              </Text>
              {precisionAnalysis.overallScore >= 90 && (
                <Tag color="success" style={{ marginLeft: '8px' }}>
                  🟢 极高精准度 - 推荐生产使用
                </Tag>
              )}
              {precisionAnalysis.overallScore >= 70 && precisionAnalysis.overallScore < 90 && (
                <Tag color="warning" style={{ marginLeft: '8px' }}>
                  🟡 中等精准度 - 建议添加重试
                </Tag>
              )}
              {precisionAnalysis.overallScore < 70 && (
                <Tag color="error" style={{ marginLeft: '8px' }}>
                  🔴 较低精准度 - 需要优化策略
                </Tag>
              )}
            </div>
          }
          type={precisionAnalysis.overallScore >= 70 ? 'success' : 'warning'}
          showIcon
          style={{ 
            background: '#2d2d2d', 
            border: '1px solid #404040',
            color: '#fff'
          }}
        />

        <div style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            {/* 左侧：原始XML字段（用于匹配） */}
            <Col span={14}>
              <Card 
                title={
                  <Space style={{ color: '#fff' }}>
                    <span>�</span>
                    原始XML字段
                    <Tag color="cyan">用于匹配识别</Tag>
                    <Tag color="blue">{sortedFields.length} 个字段</Tag>
                  </Space>
                }
                size="small"
                style={{ 
                  background: '#2d2d2d', 
                  border: '1px solid #404040'
                }}
                headStyle={{ 
                  background: '#1f1f1f', 
                  borderBottom: '1px solid #404040',
                  color: '#fff'
                }}
                bodyStyle={{ background: '#2d2d2d' }}
              >
                <Alert
                  message={
                    <Text style={{ color: '#fff' }}>
                      <strong>📋 字段用途说明</strong>
                    </Text>
                  }
                  description={
                    <div style={{ color: '#e6e6e6', fontSize: '12px', marginTop: '4px' }}>
                      <Text style={{ color: '#e6e6e6' }}>
                        这些是从Android应用界面提取的<strong>原始XML属性</strong>，系统使用这些字段来<strong>识别和定位</strong>界面元素。
                        字段稳定性越高，定位越准确。
                      </Text>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ 
                    marginBottom: '12px',
                    background: '#0f3460', 
                    border: '1px solid #1890ff'
                  }}
                />

                <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="dark-scrollbar">
                  {sortedFields.map(({ key, value, stability }, index) => (
                    <div 
                      key={key} 
                      style={{ 
                        marginBottom: '12px',
                        padding: '12px',
                        background: index < 3 ? '#0f3460' : '#333',
                        border: `1px solid ${
                          stability?.level === 'high' ? '#52c41a' :
                          stability?.level === 'medium' ? '#faad14' : '#ff4d4f'
                        }`,
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '8px' 
                      }}>
                        <Space>
                          <span style={{ 
                            background: index < 3 ? '#1890ff' : '#666',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            #{index + 1}
                          </span>
                          <Text strong style={{ color: '#fff', fontSize: '14px' }}>
                            {key}
                          </Text>
                          <Tag 
                            color={
                              stability?.level === 'high' ? 'green' : 
                              stability?.level === 'medium' ? 'orange' : 'red'
                            }
                            style={{ fontSize: '10px' }}
                          >
                            {stability?.score || 0}% 稳定性
                          </Tag>
                        </Space>
                      </div>
                      
                      {/* XML字段值展示 */}
                      <div style={{ 
                        background: '#1f1f1f', 
                        padding: '8px 10px', 
                        borderRadius: '4px',
                        fontFamily: 'Monaco, Consolas, monospace',
                        fontSize: '12px',
                        wordBreak: 'break-all',
                        marginBottom: '8px',
                        border: '1px solid #404040'
                      }}>
                        <Text 
                          copyable={{ text: String(value) }}
                          style={{ color: '#a6e22e' }}
                        >
                          {String(value)}
                        </Text>
                      </div>

                      {/* 字段特性标签 */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {stability?.level === 'high' && (
                          <Tag color="success" style={{ fontSize: '10px' }}>
                            🔥 高价值字段
                          </Tag>
                        )}
                        {key === 'resource_id' && (
                          <Tag color="purple" style={{ fontSize: '10px' }}>
                            🎯 最佳定位
                          </Tag>
                        )}
                        {key === 'text' && value && String(value).length < 10 && (
                          <Tag color="cyan" style={{ fontSize: '10px' }}>
                            📝 精简文本
                          </Tag>
                        )}
                        {index < 3 && (
                          <Tag color="gold" style={{ fontSize: '10px' }}>
                            ⭐ 推荐优先级
                          </Tag>
                        )}
                        <Tag style={{ fontSize: '9px', background: '#1f1f1f', color: '#999' }}>
                          匹配字段
                        </Tag>
                      </div>

                      {stability && stability.risks.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <Text type="secondary" style={{ fontSize: '10px', color: '#999' }}>
                            ⚠️ 风险: {stability.risks.slice(0, 2).join(', ')}
                          </Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            {/* 右侧：自定义名称配置（用于展示） */}
            <Col span={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 自定义显示名称配置 */}
                <Card 
                  key={`display-name-${refreshKey}`} // 🆕 添加key强制重新渲染
                  title={
                    <Space style={{ color: '#fff' }}>
                      <span>✏️</span>
                      自定义显示名称
                      <Tag color="orange">用户定义</Tag>
                    </Space>
                  }
                  size="small"
                  style={{ 
                    background: '#2d2d2d', 
                    border: '1px solid #404040'
                  }}
                  headStyle={{ 
                    background: '#1f1f1f', 
                    borderBottom: '1px solid #404040'
                  }}
                  bodyStyle={{ background: '#2d2d2d' }}
                >
                  <Alert
                    message={
                      <Text style={{ color: '#fff' }}>
                        <strong>🏷️ 名称用途说明</strong>
                      </Text>
                    }
                    description={
                      <div style={{ color: '#e6e6e6', fontSize: '12px', marginTop: '4px' }}>
                        <Text style={{ color: '#e6e6e6' }}>
                          自定义名称用于<strong>用户友好的显示</strong>，让复杂的XML元素有易懂的标识。
                          系统会基于左侧原始字段进行匹配，但显示您定义的名称。
                        </Text>
                      </div>
                    }
                    type="warning"
                    showIcon
                    style={{ 
                      marginBottom: '12px',
                      background: '#4a3c00', 
                      border: '1px solid #faad14'
                    }}
                  />

                  {/* 显示当前自定义名称 */}
                  <div style={{ 
                    padding: '12px', 
                    background: '#0f3460',
                    borderRadius: '6px',
                    border: '1px solid #1890ff',
                    marginBottom: '12px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="secondary" style={{ color: '#ccc', fontSize: '11px' }}>
                        当前显示名称
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                        {getCurrentDisplayName()}
                      </Text>
                      <Tag color="blue" style={{ fontSize: '10px' }}>
                        {existingMapping ? '已保存' : '临时生成'}
                      </Tag>
                    </div>
                    {existingMapping && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#ccc', fontSize: '11px' }}>
                          使用 {existingMapping.usageCount} 次
                        </Text>
                        <Text style={{ color: '#ccc', fontSize: '11px' }}>
                          {new Date(existingMapping.lastUsedAt).toLocaleString()}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* 映射规则概述 */}
                  <div style={{
                    padding: '10px',
                    background: '#1f1f1f',
                    borderRadius: '4px',
                    border: '1px solid #404040'
                  }}>
                    <Text style={{ color: '#ccc', fontSize: '12px' }}>
                      <strong>💡 工作原理：</strong><br/>
                      1. 系统使用左侧XML字段匹配识别元素<br/>
                      2. 用户看到的是右侧自定义显示名称<br/>
                      3. 两者完全分离，互不干扰<br/>
                      <br/>
                      <strong>🔄 实时同步：</strong>当前显示名称 = "{getCurrentDisplayName()}"
                    </Text>
                  </div>
                </Card>

                {/* 缓存映射值详情 */}
                {cachedValues && (
                  <Card 
                    title={
                      <Space style={{ color: '#fff' }}>
                        <span>💾</span>
                        映射缓存详情
                        <Tag color="purple">已存储</Tag>
                      </Space>
                    }
                    size="small"
                    style={{ 
                      background: '#2d2d2d', 
                      border: '1px solid #404040'
                    }}
                    headStyle={{ 
                      background: '#1f1f1f', 
                      borderBottom: '1px solid #404040'
                    }}
                    bodyStyle={{ background: '#2d2d2d' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ 
                        padding: '8px', 
                        background: '#0f3460',
                        borderRadius: '4px',
                        border: '1px solid #1890ff'
                      }}>
                        <Text type="secondary" style={{ color: '#ccc', fontSize: '11px' }}>
                          📝 存储的显示名称
                        </Text>
                        <div>
                          <Text strong style={{ color: '#fff', fontSize: '14px' }}>
                            {cachedValues.displayName}
                          </Text>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: '#333',
                        borderRadius: '4px'
                      }}>
                        <div>
                          <Text style={{ color: '#ccc', fontSize: '11px' }}>
                            📊 使用频次: {cachedValues.usageCount}
                          </Text>
                        </div>
                        <div>
                          <Text style={{ color: '#ccc', fontSize: '11px' }}>
                            🕐 最后使用: {cachedValues.lastUpdated}
                          </Text>
                        </div>
                      </div>

                      <div style={{
                        padding: '8px',
                        background: '#1f1f1f',
                        borderRadius: '4px',
                        border: '1px solid #404040'
                      }}>
                        <Text style={{ color: '#ccc', fontSize: '10px' }}>
                          💡 说明：此名称映射基于左侧XML字段特征进行匹配，
                          当系统遇到相似特征的元素时会自动应用该显示名称。
                        </Text>
                      </div>
                    </div>
                  </Card>
                )}

                {/* AI优化建议 */}
                <Card 
                  title={
                    <Space style={{ color: '#fff' }}>
                      <span>🤖</span>
                      AI 优化建议
                      <Tag color="green">智能分析</Tag>
                    </Space>
                  }
                  size="small"
                  style={{ 
                    background: '#2d2d2d', 
                    border: '1px solid #404040'
                  }}
                  headStyle={{ 
                    background: '#1f1f1f', 
                    borderBottom: '1px solid #404040'
                  }}
                  bodyStyle={{ background: '#2d2d2d' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {precisionAnalysis.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: rec.includes('✅') ? '#0f4429' :
                                     rec.includes('⚠️') ? '#4a3c00' :
                                     rec.includes('❌') ? '#5c1c1c' : '#1f1f1f',
                          border: `1px solid ${
                            rec.includes('✅') ? '#52c41a' :
                            rec.includes('⚠️') ? '#faad14' :
                            rec.includes('❌') ? '#ff4d4f' : '#404040'
                          }`,
                          color: '#fff'
                        }}
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 生成的ADB命令 */}
                {adbCommands.length > 0 && (
                  <Card 
                    title={
                      <Space style={{ color: '#fff' }}>
                        <span>⚡</span>
                        推荐 ADB 命令
                        <Tag color="blue">{adbCommands.length} 条</Tag>
                      </Space>
                    }
                    size="small"
                    style={{ 
                      background: '#2d2d2d', 
                      border: '1px solid #404040'
                    }}
                    headStyle={{ 
                      background: '#1f1f1f', 
                      borderBottom: '1px solid #404040'
                    }}
                    bodyStyle={{ background: '#2d2d2d' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {adbCommands.slice(0, 3).map((cmd, index) => (
                        <div key={index} style={{ paddingBottom: '8px', borderBottom: '1px solid #404040' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <Tag color="blue">{cmd.type.toUpperCase()}</Tag>
                            <Text type="secondary" style={{ fontSize: '11px', color: '#ccc' }}>
                              成功率: {(cmd.reliability * 100).toFixed(0)}%
                            </Text>
                          </div>
                          <div style={{ 
                            background: '#1f1f1f', 
                            padding: '4px 6px', 
                            borderRadius: '3px',
                            fontFamily: 'Monaco, Consolas, monospace',
                            fontSize: '11px',
                            wordBreak: 'break-all'
                          }}>
                            <Text 
                              copyable={{ text: cmd.command }}
                              style={{ color: '#a6e22e' }}
                            >
                              {cmd.command}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </Col>
          </Row>

          {/* 实时编辑区域 */}
          <Card 
            title={
              <Space style={{ color: '#fff' }}>
                <EditOutlined />
                实时优化编辑
                <Tag color="orange">实验功能</Tag>
              </Space>
            }
            size="small"
            style={{ 
              marginTop: '16px',
              background: '#2d2d2d', 
              border: '1px solid #404040'
            }}
            headStyle={{ 
              background: '#1f1f1f', 
              borderBottom: '1px solid #404040'
            }}
            bodyStyle={{ background: '#2d2d2d' }}
          >
            <Alert
              message={
                <Text style={{ color: '#fff' }}>实时编辑功能</Text>
              }
              description={
                <Text style={{ color: '#e6e6e6' }}>
                  修改下方字段值，系统将实时更新精准度评分和ADB命令建议。注意：这里的修改仅用于测试，不会保存到缓存中。
                </Text>
              }
              type="info"
              showIcon
              style={{ 
                marginBottom: '12px',
                background: '#0f3460', 
                border: '1px solid #1890ff'
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px', color: '#ccc' }}>
              此功能正在开发中，将提供实时的字段编辑和精准度分析能力...
            </Text>
          </Card>
        </div>
      </div>
    );
  };

  // ========== 层级结构渲染函数 ==========
  
  const renderHierarchyStructure = () => {
    if (!element) return null;

    return (
      <div className="space-y-4">
        {/* 功能说明 */}
        <Alert
          message="XML层级结构查看器"
          description="查看元素在XML页面中的完整层级结构，支持智能匹配和多页面对比。基于Universal UI缓存数据，提供准确的元素定位信息。"
          type="info"
          showIcon
        />

        {/* 集成我们的XML层级查看组件 */}
        <CachedElementXmlHierarchyTab 
          targetElement={adaptElementToUniversalUIType(element)}
          onElementSelect={(selectedElement) => {
            console.log('从XML层级树选中元素:', selectedElement);
            // 可以在这里添加元素选择的处理逻辑
          }}
        />
      </div>
    );
  };

  // ========== 主渲染 ==========
  
  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          修改元素参数
          {existingMapping && <Tag color="orange">编辑现有映射</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      style={{ maxHeight: '90vh' }}
      bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSave}
          >
            {existingMapping ? '更新映射' : '创建映射'}
          </Button>
        </Space>
      }
    >
      {/* 标签页内容 */}
      <Tabs defaultActiveKey="basic" type="card" className="element-name-editor-tabs">
        {/* 基础配置标签页 */}
        <TabPane 
          tab={
            <Space>
              <EditOutlined />
              基础配置
            </Space>
          } 
          key="basic"
        >
          <div className="space-y-4">
        
        {/* 功能说明卡片 */}
        <Card size="small" style={{ background: '#f0f8ff', border: '1px solid #1890ff' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <Title level={5} style={{ margin: 0, color: '#1890ff' }}>原始XML字段</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  系统用于<strong>识别和匹配</strong>界面元素的技术字段
                </Text>
                <div style={{ marginTop: '6px' }}>
                  <Tag color="blue" style={{ fontSize: '10px' }}>text</Tag>
                  <Tag color="blue" style={{ fontSize: '10px' }}>resource_id</Tag>
                  <Tag color="blue" style={{ fontSize: '10px' }}>class_name</Tag>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✏️</div>
                <Title level={5} style={{ margin: 0, color: '#faad14' }}>自定义显示名称</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  用户看到的<strong>友好标识名称</strong>，便于理解和记忆
                </Text>
                <div style={{ marginTop: '6px' }}>
                  <Tag color="orange" style={{ fontSize: '10px' }}>小红书主页按钮</Tag>
                  <Tag color="orange" style={{ fontSize: '10px' }}>登录入口</Tag>
                </div>
              </div>
            </Col>
          </Row>
          
          <Divider style={{ margin: '8px 0' }} />
          
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              💡 <strong>工作原理：</strong> 
              系统通过左侧技术字段精确定位元素，用户界面显示右侧友好名称。
              两者完全分离，确保技术准确性和用户体验的双重优化。
            </Text>
          </div>
        </Card>

        {/* 名称预览 */}
        <Alert
          key={`preview-${refreshKey}`} // 🆕 添加key强制重新渲染
          message={
            <Space>
              <EyeOutlined />
              显示效果预览
            </Space>
          }
          description={
            <div className="mt-2">
              <Text>用户界面将显示为：</Text>
              <div className="mt-1 p-2" style={{ background: '#f6f6f6', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  点击"{getCurrentDisplayName()}" 
                </Text>
                <Text style={{ fontSize: '14px', color: '#666', marginLeft: '8px' }}>
                  (基于XML字段智能匹配)
                </Text>
              </div>
            </div>
          }
          type="info"
          showIcon
        />

        {/* 基本信息表单 */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            console.log('📝 表单值变化:', changedValues, allValues);
            if (changedValues.displayName !== undefined) {
              handlePreviewUpdate(changedValues.displayName);
            }
          }}
          onFieldsChange={(changedFields) => {
            console.log('🔄 字段变化:', changedFields);
            // 强制更新预览
            const displayNameField = changedFields.find(field => 
              Array.isArray(field.name) ? field.name[0] === 'displayName' : field.name === 'displayName'
            );
            if (displayNameField && displayNameField.value !== undefined) {
              handlePreviewUpdate(displayNameField.value);
            }
          }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="displayName"
                label={
                  <Space>
                    <EditOutlined />
                    自定义显示名称
                    <Tag color="orange" style={{ fontSize: '10px' }}>用户界面显示</Tag>
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入元素显示名称' },
                  { max: 50, message: '名称长度不能超过50个字符' }
                ]}
              >
                <Input 
                  placeholder="例如：小红书主页、登录按钮、搜索框..."
                  prefix={<EditOutlined />}
                  suffix={
                    <Tooltip title="这个名称将在用户界面中显示，请使用易懂的描述">
                      <InfoCircleOutlined style={{ color: '#ccc' }} />
                    </Tooltip>
                  }
                />
              </Form.Item>
              
              {/* 添加名称建议 */}
              {element && (
                <div style={{ marginTop: '-16px', marginBottom: '16px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    💡 建议名称：
                  </Text>
                  {[
                    element.text && element.text.trim() ? `${element.text}按钮` : null,
                    element.resource_id ? element.resource_id.split('/').pop()?.replace('_', ' ') : null,
                    element.content_desc || null
                  ]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((suggestion, index) => (
                    <Tag 
                      key={index}
                      style={{ 
                        fontSize: '11px', 
                        cursor: 'pointer', 
                        marginLeft: '4px',
                        marginTop: '2px'
                      }}
                      onClick={() => {
                        form.setFieldsValue({ displayName: suggestion });
                        handlePreviewUpdate(suggestion);
                      }}
                    >
                      {suggestion}
                    </Tag>
                  ))}
                  
                  {/* 🆕 测试按钮 */}
                  <Button 
                    size="small" 
                    type="dashed"
                    style={{ marginLeft: '8px', fontSize: '10px' }}
                    onClick={() => {
                      const testName = `测试名称-${Date.now()}`;
                      form.setFieldsValue({ displayName: testName });
                      handlePreviewUpdate(testName);
                      message.info(`已设置测试名称: ${testName}`);
                    }}
                  >
                    🧪 测试更新
                  </Button>
                </div>
              )}
            </Col>
            <Col span={8}>
              <Form.Item label={
                <Space>
                  <InfoCircleOutlined />
                  映射状态
                </Space>
              }>
                {existingMapping ? (
                  <div style={{ 
                    padding: '8px', 
                    background: '#f0f8ff', 
                    border: '1px solid #1890ff', 
                    borderRadius: '4px' 
                  }}>
                    <Text style={{ color: '#1890ff', fontSize: '12px' }}>
                      📊 使用次数: <strong>{existingMapping.usageCount}</strong>
                    </Text>
                    <br />
                    <Text style={{ color: '#1890ff', fontSize: '12px' }}>
                      🕐 最后使用: {new Date(existingMapping.lastUsedAt).toLocaleDateString()}
                    </Text>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '8px', 
                    background: '#fff7e6', 
                    border: '1px solid #faad14', 
                    borderRadius: '4px' 
                  }}>
                    <Text style={{ color: '#faad14', fontSize: '12px' }}>
                      🆕 新建映射规则
                    </Text>
                  </div>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label={
              <Space>
                <span>📝</span>
                备注说明
                <Tag style={{ fontSize: '10px' }}>可选</Tag>
              </Space>
            }
          >
            <Input.TextArea 
              rows={2} 
              placeholder="可以添加使用场景说明，如：首页底部导航、设置页面入口等"
            />
          </Form.Item>
        </Form>

        {/* 折叠面板：高级配置 */}
        <Collapse ghost>
          <Panel 
            header={
              <Space>
                <SettingOutlined />
                高级匹配配置
                <Tag color="blue">
                  {Object.values(constraints).filter(Boolean).length} 项约束启用
                </Tag>
              </Space>
            }
            key="constraints"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {renderElementInfo()}
              </div>
              <div>
                {renderConstraintsConfig()}
              </div>
            </div>
          </Panel>
        </Collapse>
      </div>
      </TabPane>

      {/* 详细字段编辑标签页 */}
      <TabPane 
        tab={
          <Space>
            <DatabaseOutlined />
            字段详配
            <Tag color="blue">XML</Tag>
          </Space>
        } 
        key="fields"
      >
        {element && (
          <div className="p-4">
            {/* 🆕 调试信息 */}
            {process.env.NODE_ENV === 'development' && (
              <Card 
                size="small" 
                title="🔧 调试信息" 
                style={{ marginBottom: '16px', background: '#fff7e6', border: '1px solid #faad14' }}
              >
                <Text style={{ fontSize: '11px', color: '#666' }}>
                  表单值: {form.getFieldValue('displayName') || '(空)'} | 
                  预览名称: {previewName} | 
                  当前显示: {getCurrentDisplayName()} | 
                  刷新Key: {refreshKey}
                </Text>
              </Card>
            )}

            {renderFieldDetailConfig()}
          </div>
        )}
      </TabPane>

      {/* 层级关系标签页 */}
      <TabPane 
        tab={
          <Space>
            <BranchesOutlined />
            层级结构
            <Tag color="green">Tree</Tag>
          </Space>
        } 
        key="hierarchy"
      >
        {element && (
          <div className="p-4">
            {renderHierarchyStructure()}
          </div>
        )}
      </TabPane>

      {/* 批量规则配置标签页 */}
      <TabPane 
        tab={
          <Space>
            <GroupOutlined />
            批量规则
            <Tag color="purple">Batch</Tag>
          </Space>
        } 
        key="batch-rules"
      >
        <div className="p-4">
          {/* 功能介绍 */}
          <Alert
            message={
              <Space>
                <BulbOutlined />
                批量规则配置功能
              </Space>
            }
            description={
              <div>
                <Text>
                  配置自定义匹配规则，实现"一条命令针对多个目标"的批量操作功能。
                  例如：一键关注页面中的所有用户、批量点赞多个内容等。
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 提示：此功能基于您当前选择的元素作为模板，生成智能匹配规则
                </Text>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          {/* 批量规则配置面板 */}
          <ErrorBoundary fallback={
            <Alert 
              message="批量匹配组件加载失败" 
              description="该组件出现渲染错误，请尝试刷新页面或检查数据格式。"
              type="error" 
              showIcon 
            />
          }>
            <BatchRuleConfigPanel
              onChange={(rule) => {
                console.log('批量规则配置更新:', rule);
                // TODO: 保存规则配置到状态管理
              }}
              showTesting={true}
              elementType={element?.element_type || 'follow_button'}
              elementData={element}
              stepName={element?.text || '当前元素'}
            />
          </ErrorBoundary>
        </div>
      </TabPane>

      {/* ADB XML检查器标签页 */}
      <TabPane 
        tab={
          <Space>
            <BugOutlined style={{ color: '#52c41a' }} />
            XML检查器
            <Tag color="green">Debug</Tag>
          </Space>
        } 
        key="xml-inspector"
      >
        <div className="p-4">
          {/* 功能介绍 */}
          <Alert
            message={
              <Space>
                <BugOutlined />
                ADB XML层级检查器
              </Space>
            }
            description={
              <div>
                <Typography.Text>
                  可视化分析Android UiAutomator导出的XML层级结构，帮助精确定位元素。
                  支持导入XML文件、搜索节点、查看元素详情、复制XPath路径等功能。
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 提示：此工具可用于调试元素定位问题和优化匹配策略
                </Typography.Text>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          {/* ADB XML检查器组件 */}
          <ErrorBoundary fallback={
            <Alert 
              message="XML检查器加载失败" 
              description="该组件出现渲染错误，请尝试刷新页面或检查数据格式。"
              type="error" 
              showIcon 
            />
          }>
            <AdbXmlInspector
              height={400}
              showTips={false}
              onNodeSelected={(node, xpath) => {
                console.log('📍 XML检查器选中节点:', node);
                console.log('📍 生成的XPath:', xpath);
                message.success(`已选中节点: ${xpath.substring(0, 50)}${xpath.length > 50 ? '...' : ''}`);
              }}
              className="xml-inspector-in-modal"
            />
          </ErrorBoundary>
        </div>
      </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ElementNameEditor;