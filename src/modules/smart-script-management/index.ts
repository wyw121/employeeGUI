// 智能脚本管理模块 - 统一入口

// 导出类型定义
export * from './types';

// 导出服务
export * from './services/scriptService';

// 导出工具函数
export * from './utils/serializer';

// 导出React Hooks
export * from './hooks/useScriptManager';

// 导出UI组件
export { default as ScriptManager } from './components/ScriptManager';

// 导出主要接口
export type {
  SmartScript,
  SmartScriptStep,
  ScriptListItem,
  ScriptExecutionResult,
  ScriptTemplate,
  ScriptConfig,
  StepActionType,
  StepParams
} from './types';