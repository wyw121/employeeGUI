import { invoke } from '@tauri-apps/api/core';
import { Employee, LoginCredentials, LoginResponse } from '../types';

/**
 * 认证服务类
 * 处理与Flow_Farm管理服务器的认证通信
 */
export class AuthService {
  private static readonly SERVER_BASE_URL = 'http://localhost:8000/api/v1';

  /**
   * 员工登录
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // 在Tauri环境中，通过Rust后端调用管理服务器
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const response = await invoke<LoginResponse>('employee_login', {
          serverUrl: this.SERVER_BASE_URL,
          username: credentials.username,
          password: credentials.password
        });
        return response;
      } else {
        // Web环境下，直接调用API（开发测试用）
        const response = await fetch(`${this.SERVER_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          throw new Error('网络请求失败');
        }

        const data = await response.json();

        if (data.success) {
          return {
            success: true,
            token: data.data.token,
            employee: this.mapServerUserToEmployee(data.data.user),
            expiresAt: new Date(data.data.expires_at)
          };
        } else {
          return {
            success: false,
            error: data.message || '登录失败'
          };
        }
      }
    } catch (error) {
      console.error('登录请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络连接失败'
      };
    }
  }

  /**
   * 验证Token有效性
   */
  static async verifyToken(token: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        return await invoke<boolean>('verify_token', {
          serverUrl: this.SERVER_BASE_URL,
          token
        });
      } else {
        const response = await fetch(`${this.SERVER_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return response.ok;
      }
    } catch (error) {
      console.error('Token验证失败:', error);
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(token: string): Promise<Employee | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const response = await invoke<any>('get_current_user', {
          serverUrl: this.SERVER_BASE_URL,
          token
        });
        return response.success ? this.mapServerUserToEmployee(response.data) : null;
      } else {
        const response = await fetch(`${this.SERVER_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return this.mapServerUserToEmployee(data.data);
        }
        return null;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 员工登出
   */
  static async logout(token?: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        await invoke('employee_logout', {
          serverUrl: this.SERVER_BASE_URL,
          token
        });
      } else if (token) {
        await fetch(`${this.SERVER_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
      // 登出失败不影响本地清除
    }
  }

  /**
   * 刷新Token
   */
  static async refreshToken(token: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const response = await invoke<{success: boolean; data?: string}>('refresh_token', {
          serverUrl: this.SERVER_BASE_URL,
          token
        });
        return response.success ? response.data || null : null;
      } else {
        const response = await fetch(`${this.SERVER_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data.data;
        }
        return null;
      }
    } catch (error) {
      console.error('刷新Token失败:', error);
      return null;
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const response = await invoke<{success: boolean}>('change_password', {
          serverUrl: this.SERVER_BASE_URL,
          token,
          currentPassword,
          newPassword
        });
        return response.success;
      } else {
        const response = await fetch(`${this.SERVER_BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });
        return response.ok;
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      return false;
    }
  }

  /**
   * 将服务器用户数据映射为Employee类型
   */
  private static mapServerUserToEmployee(serverUser: any): Employee {
    return {
      id: serverUser.id.toString(),
      username: serverUser.username,
      email: serverUser.email,
      displayName: serverUser.full_name || serverUser.username,
      avatar: undefined,
      role: this.mapServerRoleToEmployeeRole(serverUser.role),
      department: serverUser.company,
      permissions: this.mapServerPermissions(serverUser.role),
      isActive: serverUser.is_active !== false,
      createdAt: serverUser.created_at ? new Date(serverUser.created_at) : new Date(),
      lastLoginAt: serverUser.last_login ? new Date(serverUser.last_login) : undefined
    };
  }

  /**
   * 映射服务器角色到员工角色
   */
  private static mapServerRoleToEmployeeRole(serverRole: string): 'admin' | 'supervisor' | 'operator' | 'viewer' {
    switch (serverRole.toLowerCase()) {
      case 'system_admin':
        return 'admin';
      case 'user_admin':
        return 'supervisor';
      case 'employee':
        return 'operator';
      default:
        return 'viewer';
    }
  }

  /**
   * 映射服务器权限
   */
  private static mapServerPermissions(role: string): any[] {
    // 根据角色返回对应的权限
    const basePermissions = [
      { id: '1', name: '设备查看', description: '查看设备列表', resource: 'devices', actions: ['read'] }
    ];

    switch (role.toLowerCase()) {
      case 'system_admin':
        return [
          ...basePermissions,
          { id: '2', name: '用户管理', description: '管理所有用户', resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
          { id: '3', name: '系统设置', description: '系统配置管理', resource: 'settings', actions: ['read', 'update'] },
          { id: '4', name: '日志查看', description: '查看系统日志', resource: 'logs', actions: ['read'] }
        ];
      case 'user_admin':
        return [
          ...basePermissions,
          { id: '5', name: '员工管理', description: '管理下级员工', resource: 'users', actions: ['read', 'create', 'update'] },
          { id: '6', name: '任务管理', description: '分配和管理任务', resource: 'tasks', actions: ['read', 'create', 'update', 'delete'] }
        ];
      case 'employee':
        return [
          ...basePermissions,
          { id: '7', name: '任务执行', description: '执行分配的任务', resource: 'tasks', actions: ['read', 'execute'] },
          { id: '8', name: '通讯录管理', description: '管理通讯录', resource: 'contacts', actions: ['read', 'create', 'update'] }
        ];
      default:
        return basePermissions;
    }
  }
}

export default AuthService;
