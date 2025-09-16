// 智能脚本相关类型定义
export interface SmartScriptStep {
  id: string;
  step_type: any; // 兼容 SmartActionType 和 string
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
  // 扩展字段以支持智能功能
  find_condition?: any;
  verification?: any;
  retry_config?: any;
  fallback_actions?: SmartScriptStep[];
  pre_conditions?: string[];
  post_conditions?: string[];
}

export interface SingleStepTestResult {
  success: boolean;
  step_id: string;
  step_name: string;
  message: string;
  duration_ms: number;
  timestamp: number;
  page_state?: string;
  ui_elements: any[];
  logs: string[];
  error_details?: string;
  extracted_data: Record<string, any>;
}

export interface SmartExecutionResult {
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