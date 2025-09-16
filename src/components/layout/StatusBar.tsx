import { Activity, Clock, Wifi, WifiOff } from 'lucide-react';
import React from 'react';

interface StatusBarProps {
  isConnected?: boolean;
  activeDevices?: number;
  totalDevices?: number;
  currentTime?: string;
  status?: string;
}

/**
 * 桌面应用底部状态栏
 * 显示连接状态、设备信息、系统时间等
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected = true,
  activeDevices = 0,
  totalDevices = 0,
  currentTime,
  status = '就绪'
}) => {
  const currentTimeStr = currentTime || new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="h-6 bg-gray-800 text-gray-300 text-xs flex items-center justify-between px-4 border-t border-gray-700">
      {/* 左侧：状态信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span>{isConnected ? '已连接' : '未连接'}</span>
        </div>

        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3 text-blue-400" />
          <span>设备: {activeDevices}/{totalDevices}</span>
        </div>

        <div className="text-gray-400">|</div>

        <span>{status}</span>
      </div>

      {/* 右侧：系统时间 */}
      <div className="flex items-center space-x-1">
        <Clock className="w-3 h-3" />
        <span>{currentTimeStr}</span>
      </div>
    </div>
  );
};

