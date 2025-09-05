export * from './Employee';
export * from './Contact';
export * from './Auth';

// 重新导出为更合适的名称
export type {
  Device,
  Platform,
  TaskType,
  TaskStatus,
  ContactTask,
  PreciseAcquisitionTask,
  UserBalance,
  FollowStatistics,
  TaskProgress
} from './Employee';
