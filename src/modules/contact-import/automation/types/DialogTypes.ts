/**
 * 联系人导入自动化对话框类型定义
 * 
 * 基于XML分析结果定义的对话框检测和处理类型
 */

/**
 * 对话框类型枚举
 */
export enum DialogType {
  APP_SELECTOR = 'app_selector',      // 应用选择器对话框
  VCARD_CONFIRM = 'vcard_confirm'     // vCard确认对话框
}

/**
 * 对话框检测结果接口
 */
export interface DialogDetectionResult {
  detected: boolean;
  type: DialogType;
  targetElement?: ElementMatch;
  confidence: number;  // 检测置信度 0-1
  message?: string;
}

/**
 * 元素匹配结果
 */
export interface ElementMatch {
  resourceId: string;
  text: string;
  bounds: string;
  className: string;
  clickable: boolean;
}

/**
 * 应用选择器对话框特征
 * 基于 ui_dump_...090341.xml 分析
 */
export interface AppSelectorDialog {
  titleText: string;                    // "使用以下方式打开"
  package: string;                      // "com.hihonor.android.internal.app"
  onceButtonId: string;                 // "android:id/button_once"
  alwaysButtonId: string;               // "android:id/button_always"
  targetButtonText: string;             // "仅此一次"
}

/**
 * vCard确认对话框特征
 * 基于 ui_dump_...090516.xml 分析
 */
export interface VCardConfirmDialog {
  messageText: string;                  // "是否从 vCard 导入联系人？"
  package: string;                      // "com.hihonor.contacts"
  confirmButtonId: string;              // "android:id/button1"
  cancelButtonId: string;               // "android:id/button2"
  targetButtonText: string;             // "确定"
}

/**
 * 对话框检测配置
 */
export interface DialogDetectionConfig {
  appSelector: AppSelectorDialog;
  vCardConfirm: VCardConfirmDialog;
  timeout: number;                      // 检测超时时间(ms)
  retryInterval: number;                // 重试间隔(ms)
  maxRetries: number;                   // 最大重试次数
}

/**
 * 点击操作结果
 */
export interface ClickResult {
  success: boolean;
  dialogType: DialogType;
  elementClicked: ElementMatch;
  timestamp: number;
  message?: string;
  error?: string;
}

/**
 * 自动化执行结果
 */
export interface AutomationResult {
  success: boolean;
  completedDialogs: ClickResult[];
  totalAttempts: number;
  duration: number;                     // 执行时长(ms)
  vCardConfirmed: boolean;              // 关键指标：是否成功点击vCard确定
  message: string;
}

/**
 * 默认配置常量
 */
export const DEFAULT_DIALOG_CONFIG: DialogDetectionConfig = {
  appSelector: {
    titleText: "使用以下方式打开",
    package: "com.hihonor.android.internal.app",
    onceButtonId: "android:id/button_once",
    alwaysButtonId: "android:id/button_always",
    targetButtonText: "仅此一次"
  },
  vCardConfirm: {
    messageText: "vCard",  // 模糊匹配，不区分大小写
    package: "com.hihonor.contacts",
    confirmButtonId: "android:id/button1",
    cancelButtonId: "android:id/button2",
    targetButtonText: "确定"
  },
  timeout: 10000,        // 10秒超时
  retryInterval: 500,    // 500ms重试间隔
  maxRetries: 20         // 最多20次重试
};