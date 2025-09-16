import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  statusBar?: React.ReactNode;
}

/**
 * Sindre风格主布局组件
 * 深色主题，现代化设计，渐变装饰
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  header,
  statusBar
}) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden"
         style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部标题栏 */}
      {header}

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏容器 */}
        <div className="flex-shrink-0">
          <div className="flex flex-col w-64 h-full">
            <div className="flex flex-col flex-grow overflow-y-auto glass-card border-r"
                 style={{
                   background: 'var(--bg-secondary)',
                   borderColor: 'var(--border-primary)'
                 }}>
              {sidebar}
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Sindre风格背景装饰 */}
          <div className="absolute inset-0">
            {/* 渐变圆形装饰 */}
            <div className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
                 style={{ background: 'var(--gradient-pink)' }}></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
                 style={{ background: 'var(--gradient-cyan)' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-3xl"
                 style={{ background: 'var(--gradient-green)' }}></div>
          </div>

          <main className="relative z-10 flex-1 overflow-y-auto focus:outline-none">
            <div className="h-full p-6">
              <div className="h-full glass-card"
                   style={{
                     background: 'var(--glass-bg)',
                     backdropFilter: 'blur(20px)',
                     border: '1px solid var(--glass-border)'
                   }}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* 底部状态栏 */}
      {statusBar}
    </div>
  );
};

