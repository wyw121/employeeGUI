// 循环控制模块 - 类型定义

// 由于类型路径问题，先定义基础SmartScriptStep类型
export interface SmartScriptStep {
  id: string;
  step_type: string;
  name: string;
  description: string;
  parameters: any;
  enabled: boolean;
  order: number;
  status?: string;
  conditions?: any;
  error_handling?: any;
  ui_state?: any;
}

/**
 * 循环类型枚举
 */
export enum LoopType {
  /** 固定次数循环 */
  FOR = 'for',
  /** 条件循环 */
  WHILE = 'while', 
  /** 无限循环 */
  INFINITE = 'infinite'
}

/**
 * 循环条件类型
 */
export enum LoopConditionType {
  /** 元素存在 */
  ELEMENT_EXISTS = 'element_exists',
  /** 元素不存在 */
  ELEMENT_NOT_EXISTS = 'element_not_exists',
  /** 页面变化 */
  PAGE_CHANGED = 'page_changed',
  /** 自定义条件 */
  CUSTOM = 'custom'
}

/**
 * 循环条件配置
 */
export interface LoopCondition {
  type: LoopConditionType;
  /** 元素描述（用于元素存在检查） */
  elementDescription?: string;
  /** 页面识别（用于页面变化检查） */
  pageIdentifier?: string;
  /** 自定义JavaScript表达式 */
  customExpression?: string;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
}

/**
 * 循环配置
 */
export interface LoopConfig {
  /** 循环类型 */
  type: LoopType;
  /** 循环次数（FOR类型使用） */
  count?: number;
  /** 循环条件（WHILE类型使用） */
  condition?: LoopCondition;
  /** 最大循环次数（防止无限循环） */
  maxIterations?: number;
  /** 循环间隔（毫秒） */
  intervalMs?: number;
  /** 出错时是否继续循环 */
  continueOnError?: boolean;
  /** 循环变量名（可用于步骤参数中） */
  variableName?: string;
}

/**
 * 循环步骤参数
 */
export interface LoopStepParams {
  /** 循环配置 */
  config: LoopConfig;
  /** 循环描述 */
  description?: string;
  /** 是否折叠显示 */
  collapsed?: boolean;
}

/**
 * 扩展步骤类型 - 包含循环控制
 */
export enum ExtendedStepActionType {
  // 继承原有类型
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
  VERIFY = 'verify',
  
  // 新增循环控制类型
  /** 循环开始 */
  LOOP_START = 'loop_start',
  /** 循环结束 */
  LOOP_END = 'loop_end'
}

/**
 * 扩展的智能脚本步骤 - 支持循环结构
 */
export interface ExtendedSmartScriptStep extends Omit<SmartScriptStep, 'step_type'> {
  step_type: ExtendedStepActionType;
  /** 循环ID（用于匹配循环开始和结束） */
  loopId?: string;
  /** 循环层级 */
  loopLevel?: number;
  /** 是否在循环内部 */
  inLoop?: boolean;
  /** 父循环ID */
  parentLoopId?: string;
}

/**
 * 循环执行状态
 */
export interface LoopExecutionState {
  /** 循环ID */
  loopId: string;
  /** 当前迭代次数 */
  currentIteration: number;
  /** 循环配置 */
  config: LoopConfig;
  /** 循环开始步骤索引 */
  startIndex: number;
  /** 循环结束步骤索引 */
  endIndex: number;
  /** 循环内的步骤 */
  steps: ExtendedSmartScriptStep[];
  /** 循环变量值 */
  variables: Record<string, any>;
  /** 是否应该继续循环 */
  shouldContinue: boolean;
}

/**
 * 循环执行结果
 */
export interface LoopExecutionResult {
  /** 循环ID */
  loopId: string;
  /** 总执行次数 */
  totalIterations: number;
  /** 成功次数 */
  successIterations: number;
  /** 失败次数 */
  failedIterations: number;
  /** 执行时间 */
  executionTimeMs: number;
  /** 是否成功完成 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 步骤容器类型 - 用于拖拽排序
 */
export type StepContainer = 'main' | 'loop';

/**
 * 拖拽项目数据
 */
export interface DragItem {
  /** 步骤ID */
  stepId: string;
  /** 源容器 */
  sourceContainer: StepContainer;
  /** 源索引 */
  sourceIndex: number;
  /** 循环ID（如果在循环中） */
  loopId?: string;
}

// 已通过 export enum 直接导出，无需额外导出语句