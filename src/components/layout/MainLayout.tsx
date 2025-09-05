import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
}

/**
 * 主布局组件
 * 提供侧边栏 + 主内容区域的布局
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  header
}) => {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* 侧边栏 */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
            {sidebar}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {header && (
          <header className="bg-white shadow-sm border-b border-gray-200">
            {header}
          </header>
        )}
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
