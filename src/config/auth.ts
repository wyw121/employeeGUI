/**
 * 认证配置
 * 管理与Flow_Farm服务器的连接配置
 */

// 开发环境配置
const DEVELOPMENT_CONFIG = {
  SERVER_BASE_URL: 'http://localhost:8000/api',
  API_TIMEOUT: 10000,
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分钟前刷新token
  AUTO_LOGOUT_AFTER: 24 * 60 * 60 * 1000, // 24小时后自动登出
};

// 生产环境配置
const PRODUCTION_CONFIG = {
  SERVER_BASE_URL: 'https://your-flow-farm-domain.com/api',
  API_TIMEOUT: 15000,
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
  AUTO_LOGOUT_AFTER: 8 * 60 * 60 * 1000, // 8小时后自动登出
};

// 根据环境选择配置
const isDevelopment = process.env.NODE_ENV === 'development';

export const AUTH_CONFIG = isDevelopment ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;

/**
 * API端点配置
 */
export const API_ENDPOINTS = {
  // 认证相关
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  GET_CURRENT_USER: '/auth/me',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // 用户管理
  GET_USERS: '/users',
  CREATE_USER: '/users',
  UPDATE_USER: '/users',
  DELETE_USER: '/users',
  
  // 设备管理
  GET_DEVICES: '/devices',
  UPDATE_DEVICE: '/devices',
  
  // 任务管理
  GET_TASKS: '/tasks',
  CREATE_TASK: '/tasks',
  UPDATE_TASK: '/tasks',
  DELETE_TASK: '/tasks',
  
  // 统计数据
  GET_STATISTICS: '/statistics',
  GET_REPORTS: '/reports',
  
  // 系统配置
  GET_SETTINGS: '/settings',
  UPDATE_SETTINGS: '/settings',
} as const;

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  EMPLOYEE_INFO: 'employee',
  REMEMBER_LOGIN: 'rememberLogin',
  LAST_LOGIN_USERNAME: 'lastLoginUsername',
  APP_SETTINGS: 'appSettings',
} as const;

/**
 * 错误消息配置
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '您没有权限执行此操作',
  SERVER_ERROR: '服务器内部错误，请稍后重试',
  INVALID_CREDENTIALS: '用户名或密码错误',
  ACCOUNT_DISABLED: '账户已被禁用，请联系管理员',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  PASSWORD_WEAK: '密码强度不够，请使用更强的密码',
  USERNAME_EXISTS: '用户名已存在',
  EMAIL_EXISTS: '邮箱地址已被使用',
} as const;

export default {
  AUTH_CONFIG,
  API_ENDPOINTS,
  STORAGE_KEYS,
  ERROR_MESSAGES,
};
