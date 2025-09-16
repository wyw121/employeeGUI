/**
 * 员工认证相关的类型定义
 */

// 员工用户信息
export interface Employee {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatar?: string;
  role: EmployeeRole;
  department?: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

// 员工角色
export type EmployeeRole =
  | 'admin'        // 管理员
  | 'supervisor'   // 主管
  | 'operator'     // 操作员
  | 'viewer';      // 查看者

// 权限定义
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: PermissionResource;
  actions: PermissionAction[];
}

// 权限资源
export type PermissionResource =
  | 'devices'      // 设备管理
  | 'tasks'        // 任务管理
  | 'contacts'     // 通讯录管理
  | 'statistics'   // 统计查看
  | 'users'        // 用户管理
  | 'settings'     // 系统设置
  | 'logs';        // 日志查看

// 权限动作
export type PermissionAction =
  | 'read'         // 查看
  | 'create'       // 创建
  | 'update'       // 更新
  | 'delete'       // 删除
  | 'execute';     // 执行

// 登录凭证
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  token?: string;
  employee?: Employee;
  error?: string;
  expiresAt?: Date;
}

// 会话信息
export interface SessionInfo {
  token: string;
  employee: Employee;
  expiresAt: Date;
  issuedAt: Date;
  lastActivity: Date;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  employee?: Employee;
  token?: string;
  error?: string;
}

// 密码重置
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

// 员工注册（管理员功能）
export interface EmployeeRegistration {
  username: string;
  email: string;
  displayName: string;
  password: string;
  role: EmployeeRole;
  department?: string;
  permissions: string[]; // permission IDs
}

// 操作日志
export interface AuditLog {
  id: string;
  employeeId: string;
  employeeName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

