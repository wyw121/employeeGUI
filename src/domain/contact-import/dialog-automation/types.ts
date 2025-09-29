/**
 * 对话框检测器类型定义
 * 定义联系人导入过程中需要处理的对话框类型和检测规则
 */

// 对话框类型枚举
export enum DialogType {
  APP_SELECTION = 'app_selection',     // 应用选择对话框（仅此一次/始终）
  VCARD_CONFIRMATION = 'vcard_confirmation'  // vCard确认对话框（确定/取消）
}

// 目标按钮类型
export enum TargetButton {
  JUST_ONCE = 'just_once',    // 仅此一次
  ALWAYS = 'always',          // 始终
  CONFIRM = 'confirm',        // 确定
  CANCEL = 'cancel'           // 取消
}

// UI元素识别规则
export interface ElementPattern {
  text?: string[];            // 文本匹配规则（支持多个候选）
  textRegex?: RegExp[];       // 正则表达式匹配
  resourceId?: string[];      // 资源ID匹配
  className?: string[];       // 类名匹配
  contentDesc?: string[];     // 内容描述匹配
  bounds?: string;            // 坐标范围（可选）
}

// 对话框检测规则
export interface DialogDetectionRule {
  type: DialogType;
  requiredElements: ElementPattern[];  // 必须存在的元素
  targetButton: TargetButton;         // 要点击的目标按钮
  buttonPattern: ElementPattern;       // 目标按钮的识别规则
  priority: number;                   // 优先级（越高越优先）
  timeout: number;                    // 检测超时时间（毫秒）
}

// 检测结果
export interface DialogDetectionResult {
  found: boolean;
  type?: DialogType;
  targetElement?: UIElement;
  confidence: number;         // 置信度 0-1
  message: string;
}

// UI元素信息
export interface UIElement {
  text: string;
  resourceId: string;
  className: string;
  contentDesc: string;
  bounds: string;
  clickable: boolean;
  enabled: boolean;
}

// 点击结果
export interface ClickResult {
  success: boolean;
  element?: UIElement;
  error?: string;
  timestamp: number;
}

// 并行处理配置
export interface ParallelProcessingConfig {
  maxConcurrentTasks: number;    // 最大并发任务数
  retryAttempts: number;         // 重试次数
  retryDelay: number;           // 重试间隔（毫秒）
  totalTimeout: number;         // 总超时时间（毫秒）
  successCondition: 'any' | 'all' | 'specific'; // 成功条件
  requiredSuccessTypes?: DialogType[]; // 必须成功的对话框类型
}

// 自动化处理结果
export interface AutomationResult {
  success: boolean;
  processedDialogs: DialogType[];
  clickResults: ClickResult[];
  totalTime: number;
  error?: string;
}