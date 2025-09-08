import { BarChart3, Contact, HardDrive, Target, Zap } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  balance: number;
}

/**
 * 现代化侧边栏导航组件
 * 包含页面导航和余额显示，采用现代设计风格
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
      icon: HardDrive,
      description: '管理连接设备',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      name: 'ADB测试',
      id: 'adb-test',
      icon: Zap,
      description: '测试雷电模拟器连接',
      color: 'from-amber-500 to-orange-600'
    },
    {
      name: '通讯录管理',
      id: 'contacts',
      icon: Contact,
      description: '通讯录联系 & ADB自动化',
      color: 'from-purple-500 to-pink-600'
    },
    {
      name: '精准获客',
      id: 'precise-acquisition',
      icon: Target,
      description: '精准获客功能',
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: '关注统计',
      id: 'statistics',
      icon: BarChart3,
      description: '查看关注数据统计',
      color: 'from-teal-500 to-cyan-600'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50">
      {/* 标题区域 */}
      <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">E</span>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
        </div>
        <div className="ml-3">
          <h1 className="text-lg font-bold text-gray-900">员工操作台</h1>
          <p className="text-xs text-gray-500 mt-0.5">Flow Farm 自动化系统</p>
        </div>
      </div>

      {/* 余额显示卡片 */}
      <div className="m-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-5 shadow-xl">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse"></div>
                <span className="text-white/90 font-medium text-sm">当前余额</span>
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-lg">💰</span>
              </div>
            </div>
            <div className="text-white font-bold text-2xl mb-1">
              ¥{balance.toLocaleString()}
            </div>
            <div className="text-emerald-100/80 text-xs font-medium">
              余额充足 • 系统正常运行
            </div>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-grow px-4 pb-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full text-left group flex items-center p-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden ${
                  isActive
                    ? 'bg-white shadow-lg shadow-indigo-500/20 text-indigo-900 border border-indigo-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md'
                }`}
              >
                {/* 背景渐变（仅活跃状态） */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-5 rounded-xl`}></div>
                )}

                {/* 左侧图标 */}
                <div className={`relative z-10 mr-4 p-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* 文本内容 */}
                <div className="flex flex-col flex-1 relative z-10">
                  <span className="font-semibold leading-tight">{item.name}</span>
                  <span className={`text-xs mt-0.5 leading-tight transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                    {item.description}
                  </span>
                </div>

                {/* 活跃状态指示器 */}
                {isActive && (
                  <div className={`relative z-10 w-3 h-3 rounded-full bg-gradient-to-r ${item.color} shadow-sm animate-pulse`}></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 底部装饰 */}
      <div className="p-4">
        <div className="text-center text-xs text-gray-400 font-medium">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>系统运行正常</span>
          </div>
          <div>Flow Farm © 2024</div>
        </div>
      </div>
    </div>
  );
};
