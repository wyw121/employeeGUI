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
import BasicConfigTab from './tabs/BasicConfigTab';
import ConstraintsTab from './tabs/ConstraintsTab';
import HierarchyTab from './tabs/HierarchyTab';
import { ConstraintFieldEditor } from './ConstraintFieldEditor';
import { ExtendedUIElement, adaptToAndroidXMLFields } from './ElementDataAdapter';
// 新增：抽离后的适配与逻辑
import adaptElementToUniversalUIType from './toUniversalElement';
import { CONSTRAINT_CONFIG } from './logic/constraints';
import { calculateDisplayMatchScore } from './logic/score';
import useDisplayNameSuggestions from './hooks/useDisplayNameSuggestions';
import useElementNameEditorState from './hooks/useElementNameEditorState';
import { AdbPrecisionStrategy } from '../../services/AdbPrecisionStrategy';
import BatchRuleConfigPanel from './BatchRuleConfigPanel';
import ErrorBoundary from '../ErrorBoundary';
import CachedElementXmlHierarchyTab from '../element-xml-hierarchy/CachedElementXmlHierarchyTab';
import { AdbXmlInspector } from '../adb-xml-inspector';
import type { UIElement as UniversalUIElement } from '../../api/universalUIAPI';
import FieldDetailTab from './tabs/FieldDetailTab';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

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


// ========== 主组件 ==========

const ElementNameEditor: React.FC<ElementNameEditorProps> = ({
  visible,
  onClose,
  element,
  onSaved
}) => {
  // ========== 状态管理 ==========
  const [form] = Form.useForm();

  const {
    displayName,
    setDisplayName,
    notes,
    setNotes,
    constraints,
    toggleConstraint,
    existingMapping,
    loading,
    save,
    previewName
  } = useElementNameEditorState({ element, visible });

  // ========== 生命周期 ==========
  // 初始化同步 form 值（当抽离的 hook 初始化完成后）
  useEffect(() => {
    if (!element || !visible) return;
    form.setFieldsValue({ displayName, notes });
  }, [displayName, notes, element, visible, form]);

  // 旧 initializeFormData 已被 hook 接管，保留注释占位防止重复添加

  // （匹配度计算已抽离至 logic/score.ts）

  // ========== 事件处理 ==========

  const handleSave = async () => {
    try {
      await form.validateFields();
      const result = await save();
      if (result.success && result.displayName) {
        onSaved?.(result.displayName);
        onClose();
        message.success('元素名称映射保存成功！');
      } else if (!result.success) {
        message.error('保存失败');
      }
    } catch (e) {
      message.error('表单校验失败');
    }
  };

  const handleConstraintChange = (key: keyof MatchingConstraints, value: boolean) => {
    toggleConstraint(key, value);
  };

  const handleResetConstraints = () => {
    // 直接一次性覆盖
    toggleConstraint as any; // 占位避免 TS 未使用警告（下一阶段可改为独立 reset 方法）
    message.info('暂未实现重置（后续在 hook 内添加 resetConstraints）');
  };

  const handlePreviewUpdate = (val: string) => {
    setDisplayName(val);
  };

  // 🆕 实时获取表单中的显示名称
  const getCurrentDisplayName = () => previewName;

  // ========== 渲染辅助函数 ==========

  // 已抽离出 ConstraintsTab / BasicConfigTab

  // 字段详配内容已迁移至 FieldDetailTab 组件

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
                  {useDisplayNameSuggestions(element).map((suggestion, index) => (
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
                        handlePreviewUpdate(suggestion as string);
                      }}
                    >
                      {suggestion as string}
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

        {/* 高级匹配配置折叠面板已迁移到 BasicConfigTab + ConstraintsTab 组合 */}
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
                  表单值: {form.getFieldValue('displayName') || '(空)'} | 预览名称: {previewName} | 当前显示: {getCurrentDisplayName()}
                </Text>
              </Card>
            )}

            <FieldDetailTab 
              element={element}
              getCurrentDisplayName={getCurrentDisplayName}
              existingMapping={existingMapping}
            />
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