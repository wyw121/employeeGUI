import React, { useEffect } from 'react';
import { LoginPage } from '../../pages/auth/LoginPage';
import { useAuth } from '../../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * 认证守护组件
 * 检查用户是否已登录，未登录则显示登录页面
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading,
    login,
    checkAuthStatus,
    error
  } = useAuth();

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 如果正在加载认证状态，显示加载界面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">正在验证身份...</h2>
          <p className="text-gray-500">请稍候</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示登录页面
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={login}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // 已认证，显示子组件
  return <>{children}</>;
};
