import { useCallback, useState } from 'react';
import AuthService from '../services/authService';
import {
    AuthState,
    Employee,
    LoginCredentials
} from '../types';

/**
 * 认证相关的Hook
 * 管理员工登录状态和认证操作
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    employee: undefined,
    token: undefined,
    error: undefined
  });

  // 登录
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // 使用AuthService进行登录
      const response = await AuthService.login(credentials);

      if (response.success && response.employee && response.token) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          employee: response.employee,
          token: response.token,
          error: undefined
        });

        // 保存到localStorage
        if (credentials.remember) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('employee', JSON.stringify(response.employee));
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || '登录失败'
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: '网络错误，请重试'
      }));
    }
  }, []);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    try {
      // 调用AuthService进行登出
      await AuthService.logout(authState.token);

      // 清除本地存储
      localStorage.removeItem('authToken');
      localStorage.removeItem('employee');

      // 重置状态
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        employee: undefined,
        token: undefined,
        error: undefined
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [authState.token]);

  // 检查认证状态
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const employeeStr = localStorage.getItem('employee');

    if (token && employeeStr) {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true }));

        // 使用AuthService验证token是否有效
        const isValid = await AuthService.verifyToken(token);

        if (isValid) {
          const employee = JSON.parse(employeeStr) as Employee;
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            employee,
            token,
            error: undefined
          });
        } else {
          // token无效，清除存储
          localStorage.removeItem('authToken');
          localStorage.removeItem('employee');
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(async (updates: Partial<Employee>): Promise<void> => {
    if (!authState.employee) return;

    try {
      // 暂时只更新本地状态，待后续实现服务器端更新接口
      const updatedEmployee = { ...authState.employee, ...updates };
      
      setAuthState(prev => ({
        ...prev,
        employee: updatedEmployee
      }));

      // 更新本地存储
      localStorage.setItem('employee', JSON.stringify(updatedEmployee));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, [authState.employee]);

  // 修改密码
  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    if (!authState.employee || !authState.token) return;

    try {
      const success = await AuthService.changePassword(
        authState.token,
        currentPassword,
        newPassword
      );

      if (!success) {
        throw new Error('修改密码失败');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }, [authState.employee, authState.token]);

  // 检查权限
  const hasPermission = useCallback((
    resource: string,
    action: string
  ): boolean => {
    if (!authState.employee) return false;

    return authState.employee.permissions.some(permission =>
      permission.resource === resource &&
      permission.actions.includes(action as any)
    );
  }, [authState.employee]);

  // 清除错误
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: undefined }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuthStatus,
    updateProfile,
    changePassword,
    hasPermission,
    clearError
  };
};
