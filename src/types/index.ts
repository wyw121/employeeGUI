export * from './Employee';

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
