// 旧的员工API（保留）
export { default as EmployeeAPI } from './employeeAPI';
export * from './employeeAPI';

// 新的业务API
export { default as DeviceAPI } from './deviceAPI';
export { default as TaskAPI, BalanceAPI, StatisticsAPI } from './taskAPI';
export { ContactAPI, AdbAPI } from './ContactAPI';
export * from './deviceAPI';
export * from './taskAPI';
export * from './ContactAPI';
