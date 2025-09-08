import { BarChart3, Contact, HardDrive, Target, Zap } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  balance: number;
}

/**
 * Sindre风格侧边栏导航组件
 * 深色主题，渐变装饰，现代化设计
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  balance
}) => {
  const navigation = [
    {
      name: 'Device Management',
      id: 'devices',
      icon: HardDrive,
      description: '设备连接和管理',
      gradient: 'var(--gradient-cyan)'
    },
    {
      name: 'ADB Testing',
      id: 'adb-test',
      icon: Zap,
      description: '雷电模拟器测试',
      gradient: 'var(--gradient-orange)'
    },
    {
      name: 'Contact Automation',
      id: 'contacts',
      icon: Contact,
      description: '通讯录自动化',
      gradient: 'var(--gradient-purple)'
    },
    {
      name: 'Precise Acquisition',
      id: 'precise-acquisition',
      icon: Target,
      description: '精准获客系统',
      gradient: 'var(--gradient-green)'
    },
    {
      name: 'Statistics',
      id: 'statistics',
      icon: BarChart3,
      description: '数据统计分析',
      gradient: 'var(--gradient-pink)'
    }
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sindre风格标题区域 */}
      <div className="flex items-center flex-shrink-0 px-6 py-4 border-b"
           style={{ borderColor: 'var(--border-primary)' }}>
        <div className="relative">
          {/* 独角兽风格的应用图标 */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg relative"
               style={{ background: 'var(--gradient-hero)' }}>
            <span className="text-white text-lg font-bold">F</span>
            <div className="absolute -top-1 -right-1 text-xs">🦄</div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full animate-pulse"
               style={{ background: 'var(--gradient-green)' }}></div>
        </div>
        <div className="ml-3">
          <h1 className="text-lg font-bold gradient-hero-text">Flow Farm</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Employee Dashboard
          </p>
        </div>
      </div>

      {/* Sindre风格余额卡片 */}
      <div className="m-4">
        <div className="relative overflow-hidden rounded-2xl p-5 glass-card"
             style={{
               background: 'var(--gradient-brand)',
               boxShadow: 'var(--shadow-glow)'
             }}>
          {/* 背景装饰圆圈 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl opacity-20">
            🦄
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse"></div>
                <span className="text-white/90 font-medium text-sm">Account Balance</span>
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-lg">💰</span>
              </div>
            </div>
            <div className="text-white font-bold text-2xl mb-1">
              ¥{balance.toLocaleString()}
            </div>
            <div className="text-white/80 text-xs font-medium">
              Ready to work • All systems go
            </div>
          </div>
        </div>
      </div>

      {/* Sindre风格导航菜单 */}
      <nav className="flex-grow px-4 pb-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full text-left group flex items-center p-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.01] relative overflow-hidden ${
                  isActive
                    ? 'glass-card shadow-lg border'
                    : 'hover:bg-white/5'
                }`}
                style={{
                  background: isActive ? 'var(--glass-bg)' : 'transparent',
                  borderColor: isActive ? 'var(--glass-border)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                {/* Sindre风格背景渐变（仅活跃状态） */}
                {isActive && (
                  <div className="absolute inset-0 opacity-10 rounded-xl"
                       style={{ background: item.gradient }}></div>
                )}

                {/* 左侧图标 - Sindre风格 */}
                <div className="relative z-10 mr-4 p-2 rounded-lg transition-all duration-200"
                     style={{
                       background: isActive ? item.gradient : 'var(--bg-tertiary)',
                       color: isActive ? 'white' : 'var(--text-secondary)'
                     }}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* 文本内容 */}
                <div className="flex flex-col flex-1 relative z-10">
                  <span className="font-semibold leading-tight">{item.name}</span>
                  <span className="text-xs mt-0.5 leading-tight transition-colors"
                        style={{
                          color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)'
                        }}>
                    {item.description}
                  </span>
                </div>

                {/* 活跃状态指示器 */}
                {isActive && (
                  <div className="relative z-10 w-3 h-3 rounded-full shadow-sm animate-pulse"
                       style={{ background: item.gradient }}></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sindre风格底部装饰 */}
      <div className="p-4">
        <div className="text-center text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center justify-center space-x-1 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse"
                 style={{ background: 'var(--gradient-green)' }}></div>
            <span>All systems operational</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>Flow Farm</span>
            <span>•</span>
            <span className="gradient-text">2024</span>
            <span>🦄</span>
          </div>
        </div>
      </div>
    </div>
  );
};
