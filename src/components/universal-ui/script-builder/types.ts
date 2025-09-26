// Script Builder 类型定义 (初始骨架)
// 后续会从现有大文件迁入真实类型。

export interface ScriptStepParameters {
  [key: string]: unknown;
}

export interface ScriptStep {
  id: string;
  type: string;            // 具体执行类型 e.g. 'tap', 'open_app'
  name?: string;           // 展示名称
  description?: string;    // 描述
  order: number;           // 顺序(1-based 或 0-based 按现有实现继续保持)
  disabled?: boolean;      // 是否禁用
  parameters: ScriptStepParameters;
  parent_loop_id?: string; // 若在循环内
  step_type?: string;      // 兼容历史字段
}

export interface ScriptBuilderState {
  steps: ScriptStep[];
  activeStepId: string | null;
}

export interface ReorderPayload {
  fromIndex: number;
  toIndex: number;
}

export type ScriptValidationIssue = {
  stepId: string;
  level: 'error' | 'warning';
  message: string;
};

export interface ScriptValidationResult {
  issues: ScriptValidationIssue[];
  isValid: boolean;
}
