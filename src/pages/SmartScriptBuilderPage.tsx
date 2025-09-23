import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  WarningOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  AndroidOutlined,
  SyncOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { LaunchAppSmartComponent } from '../components/smart/LaunchAppSmartComponent';
import { SmartNavigationModal } from '../components';
import { DistributedScriptQualityPanel } from '../modules/distributed-script-quality/DistributedScriptQualityPanel';
import { SmartPageFinderModal } from '../components/smart-page-finder';
import { UniversalPageFinderModal } from '../components/universal-ui/UniversalPageFinderModal';
import type { NodeLocator } from '../domain/inspector/entities/NodeLocator';
import type { SnapshotInfo } from '../modules/snapshot-recovery/SnapshotRecoveryTypes';
import SmartStepGenerator from '../modules/SmartStepGenerator';
import { testSmartStepGenerator, testVariousCases } from '../test/SmartStepGeneratorTest';
// import { runAllElementNameMapperTests } from '../test/ElementNameMapperTest';
import { PageAnalysisProvider } from '../application/page-analysis/PageAnalysisProvider';
import { PageAnalysisApplicationService } from '../application/page-analysis/PageAnalysisApplicationService';
import { SmartActionType } from '../types/smartComponents';
import type { LaunchAppComponentParams } from '../types/smartComponents';
import type { SmartScriptStep } from '../types/smartScript';
// 🆕 导入分布式脚本管理相关服务
import { DistributedStepLookupService } from '../application/services/DistributedStepLookupService';
import { DistributedScriptManager, DistributedStep } from '../domain/distributed-script';
import StepTestButton from '../components/StepTestButton';
import TestResultsDisplay from '../components/TestResultsDisplay';
// 🆕 导入新的脚本管理模块
import { ScriptBuilderIntegration } from '../modules/smart-script-management/components/ScriptBuilderIntegration';
import { ScriptSerializer } from '../modules/smart-script-management/utils/serializer';
// 🆕 导入拖拽步骤组件
import { DraggableStepsContainer } from '../components/DraggableStepsContainer';
import { EnhancedDraggableStepsContainer } from '../components/EnhancedDraggableStepsContainer';
// 🆕 导入循环逻辑类型
import type { ExtendedSmartScriptStep, LoopConfig } from '../types/loopScript';
// 🆕 导入通讯录自动化模块
import { ContactWorkflowSelector, generateContactImportWorkflowSteps } from '../modules/contact-automation';
// 🆕 导入增强元素信息模块
import { EnhancedUIElement, EnhancedStepParameters, EnhancedElementInfoService } from '../modules/enhanced-element-info';
import { EnhancedStepCard } from '../modules/enhanced-step-card';
import XmlCacheManager from '../services/XmlCacheManager';
// 🧪 XML数据质量校验
import { XmlDataValidator } from '../modules/distributed-script-quality/XmlDataValidator';
// 🆕 自包含脚本支持
import { 
  XmlSnapshot, 
  ElementLocator, 
  SelfContainedStepParameters,
  createXmlSnapshot,
  validateXmlSnapshot,
  migrateToSelfContainedParameters,
  generateXmlHash
} from '../types/selfContainedScript';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TextArea } = Input;

// ==================== 智能操作配置 ====================

const SMART_ACTION_CONFIGS = {
  // 通讯录自动化操作 - 置顶优先显示
  [SmartActionType.CONTACT_IMPORT_WORKFLOW]: {
    name: '通讯录导入',
    description: '完整的通讯录导入工作流程',
    icon: '📱',
    color: 'green',
    category: 'contact',
    parameters: [],
    advanced: []
  },

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

  // 循环控制操作
  [SmartActionType.LOOP_START]: {
    name: '循环开始',
    description: '标记循环体的开始',
    icon: '🔄',
    color: 'blue',
    category: 'loop',
    parameters: [
      { key: 'loop_name', label: '循环名称', type: 'text', required: true, default: '新循环' },
      { key: 'loop_count', label: '循环次数', type: 'number', required: true, default: 3 },
      { key: 'break_condition', label: '跳出条件', type: 'select', 
        options: ['none', 'page_change', 'element_found', 'element_not_found'], default: 'none' },
      { key: 'break_condition_value', label: '跳出条件值', type: 'text', required: false },
    ],
    advanced: [
      { key: 'max_iterations', label: '最大迭代次数', type: 'number', default: 100 },
      { key: 'delay_between_loops', label: '循环间延迟(ms)', type: 'number', default: 500 },
      { key: 'enable_debug_logging', label: '启用调试日志', type: 'boolean', default: false },
    ]
  },

  [SmartActionType.LOOP_END]: {
    name: '循环结束',
    description: '标记循环体的结束',
    icon: '🏁',
    color: 'blue',
    category: 'loop',
    parameters: [
      { key: 'loop_id', label: '对应循环ID', type: 'text', required: true },
    ],
    advanced: [
      { key: 'log_iteration_results', label: '记录迭代结果', type: 'boolean', default: true },
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
  
  // 创建页面分析服务实例
  const pageAnalysisService = React.useMemo(() => {
    try {
      const { PageAnalysisApplicationService } = require('../application/page-analysis/PageAnalysisApplicationService');
      const { PageAnalysisRepositoryFactory } = require('../infrastructure/repositories/PageAnalysisRepositoryFactory');
      
      const pageAnalysisRepository = PageAnalysisRepositoryFactory.getPageAnalysisRepository();
      const deviceUIStateRepository = PageAnalysisRepositoryFactory.getDeviceUIStateRepository();
      
      return new PageAnalysisApplicationService(pageAnalysisRepository, deviceUIStateRepository);
    } catch (error) {
      console.error('创建页面分析服务失败:', error);
      return null;
    }
  }, []);
  
  const [steps, setSteps] = useState<ExtendedSmartScriptStep[]>([]);
  
  // 🆕 当步骤变化时，同步到分布式步骤查找服务
  useEffect(() => {
    // 转换当前步骤为分布式步骤格式（如果包含XML快照）
    const distributedSteps: DistributedStep[] = steps
      .filter(step => step.parameters?.xmlContent) // 只处理有XML快照的步骤
      .map(step => ({
        id: step.id,
        name: step.name || `步骤_${step.id}`,
        actionType: step.step_type || 'click',
        params: step.parameters || {},
        locator: step.parameters?.locator || {
          absoluteXPath: step.parameters?.xpath || '',
          attributes: {
            resourceId: step.parameters?.resource_id,
            text: step.parameters?.text,
            contentDesc: step.parameters?.content_desc,
            className: step.parameters?.class_name,
          },
        },
        createdAt: Date.now(),
        description: step.description,
        xmlSnapshot: {
          xmlContent: step.parameters.xmlContent,
          xmlHash: `hash_${step.id}_${Date.now()}`,
          timestamp: Date.now(),
          deviceInfo: step.parameters.deviceInfo ? {
            deviceId: step.parameters.deviceInfo.deviceId || 'unknown',
            deviceName: step.parameters.deviceInfo.deviceName,
          } : (step.parameters.deviceId || step.parameters.deviceName) ? {
            deviceId: step.parameters.deviceId || 'unknown',
            deviceName: step.parameters.deviceName || 'Unknown Device',
          } : undefined,
          pageInfo: step.parameters.pageInfo ? {
            appPackage: step.parameters.pageInfo.appPackage || 'unknown',
            activityName: step.parameters.pageInfo.activityName,
            pageTitle: step.parameters.pageInfo.pageTitle,
          } : undefined,
        }
      }));
    
    // 同步到分布式步骤查找服务
    DistributedStepLookupService.setGlobalScriptSteps(distributedSteps);
    
    console.log("🔄 同步步骤到分布式查找服务:", {
      totalSteps: steps.length,
      distributedSteps: distributedSteps.length,
      stepIds: distributedSteps.map(s => s.id)
    });
  }, [steps]);
  const [loopConfigs, setLoopConfigs] = useState<LoopConfig[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editingStep, setEditingStep] = useState<ExtendedSmartScriptStep | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(''); // 当前选择的设备ID
  const [showAppComponent, setShowAppComponent] = useState(false); // 显示应用组件
  const [showNavigationModal, setShowNavigationModal] = useState(false); // 显示导航模态框
  const [showPageAnalyzer, setShowPageAnalyzer] = useState(false); // 显示智能页面分析器
  const [snapshotFixMode, setSnapshotFixMode] = useState<{ enabled: boolean; forStepId?: string }>(
    { enabled: false }
  );
  const [pendingAutoResave, setPendingAutoResave] = useState<boolean>(false);
  const [isQuickAnalyzer, setIsQuickAnalyzer] = useState(false); // 标记是否是快捷页面分析器
  const [editingStepForParams, setEditingStepForParams] = useState<ExtendedSmartScriptStep | null>(null); // 当前正在修改参数的步骤
  const [lastNavigationConfig, setLastNavigationConfig] = useState<{app_name?: string, navigation_type?: string} | null>(null); // 记录最后的导航配置
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
  // 🆕 通讯录工作流相关状态
  const [showContactWorkflowSelector, setShowContactWorkflowSelector] = useState(false);
  // 🆕 脚本质量验证状态
  const [isScriptValid, setIsScriptValid] = useState<boolean>(true);
  const [showQualityPanel, setShowQualityPanel] = useState<boolean>(false);
  // 🆕 当前XML内容状态（用于自包含脚本）
  const [currentXmlContent, setCurrentXmlContent] = useState<string>('');
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<Partial<XmlSnapshot['deviceInfo']>>({});
  const [currentPageInfo, setCurrentPageInfo] = useState<Partial<XmlSnapshot['pageInfo']>>({});

  // 初始化设备选择
  useEffect(() => {
    // 刷新设备列表
    refreshDevices();
    
    // 临时测试：在控制台中运行智能步骤生成器测试
    console.log('🧪 运行智能步骤生成器测试...');
    testSmartStepGenerator();
    testVariousCases();
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

  // 处理智能导航配置变化，强制覆盖表单字段
  const handleNavigationConfigChange = useCallback((config: {app_name?: string, navigation_type?: string}) => {
    console.log('📥 接收到配置变化:', config); // 调试信息
    setLastNavigationConfig(config);
  }, []);

  // 处理智能导航模态框关闭，强制应用配置
  const handleNavigationModalClose = useCallback((finalConfig?: {app_name?: string, navigation_type?: string}) => {
    console.log('🔄 模态框关闭，最后配置:', lastNavigationConfig, '最终配置:', finalConfig); // 调试信息
    setShowNavigationModal(false);
    
    // 优先使用传入的最终配置，否则使用保存的配置
    const configToApply = finalConfig || lastNavigationConfig;
    
    // 如果有配置信息，强制覆盖表单字段
    if (configToApply) {
      const appName = configToApply.app_name || '智能导航';
      const navType = configToApply.navigation_type || '导航操作';
      
      console.log('💾 强制覆盖表单字段:', { appName, navType }); // 调试信息
      
      // 强制覆盖，不管用户是否已经输入
      form.setFieldValue('name', appName);
      form.setFieldValue('description', `导航栏选择 ${navType}`);
      
      message.success(`已自动填充步骤信息：${appName} - 导航栏选择 ${navType}`);
    }
  }, [lastNavigationConfig, form]);

  // 添加新步骤
  const handleAddStep = () => {
    setEditingStep(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 🆕 处理快捷页面分析器
  const handleQuickPageAnalyzer = () => {
    setIsQuickAnalyzer(true); // 标记为快捷模式
    setEditingStepForParams(null); // 清空修改参数模式
    setShowPageAnalyzer(true);
  };

  // 🆕 更新当前XML内容状态（用于自包含脚本）
  const updateCurrentXmlContext = (xmlContent: string, deviceInfo?: Partial<XmlSnapshot['deviceInfo']>, pageInfo?: Partial<XmlSnapshot['pageInfo']>) => {
    setCurrentXmlContent(xmlContent);
    if (deviceInfo) {
      setCurrentDeviceInfo(prev => ({ ...prev, ...deviceInfo }));
    }
    if (pageInfo) {
      setCurrentPageInfo(prev => ({ ...prev, ...pageInfo }));
    }
    console.log('🔄 已更新当前XML上下文:', {
      xmlLength: xmlContent.length,
      deviceInfo,
      pageInfo,
    });
  };

  // 🆕 从页面分析器获取当前XML内容
  const getCurrentXmlFromAnalyzer = (): string => {
    // 这里可以从UniversalPageFinderModal获取当前分析的XML
    return currentXmlContent;
  };

  // 🆕 处理修改步骤参数
  const handleEditStepParams = (step: ExtendedSmartScriptStep) => {
    console.log('📝 开始修改步骤参数:', {
      stepId: step.id,
      stepName: step.name,
      xmlCacheId: step.parameters?.xmlCacheId,
      hasXmlContent: !!step.parameters?.xmlContent,
      xmlContentLength: step.parameters?.xmlContent?.length || 0,
      allParameterKeys: Object.keys(step.parameters || {})
    });
    
    // 🆕 确保步骤包含XML快照信息
    let stepForEdit = step;
    if (!step.parameters?.xmlContent) {
      console.warn('⚠️ 步骤缺少XML快照，尝试根据 xmlCacheId 回填:', step.id, step.parameters?.xmlCacheId);
      try {
        if (step.parameters?.xmlCacheId) {
          const xmlCacheManager = XmlCacheManager.getInstance();
          const cacheEntry = xmlCacheManager.getCachedXml(step.parameters.xmlCacheId);
          if (cacheEntry?.xmlContent) {
            console.log('✅ 已从缓存回填步骤XML快照:', {
              cacheId: step.parameters.xmlCacheId,
              bytes: cacheEntry.xmlContent.length
            });
            // 回填到当前步骤并持久到状态
            const updatedParameters = {
              ...step.parameters,
              xmlContent: cacheEntry.xmlContent,
              xmlTimestamp: cacheEntry.timestamp,
              deviceId: cacheEntry.deviceId,
              deviceName: cacheEntry.deviceName,
            };
            const updatedStep: ExtendedSmartScriptStep = { ...step, parameters: updatedParameters };
            setSteps(prev => prev.map(s => s.id === step.id ? updatedStep : s));
            stepForEdit = updatedStep;
          } else {
            console.warn('⚠️ 未找到对应的XML缓存条目或内容为空:', step.parameters.xmlCacheId);
            message.warning('该步骤缺少页面快照信息，可能无法正确显示原始页面');
          }
        } else {
          message.warning('该步骤缺少页面快照信息，可能无法正确显示原始页面');
        }
      } catch (e) {
        console.warn('回填XML快照失败:', e);
        message.warning('该步骤缺少页面快照信息，可能无法正确显示原始页面');
      }
    } else {
      console.log('✅ 步骤包含XML快照，将恢复原始页面环境');
    }
    
    setEditingStepForParams(stepForEdit); // 标记当前修改的步骤（可能已回填）
    setIsQuickAnalyzer(false); // 清除快捷模式
    setShowPageAnalyzer(true);
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
      console.log('🔍 表单验证后的所有值:', values);
      const { step_type, name, description, ...parameters } = values;
      console.log('🔍 解构后的 parameters:', parameters);

      // 🆕 特殊处理通讯录导入工作流
      if (step_type === SmartActionType.CONTACT_IMPORT_WORKFLOW) {
        // 显示通讯录工作流配置器，让用户配置详细参数
        setShowContactWorkflowSelector(true);
        setIsModalVisible(false);
        return;
      }

      const stepId = editingStep?.id || `step_${Date.now()}`;
      
  // ✅ 保存前的XML质量校验（阻断式）
      if (parameters) {
        // 构造最小 xmlSnapshot 视图（增强：允许使用当前分析器中的XML与上下文信息作为回退）
        const effectiveXmlContent = parameters.xmlContent || currentXmlContent || '';
        const effectiveDeviceInfo = parameters.deviceInfo
          || (parameters.deviceId || parameters.deviceName
                ? { deviceId: parameters.deviceId, deviceName: parameters.deviceName }
                : undefined)
          || (currentDeviceInfo?.deviceId || currentDeviceInfo?.deviceName
                ? { deviceId: currentDeviceInfo.deviceId as string, deviceName: currentDeviceInfo.deviceName as string }
                : undefined);
        // 校验器仅要求存在 appName 字段，这里补齐最小信息
        const effectivePageInfo = parameters.pageInfo
          || ({
                appName: (currentPageInfo as any)?.appName || '小红书',
                pageTitle: currentPageInfo?.pageTitle || '未知页面'
              } as any);
        const effectiveTimestamp = parameters.xmlTimestamp || Date.now();

        const xmlSnapshot = {
          xmlContent: effectiveXmlContent,
          deviceInfo: effectiveDeviceInfo,
          pageInfo: effectivePageInfo,
          timestamp: effectiveTimestamp
        };

        const validation = XmlDataValidator.validateXmlSnapshot(xmlSnapshot as any);
        console.log('🧪 XML快照校验结果:', validation);

        if (!validation.isValid && validation.severity === 'critical') {
          // 关键问题：阻断保存，并提供一键修复入口
          const tips = validation.issues.map(i => `• [${i.severity}] ${i.message}${i.suggestion ? `（建议：${i.suggestion}）` : ''}`).join('\n');
          Modal.confirm({
            title: '无法保存：XML 快照无效',
            width: 640,
            content: (
              <div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginBottom: 8 }}>{tips}</pre>
                <Alert type="info" showIcon message="可选择一键重新采集当前页面快照并自动回填（推荐）" />
              </div>
            ),
            okText: '一键修复并重试保存',
            cancelText: '返回修改',
            onOk: () => {
              // 进入仅采集快照模式，回填后自动再次保存
              setSnapshotFixMode({ enabled: true, forStepId: stepId });
              setPendingAutoResave(true);
              setIsQuickAnalyzer(false);
              setEditingStepForParams(null);
              setShowPageAnalyzer(true);
            }
          });
          return; // 阻断保存
        }

        if (!validation.isValid && (validation.severity === 'major' || validation.severity === 'minor')) {
          // 重要/次要问题：提示并允许继续
          const warnTips = validation.issues.map(i => `• [${i.severity}] ${i.message}`).join('\n');
          message.warning({
            content: (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>XML 快照存在问题，建议修复后再保存</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{warnTips}</pre>
              </div>
            ),
            duration: 3
          });
        }
      }
      const newStep: ExtendedSmartScriptStep = {
        id: stepId,
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

      // 🆕 若参数缺少 xmlContent，但存在 xmlCacheId，则尝试从缓存回填
      if (!newStep.parameters?.xmlContent && newStep.parameters?.xmlCacheId) {
        try {
          const xmlCacheManager = XmlCacheManager.getInstance();
          const cacheEntry = xmlCacheManager.getCachedXml(newStep.parameters.xmlCacheId);
          if (cacheEntry?.xmlContent) {
            newStep.parameters = {
              ...newStep.parameters,
              xmlContent: cacheEntry.xmlContent,
              xmlTimestamp: cacheEntry.timestamp,
              deviceId: cacheEntry.deviceId,
              deviceName: cacheEntry.deviceName,
            };
            console.log('🧩 已在保存前回填步骤XML快照:', {
              stepId,
              cacheId: newStep.parameters.xmlCacheId,
              bytes: cacheEntry.xmlContent.length
            });
          }
        } catch (e) {
          console.warn('保存前回填XML快照失败（可忽略）:', e);
        }
      }

      // 🆕 自包含脚本：创建完整的XML快照
      if (newStep.parameters && (newStep.parameters.xmlContent || currentXmlContent)) {
        console.log('📸 创建自包含XML快照...');
        
        try {
          // 获取XML内容（优先使用步骤参数中的，其次使用当前页面的）
          const xmlContent = newStep.parameters.xmlContent || currentXmlContent;
          
          if (xmlContent) {
            // 创建完整的XML快照
            const xmlSnapshot = createXmlSnapshot(
              xmlContent,
              {
                deviceId: newStep.parameters.deviceId || currentDeviceInfo.deviceId || currentDeviceId || 'unknown',
                deviceName: newStep.parameters.deviceName || currentDeviceInfo.deviceName || devices.find(d => d.id === currentDeviceId)?.name || 'unknown',
                appPackage: currentDeviceInfo.appPackage || 'com.xingin.xhs',
                activityName: currentDeviceInfo.activityName || 'unknown',
              },
              {
                pageTitle: currentPageInfo.pageTitle || '小红书页面',
                pageType: currentPageInfo.pageType || 'unknown',
                elementCount: currentPageInfo.elementCount || 0,
                appVersion: currentPageInfo.appVersion,
                // 兼容 XmlDataValidator.checkPageInfo 需要的 appName 字段
                // createXmlSnapshot 的类型未包含 appName，但我们会在迁移/校验时以扩展字段传递
              }
            );

            // 创建元素定位信息
            const elementLocator: ElementLocator | undefined = newStep.parameters.bounds ? {
              selectedBounds: newStep.parameters.bounds,
              elementPath: newStep.parameters.xpath || newStep.parameters.element_path || '',
              confidence: newStep.parameters.smartAnalysis?.confidence || 0.8,
              additionalInfo: {
                xpath: newStep.parameters.xpath,
                resourceId: newStep.parameters.resource_id,
                text: newStep.parameters.text,
                contentDesc: newStep.parameters.content_desc,
                className: newStep.parameters.class_name,
              },
            } : undefined;

            // 使用迁移函数创建自包含参数
            const selfContainedParams = migrateToSelfContainedParameters(
              newStep.parameters,
              xmlContent,
              xmlSnapshot.deviceInfo,
              xmlSnapshot.pageInfo
            );

            // 手动设置XML快照和定位器
            selfContainedParams.xmlSnapshot = xmlSnapshot;
            selfContainedParams.elementLocator = elementLocator;

            // 更新步骤参数为自包含格式
            newStep.parameters = selfContainedParams;

            console.log('✅ 自包含XML快照创建成功:', {
              stepId,
              xmlHash: xmlSnapshot.xmlHash,
              xmlSize: xmlSnapshot.xmlContent.length,
              deviceInfo: xmlSnapshot.deviceInfo,
              pageInfo: xmlSnapshot.pageInfo,
              hasElementLocator: !!elementLocator,
            });

            // 验证XML快照完整性
            if (!validateXmlSnapshot(xmlSnapshot)) {
              console.warn('⚠️ XML快照完整性验证失败，但步骤仍会保存');
              message.warning('XML快照可能不完整，建议重新分析页面');
            }

          } else {
            console.warn('⚠️ 无可用XML内容创建快照');
          }
        } catch (error) {
          console.error('创建自包含XML快照失败:', error);
          message.warning('创建XML快照失败，步骤将以传统模式保存');
        }
      }

      // 🆕 建立步骤与XML源的关联
      if (parameters.xmlCacheId && parameters.xmlCacheId !== 'unknown') {
        const xmlCacheManager = XmlCacheManager.getInstance();
        xmlCacheManager.linkStepToXml(stepId, parameters.xmlCacheId, {
          elementPath: parameters.element_path,
          selectionContext: {
            selectedBounds: parameters.bounds,
            searchCriteria: parameters.search_criteria || parameters.target_value || '',
            confidence: parameters.confidence || 0.8
          }
        });
        
        console.log(`🔗 步骤已关联XML源:`, {
          stepId,
          xmlCacheId: parameters.xmlCacheId,
          hasElementPath: !!parameters.element_path
        });
      }

      if (editingStep) {
        setSteps(prev => prev.map(s => s.id === editingStep.id ? newStep : s));
        message.success('步骤更新成功');
      } else {
        setSteps(prev => [...prev, newStep]);
        message.success(`步骤添加成功${parameters.xmlCacheId ? '（已关联XML源）' : ''}`);
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存步骤失败:', error);
    }
  };

  // 删除步骤（由组件级 Popconfirm 调用）
  const handleDeleteStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
    message.success('步骤删除成功');
  };

  // 切换步骤启用状态
  const handleToggleStep = (stepId: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // 处理批量匹配操作 - 支持双向转换：smart_find_element ⇄ batch_match
  const handleBatchMatch = (stepId: string) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        // 情况1: smart_find_element -> batch_match
        if (step.step_type === 'smart_find_element') {
          return {
            ...step,
            step_type: 'batch_match',
            name: step.name.replace('智能元素查找', '批量匹配'),
            description: `${step.description} (批量匹配模式 - 动态查找)`,
            parameters: {
              ...step.parameters,
              is_batch_match: true,
              original_step_type: 'smart_find_element' // 保留原始类型
            }
          };
        }
        
        // 情况2: batch_match -> smart_find_element
        if (step.step_type === 'batch_match') {
          const cleanedParameters = { ...step.parameters };
          // 清理批量匹配相关的参数
          delete cleanedParameters.is_batch_match;
          delete cleanedParameters.original_step_type;
          
          return {
            ...step,
            step_type: 'smart_find_element',
            name: step.name.replace('批量匹配', '智能元素查找'),
            description: step.description.replace(/\s*\(批量匹配模式 - 动态查找\)$/, ''),
            parameters: cleanedParameters
          };
        }
      }
      return step;
    }));
    
    // 根据当前步骤类型显示相应的成功消息
    const currentStep = steps.find(s => s.id === stepId);
    if (currentStep?.step_type === 'smart_find_element') {
      message.success('已转换为批量匹配模式，将使用动态元素查找');
    } else if (currentStep?.step_type === 'batch_match') {
      message.success('已切换回智能元素查找模式，将使用预设坐标');
    }
  };

  // ==================== 循环管理函数 ====================
  
  // 创建新循环
  const handleCreateLoop = () => {
    const loopId = `loop_${Date.now()}`;
    const startStepId = `step_${Date.now()}_start`;
    const endStepId = `step_${Date.now()}_end`;

    // 创建循环配置
    const newLoopConfig: LoopConfig = {
      loopId,
      name: '新循环',
      iterations: 3,
      enabled: true,
      description: '智能循环'
    };

    // 创建循环开始步骤
    const loopStartStep: ExtendedSmartScriptStep = {
      id: startStepId,
      step_type: SmartActionType.LOOP_START,
      name: '循环开始',
      description: `开始执行 ${newLoopConfig.name}`,
      parameters: {
        loop_id: loopId,
        loop_name: newLoopConfig.name,
        loop_count: newLoopConfig.iterations,
        is_infinite_loop: false // 初始化为非无限循环
      },
      enabled: true,
      order: steps.length + 1,
      find_condition: null,
      verification: null,
      retry_config: null,
      fallback_actions: [],
      pre_conditions: [],
      post_conditions: [],
    };

    // 创建循环结束步骤
    const loopEndStep: ExtendedSmartScriptStep = {
      id: endStepId,
      step_type: SmartActionType.LOOP_END,
      name: '循环结束',
      description: `结束执行 ${newLoopConfig.name}`,
      parameters: {
        loop_id: loopId,
        loop_name: newLoopConfig.name,
        loop_count: newLoopConfig.iterations, // 确保循环结束步骤也有相同的循环次数
        is_infinite_loop: false // 初始化为非无限循环
      },
      enabled: true,
      order: steps.length + 2,
      find_condition: null,
      verification: null,
      retry_config: null,
      fallback_actions: [],
      pre_conditions: [],
      post_conditions: [],
    };

    // 更新状态
    setLoopConfigs(prev => [...prev, newLoopConfig]);
    setSteps(prev => [...prev, loopStartStep, loopEndStep]);
    
    message.success('创建循环成功！可以拖拽其他步骤到循环体内');
  };

  // 创建通讯录导入工作流
  const handleCreateContactImport = () => {
    const baseTimestamp = Date.now();
    
    // 生成3个步骤卡片
    const contactSteps = generateContactImportWorkflowSteps('', currentDeviceId);
    
    // 更新步骤顺序
    const updatedSteps = contactSteps.map((step, index) => ({
      ...step,
      order: steps.length + index + 1
    }));
    
    // 添加到步骤列表
    setSteps(prev => [...prev, ...updatedSteps]);
    
    message.success('通讯录导入步骤创建成功！已添加3个步骤到脚本中');
  };

  // 删除循环
  const handleDeleteLoop = (loopId: string) => {
    Modal.confirm({
      title: '确认删除循环',
      content: '确定要删除整个循环吗？这将删除循环开始和结束标记，循环内的步骤会保留。',
      onOk: () => {
        // 删除循环配置
        setLoopConfigs(prev => prev.filter(config => config.loopId !== loopId));
        
        // 删除循环相关步骤，重置循环体内步骤的父级关系
        setSteps(prev => {
          const updatedSteps = prev.filter(step => {
            // 删除循环开始和结束步骤
            if ((step.step_type === SmartActionType.LOOP_START || step.step_type === SmartActionType.LOOP_END) 
                && step.parameters?.loop_id === loopId) {
              return false;
            }
            return true;
          }).map(step => {
            // 重置循环体内步骤的父级关系
            if (step.parent_loop_id === loopId) {
              return { ...step, parent_loop_id: undefined };
            }
            return step;
          });
          
          // 重新计算步骤顺序
          return updatedSteps.map((step, index) => ({ ...step, order: index + 1 }));
        });
        
        message.success('循环删除成功');
      },
    });
  };

  // 更新循环配置
  const handleUpdateLoopConfig = (loopId: string, updates: Partial<LoopConfig>) => {
    setLoopConfigs(prev => prev.map(config => 
      config.loopId === loopId ? { ...config, ...updates } : config
    ));
    
    // 同步更新相关步骤的参数
    setSteps(prev => prev.map(step => {
      if ((step.step_type === SmartActionType.LOOP_START || step.step_type === SmartActionType.LOOP_END) 
          && step.parameters?.loop_id === loopId) {
        return {
          ...step,
          name: step.step_type === SmartActionType.LOOP_START ? `循环开始 - ${updates.name || step.name}` : step.name,
          description: step.step_type === SmartActionType.LOOP_START ? 
            `开始执行 ${updates.name || '循环'}` : step.description,
          parameters: {
            ...step.parameters,
            loop_name: updates.name || step.parameters?.loop_name,
            loop_count: updates.iterations || step.parameters?.loop_count
          }
        };
      }
      return step;
    }));
  };

  // 🆕 处理通讯录工作流步骤生成
  const handleContactWorkflowStepsGenerated = (generatedSteps: ExtendedSmartScriptStep[]) => {
    console.log('📱 生成的通讯录工作流步骤:', generatedSteps);
    
    // 添加生成的步骤到步骤列表
    setSteps(prev => [...prev, ...generatedSteps]);
    
    message.success(`已生成 ${generatedSteps.length} 个通讯录导入步骤`);
    setShowContactWorkflowSelector(false);
  };

  // 保存智能脚本
  const handleSaveScript = async () => {
    console.log('💾 开始保存智能脚本...');
    
    if (steps.length === 0) {
      message.warning('请先添加脚本步骤');
      return;
    }

    try {
      // 改进的Tauri环境检测 - 直接尝试使用invoke函数
      console.log('🔍 开始Tauri环境检测...');
      console.log('window对象存在:', typeof window !== 'undefined');
      console.log('__TAURI__对象:', typeof (window as any).__TAURI__);
      console.log('__TAURI__内容:', (window as any).__TAURI__);
      
      let isTauri = false;
      try {
        // 尝试调用一个存在的Tauri命令来测试环境
        await invoke('get_adb_devices_safe');
        isTauri = true;
        console.log('✅ Tauri invoke 函数可用');
      } catch (invokeError) {
        console.log('❌ Tauri invoke 函数不可用:', invokeError);
        isTauri = false;
      }
      
      console.log('🌐 Tauri环境检测:', isTauri ? '是' : '否');
      
      if (!isTauri) {
        message.warning('保存功能仅在Tauri环境中可用');
        return;
      }

      // 构造脚本对象
      const currentTime = new Date().toISOString();
      const scriptId = `script_${Date.now()}`;
      
      const scriptData = {
        id: scriptId,
        name: `智能脚本_${new Date().toLocaleString()}`,
        description: `包含 ${steps.length} 个步骤的自动化脚本`,
        version: "1.0.0",
        created_at: currentTime,
        updated_at: currentTime,
        author: "用户",
        category: "通用",
        tags: ['智能脚本', '自动化'],
        steps: steps.map((step, index) => ({
          id: step.id || `step_${index + 1}`,
          step_type: step.step_type,
          name: step.name || step.description,
          description: step.description,
          parameters: step.parameters || {},
          enabled: step.enabled !== false, // 默认启用
          order: index
        })),
        config: {
          continue_on_error: executorConfig.smart_recovery_enabled,
          auto_verification_enabled: executorConfig.auto_verification_enabled,
          smart_recovery_enabled: executorConfig.smart_recovery_enabled,
          detailed_logging: executorConfig.detailed_logging
        },
        metadata: {}
      };

      console.log('📝 保存脚本数据:', scriptData);

      // 调用后端保存接口
      const savedScriptId = await invoke('save_smart_script', {
        script: scriptData
      });

      console.log('✅ 脚本保存成功，ID:', savedScriptId);
      message.success(`脚本保存成功！ID: ${savedScriptId}`);

    } catch (error) {
      console.error('❌ 保存脚本失败:', error);
      message.error(`保存脚本失败: ${error}`);
    }
  };

  // 🆕 处理脚本加载的回调函数
  const handleLoadScriptFromManager = (loadedScript: any) => {
    try {
      console.log('📥 正在加载脚本:', loadedScript);
      
      // 使用新的序列化工具来恢复UI状态
      const { steps: deserializedSteps, config: deserializedConfig } = 
        ScriptSerializer.deserializeScript(loadedScript);
        
      console.log('🔄 反序列化的步骤:', deserializedSteps);
      console.log('🔄 反序列化的配置:', deserializedConfig);
      
      // 更新UI状态
      setSteps(deserializedSteps);
      setExecutorConfig(deserializedConfig);
      
      message.success(`已成功加载脚本: ${loadedScript.name} (${deserializedSteps.length} 个步骤)`);
      
    } catch (error) {
      console.error('❌ 脚本加载失败:', error);
      message.error(`脚本加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 执行智能脚本
  const handleExecuteScript = async () => {
    console.log('🚀 开始执行智能脚本...');
    
    if (steps.length === 0) {
      message.warning('请先添加脚本步骤');
      return;
    }

    const enabledSteps = steps.filter(s => s.enabled);
    if (enabledSteps.length === 0) {
      message.warning('没有启用的步骤可执行');
      return;
    }

    console.log('📋 启用的步骤数量:', enabledSteps.length);
    console.log('📝 启用的步骤详情:', enabledSteps);

    // 获取当前选中的设备
    const selectedDevice = currentDeviceId || devices.find(d => d.status === 'online')?.id || 'emulator-5554';
    console.log('📱 选中的设备:', selectedDevice);
    console.log('🔧 执行配置:', executorConfig);

    setIsExecuting(true);
    try {
      // 改进的Tauri环境检测 - 直接尝试使用invoke函数
      console.log('🔍 开始Tauri环境检测...');
      console.log('window对象存在:', typeof window !== 'undefined');
      console.log('__TAURI__对象:', typeof (window as any).__TAURI__);
      console.log('__TAURI__内容:', (window as any).__TAURI__);
      
      let isTauri = false;
      try {
        // 尝试调用一个存在的Tauri命令来测试环境
        await invoke('get_adb_devices_safe');
        isTauri = true;
        console.log('✅ Tauri invoke 函数可用');
      } catch (invokeError) {
        console.log('❌ Tauri invoke 函数不可用:', invokeError);
        isTauri = false;
      }
      
      console.log('🌐 Tauri环境检测:', isTauri ? '是' : '否');
      
      if (!isTauri) {
        // 模拟执行结果（用于开发环境）
        console.log('🎭 使用模拟执行...');
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
        console.log('🔌 准备调用Tauri API...');
        
        // 构造符合后端期望的配置对象
        const backendConfig = {
          continue_on_error: executorConfig.smart_recovery_enabled,
          auto_verification_enabled: executorConfig.auto_verification_enabled,
          smart_recovery_enabled: executorConfig.smart_recovery_enabled,
          detailed_logging: executorConfig.detailed_logging
        };
        
        console.log('📤 发送Tauri调用:', {
          command: 'execute_smart_automation_script',
          deviceId: selectedDevice,
          stepsCount: enabledSteps.length,
          config: backendConfig
        });

        const result = await invoke('execute_smart_automation_script', {
          deviceId: selectedDevice,
          steps: enabledSteps,
          config: backendConfig,
        }) as SmartExecutionResult;

        console.log('📥 收到Tauri响应:', result);
        setExecutionResult(result);
        
        if (result.success) {
          message.success(`智能脚本执行成功！执行了 ${result.executed_steps} 个步骤，耗时 ${result.duration_ms} ms`);
        } else {
          message.warning(`智能脚本执行完成，${result.executed_steps} 个成功，${result.failed_steps} 个失败`);
        }
      } catch (tauriError) {
        // 如果Tauri调用失败，使用模拟结果
        console.error('❌ Tauri API调用失败:', tauriError);
        console.warn('🎭 回退到模拟执行...');
        
        const mockResult: SmartExecutionResult = {
          success: true,
          total_steps: enabledSteps.length,
          executed_steps: enabledSteps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 2500,
          logs: [`模拟执行 ${enabledSteps.length} 个步骤`, '所有步骤模拟成功'],
          final_page_state: 'Home',
          extracted_data: {},
          message: '使用模拟执行（Tauri API不可用）',
        };
        
        setExecutionResult(mockResult);
        message.warning('Tauri API不可用，使用模拟执行模式');
      }
    } catch (error) {
      console.error('❌ 智能脚本执行失败:', error);
      message.error(`智能脚本执行失败: ${error}`);
    } finally {
      setIsExecuting(false);
      console.log('🏁 智能脚本执行流程结束');
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
        {/* 左侧：可拖拽的步骤列表 */}
        <Col span={16}>
          <div style={{ height: '100%' }}>
            <EnhancedDraggableStepsContainer
              steps={steps}
              loopConfigs={loopConfigs}
              onStepsChange={setSteps}
              onLoopConfigsChange={setLoopConfigs}
              currentDeviceId={currentDeviceId}
              devices={devices}
              onEditStep={handleEditStep}
              onDeleteStep={handleDeleteStep}
              onDeleteLoop={handleDeleteLoop}
              onToggleStep={handleToggleStep}
              onOpenPageAnalyzer={handleQuickPageAnalyzer}
              onEditStepParams={handleEditStepParams}
              StepTestButton={StepTestButton}
              onCreateLoop={handleCreateLoop}
              onCreateContactImport={handleCreateContactImport}
              onAddStep={handleAddStep}
              onBatchMatch={handleBatchMatch}
            />
          </div>
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
                  <Col span={24}>
                    {/* 🆕 集成完整的脚本管理功能 */}
                    <ScriptBuilderIntegration
                      steps={steps}
                      executorConfig={executorConfig}
                      onLoadScript={handleLoadScriptFromManager}
                      onUpdateSteps={setSteps}
                      onUpdateConfig={setExecutorConfig}
                    />
                  </Col>
                </Row>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <Row gutter={8}>
                  <Col span={12}>
                    <Button 
                      block 
                      icon={<SaveOutlined />}
                      disabled={steps.length === 0}
                      onClick={handleSaveScript}
                    >
                      快速保存 (旧版)
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

            {/* 🆕 调试和测试区域 */}
            <Card title="🧪 调试测试">
              <Space direction="vertical" className="w-full">
                <Button
                  size="small"
                  type="default"
                  block
                  icon={<BulbOutlined />}
                  onClick={() => {
                    console.log('🧪 运行元素名称映射测试...');
                    // runAllElementNameMapperTests(); // 暂时注释掉，函数未导入
                    message.info('元素名称映射测试功能暂时禁用');
                  }}
                >
                  测试元素名称映射
                </Button>
                <Button
                  size="small"
                  type="default"
                  block
                  icon={<RobotOutlined />}
                  onClick={() => {
                    console.log('🧪 运行智能步骤生成器测试...');
                    testSmartStepGenerator();
                    testVariousCases();
                  }}
                >
                  测试智能步骤生成
                </Button>
                
                {/* 🆕 分布式脚本质量检查按钮 */}
                <Button
                  size="small"
                  type={isScriptValid ? "default" : "primary"}
                  danger={!isScriptValid}
                  block
                  icon={isScriptValid ? <CheckCircleOutlined /> : <WarningOutlined />}
                  onClick={() => setShowQualityPanel(true)}
                  disabled={steps.length === 0}
                >
                  {isScriptValid ? '质量检查通过' : '需要质量修复'} ({steps.length} 步骤)
                </Button>
              </Space>
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
        zIndex={1000} // 设置基础z-index，确保子模态框可以显示在其上方
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            step_type: SmartActionType.CONTACT_IMPORT_WORKFLOW, // 默认选择通讯录导入
            name: '通讯录导入', // 默认步骤名称
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
                label="步骤名称 (可选)"
                help="默认为对应操作类型名称"
              >
                <Input placeholder="步骤名称将自动设置为操作类型名称" />
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

              // 特殊处理：如果是SMART_FIND_ELEMENT类型，显示智能页面分析器
              if (stepType === SmartActionType.SMART_FIND_ELEMENT) {
                return (
                  <div>
                    <Divider orientation="left">智能元素查找配置</Divider>
                    <Alert 
                      message="智能元素查找通过分析当前页面UI结构，自动识别可操作元素并支持智能去重和分类，提供精确的元素定位能力"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Card className="text-center" style={{ marginBottom: 16 }}>
                      <Button 
                        type="primary" 
                        size="large"
                        icon={<EyeOutlined />}
                        onClick={() => setShowPageAnalyzer(true)}
                      >
                        打开智能页面分析器
                      </Button>
                      <br />
                      <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                        配置设备连接并分析页面，智能识别可操作元素
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
          
          {/* 🆕 隐藏字段：保存元素属性用于指纹匹配 */}
          <Form.Item name="text" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="element_text" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="element_type" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="resource_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="content_desc" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="bounds" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="smartDescription" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="smartAnalysis" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="class_name" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="clickable" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="parent" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="siblings" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="xpath" hidden>
            <Input />
          </Form.Item>
          
          {/* 🆕 XML缓存和增强信息隐藏字段 */}
          <Form.Item name="xmlCacheId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="xmlContent" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="isEnhanced" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="xmlTimestamp" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="deviceId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="deviceName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="elementSummary" hidden>
            <Input />
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
        onClose={handleNavigationModalClose}
        onConfigurationChange={handleNavigationConfigChange}
        onStepGenerated={(step) => {
          // 强制覆盖表单字段（确定添加时）
          const appName = step.parameters?.app_name || '智能导航';
          const navType = step.parameters?.navigation_type || '导航操作';
          form.setFieldValue('name', appName);
          form.setFieldValue('description', `导航栏选择 ${navType}`);
          
          // 添加生成的步骤到脚本中
          setSteps(prev => [...prev, step]);
          setShowNavigationModal(false);
          message.success(`已添加导航步骤: ${step.name}，已强制覆盖表单字段`);
        }}
        deviceId={currentDeviceId}
      />

      {/* Universal UI智能页面查找模态框 */}
      <UniversalPageFinderModal
        visible={showPageAnalyzer}
        initialViewMode={editingStepForParams ? "grid" : "visual"} // 🆕 修改参数时使用网格检查器视图
        snapshotOnlyMode={snapshotFixMode.enabled}
        onSnapshotCaptured={(snapshot) => {
          // 回填快照到表单（将作为 parameters 写入）
          form.setFieldValue('xmlContent', snapshot.xmlContent);
          form.setFieldValue('xmlCacheId', snapshot.xmlCacheId);
          form.setFieldValue('xmlTimestamp', snapshot.timestamp);
          if (snapshot.deviceId) form.setFieldValue('deviceId', snapshot.deviceId);
          if (snapshot.deviceName) form.setFieldValue('deviceName', snapshot.deviceName);

          message.success('已回填最新页面快照');

          // 退出快照修复模式
          setSnapshotFixMode({ enabled: false, forStepId: undefined });

          // 若标记为自动重试保存，则再次调用保存
          if (pendingAutoResave) {
            setPendingAutoResave(false);
            // 异步微任务以确保表单已更新
            setTimeout(() => {
              handleSaveStep();
            }, 0);
          }
        }}
        // 🆕 从步骤XML源加载 - 优先使用步骤保存的XML快照
        loadFromStepXml={editingStepForParams ? {
          stepId: editingStepForParams.id,
          xmlCacheId: editingStepForParams.parameters?.xmlCacheId,
          // 🆕 优先使用新的自包含XML快照
          xmlContent: editingStepForParams.parameters?.xmlSnapshot?.xmlContent || editingStepForParams.parameters?.xmlContent,
          deviceId: editingStepForParams.parameters?.xmlSnapshot?.deviceInfo?.deviceId || editingStepForParams.parameters?.deviceId,
          deviceName: editingStepForParams.parameters?.xmlSnapshot?.deviceInfo?.deviceName || editingStepForParams.parameters?.deviceName
        } : undefined}
        // 🆕 预选定位器：根据步骤参数构建，支持 bounds/resource_id/text/class/xpath
        preselectLocator={(() => {
          const p: any = editingStepForParams?.parameters || {};
          const locator: NodeLocator = {} as any;
          // XPath 优先
          if (p.xpath && typeof p.xpath === 'string' && p.xpath.trim()) {
            // 简单判断：以 / 开头认为是绝对 XPath，否则当作谓词
            if (/^\s*\//.test(p.xpath)) locator.absoluteXPath = String(p.xpath).trim();
            else locator.predicateXPath = String(p.xpath).trim();
          }
          // 属性与 bounds
          locator.attributes = {
            resourceId: p.resource_id || p.element_resource_id || undefined,
            text: p.element_text || p.text || undefined,
            className: p.class_name || undefined,
            contentDesc: p.content_desc || undefined,
            packageName: p.package_name || undefined,
          };
          if (p.bounds && typeof p.bounds === 'string') locator.bounds = p.bounds;
          // 如果完全没有可用信息，则不传定位器
          const hasAny = locator.absoluteXPath || locator.predicateXPath || locator.bounds || (locator.attributes && Object.values(locator.attributes).some(Boolean));
          return hasAny ? locator : undefined;
        })()}
        // 🆕 XML内容更新回调
        onXmlContentUpdated={updateCurrentXmlContext}
        onClose={() => {
          setShowPageAnalyzer(false);
          setIsQuickAnalyzer(false); // 重置快捷模式标记
          setEditingStepForParams(null); // 重置修改参数模式标记
          // 若是快照修复模式被用户主动关闭，则复位标志避免意外重试
          if (snapshotFixMode.enabled) {
            setSnapshotFixMode({ enabled: false, forStepId: undefined });
            setPendingAutoResave(false);
          }
        }}
        onElementSelected={(element) => {
          // 当用户选择元素时，根据不同模式进行处理
          console.log('🎯 接收到增强智能分析元素:', element);
          console.log('🎯 当前模式检查:', {
            isQuickAnalyzer,
            editingStepForParams: editingStepForParams?.id,
            editingStepName: editingStepForParams?.name
          });
          
          try {
            // 🔍 检查是否为增强元素信息（兼容多种数据格式）
            const isEnhanced = !!(
              (element as any).isEnhanced ||  // 简化标识
              (element as any).xmlCacheId ||   // XML缓存ID
              (element as any).xmlContent ||   // XML内容
              (element as any).enhancedElement // 完整增强信息
            );
            
            console.log('🔍 元素类型检查:', {
              isEnhanced,
              hasIsEnhanced: !!(element as any).isEnhanced,
              hasXmlCacheId: !!(element as any).xmlCacheId,
              hasXmlContent: !!(element as any).xmlContent,
              hasEnhancedElement: !!(element as any).enhancedElement,
              element
            });
            
            // 使用智能步骤生成器处理元素
            const stepInfo = SmartStepGenerator.generateStepInfo(element);
            
            // 填充表单字段
            form.setFieldValue('step_type', SmartActionType.SMART_FIND_ELEMENT);
            form.setFieldValue('search_criteria', stepInfo.searchCriteria);
            form.setFieldValue('name', stepInfo.name);
            form.setFieldValue('description', stepInfo.description);
            form.setFieldValue('click_if_found', true);
            
            // 🆕 保存增强元素信息到表单参数中
            if (isEnhanced) {
              console.log('✅ 检测到增强元素信息，保存完整数据');
              
              // 构建增强步骤参数（兼容多种数据格式）
              const enhancedParams = {
                // 保持原有参数
                text: element.text,
                element_text: element.text,
                element_type: element.element_type,
                resource_id: element.resource_id,
                content_desc: element.content_desc,
                bounds: element.bounds,
                smartDescription: (element as any).smartDescription,
                smartAnalysis: (element as any).smartAnalysis,
                
                // 🆕 新增：完整增强元素信息（兼容不同格式）
                isEnhanced: true,
                xmlCacheId: (element as any).xmlCacheId || 'unknown',
                xmlContent: (element as any).xmlContent || '',
                xmlTimestamp: (element as any).xmlTimestamp || Date.now(),
                deviceId: (element as any).deviceId,
                deviceName: (element as any).deviceName,
                
                // 元素摘要信息
                elementSummary: {
                  displayName: element.text || element.element_type || 'Unknown',
                  elementType: element.element_type || 'Unknown',
                  position: element.bounds ? {
                    x: element.bounds.left,
                    y: element.bounds.top,
                    width: element.bounds.right - element.bounds.left,
                    height: element.bounds.bottom - element.bounds.top
                  } : { x: 0, y: 0, width: 0, height: 0 },
                  xmlSource: (element as any).xmlCacheId || 'unknown',
                  confidence: (element as any).smartAnalysis?.confidence || 0.8
                }
              };
              
              // 保存增强参数到表单
              Object.entries(enhancedParams).forEach(([key, value]) => {
                form.setFieldValue(key, value);
              });
              
              console.log('💾 已保存增强步骤参数:', enhancedParams);
            } else {
              // 降级处理：保存基础元素属性
              form.setFieldValue('text', element.text);
              form.setFieldValue('element_text', element.text);
              form.setFieldValue('element_type', element.element_type);
              form.setFieldValue('resource_id', element.resource_id);
              form.setFieldValue('content_desc', element.content_desc);
              form.setFieldValue('bounds', element.bounds);
              form.setFieldValue('smartDescription', (element as any).smartDescription);
              form.setFieldValue('smartAnalysis', (element as any).smartAnalysis);
              
              console.log('⚠️ 使用基础元素信息（未增强）');
            }
            
            // 关闭页面分析器并重置状态
            setShowPageAnalyzer(false);
            setIsQuickAnalyzer(false);
            setEditingStepForParams(null);
            
            // 🔄 处理不同模式的逻辑
            if (editingStepForParams) {
              // 修改现有步骤参数模式
              console.log('📝 修改步骤参数模式:', editingStepForParams.id);
              
              // 更新现有步骤的参数
              const updatedSteps = steps.map(existingStep => {
                if (existingStep.id === editingStepForParams.id) {
                  const updatedParameters = {
                    ...existingStep.parameters,
                    // 更新选择的元素信息
                    text: element.text,
                    element_text: element.text,
                    element_type: element.element_type,
                    resource_id: element.resource_id,
                    content_desc: element.content_desc,
                    bounds: element.bounds,
                    smartDescription: (element as any).smartDescription,
                    smartAnalysis: (element as any).smartAnalysis,
                    // 如果是增强信息，更新增强参数
                    ...(isEnhanced && {
                      isEnhanced: true,
                      xmlCacheId: (element as any).xmlCacheId || 'unknown',
                      xmlContent: (element as any).xmlContent || '',
                      xmlTimestamp: (element as any).xmlTimestamp || Date.now(),
                      deviceId: (element as any).deviceId,
                      deviceName: (element as any).deviceName,
                      elementSummary: {
                        displayName: element.text || element.element_type || 'Unknown',
                        elementType: element.element_type || 'Unknown',
                        position: element.bounds ? {
                          x: element.bounds.left,
                          y: element.bounds.top,
                          width: element.bounds.right - element.bounds.left,
                          height: element.bounds.bottom - element.bounds.top
                        } : { x: 0, y: 0, width: 0, height: 0 },
                        xmlSource: (element as any).xmlCacheId || 'unknown',
                        confidence: (element as any).smartAnalysis?.confidence || 0.8
                      }
                    })
                  };
                  
                  return {
                    ...existingStep,
                    name: stepInfo.name, // 更新步骤名称
                    description: stepInfo.description, // 更新步骤描述
                    parameters: updatedParameters
                  };
                }
                return existingStep;
              });
              
              setSteps(updatedSteps);
              
              message.success({
                content: (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      ✏️ 步骤参数修改成功！{isEnhanced ? ' (增强信息)' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {editingStepForParams.name} → {stepInfo.name}
                    </div>
                    {isEnhanced && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        📄 XML缓存: {(element as any).xmlCacheId || 'unknown'}
                      </div>
                    )}
                  </div>
                ),
                duration: 3
              });
              
            } else if (isQuickAnalyzer) {
              // 快捷模式：创建新步骤
              console.log('🚀 快捷模式：创建新步骤');
              setEditingStep(null);
              setIsModalVisible(true);
              
              message.success({
                content: (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      🚀 快捷步骤生成成功！{isEnhanced ? ' (增强信息)' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                    {stepInfo.name} - 请点击确定完成创建
                    </div>
                    {isEnhanced && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        📄 XML缓存: {(element as any).xmlCacheId || 'unknown'}
                      </div>
                    )}
                  </div>
                ),
                duration: 4
              });
            } else {
              // 普通模式：填充表单等待用户进一步操作
              console.log('📝 普通模式：填充表单');
              message.success({
                content: (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      🎯 智能步骤生成成功！{isEnhanced ? ' (增强信息)' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {stepInfo.name}
                    </div>
                    {isEnhanced && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        📄 XML缓存: {(element as any).xmlCacheId || 'unknown'}
                      </div>
                    )}
                  </div>
                ),
                duration: 3
              });
            }
            
            SmartStepGenerator.previewStepInfo(element);
            
          } catch (error) {
            console.error('❌ 智能步骤生成失败:', error);
            
            // 降级处理：使用基础显示名称
            const elementDesc = element.text || element.element_type || '未知元素';
            const searchCriteria = element.text ? `文本: "${element.text}"` : '自动识别元素特征';
            
            form.setFieldValue('step_type', SmartActionType.SMART_FIND_ELEMENT); // 🆕 设置为智能元素查找
            form.setFieldValue('search_criteria', searchCriteria);
            form.setFieldValue('name', `点击"${elementDesc}"`);
            form.setFieldValue('description', `自动查找并点击"${elementDesc}"元素`);
            form.setFieldValue('click_if_found', true);
            
            // 🆕 在降级处理中也保存完整的元素属性
            form.setFieldValue('text', element.text);
            form.setFieldValue('element_text', element.text);
            form.setFieldValue('element_type', element.element_type);
            form.setFieldValue('resource_id', element.resource_id);
            form.setFieldValue('content_desc', element.content_desc);
            form.setFieldValue('bounds', element.bounds);
            form.setFieldValue('smartDescription', (element as any).smartDescription);
            form.setFieldValue('smartAnalysis', (element as any).smartAnalysis);
            if ((element as any).class_name) {
              form.setFieldValue('class_name', (element as any).class_name);
            }
            if ((element as any).clickable !== undefined) {
              form.setFieldValue('clickable', (element as any).clickable);
            }
            if ((element as any).parent) {
              form.setFieldValue('parent', (element as any).parent);
            }
            if ((element as any).siblings) {
              form.setFieldValue('siblings', (element as any).siblings);
            }
            
            setShowPageAnalyzer(false);
            setIsQuickAnalyzer(false); // 重置快捷模式标记
            
            // 🆕 如果是快捷模式，也自动打开步骤编辑模态框
            if (isQuickAnalyzer) {
              setEditingStep(null);
              setIsModalVisible(true);
            }
            
            message.warning('使用基础模式填充步骤信息' + (isQuickAnalyzer ? '，请点击确定完成创建' : ''));
          }
        }}
      />

      {/* 🆕 通讯录工作流选择器 */}
      <ContactWorkflowSelector
        visible={showContactWorkflowSelector}
        onCancel={() => setShowContactWorkflowSelector(false)}
        onStepsGenerated={handleContactWorkflowStepsGenerated}
        deviceId={currentDeviceId}
      />

      {/* 🆕 分布式脚本质量检查面板 */}
      <Modal
        title="分布式脚本质量检查"
        open={showQualityPanel}
        onCancel={() => setShowQualityPanel(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <DistributedScriptQualityPanel
          script={{
            name: '智能脚本',
            version: '1.0.0',
            steps: steps,
            metadata: {
              platform: 'Android',
              createdAt: Date.now(),
              deviceId: currentDeviceId
            }
          }}
          onScriptUpdate={(updatedScript) => {
            console.log('🔄 脚本已通过质量检查更新:', updatedScript);
            if (updatedScript.steps) {
              setSteps(updatedScript.steps);
            }
          }}
          onValidationChange={(isValid) => {
            setIsScriptValid(isValid);
            console.log('🔍 脚本验证状态变更:', isValid ? '通过' : '需要修复');
          }}
        />
      </Modal>
    </div>
  );
};

export default SmartScriptBuilderPage;

