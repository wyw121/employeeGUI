import React from 'react';
import { Minimize2, Square, X, Settings, User, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  user?: {
    name: string;
    avatar?: string;
  };
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  onLogout?: () => void;
}

/**
 * 桌面应用顶部标题栏
 * 包含窗口控制按钮和用户信息
 */
export const AppHeader: React.FC<HeaderProps> = ({
  title,
  user,
  onMinimize,
  onMaximize,
  onClose,
  onSettings,
  onProfile,
  onLogout
}) => {
  return (
    <div className="flex items-center justify-between h-12 bg-gray-900 text-white px-4 select-none" data-tauri-drag-region>
      {/* 左侧：应用标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      {/* 中间：用户信息 */}
      {user && (
        <div className="flex items-center space-x-4">
          <button
            className="flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
            onClick={onProfile}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="text-sm">{user.name}</span>
          </button>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={onSettings}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onMinimize}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="最小化"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onMaximize}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="最大化"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-600 rounded transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
