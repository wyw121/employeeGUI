import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  balance: number;
}

/**
 * 侧边栏导航组件
 * 包含页面导航和余额显示
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  balance
}) => {
  const navigation = [
    {
      name: '设备管理',
      id: 'devices',
      icon: '📱',
      description: '管理连接设备'
    },
    {
      name: 'ADB测试',
      id: 'adb-test',
      icon: '🔧',
      description: '测试雷电模拟器连接'
    },
    {
      name: '通讯录管理',
      id: 'contacts',
      icon: '📇',
      description: '通讯录联系 & ADB自动化'
    },
    {
      name: '任务管理',
      id: 'tasks',
      icon: '📋',
      description: '通讯录关注 & 精准获客'
    },
    {
      name: '关注统计',
      id: 'statistics',
      icon: '📊',
      description: '查看关注数据统计'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">员工操作台</h1>
      </div>

      {/* 余额显示 */}
      <div className="mt-4 mx-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-medium text-sm">当前余额</span>
            </div>
            <span className="text-green-800 font-bold text-lg">
              ¥{balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="mt-6 flex-grow px-4">
        <div className="space-y-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full text-left group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                currentPage === item.id
                  ? 'bg-indigo-100 text-indigo-900 shadow-sm border-l-4 border-indigo-500'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              <span className="mr-4 text-xl">{item.icon}</span>
              <div className="flex flex-col flex-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-gray-500 mt-0.5 leading-tight">
                  {item.description}
                </span>
              </div>
              {currentPage === item.id && (
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 底部信息 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <div className="text-xs text-gray-600 font-medium">
            社交平台自动化操作系统
          </div>
          <div className="text-xs text-gray-500 mt-1">
            v1.0.0 | Build 2024.09.05
          </div>
        </div>
      </div>
    </div>
  );
};
