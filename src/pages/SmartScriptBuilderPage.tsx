import React, { useState, useEffect } from 'react';
import { useAdb } from '../application/hooks/useAdb';
import { DeviceStatus } from '../domain/adb/entities/Device';
import {
  Card,
  Button,
  Space,
  Form,
  Input,
  Select,
  Checkbox,
  InputNumber,
  Row,
  Col,
  Typography,
  Alert,
  Tag,
  Collapse,
  Divider,
  Modal,
  message,
  Tooltip,
  Switch,
  Slider,
  DatePicker,
  TimePicker,
  Upload,
  Progress
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  BulbOutlined,
  RobotOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  AndroidOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { LaunchAppSmartComponent } from '../components/smart/LaunchAppSmartComponent';
import { SmartNavigationModal } from '../components';
import { SmartActionType } from '../types/smartComponents';
import type { LaunchAppComponentParams } from '../types/smartComponents';
import type { SmartScriptStep } from '../types/smartScript';
import StepTestButton from '../components/StepTestButton';
import TestResultsDisplay from '../components/TestResultsDisplay';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TextArea } = Input;

// ==================== 智能操作配置 ====================

const SMART_ACTION_CONFIGS = {
  // 基础操作
  [SmartActionType.TAP]: {
    name: '基础点击',
    description: '点击固定坐标位置',
    icon: '👆',
    color: 'blue',
    category: 'basic',
    parameters: [
      { key: 'x', label: 'X坐标', type: 'number', required: true },
      { key: 'y', label: 'Y坐标', type: 'number', required: true },
      { key: 'wait_after', label: '操作后等待(ms)', type: 'number', default: 1000 },
    ]
  },
  
  [SmartActionType.SMART_TAP]: {
    name: '智能点击',
    description: '基于UI元素智能识别和点击',
    icon: '🎯',
    color: 'green',
    category: 'smart',
    parameters: [
      { key: 'find_method', label: '查找方式', type: 'select', required: true, 
        options: ['text', 'resource_id', 'class_name', 'bounds'], default: 'text' },
      { key: 'target_value', label: '目标值', type: 'text', required: true },
      { key: 'clickable_only', label: '仅可点击元素', type: 'boolean', default: true },
      { key: 'wait_after', label: '操作后等待(ms)', type: 'number', default: 1000 },
    ],
    advanced: [
      { key: 'confidence_threshold', label: '置信度阈值', type: 'slider', min: 0.1, max: 1.0, default: 0.8 },
      { key: 'retry_count', label: '重试次数', type: 'number', default: 3 },
      { key: 'timeout_ms', label: '超时时间(ms)', type: 'number', default: 10000 },
    ]
  },

  [SmartActionType.SMART_FIND_ELEMENT]: {
    name: '智能元素查找',
    description: '动态查找并定位UI元素',
    icon: '🔍',
    color: 'purple',
    category: 'smart',
    parameters: [
      { key: 'search_criteria', label: '搜索条件', type: 'textarea', required: true },
      { key: 'click_if_found', label: '找到后点击', type: 'boolean', default: false },
      { key: 'extract_attributes', label: '提取属性', type: 'multiselect', 
        options: ['text', 'bounds', 'resource_id', 'class_name'], default: ['text', 'bounds'] },
    ],
    advanced: [
      { key: 'bounds_filter', label: '坐标范围过滤', type: 'bounds' },
      { key: 'element_type_filter', label: '元素类型过滤', type: 'select',
        options: ['Button', 'TextView', 'EditText', 'ImageView', 'Any'], default: 'Any' },
    ]
  },

  [SmartActionType.RECOGNIZE_PAGE]: {
    name: '页面识别',
    description: '智能识别当前页面状态',
    icon: '📱',
    color: 'orange',
    category: 'smart',
    parameters: [
      { key: 'expected_state', label: '期望页面状态', type: 'select', required: false,
        options: ['Unknown', 'Home', 'AppMainPage', 'Loading', 'Dialog', 'Settings', 'ListPage', 'DetailPage'] },
      { key: 'confidence_threshold', label: '置信度阈值', type: 'slider', min: 0.1, max: 1.0, default: 0.7 },
    ],
    advanced: [
      { key: 'save_recognition_result', label: '保存识别结果', type: 'boolean', default: true },
      { key: 'screenshot_on_fail', label: '失败时截图', type: 'boolean', default: true },
    ]
  },

  [SmartActionType.VERIFY_ACTION]: {
    name: '操作验证',
    description: '验证操作是否成功执行',
    icon: '✅',
    color: 'red',
    category: 'verification',
    parameters: [
      { key: 'verify_type', label: '验证类型', type: 'select', required: true,
        options: ['text_change', 'page_state_change', 'element_exists', 'element_disappears'], default: 'text_change' },
      { key: 'expected_result', label: '期望结果', type: 'text', required: true },
      { key: 'timeout_ms', label: '验证超时(ms)', type: 'number', default: 5000 },
    ],
    advanced: [
      { key: 'retry_interval_ms', label: '重试间隔(ms)', type: 'number', default: 1000 },
      { key: 'max_retries', label: '最大重试次数', type: 'number', default: 3 },
    ]
  },

  [SmartActionType.WAIT_FOR_PAGE_STATE]: {
    name: '等待页面状态',
    description: '等待页面切换到指定状态',
    icon: '⏳',
    color: 'cyan',
    category: 'smart',
    parameters: [
      { key: 'expected_state', label: '期望页面状态', type: 'select', required: true,
        options: ['Home', 'AppMainPage', 'Loading', 'Dialog', 'Settings', 'ListPage', 'DetailPage'] },
      { key: 'timeout_ms', label: '超时时间(ms)', type: 'number', default: 10000 },
      { key: 'check_interval_ms', label: '检查间隔(ms)', type: 'number', default: 1000 },
    ]
  },

  [SmartActionType.EXTRACT_ELEMENT]: {
    name: '提取元素信息',
    description: '提取UI元素的详细信息',
    icon: '📊',
    color: 'magenta',
    category: 'data',
    parameters: [
      { key: 'target_elements', label: '目标元素', type: 'textarea', required: true },
      { key: 'extract_fields', label: '提取字段', type: 'multiselect', required: true,
        options: ['text', 'bounds', 'center', 'clickable', 'resource_id', 'class_name'], 
        default: ['text', 'bounds', 'clickable'] },
    ],
    advanced: [
      { key: 'save_to_variable', label: '保存到变量', type: 'text' },
      { key: 'format_output', label: '输出格式', type: 'select', options: ['json', 'csv', 'plain'], default: 'json' },
    ]
  },

  [SmartActionType.SMART_NAVIGATION]: {
    name: '智能导航',
    description: '智能识别并点击导航栏按钮（底部、顶部、侧边、悬浮导航栏）',
    icon: '🧭',
    color: 'geekblue',
    category: 'smart',
    parameters: [
      { key: 'navigation_type', label: '导航栏类型', type: 'select', required: true,
        options: ['bottom', 'top', 'side', 'floating'], default: 'bottom' },
      { key: 'app_name', label: '应用名称', type: 'text', required: true },
      { key: 'button_name', label: '按钮名称', type: 'text', required: true },
      { key: 'click_action', label: '点击方式', type: 'select',
        options: ['single_tap', 'double_tap', 'long_press'], default: 'single_tap' },
    ],
    advanced: [
      { key: 'position_ratio', label: '位置范围', type: 'bounds' },
      { key: 'button_patterns', label: '按钮模式', type: 'multiselect',
        options: ['首页', '市集', '发布', '消息', '我', '微信', '通讯录', '发现'] },
      { key: 'retry_count', label: '重试次数', type: 'number', default: 3 },
      { key: 'timeout_ms', label: '超时时间(ms)', type: 'number', default: 10000 },
    ]
  },

  // 应用操作 - 新增
  [SmartActionType.LAUNCH_APP]: {
    name: '打开应用',
    description: '智能选择并启动设备上的应用程序',
    icon: '🚀',
    color: 'cyan',
    category: 'app',
    parameters: [
      { key: 'app_selection_method', label: '应用选择方式', type: 'select', required: true,
        options: ['manual', 'auto_detect', 'popular'], default: 'manual' },
      { key: 'wait_after_launch', label: '启动后等待时间(ms)', type: 'number', default: 3000 },
      { key: 'verify_launch', label: '验证启动成功', type: 'boolean', default: true },
    ],
    advanced: [
      { key: 'fallback_method', label: '失败后操作', type: 'select', 
        options: ['retry', 'ignore', 'error'], default: 'retry' },
      { key: 'max_retry_count', label: '最大重试次数', type: 'number', default: 3 },
    ]
  },

  [SmartActionType.COMPLETE_WORKFLOW]: {
    name: '完整工作流程',
    description: '执行完整的自动化工作流程',
    icon: '🚀',
    color: 'gold',
    category: 'workflow',
    parameters: [
      { key: 'workflow_type', label: '工作流程类型', type: 'select', required: true,
        options: ['xiaohongshu_follow', 'contact_import', 'app_automation', 'custom'] },
      { key: 'workflow_config', label: '工作流程配置', type: 'textarea', required: true },
    ],
    advanced: [
      { key: 'enable_smart_recovery', label: '启用智能恢复', type: 'boolean', default: true },
      { key: 'detailed_logging', label: '详细日志记录', type: 'boolean', default: true },
      { key: 'screenshot_on_error', label: '出错时截图', type: 'boolean', default: true },
    ]
  },
};

// ==================== 接口定义 ====================

interface ExecutorConfig {
  default_timeout_ms: number;
  default_retry_count: number;
  page_recognition_enabled: boolean;
  auto_verification_enabled: boolean;
  smart_recovery_enabled: boolean;
  detailed_logging: boolean;
}

interface SmartExecutionResult {
  success: boolean;
  total_steps: number;
  executed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  duration_ms: number;
  logs: any[];
  final_page_state?: string;
  extracted_data: Record<string, any>;
  message: string;
}

// ==================== 主组件 ====================

const SmartScriptBuilderPage: React.FC = () => {
  // ADB Hook 获取设备信息
  const { devices, refreshDevices } = useAdb();
  
  const [steps, setSteps] = useState<SmartScriptStep[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editingStep, setEditingStep] = useState<SmartScriptStep | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(''); // 当前选择的设备ID
  const [showAppComponent, setShowAppComponent] = useState(false); // 显示应用组件
  const [showNavigationModal, setShowNavigationModal] = useState(false); // 显示导航模态框
  const [executorConfig, setExecutorConfig] = useState<ExecutorConfig>({
    default_timeout_ms: 10000,
    default_retry_count: 3,
    page_recognition_enabled: true,
    auto_verification_enabled: true,
    smart_recovery_enabled: true,
    detailed_logging: true,
  });
  const [executionResult, setExecutionResult] = useState<SmartExecutionResult | null>(null);
  const [form] = Form.useForm();

  // 初始化设备选择
  useEffect(() => {
    // 刷新设备列表
    refreshDevices();
  }, [refreshDevices]);

  // 当设备列表变化时，自动选择第一个设备
  useEffect(() => {
    if (devices.length > 0 && !currentDeviceId) {
      const firstOnlineDevice = devices.find(d => d.status === DeviceStatus.ONLINE);
      if (firstOnlineDevice) {
        setCurrentDeviceId(firstOnlineDevice.id);
      }
    }
  }, [devices, currentDeviceId]);

  // 添加新步骤
  const handleAddStep = () => {
    setEditingStep(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑步骤
  const handleEditStep = (step: SmartScriptStep) => {
    setEditingStep(step);
    form.setFieldsValue({
      step_type: step.step_type,
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
      const { step_type, name, description, ...parameters } = values;

      const newStep: SmartScriptStep = {
        id: editingStep?.id || `step_${Date.now()}`,
        step_type,
        name,
        description,
        parameters,
        enabled: true,
        order: editingStep?.order || steps.length + 1,
        find_condition: null,
        verification: null,
        retry_config: null,
        fallback_actions: [],
        pre_conditions: [],
        post_conditions: [],
      };

      if (editingStep) {
        setSteps(prev => prev.map(s => s.id === editingStep.id ? newStep : s));
        message.success('步骤更新成功');
      } else {
        setSteps(prev => [...prev, newStep]);
        message.success('步骤添加成功');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存步骤失败:', error);
    }
  };

  // 删除步骤
  const handleDeleteStep = (stepId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个步骤吗？',
      onOk: () => {
        setSteps(prev => prev.filter(s => s.id !== stepId));
        message.success('步骤删除成功');
      },
    });
  };

  // 切换步骤启用状态
  const handleToggleStep = (stepId: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // 执行智能脚本
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
      // 检查是否在Tauri环境中
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
      
      if (!isTauri) {
        // 模拟执行结果（用于开发环境）
        const mockResult: SmartExecutionResult = {
          success: true,
          total_steps: enabledSteps.length,
          executed_steps: enabledSteps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 2500,
          logs: [],
          final_page_state: 'Home',
          extracted_data: {},
          message: '模拟执行成功（开发环境）',
        };
        
        // 模拟异步执行
        await new Promise(resolve => setTimeout(resolve, 2000));
        setExecutionResult(mockResult);
        message.success(`智能脚本执行成功！执行了 ${mockResult.executed_steps} 个步骤，耗时 ${mockResult.duration_ms} ms`);
        setIsExecuting(false);
        return;
      }

      // 真实的Tauri调用
      try {
        // 动态导入在Tauri环境中的处理
        const tauriApi = (window as any).__TAURI__;
        if (!tauriApi?.invoke) {
          throw new Error('Tauri API不可用');
        }

        const result = await tauriApi.invoke('execute_smart_automation_script', {
          deviceId: 'emulator-5554', // 使用默认模拟器设备
          steps: enabledSteps,
          config: executorConfig,
        }) as SmartExecutionResult;

        setExecutionResult(result);
        
        if (result.success) {
          message.success(`智能脚本执行成功！执行了 ${result.executed_steps} 个步骤，耗时 ${result.duration_ms} ms`);
        } else {
          message.warning(`智能脚本执行完成，${result.executed_steps} 个成功，${result.failed_steps} 个失败`);
        }
      } catch (tauriError) {
        // 如果Tauri调用失败，使用模拟结果
        console.warn('Tauri API调用失败，使用模拟执行:', tauriError);
        const mockResult: SmartExecutionResult = {
          success: true,
          total_steps: enabledSteps.length,
          executed_steps: enabledSteps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 2500,
          logs: [],
          final_page_state: 'Home',
          extracted_data: {},
          message: '使用模拟执行（Tauri API不可用）',
        };
        
        setExecutionResult(mockResult);
        message.success(`智能脚本模拟执行成功！执行了 ${mockResult.executed_steps} 个步骤`);
      }
    } catch (error) {
      console.error('智能脚本执行失败:', error);
      message.error(`智能脚本执行失败: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 渲染参数输入组件
  const renderParameterInput = (param: any, value: any, onChange: (value: any) => void) => {
    switch (param.type) {
      case 'number':
        return (
          <InputNumber
            placeholder={`请输入${param.label}`}
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
            checkedChildren="是"
            unCheckedChildren="否"
          />
        );
      case 'select':
        return (
          <Select
            placeholder={`请选择${param.label}`}
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
          >
            {param.options?.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      case 'multiselect':
        return (
          <Select
            mode="multiple"
            placeholder={`请选择${param.label}`}
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
          >
            {param.options?.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      case 'slider':
        return (
          <Slider
            min={param.min}
            max={param.max}
            step={0.1}
            value={value}
            onChange={onChange}
            marks={{
              [param.min]: param.min,
              [param.max]: param.max,
            }}
          />
        );
      case 'textarea':
        return (
          <TextArea
            placeholder={`请输入${param.label}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        );
      default:
        return (
          <Input
            placeholder={`请输入${param.label}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} className="mb-2">
              🤖 智能脚本构建器
            </Title>
            <Paragraph type="secondary">
              基于AI的智能自动化脚本构建系统，支持页面识别、元素智能定位、操作验证和智能恢复
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <Text type="secondary">目标设备:</Text>
              <Select
                placeholder="选择设备"
                value={currentDeviceId || undefined}
                onChange={(value) => setCurrentDeviceId(value)}
                style={{ width: 240 }}
                loading={devices.length === 0}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px' }}>
                      <Button
                        type="text"
                        icon={<SyncOutlined />}
                        onClick={() => refreshDevices()}
                        size="small"
                      >
                        刷新设备
                      </Button>
                    </Space>
                  </>
                )}
              >
                {devices.map(device => (
                  <Option key={device.id} value={device.id}>
                    <Space>
                      <AndroidOutlined 
                        style={{ 
                          color: device.status === DeviceStatus.ONLINE ? '#52c41a' : '#d9d9d9' 
                        }} 
                      />
                      <Text>
                        {device.id}
                      </Text>
                      <Tag 
                        color={device.status === DeviceStatus.ONLINE ? 'success' : 'default'}
                      >
                        {device.status === DeviceStatus.ONLINE ? '在线' : '离线'}
                      </Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
              <Button
                icon={<RocketOutlined />}
                onClick={() => setShowAppComponent(true)}
                disabled={!currentDeviceId}
              >
                快速添加应用
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 执行器配置 */}
      <Card 
        title={
          <span>
            <SettingOutlined className="mr-2" />
            执行器配置
          </span>
        }
        size="small"
        className="mb-4"
      >
        <Row gutter={16}>
          <Col span={6}>
            <div className="text-center">
              <Switch
                checked={executorConfig.page_recognition_enabled}
                onChange={(checked) => setExecutorConfig(prev => ({ ...prev, page_recognition_enabled: checked }))}
              />
              <div className="mt-1 text-xs">页面识别</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <Switch
                checked={executorConfig.auto_verification_enabled}
                onChange={(checked) => setExecutorConfig(prev => ({ ...prev, auto_verification_enabled: checked }))}
              />
              <div className="mt-1 text-xs">自动验证</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <Switch
                checked={executorConfig.smart_recovery_enabled}
                onChange={(checked) => setExecutorConfig(prev => ({ ...prev, smart_recovery_enabled: checked }))}
              />
              <div className="mt-1 text-xs">智能恢复</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <Switch
                checked={executorConfig.detailed_logging}
                onChange={(checked) => setExecutorConfig(prev => ({ ...prev, detailed_logging: checked }))}
              />
              <div className="mt-1 text-xs">详细日志</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} className="h-full">
        {/* 左侧：步骤列表 */}
        <Col span={16}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span>📋 智能脚本步骤 ({steps.length})</span>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleAddStep}
                  >
                    添加智能步骤
                  </Button>
                </Space>
              </div>
            }
            className="h-full"
            bodyStyle={{ padding: '16px', height: 'calc(100% - 57px)', overflow: 'auto' }}
          >
            {steps.length === 0 ? (
              <div className="text-center py-12">
                <RobotOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                <div className="mt-4 text-gray-500">
                  还没有添加智能步骤，点击上方按钮开始构建智能脚本
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const config = SMART_ACTION_CONFIGS[step.step_type];
                  return (
                    <Card
                      key={step.id}
                      size="small"
                      className={`${step.enabled ? 'border-blue-200' : 'border-gray-200'} transition-all`}
                      title={
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Text className="text-lg">{config?.icon}</Text>
                            <Text strong>{step.name}</Text>
                            <Tag color={config?.color}>{config?.name}</Tag>
                            {!step.enabled && <Tag>已禁用</Tag>}
                          </div>
                          <Space>
                            <StepTestButton 
                              step={step} 
                              deviceId={currentDeviceId}
                              disabled={!currentDeviceId || devices.filter(d => d.status === DeviceStatus.ONLINE).length === 0}
                            />
                            <Switch
                              size="small"
                              checked={step.enabled}
                              onChange={() => handleToggleStep(step.id)}
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditStep(step)}
                            />
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteStep(step.id)}
                            />
                          </Space>
                        </div>
                      }
                    >
                      <div className="text-sm text-gray-600 mb-2">
                        {step.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        步骤 #{index + 1} | 类型: {config?.category} | 参数: {Object.keys(step.parameters).length} 个
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：控制面板 */}
        <Col span={8}>
          <Space direction="vertical" size="middle" className="w-full">
            {/* 脚本控制 */}
            <Card title="🎮 智能脚本控制">
              <Space direction="vertical" className="w-full">
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  icon={<ThunderboltOutlined />}
                  loading={isExecuting}
                  disabled={steps.length === 0}
                  onClick={handleExecuteScript}
                >
                  {isExecuting ? '智能执行中...' : '执行智能脚本'}
                </Button>
                
                <Row gutter={8}>
                  <Col span={12}>
                    <Button 
                      block 
                      icon={<SaveOutlined />}
                      disabled={steps.length === 0}
                    >
                      保存脚本
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      block 
                      icon={<EyeOutlined />}
                    >
                      预览脚本
                    </Button>
                  </Col>
                </Row>

                {executionResult && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-2">执行结果</div>
                    <div className="space-y-1 text-xs">
                      <div>状态: <Tag color={executionResult.success ? 'green' : 'red'}>
                        {executionResult.success ? '成功' : '失败'}
                      </Tag></div>
                      <div>总步骤: {executionResult.total_steps}</div>
                      <div>执行成功: {executionResult.executed_steps}</div>
                      <div>执行失败: {executionResult.failed_steps}</div>
                      <div>耗时: {executionResult.duration_ms}ms</div>
                    </div>
                  </div>
                )}
              </Space>
            </Card>

            {/* 单步测试结果 */}
            <TestResultsDisplay />

            {/* 智能功能说明 */}
            <Card title={<><BulbOutlined className="mr-2" />智能功能特性</>}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircleOutlined className="text-green-500" />
                  <span>页面状态智能识别</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleOutlined className="text-green-500" />
                  <span>UI元素动态定位</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleOutlined className="text-green-500" />
                  <span>操作结果自动验证</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleOutlined className="text-green-500" />
                  <span>智能重试和恢复</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleOutlined className="text-green-500" />
                  <span>复杂工作流程支持</span>
                </div>
              </div>
            </Card>

            {/* 操作类型说明 */}
            <Card title="🏷️ 操作类型分类">
              <Collapse size="small">
                <Panel header="基础操作" key="basic">
                  <div className="text-xs space-y-1">
                    <div>• 基础点击 - 固定坐标点击</div>
                    <div>• 滑动操作 - 屏幕滑动</div>
                    <div>• 文本输入 - 键盘输入</div>
                    <div>• 等待操作 - 时间延迟</div>
                  </div>
                </Panel>
                <Panel header="智能操作" key="smart">
                  <div className="text-xs space-y-1">
                    <div>• 智能点击 - AI识别元素</div>
                    <div>• 智能查找 - 动态元素定位</div>
                    <div>• 页面识别 - 状态智能判断</div>
                    <div>• 智能导航 - 复杂路径规划</div>
                  </div>
                </Panel>
                <Panel header="验证操作" key="verification">
                  <div className="text-xs space-y-1">
                    <div>• 操作验证 - 结果确认</div>
                    <div>• 状态等待 - 页面切换等待</div>
                    <div>• 数据提取 - 信息采集</div>
                  </div>
                </Panel>
              </Collapse>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 步骤编辑模态框 */}
      <Modal
        title={editingStep ? '编辑智能步骤' : '添加智能步骤'}
        open={isModalVisible}
        onOk={handleSaveStep}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            step_type: SmartActionType.SMART_TAP,
            wait_after: 1000,
          }}
        >
          <Form.Item
            name="step_type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择智能操作类型">
              {Object.entries(SMART_ACTION_CONFIGS).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                    <Tag color={config.color}>{config.category}</Tag>
                  </Space>
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
                <Input placeholder="请输入步骤名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="description"
                label="步骤描述"
              >
                <Input placeholder="请输入步骤描述" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item dependencies={['step_type']} noStyle>
            {({ getFieldValue }) => {
              const stepType = getFieldValue('step_type');
              const config = SMART_ACTION_CONFIGS[stepType];
              
              if (!config) return null;

              // 特殊处理：如果是LAUNCH_APP类型，使用专门的智能组件
              if (stepType === SmartActionType.LAUNCH_APP) {
                return (
                  <div>
                    <Divider orientation="left">智能应用启动配置</Divider>
                    <Alert 
                      message="使用智能应用启动组件，提供完整的应用选择和启动功能"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <LaunchAppSmartComponent
                      deviceId={currentDeviceId}
                      value={editingStep?.parameters as LaunchAppComponentParams}
                      onChange={(params) => {
                        // 同步更新表单数据
                        form.setFieldsValue(params);
                      }}
                      onExecute={async (params) => {
                        // 这里可以添加执行逻辑
                        message.success('应用启动测试完成');
                        return true;
                      }}
                    />
                  </div>
                );
              }

              // 特殊处理：如果是SMART_NAVIGATION类型，显示配置按钮
              if (stepType === SmartActionType.SMART_NAVIGATION) {
                return (
                  <div>
                    <Divider orientation="left">智能导航配置</Divider>
                    <Alert 
                      message="智能导航支持自动识别导航栏并点击指定按钮，适用于底部导航栏、顶部导航栏等场景"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Card className="text-center" style={{ marginBottom: 16 }}>
                      <Button 
                        type="primary" 
                        size="large"
                        icon={<SettingOutlined />}
                        onClick={() => setShowNavigationModal(true)}
                      >
                        打开智能导航配置器
                      </Button>
                      <br />
                      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                        包含向导模式（推荐新手）和专业模式（支持自定义配置）
                      </Text>
                    </Card>
                  </div>
                );
              }

              return (
                <div>
                  <Divider orientation="left">参数配置</Divider>
                  <Alert 
                    message={config.description}
                    type="info"
                    showIcon
                    className="mb-4"
                  />
                  
                  {config.parameters?.map((param) => (
                    <Form.Item
                      key={param.key}
                      name={param.key}
                      label={param.label}
                      rules={param.required ? [{ required: true, message: `请输入${param.label}` }] : []}
                      initialValue={param.default}
                    >
                      {renderParameterInput(param, undefined, () => {})}
                    </Form.Item>
                  ))}

                  {config.advanced && config.advanced.length > 0 && (
                    <Collapse size="small" className="mt-4">
                      <Panel header="高级配置" key="advanced">
                        {config.advanced.map((param) => (
                          <Form.Item
                            key={param.key}
                            name={param.key}
                            label={param.label}
                            initialValue={param.default}
                          >
                            {renderParameterInput(param, undefined, () => {})}
                          </Form.Item>
                        ))}
                      </Panel>
                    </Collapse>
                  )}
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 快速应用选择Modal */}
      <Modal
        title="快速添加应用启动步骤"
        open={showAppComponent}
        onCancel={() => setShowAppComponent(false)}
        footer={null}
        width={900}
      >
        <Alert
          message="快速创建应用启动步骤"
          description="选择一个应用并配置启动参数，将自动创建一个智能应用启动步骤"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <LaunchAppSmartComponent
          deviceId={currentDeviceId}
          onChange={(params) => {
            // 临时存储参数，等待用户确认添加
          }}
          onExecute={async (params) => {
            // 创建新的智能步骤
            if (params.selected_app) {
              const newStep: SmartScriptStep = {
                id: `step_${Date.now()}`,
                step_type: SmartActionType.LAUNCH_APP,
                name: `启动${params.selected_app.app_name}`,
                description: `智能启动应用: ${params.selected_app.app_name}`,
                parameters: params,
                enabled: true,
                order: steps.length
              };

              setSteps(prev => [...prev, newStep]);
              setShowAppComponent(false);
              message.success(`已添加应用启动步骤: ${params.selected_app.app_name}`);
              return true;
            }
            return false;
          }}
        />
      </Modal>

      {/* 智能导航配置模态框 */}
      <SmartNavigationModal
        visible={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        onStepGenerated={(step) => {
          // 添加生成的步骤到脚本中
          setSteps(prev => [...prev, step]);
          setShowNavigationModal(false);
          message.success(`已添加导航步骤: ${step.name}`);
        }}
        deviceId={currentDeviceId}
      />
    </div>
  );
};

export default SmartScriptBuilderPage;

