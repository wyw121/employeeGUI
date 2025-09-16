import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Divider,
  List,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Timeline,
  Tag,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  AimOutlined,
} from '@ant-design/icons';
import CoordinateCapture from '../components/device/CoordinateCapture';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 操作类型定义
export enum ActionType {
  TAP = 'tap',
  SWIPE = 'swipe',
  INPUT = 'input',
  WAIT = 'wait',
  FIND_ELEMENT = 'find_element',
  CHECK_CONDITION = 'check_condition',
  LOOP = 'loop',
  IF_CONDITION = 'if_condition',
  SCREENSHOT = 'screenshot',
  OPEN_APP = 'open_app',
}

// 脚本步骤接口
export interface ScriptStep {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
}

// 脚本执行结果接口
export interface ScriptExecutionResult {
  success: boolean;
  executed_steps: number;
  failed_steps?: number;
  duration?: number;
  error?: string;
}

// 操作类型配置
const ACTION_CONFIGS = {
  [ActionType.TAP]: {
    name: '点击操作',
    description: '点击指定坐标或UI元素',
    icon: '👆',
    color: 'blue',
    parameters: [
      { key: 'coordinate', label: '点击坐标', type: 'coordinate', required: true },
      { key: 'wait_after', label: '操作后等待(ms)', type: 'number', default: 1000 },
    ]
  },
  [ActionType.SWIPE]: {
    name: '滑动操作',
    description: '从起始点滑动到结束点',
    icon: '👋',
    color: 'green',
    parameters: [
      { key: 'start_coordinate', label: '起始坐标', type: 'coordinate', required: true },
      { key: 'end_coordinate', label: '结束坐标', type: 'coordinate', required: true },
      { key: 'duration', label: '滑动时长(ms)', type: 'number', default: 1000 },
    ]
  },
  [ActionType.INPUT]: {
    name: '输入文本',
    description: '在指定位置输入文本内容',
    icon: '⌨️',
    color: 'orange',
    parameters: [
      { key: 'text', label: '输入内容', type: 'text', required: true },
      { key: 'clear_first', label: '先清空', type: 'boolean', default: true },
    ]
  },
  [ActionType.WAIT]: {
    name: '等待',
    description: '等待指定时间',
    icon: '⏱️',
    color: 'purple',
    parameters: [
      { key: 'duration', label: '等待时长(ms)', type: 'number', required: true, default: 3000 },
    ]
  },
  [ActionType.FIND_ELEMENT]: {
    name: '查找元素',
    description: '查找UI元素并可选择性点击',
    icon: '🔍',
    color: 'cyan',
    parameters: [
      { key: 'text', label: '元素文本', type: 'text', required: true },
      { key: 'click_if_found', label: '找到后点击', type: 'boolean', default: true },
      { key: 'timeout', label: '超时时间(ms)', type: 'number', default: 5000 },
    ]
  },
  [ActionType.CHECK_CONDITION]: {
    name: '条件检查',
    description: '检查页面是否满足特定条件',
    icon: '✅',
    color: 'red',
    parameters: [
      { key: 'condition_text', label: '检查文本', type: 'text', required: true },
      { key: 'action_if_true', label: '满足时执行', type: 'select', options: ['continue', 'skip_next', 'goto_step'] },
      { key: 'action_if_false', label: '不满足时执行', type: 'select', options: ['continue', 'skip_next', 'stop'] },
    ]
  },
};

/**
 * 自动化脚本构建器主页面
 */
const ScriptBuilderPage: React.FC = () => {
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<ScriptStep | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editingStep, setEditingStep] = useState<ScriptStep | null>(null);
  const [coordinateCaptureVisible, setCoordinateCaptureVisible] = useState(false);
  const [capturingForField, setCapturingForField] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 添加新步骤
  const handleAddStep = () => {
    setEditingStep(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑步骤
  const handleEditStep = (step: ScriptStep) => {
    setEditingStep(step);
    form.setFieldsValue({
      type: step.type,
      name: step.name,
      description: step.description,
      ...step.parameters,
    });
    setIsModalVisible(true);
  };

  // 保存步骤
  const handleSaveStep = async () => {
    try {
      const values = await form.validateFields();
      const { type, name, description, ...parameters } = values;

      const step: ScriptStep = {
        id: editingStep?.id || `step_${Date.now()}`,
        type,
        name,
        description,
        parameters,
        enabled: true,
        order: editingStep?.order || steps.length,
      };

      if (editingStep) {
        // 更新现有步骤
        setSteps(prev => prev.map(s => s.id === editingStep.id ? step : s));
        message.success('步骤更新成功！');
      } else {
        // 添加新步骤
        setSteps(prev => [...prev, step]);
        message.success('步骤添加成功！');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存步骤失败:', error);
      message.error('保存失败，请检查必填项');
    }
  };

  // 删除步骤
  const handleDeleteStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
    message.success('步骤删除成功！');
  };

  // 移动步骤
  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    
    // 更新order
    newSteps.forEach((step, index) => {
      step.order = index;
    });

    setSteps(newSteps);
  };

  // 复制步骤
  const handleCopyStep = (step: ScriptStep) => {
    const newStep: ScriptStep = {
      ...step,
      id: `step_${Date.now()}`,
      name: `${step.name} (副本)`,
      order: steps.length,
    };
    setSteps(prev => [...prev, newStep]);
    message.success('步骤复制成功！');
  };

  // 切换步骤启用状态
  const toggleStepEnabled = (stepId: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // 渲染参数输入组件
  const renderParameterInput = (param: any) => {
    if (param.type === 'coordinate') {
      return (
        <Input
          placeholder={`请输入${param.label}，格式：x,y`}
          addonAfter={
            <Tooltip title="点击捕获坐标">
              <AimOutlined 
                style={{ cursor: 'pointer' }}
                onClick={() => handleCoordinateCapture(param.key)}
              />
            </Tooltip>
          }
        />
      );
    }
    
    if (param.type === 'number') {
      return (
        <InputNumber 
          placeholder={`请输入${param.label}`}
          className="w-full"
          min={0}
        />
      );
    }
    
    if (param.type === 'boolean') {
      return (
        <Select placeholder={`选择${param.label}`}>
          <Option value={true}>是</Option>
          <Option value={false}>否</Option>
        </Select>
      );
    }
    
    if (param.type === 'select' && param.options) {
      return (
        <Select placeholder={`选择${param.label}`}>
          {param.options.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    }
    
    if (param.type === 'text' && param.key === 'text') {
      return (
        <TextArea 
          placeholder={`请输入${param.label}`}
          rows={3}
        />
      );
    }
    
    return <Input placeholder={`请输入${param.label}`} />;
  };

  // 执行脚本
  const handleExecuteScript = async () => {
    if (steps.length === 0) {
      message.warning('请先添加脚本步骤');
      return;
    }

    const enabledSteps = steps.filter(s => s.enabled);
    if (enabledSteps.length === 0) {
      message.warning('没有启用的步骤可执行');
      return;
    }

    setIsExecuting(true);
    try {
      // 调用后端API执行脚本
      const result = await invoke('execute_automation_script', {
        deviceId: 'emulator-5554', // TODO: 从设备选择器获取
        steps: enabledSteps,
      }) as ScriptExecutionResult;

      console.log('脚本执行结果:', result);
      
      if (result.success) {
        message.success(`脚本执行成功！执行了 ${result.executed_steps} 个步骤，耗时 ${result.duration || 0} 秒`);
      } else {
        message.warning(`脚本执行完成，${result.executed_steps} 个成功，${result.failed_steps || 0} 个失败`);
      }
    } catch (error) {
      console.error('脚本执行失败:', error);
      message.error(`脚本执行失败: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 坐标捕获处理
  const handleCoordinateCapture = (field: string) => {
    setCapturingForField(field);
    setCoordinateCaptureVisible(true);
  };

  const handleCoordinateSelect = (x: number, y: number) => {
    if (capturingForField) {
      if (capturingForField === 'coordinate') {
        form.setFieldsValue({ coordinate: `${x},${y}` });
      } else if (capturingForField === 'start_coordinate') {
        form.setFieldsValue({ start_coordinate: `${x},${y}` });
      } else if (capturingForField === 'end_coordinate') {
        form.setFieldsValue({ end_coordinate: `${x},${y}` });
      }
    }
    setCoordinateCaptureVisible(false);
    setCapturingForField(null);
  };

  // 保存脚本
  const handleSaveScript = () => {
    if (steps.length === 0) {
      message.warning('没有步骤可保存');
      return;
    }
    // 模拟保存到本地存储
    const scriptData = {
      name: `Script_${Date.now()}`,
      steps: steps,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('automation_script', JSON.stringify(scriptData));
    message.success('脚本保存成功！');
  };

  // 渲染步骤列表项
  const renderStepItem = (step: ScriptStep, index: number) => {
    const config = ACTION_CONFIGS[step.type];
    
    return (
      <List.Item
        key={step.id}
        className={`transition-all duration-200 ${!step.enabled ? 'opacity-50' : ''}`}
        style={{
          border: selectedStep?.id === step.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
          borderRadius: '8px',
          margin: '8px 0',
          padding: '12px',
          background: step.enabled ? '#fff' : '#f5f5f5',
        }}
        onClick={() => setSelectedStep(step)}
      >
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{config.icon}</span>
              <div>
                <Text strong className={step.enabled ? '' : 'text-gray-400'}>
                  {index + 1}. {step.name}
                </Text>
                <br />
                <Text type="secondary" className="text-sm">
                  {step.description}
                </Text>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Tag color={config.color}>{config.name}</Tag>
              <Space size="small">
                <Tooltip title="编辑">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStep(step);
                    }}
                  />
                </Tooltip>
                
                <Tooltip title="复制">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyStep(step);
                    }}
                  />
                </Tooltip>
                
                <Tooltip title="上移">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(step.id, 'up');
                    }}
                  />
                </Tooltip>
                
                <Tooltip title="下移">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ArrowDownOutlined />}
                    disabled={index === steps.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(step.id, 'down');
                    }}
                  />
                </Tooltip>
                
                <Tooltip title={step.enabled ? '禁用' : '启用'}>
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepEnabled(step.id);
                    }}
                  >
                    {step.enabled ? '🟢' : '⭕'}
                  </Button>
                </Tooltip>
                
                <Popconfirm
                  title="确定删除这个步骤吗？"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteStep(step.id);
                  }}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button 
                    type="text" 
                    size="small" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </Space>
            </div>
          </div>
          
          {/* 参数预览 */}
          <div className="text-xs text-gray-500 mt-2">
            {Object.entries(step.parameters).map(([key, value]) => (
              <span key={key} className="mr-3">
                {key}: <Text code>{String(value)}</Text>
              </span>
            ))}
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <div className="h-full p-6 overflow-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <Title level={2} className="mb-2">
          🔧 自动化脚本构建器
        </Title>
        <Paragraph type="secondary">
          通过可视化界面构建自动化脚本，支持拖拽排序、参数配置、实时预览和测试执行
        </Paragraph>
      </div>

      <Row gutter={16} className="h-full">
        {/* 左侧：步骤列表 */}
        <Col span={16}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span>📋 脚本步骤 ({steps.length})</span>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleAddStep}
                  >
                    添加步骤
                  </Button>
                </Space>
              </div>
            }
            className="h-full"
            bodyStyle={{ padding: '16px', height: 'calc(100% - 57px)', overflow: 'auto' }}
          >
            {steps.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <Title level={4} type="secondary">还没有添加任何步骤</Title>
                <Paragraph type="secondary">点击上方"添加步骤"按钮开始构建你的自动化脚本</Paragraph>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAddStep}>
                  添加第一个步骤
                </Button>
              </div>
            ) : (
              <List
                dataSource={[...steps].sort((a, b) => a.order - b.order)}
                renderItem={renderStepItem}
                pagination={false}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：操作面板 */}
        <Col span={8}>
          <Space direction="vertical" size="middle" className="w-full">
            {/* 脚本控制 */}
            <Card title="🎮 脚本控制">
              <Space direction="vertical" className="w-full">
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  icon={<PlayCircleOutlined />}
                  loading={isExecuting}
                  disabled={steps.length === 0}
                  onClick={handleExecuteScript}
                >
                  {isExecuting ? '执行中...' : '执行脚本'}
                </Button>
                
                <Row gutter={8}>
                  <Col span={12}>
                    <Button 
                      block 
                      icon={<SaveOutlined />}
                      onClick={handleSaveScript}
                      disabled={steps.length === 0}
                    >
                      保存脚本
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      block 
                      icon={<UploadOutlined />}
                    >
                      加载脚本
                    </Button>
                  </Col>
                </Row>
              </Space>
            </Card>

            {/* 脚本预览 */}
            <Card title="👁️ 脚本预览" size="small">
              <Timeline>
                {steps.filter(s => s.enabled).slice(0, 5).map((step, index) => {
                  const config = ACTION_CONFIGS[step.type];
                  return (
                    <Timeline.Item 
                      key={step.id}
                      color={config.color}
                      dot={<span className="text-xs">{config.icon}</span>}
                    >
                      <Text className="text-sm">{step.name}</Text>
                    </Timeline.Item>
                  );
                })}
                {steps.filter(s => s.enabled).length > 5 && (
                  <Timeline.Item color="gray">
                    <Text type="secondary" className="text-sm">
                      ...还有 {steps.filter(s => s.enabled).length - 5} 个步骤
                    </Text>
                  </Timeline.Item>
                )}
              </Timeline>
            </Card>

            {/* 快速添加 */}
            <Card title="⚡ 快速添加" size="small">
              <Space direction="vertical" className="w-full" size="small">
                <Button 
                  block 
                  size="small"
                  onClick={() => {
                    setEditingStep(null);
                    form.setFieldsValue({ type: ActionType.TAP });
                    setIsModalVisible(true);
                  }}
                >
                  👆 添加点击
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => {
                    setEditingStep(null);
                    form.setFieldsValue({ type: ActionType.WAIT });
                    setIsModalVisible(true);
                  }}
                >
                  ⏱️ 添加等待
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => {
                    setEditingStep(null);
                    form.setFieldsValue({ type: ActionType.FIND_ELEMENT });
                    setIsModalVisible(true);
                  }}
                >
                  🔍 查找元素
                </Button>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 步骤编辑模态框 */}
      <Modal
        title={editingStep ? '编辑步骤' : '添加新步骤'}
        open={isModalVisible}
        onOk={handleSaveStep}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ enabled: true }}>
          <Form.Item
            name="type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="选择操作类型">
              {Object.entries(ACTION_CONFIGS).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.icon} {config.name} - {config.description}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="步骤名称"
                rules={[{ required: true, message: '请输入步骤名称' }]}
              >
                <Input placeholder="例如：点击登录按钮" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="步骤描述">
                <Input placeholder="详细描述这个步骤的作用" />
              </Form.Item>
            </Col>
          </Row>

          {/* 动态参数表单 */}
          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) => {
              const actionType = getFieldValue('type');
              if (!actionType || !ACTION_CONFIGS[actionType]) return null;

              const config = ACTION_CONFIGS[actionType];
              return (
                <div>
                  <Divider>参数配置</Divider>
                  <Row gutter={16}>
                    {config.parameters.map((param) => (
                      <Col span={param.type === 'text' ? 24 : 12} key={param.key}>
                        <Form.Item
                          name={param.key}
                          label={param.label}
                          rules={param.required ? [{ required: true, message: `请输入${param.label}` }] : []}
                          initialValue={param.default}
                        >
                          {renderParameterInput(param)}
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 坐标捕获工具 */}
      <CoordinateCapture
        visible={coordinateCaptureVisible}
        onClose={() => {
          setCoordinateCaptureVisible(false);
          setCapturingForField(null);
        }}
        onCoordinateSelect={handleCoordinateSelect}
        deviceId="emulator-5554"
      />
    </div>
  );
};

export default ScriptBuilderPage;

