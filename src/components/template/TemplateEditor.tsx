import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Input,
  Select,
  message,
  Form,
  Steps,
  Collapse,
  Tag,
  Switch,
  InputNumber,
  Alert,
  Divider,
  Tooltip,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Step } = Steps;

// 动作类型定义
interface ActionType {
  type: string;
  name: string;
  description: string;
  parameters: { [key: string]: any };
  icon: React.ReactNode;
  category: string;
}

// 可用的动作类型
const ACTION_TYPES: ActionType[] = [
  {
    type: 'open_app',
    name: '打开应用',
    description: '启动指定的应用程序',
    parameters: {
      package_name: { type: 'string', label: '包名', required: true, placeholder: 'com.example.app' },
      wait_time: { type: 'number', label: '等待时间(秒)', default: 3, min: 1, max: 10 }
    },
    icon: <PlayCircleOutlined />,
    category: 'app'
  },
  {
    type: 'tap',
    name: '点击',
    description: '点击屏幕上的指定坐标',
    parameters: {
      coordinate: { type: 'coordinate', label: '坐标', required: true, placeholder: '100,200' },
      duration: { type: 'number', label: '按压时长(毫秒)', default: 100, min: 50, max: 2000 }
    },
    icon: <InfoCircleOutlined />,
    category: 'gesture'
  },
  {
    type: 'input',
    name: '输入文本',
    description: '在当前焦点位置输入文本',
    parameters: {
      text: { type: 'string', label: '文本内容', required: true, placeholder: '要输入的文本' },
      clear_first: { type: 'boolean', label: '先清空', default: true }
    },
    icon: <EditOutlined />,
    category: 'input'
  },
  {
    type: 'wait',
    name: '等待',
    description: '等待指定的时间',
    parameters: {
      duration: { type: 'number', label: '等待时间(秒)', required: true, default: 1, min: 0.1, max: 60 }
    },
    icon: <SettingOutlined />,
    category: 'control'
  },
  {
    type: 'wait_for_element',
    name: '等待元素',
    description: '等待页面元素出现',
    parameters: {
      condition_type: { 
        type: 'select', 
        label: '条件类型', 
        required: true, 
        options: [
          { value: 'text', label: '文本内容' },
          { value: 'resource_id', label: '资源ID' },
          { value: 'class', label: '类名' }
        ]
      },
      selector: { type: 'string', label: '选择器', required: true, placeholder: '元素标识' },
      timeout: { type: 'number', label: '超时时间(秒)', default: 10, min: 1, max: 60 }
    },
    icon: <EyeOutlined />,
    category: 'control'
  },
  {
    type: 'swipe',
    name: '滑动',
    description: '在屏幕上执行滑动手势',
    parameters: {
      start_coordinate: { type: 'coordinate', label: '起始坐标', required: true, placeholder: '100,400' },
      end_coordinate: { type: 'coordinate', label: '结束坐标', required: true, placeholder: '100,200' },
      duration: { type: 'number', label: '滑动时长(毫秒)', default: 500, min: 100, max: 2000 }
    },
    icon: <ArrowUpOutlined />,
    category: 'gesture'
  },
  {
    type: 'back',
    name: '返回',
    description: '按下返回键',
    parameters: {},
    icon: <ArrowDownOutlined />,
    category: 'navigation'
  }
];

// 脚本步骤
interface ScriptStep {
  id: string;
  type: string;
  name: string;
  parameters: { [key: string]: any };
  enabled: boolean;
  description?: string;
}

// 模板编辑器组件
interface TemplateEditorProps {
  template?: any;
  onSave?: (template: any) => void;
  onCancel?: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingStep, setEditingStep] = useState<ScriptStep | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // 初始化
  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags?.join(', '),
        targetApp: template.metadata?.targetApp,
        difficulty: template.metadata?.difficulty,
        estimatedTime: template.metadata?.estimatedTime
      });
      setSteps(template.steps || []);
    }
  }, [template, form]);

  // 添加步骤
  const handleAddStep = () => {
    setEditingStep(null);
    setSelectedActionType('');
    setShowActionModal(true);
  };

  // 编辑步骤
  const handleEditStep = (step: ScriptStep) => {
    setEditingStep(step);
    setSelectedActionType(step.type);
    setShowActionModal(true);
  };

  // 删除步骤
  const handleDeleteStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
    message.success('步骤已删除');
  };

  // 移动步骤
  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === stepId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newSteps = [...prev];
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      return newSteps;
    });
  };

  // 复制步骤
  const handleCopyStep = (step: ScriptStep) => {
    const newStep: ScriptStep = {
      ...step,
      id: `step_${Date.now()}`,
      name: `${step.name} (复制)`
    };
    setSteps(prev => [...prev, newStep]);
    message.success('步骤已复制');
  };

  // 保存步骤
  const handleSaveStep = (values: any) => {
    const actionType = ACTION_TYPES.find(t => t.type === selectedActionType);
    if (!actionType) return;

    const stepData: ScriptStep = {
      id: editingStep?.id || `step_${Date.now()}`,
      type: selectedActionType,
      name: values.stepName || actionType.name,
      parameters: { ...values },
      enabled: true,
      description: values.stepDescription
    };

    // 移除步骤名称和描述，这些不是参数
    delete stepData.parameters.stepName;
    delete stepData.parameters.stepDescription;

    if (editingStep) {
      setSteps(prev => prev.map(s => s.id === editingStep.id ? stepData : s));
      message.success('步骤已更新');
    } else {
      setSteps(prev => [...prev, stepData]);
      message.success('步骤已添加');
    }

    setShowActionModal(false);
    setEditingStep(null);
  };

  // 保存模板
  const handleSaveTemplate = (values: any) => {
    const templateData = {
      ...template,
      name: values.name,
      description: values.description,
      category: values.category,
      tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
      steps: steps,
      metadata: {
        targetApp: values.targetApp,
        difficulty: values.difficulty,
        estimatedTime: values.estimatedTime,
        deviceType: ['Android', 'iOS']
      },
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onSave?.(templateData);
    message.success('模板已保存');
  };

  // 渲染参数输入组件
  const renderParameterInput = (paramKey: string, paramConfig: any, value: any, onChange: (value: any) => void) => {
    switch (paramConfig.type) {
      case 'string':
        return (
          <Input
            placeholder={paramConfig.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <InputNumber
            min={paramConfig.min}
            max={paramConfig.max}
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={value}
            onChange={onChange}
          />
        );
      case 'select':
        return (
          <Select
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
          >
            {paramConfig.options?.map((option: any) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      case 'coordinate':
        return (
          <Input
            placeholder={paramConfig.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            addonAfter={
              <Button size="small" onClick={() => message.info('坐标拾取功能开发中')}>
                拾取
              </Button>
            }
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  // 渲染步骤卡片
  const renderStepCard = (step: ScriptStep, index: number) => {
    const actionType = ACTION_TYPES.find(t => t.type === step.type);
    
    return (
      <Card
        key={step.id}
        size="small"
        style={{ marginBottom: 8 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 24, textAlign: 'center', backgroundColor: '#1890ff', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 12 }}>
              {index + 1}
            </span>
            {actionType?.icon}
            <span>{step.name}</span>
            <Switch
              size="small"
              checked={step.enabled}
              onChange={(checked) => {
                const updatedSteps = steps.map(s => 
                  s.id === step.id ? { ...s, enabled: checked } : s
                );
                setSteps(updatedSteps);
              }}
            />
          </div>
        }
        extra={
          <Space size="small">
            <Tooltip title="向上移动">
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => handleMoveStep(step.id, 'up')}
              />
            </Tooltip>
            <Tooltip title="向下移动">
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === steps.length - 1}
                onClick={() => handleMoveStep(step.id, 'down')}
              />
            </Tooltip>
            <Tooltip title="复制步骤">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyStep(step)}
              />
            </Tooltip>
            <Tooltip title="编辑步骤">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditStep(step)}
              />
            </Tooltip>
            <Tooltip title="删除步骤">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteStep(step.id)}
              />
            </Tooltip>
          </Space>
        }
      >
        {step.description && (
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
            {step.description}
          </Paragraph>
        )}
        <div style={{ fontSize: 12, color: '#666' }}>
          {Object.entries(step.parameters).map(([key, value]) => (
            <Tag key={key}>
              {key}: {String(value)}
            </Tag>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          {template ? '编辑模板' : '创建模板'}
        </Title>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? '编辑模式' : '预览模式'}
            </Button>
          </Space>
          <Space>
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              保存模板
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={8}>
          <Card title="模板信息" style={{ marginBottom: 16 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveTemplate}
            >
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="输入模板名称" />
              </Form.Item>
              
              <Form.Item
                name="description"
                label="模板描述"
                rules={[{ required: true, message: '请输入模板描述' }]}
              >
                <TextArea rows={3} placeholder="描述模板的功能和用途" />
              </Form.Item>
              
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择模板分类">
                  <Option value="social">社交应用</Option>
                  <Option value="ecommerce">电商购物</Option>
                  <Option value="productivity">办公效率</Option>
                  <Option value="entertainment">娱乐应用</Option>
                  <Option value="system">系统操作</Option>
                  <Option value="custom">自定义</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="tags" label="标签">
                <Input placeholder="多个标签用逗号分隔" />
              </Form.Item>
              
              <Form.Item name="targetApp" label="目标应用">
                <Input placeholder="如：小红书、微信等" />
              </Form.Item>
              
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="difficulty" label="难度等级">
                    <Select placeholder="选择难度">
                      <Option value="beginner">初级</Option>
                      <Option value="intermediate">中级</Option>
                      <Option value="advanced">高级</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estimatedTime" label="执行时间">
                    <Input placeholder="如：2-3分钟" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card title="可用动作" size="small">
            <Collapse size="small" ghost>
              {['app', 'gesture', 'input', 'control', 'navigation'].map(category => {
                const getCategoryName = (cat: string) => {
                  switch (cat) {
                    case 'app': return '应用操作';
                    case 'gesture': return '手势操作';
                    case 'input': return '输入操作';
                    case 'control': return '流程控制';
                    case 'navigation': return '导航操作';
                    default: return cat;
                  }
                };

                return (
                  <Panel 
                    key={category} 
                    header={getCategoryName(category)}
                  >
                    {ACTION_TYPES.filter(action => action.category === category).map(action => (
                      <Button
                        key={action.type}
                        style={{ 
                          width: '100%',
                          textAlign: 'left',
                          height: 'auto',
                          padding: '4px 8px', 
                          margin: '2px 0', 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                        onClick={() => {
                          setSelectedActionType(action.type);
                          setEditingStep(null);
                          setShowActionModal(true);
                        }}
                      >
                        {action.icon}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 'bold' }}>{action.name}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>{action.description}</div>
                        </div>
                      </Button>
                    ))}
                  </Panel>
                );
              })}
            </Collapse>
          </Card>
        </Col>

        <Col span={16}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>脚本步骤 ({steps.length})</span>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStep}>
                  添加步骤
                </Button>
              </div>
            }
          >
            {previewMode ? (
              <div>
                <Alert 
                  message="预览模式" 
                  description="以下是脚本的执行步骤预览" 
                  type="info" 
                  style={{ marginBottom: 16 }}
                />
                <Steps direction="vertical" size="small">
                  {steps.filter(s => s.enabled).map((step, index) => (
                    <Step
                      key={step.id}
                      title={step.name}
                      description={step.description || `${step.type} 操作`}
                      icon={ACTION_TYPES.find(t => t.type === step.type)?.icon}
                    />
                  ))}
                </Steps>
              </div>
            ) : (
              <div>
                {steps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    暂无步骤，点击左侧动作或上方按钮添加步骤
                  </div>
                ) : (
                  steps.map((step, index) => renderStepCard(step, index))
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 添加/编辑步骤对话框 */}
      <Modal
        title={editingStep ? '编辑步骤' : '添加步骤'}
        open={showActionModal}
        onCancel={() => setShowActionModal(false)}
        width={600}
        footer={null}
      >
        {selectedActionType && (
          <Form
            layout="vertical"
            onFinish={handleSaveStep}
            initialValues={editingStep ? {
              stepName: editingStep.name,
              stepDescription: editingStep.description,
              ...editingStep.parameters
            } : {
              stepName: ACTION_TYPES.find(t => t.type === selectedActionType)?.name
            }}
          >
            <Alert
              message={ACTION_TYPES.find(t => t.type === selectedActionType)?.name}
              description={ACTION_TYPES.find(t => t.type === selectedActionType)?.description}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Form.Item name="stepName" label="步骤名称">
              <Input placeholder="输入步骤名称" />
            </Form.Item>
            
            <Form.Item name="stepDescription" label="步骤描述">
              <TextArea rows={2} placeholder="描述此步骤的作用（可选）" />
            </Form.Item>
            
            <Divider />
            
            {Object.entries(ACTION_TYPES.find(t => t.type === selectedActionType)?.parameters || {}).map(([key, config]: [string, any]) => (
              <Form.Item
                key={key}
                name={key}
                label={config.label}
                rules={config.required ? [{ required: true, message: `请输入${config.label}` }] : []}
                initialValue={config.default}
              >
                {renderParameterInput(key, config, undefined, () => {})}
              </Form.Item>
            ))}
            
            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Space>
                <Button onClick={() => setShowActionModal(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingStep ? '更新步骤' : '添加步骤'}
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default TemplateEditor;