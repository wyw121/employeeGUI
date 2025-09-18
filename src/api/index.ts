// 旧的员工API（保留）
export * from './employeeAPI';
export { default as EmployeeAPI } from './employeeAPI';

// 新的业务API
export * from './ContactAPI';
export { AdbAPI, ContactAPI } from './ContactAPI';
export * from './deviceAPI';
export { default as DeviceAPI } from './deviceAPI';
export * from './taskAPI';
export { BalanceAPI, StatisticsAPI, default as TaskAPI } from './taskAPI';

// 页面分析API
// 删除已不存在的 pageAnalysisAPI 模块导出

