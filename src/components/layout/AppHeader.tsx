import { LogOut, Minimize2, Settings, Square, User, X } from 'lucide-react';
import React from 'react';

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
 * Sindre风格桌面应用顶部标题栏
 * 深色主题，渐变装饰，现代化设计
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
    <div className="relative flex items-center justify-between h-12 px-4 select-none border-b"
         style={{
           background: 'var(--bg-secondary)',
           borderColor: 'var(--border-primary)'
         }}
         data-tauri-drag-region>
      {/* Sindre风格背景装饰 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-32 h-full opacity-10"
             style={{ background: 'var(--gradient-pink)' }}></div>
        <div className="absolute top-0 right-0 w-32 h-full opacity-10"
             style={{ background: 'var(--gradient-cyan)' }}></div>
      </div>

      {/* 左侧：应用标题和图标 */}
      <div className="relative flex items-center space-x-3 z-10">
        <div className="relative">
          {/* 使用Sindre风格的渐变图标 */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg relative"
               style={{ background: 'var(--gradient-hero)' }}>
            <span className="text-white text-sm font-bold">F</span>
            {/* 独角兽emoji风格的装饰 */}
            <div className="absolute -top-1 -right-1 text-xs">🦄</div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full animate-pulse"
               style={{ background: 'var(--gradient-green)' }}></div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold gradient-text leading-tight">{title}</h1>
          <p className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
            Flow Farm • Employee Dashboard
          </p>
        </div>
      </div>

      {/* 中间：用户信息 */}
      {user && (
        <div className="relative flex items-center space-x-4 z-10">
          <button
            className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 group"
            onClick={onProfile}
          >
            <div className="relative">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full border-2 border-white/20" />
              ) : (
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white/90 leading-tight group-hover:text-white transition-colors">{user.name}</span>
              <span className="text-xs text-slate-400 leading-tight">在线</span>
            </div>
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={onSettings}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 group"
              title="设置"
            >
              <Settings className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-red-400/50 group"
              title="退出登录"
            >
              <LogOut className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* 右侧：窗口控制按钮 */}
      <div className="relative flex items-center space-x-1 z-10">
        <button
          onClick={onMinimize}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 group"
          title="最小化"
        >
          <Minimize2 className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={onMaximize}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 group"
          title="最大化"
        >
          <Square className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/80 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-red-400/50 group"
          title="关闭"
        >
          <X className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
};
