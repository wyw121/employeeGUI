import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import React, { useState } from 'react';
import { LoginCredentials } from '../../types';

interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  isLoading = false,
  error
}) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.username && credentials.password) {
      await onLogin(credentials);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            员工登录
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            社交平台自动化操作系统
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="mt-1 relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="输入用户名"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="输入密码"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 记住我选项 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={credentials.remember}
                onChange={(e) => handleInputChange('remember', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                记住我
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                忘记密码？
              </a>
            </div>
          </div>

          {/* 登录按钮 */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isLoading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>

        {/* 底部信息 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            版权所有 © 2024 社交平台自动化操作系统
          </p>
        </div>
      </div>
    </div>
  );
};
