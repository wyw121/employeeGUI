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
      <div className="flex items-center flex-shrink-0 px-4">
        <h1 className="text-xl font-bold text-gray-900">员工操作台</h1>
      </div>

      {/* 余额显示 */}
      <div className="mt-6 px-4">
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-green-700 font-medium text-sm">当前余额</span>
            <span className="text-green-800 font-bold text-lg">
              ¥{balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="mt-8 flex-grow">
        <div className="space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full text-left group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${
                currentPage === item.id
                  ? 'bg-indigo-100 text-indigo-900 border-r-2 border-indigo-500'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <div className="flex flex-col">
                <span>{item.name}</span>
                <span className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* 底部信息 */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          社交平台自动化操作系统
          <br />
          v1.0.0
        </div>
      </div>
    </div>
  );
};
