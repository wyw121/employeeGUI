import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  statusBar?: React.ReactNode;
}

/**
 * 主布局组件
 * 提供桌面应用的完整布局：顶栏 + 侧边栏 + 主内容 + 状态栏
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  header,
  statusBar
}) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* 顶部标题栏 */}
      {header}

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <div className="flex-shrink-0">
          <div className="flex flex-col w-64 h-full">
            <div className="flex flex-col flex-grow overflow-y-auto bg-white border-r border-gray-200">
              {sidebar}
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 底部状态栏 */}
      {statusBar}
    </div>
  );
};
