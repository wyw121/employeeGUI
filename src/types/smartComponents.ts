// 智能应用管理相关类型定义

export interface AppInfo {
  package_name: string;      // 包名
  app_name: string;          // 显示名称
  version_name?: string;     // 版本名
  version_code?: string;     // 版本号
  is_system_app: boolean;    // 是否系统应用
  is_enabled: boolean;       // 是否启用
  main_activity?: string;    // 主Activity
  icon_path?: string;        // 图标路径
}

export interface AppLaunchResult {
  success: boolean;
  message: string;
  package_name: string;
  launch_time_ms: number;
}

// 智能组件的基础配置
export interface SmartComponentBase {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'basic' | 'smart' | 'app' | 'system';
}

// "打开应用"组件的配置参数
export interface LaunchAppComponentParams {
  app_selection_method: 'manual' | 'auto_detect' | 'popular';
  selected_app?: AppInfo;
  package_name?: string;
  wait_after_launch: number;
  verify_launch: boolean;
  fallback_method: 'retry' | 'ignore' | 'error';
  max_retry_count: number;
}

// "打开应用"智能组件配置
export const LAUNCH_APP_COMPONENT: SmartComponentBase & {
  parameters: Array<{
    key: keyof LaunchAppComponentParams;
    label: string;
    type: 'select' | 'app_selector' | 'number' | 'boolean';
    required?: boolean;
    default?: any;
    options?: string[];
    description?: string;
  }>;
} = {
  id: 'launch_app',
  name: '打开应用',
  description: '智能选择并启动设备上的应用程序',
  icon: '🚀',
  color: 'cyan',
  category: 'app',
  parameters: [
    {
      key: 'app_selection_method',
      label: '应用选择方式',
      type: 'select',
      required: true,
      default: 'manual',
      options: ['manual', 'auto_detect', 'popular'],
      description: 'manual: 手动选择; auto_detect: 自动检测设备应用; popular: 从常用应用中选择'
    },
    {
      key: 'selected_app',
      label: '选择应用',
      type: 'app_selector',
      required: true,
      description: '从设备应用列表中选择要启动的应用'
    },
    {
      key: 'wait_after_launch',
      label: '启动后等待时间(ms)',
      type: 'number',
      default: 3000,
      description: '启动应用后等待的时间，确保应用完全加载'
    },
    {
      key: 'verify_launch',
      label: '验证启动成功',
      type: 'boolean',
      default: true,
      description: '启动后检查应用是否成功运行'
    },
    {
      key: 'fallback_method',
      label: '失败后操作',
      type: 'select',
      default: 'retry',
      options: ['retry', 'ignore', 'error'],
      description: 'retry: 重试启动; ignore: 忽略继续; error: 报错停止'
    },
    {
      key: 'max_retry_count',
      label: '最大重试次数',
      type: 'number',
      default: 3,
      description: '启动失败时的最大重试次数'
    }
  ]
};

// 扩展现有的智能操作类型
export enum SmartActionType {
  // 基础操作
  TAP = 'tap',
  SWIPE = 'swipe', 
  INPUT = 'input',
  WAIT = 'wait',
  
  // 智能操作
  SMART_TAP = 'smart_tap',
  SMART_FIND_ELEMENT = 'smart_find_element',
  BATCH_MATCH = 'batch_match', // 批量匹配 - 动态元素查找
  RECOGNIZE_PAGE = 'recognize_page',
  VERIFY_ACTION = 'verify_action',
  SMART_LOOP = 'smart_loop',
  CONDITIONAL_ACTION = 'conditional_action',
  WAIT_FOR_PAGE_STATE = 'wait_for_page_state',
  EXTRACT_ELEMENT = 'extract_element',
  SMART_NAVIGATION = 'smart_navigation',
  
  // 循环控制操作
  LOOP_START = 'loop_start',
  LOOP_END = 'loop_end',
  
  // 应用操作
  LAUNCH_APP = 'launch_app',
  CLOSE_APP = 'close_app',
  SWITCH_APP = 'switch_app',
  
  // 通讯录自动化操作 - 新增
  CONTACT_IMPORT_WORKFLOW = 'contact_import_workflow',
  CONTACT_GENERATE_VCF = 'contact_generate_vcf',
  CONTACT_IMPORT_TO_DEVICE = 'contact_import_to_device',
  CONTACT_DELETE_IMPORTED = 'contact_delete_imported',
  CONTACT_BACKUP_EXISTING = 'contact_backup_existing',
  
  // 复合操作
  COMPLETE_WORKFLOW = 'complete_workflow',
}