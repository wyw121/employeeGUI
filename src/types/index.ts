export * from './Auth';
export * from './Contact';
// 从Employee.ts导出，避免与Auth.ts中的Employee冲突
export type { 
  Employee as EmployeeData,
  EmployeeFormData,
  Device,
  ContactTask as EmployeeContactTask,
  TaskProgress, 
  TaskStatus, 
  TaskType,
  Platform,
  FollowStatistics,
  UserBalance,
  PreciseAcquisitionTask
} from './Employee';

// 页面分析相关类型
// 删除已不存在的 pageAnalysis 模块导出

