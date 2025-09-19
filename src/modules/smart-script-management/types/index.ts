// 智能脚本管理模块 - 类型定义

/**
 * 步骤类型枚举
 */
export enum StepActionType {
  TAP = 'tap',
  INPUT = 'input', 
  WAIT = 'wait',
  SMART_TAP = 'smart_tap',
  SMART_FIND_ELEMENT = 'smart_find_element',
  RECOGNIZE_PAGE = 'recognize_page',
  LAUNCH_APP = 'launch_app',
  NAVIGATION = 'navigation',
  SCREENSHOT = 'screenshot',
  SWIPE = 'swipe',
  VERIFY = 'verify'
}

/**
 * 步骤状态
 */
export enum StepStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * 步骤参数基础接口
 */
export interface BaseStepParams {
  timeout_ms?: number;
  retry_count?: number;
  screenshot_on_error?: boolean;
  verification_enabled?: boolean;
  description?: string;
}

/**
 * 点击步骤参数
 */
export interface TapStepParams extends BaseStepParams {
  x: number;
  y: number;
  hold_duration_ms?: number;
}

/**
 * 输入步骤参数
 */
export interface InputStepParams extends BaseStepParams {
  x: number;
  y: number;
  text: string;
  clear_before_input?: boolean;
}

/**
 * 等待步骤参数
 */
export interface WaitStepParams extends BaseStepParams {
  duration_ms: number;
  wait_for_element?: string;
}

/**
 * 智能点击步骤参数
 */
export interface SmartTapStepParams extends BaseStepParams {
  element_description: string;
  fallback_coordinates?: { x: number; y: number };
  search_area?: { x: number; y: number; width: number; height: number };
}

/**
 * 智能查找元素步骤参数
 */
export interface SmartFindElementStepParams extends BaseStepParams {
  element_description: string;
  find_multiple?: boolean;
  return_coordinates?: boolean;
}

/**
 * 页面识别步骤参数
 */
export interface RecognizePageStepParams extends BaseStepParams {
  expected_page: string;
  confidence_threshold?: number;
}

/**
 * 启动应用步骤参数  
 */
export interface LaunchAppStepParams extends BaseStepParams {
  package_name: string;
  activity_name?: string;
  wait_for_launch?: boolean;
}

/**
 * 导航步骤参数
 */
export interface NavigationStepParams extends BaseStepParams {
  navigation_type: string;
  target_page: string;
  method: 'click' | 'swipe' | 'key';
}

/**
 * 步骤参数联合类型
 */
export type StepParams = 
  | TapStepParams
  | InputStepParams
  | WaitStepParams
  | SmartTapStepParams
  | SmartFindElementStepParams
  | RecognizePageStepParams
  | LaunchAppStepParams
  | NavigationStepParams;

/**
 * 完整步骤定义
 */
export interface SmartScriptStep {
  // 基础标识
  id: string;
  step_type: StepActionType;
  name: string;
  description: string;
  
  // 步骤参数
  parameters: StepParams;
  
  // 执行控制
  enabled: boolean;
  order: number;
  status?: StepStatus;
  
  // 扩展功能
  conditions?: {
    pre_conditions?: string[];
    post_conditions?: string[];
    verification_rules?: Array<{
      type: 'element_exists' | 'text_contains' | 'page_state';
      rule: string;
      expected: any;
    }>;
  };
  
  // 错误处理
  error_handling?: {
    retry_on_failure?: boolean;
    fallback_steps?: SmartScriptStep[];
    continue_on_error?: boolean;
  };
  
  // UI状态保存
  ui_state?: {
    collapsed?: boolean;
    edited_at?: string;
    notes?: string;
  };
}

/**
 * 脚本配置
 */
export interface ScriptConfig {
  // 执行控制
  continue_on_error: boolean;
  auto_verification_enabled: boolean;
  smart_recovery_enabled: boolean;
  detailed_logging: boolean;
  
  // 时间设置
  default_timeout_ms: number;
  default_retry_count: number;
  
  // 功能开关
  page_recognition_enabled: boolean;
  screenshot_on_error: boolean;
  
  // 高级设置
  parallel_execution?: boolean;
  execution_delay_ms?: number;
  device_specific?: boolean;
}

/**
 * 完整脚本定义
 */
export interface SmartScript {
  // 基础信息
  id: string;
  name: string;
  description: string;
  version: string;
  
  // 时间戳
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  
  // 作者信息
  author: string;
  category: string;
  tags: string[];
  
  // 脚本内容
  steps: SmartScriptStep[];
  config: ScriptConfig;
  
  // 元数据
  metadata: {
    execution_count?: number;
    success_rate?: number;
    average_duration_ms?: number;
    target_devices?: string[];
    dependencies?: string[];
    [key: string]: any;
  };
}

/**
 * 脚本执行结果
 */
export interface ScriptExecutionResult {
  success: boolean;
  script_id: string;
  execution_id: string;
  
  // 统计信息
  total_steps: number;
  executed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  
  // 时间信息
  start_time: string;
  end_time: string;
  duration_ms: number;
  
  // 详细结果
  step_results: Array<{
    step_id: string;
    success: boolean;
    duration_ms: number;
    message: string;
    error_details?: string;
    screenshots?: string[];
  }>;
  
  // 提取数据
  extracted_data: Record<string, any>;
  
  // 日志
  logs: string[];
  final_page_state?: string;
  message: string;
}

/**
 * 脚本模板
 */
export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  template_steps: Omit<SmartScriptStep, 'id' | 'order'>[];
  default_config: ScriptConfig;
  preview_image?: string;
}

/**
 * 脚本列表项
 */
export interface ScriptListItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  step_count: number;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  success_rate: number;
}

/**
 * 脚本导入/导出格式
 */
export interface ScriptExportData {
  version: string;
  exported_at: string;
  scripts: SmartScript[];
  templates?: ScriptTemplate[];
}