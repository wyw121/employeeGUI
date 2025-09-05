import React from 'react';
import type { Device } from '../../types';

interface DeviceListProps {
  devices: Device[];
  onConnect: (deviceId: number) => void;
  onDisconnect: (deviceId: number) => void;
  selectedDevices?: number[];
  onDeviceSelect?: (deviceIds: number[]) => void;
  isSelectable?: boolean;
  isLoading?: boolean;
}

/**
 * 设备列表组件
 * 显示设备状态，支持连接/断开操作和设备选择
 */
export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  onConnect,
  onDisconnect,
  selectedDevices = [],
  onDeviceSelect,
  isSelectable = false,
  isLoading = false
}) => {
  const handleSelectAll = () => {
    if (!onDeviceSelect) return;
    
    const connectedDevices = devices.filter(d => d.status === 'connected').map(d => d.id);
    const allSelected = connectedDevices.every(id => selectedDevices.includes(id));
    
    if (allSelected) {
      onDeviceSelect([]);
    } else {
      onDeviceSelect(connectedDevices);
    }
  };

  const handleDeviceToggle = (deviceId: number) => {
    if (!onDeviceSelect) return;
    
    const newSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId];
    
    onDeviceSelect(newSelection);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">正在加载设备列表...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">设备管理</h3>
          {isSelectable && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              全选/取消全选
            </button>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {devices.map((device) => (
          <div
            key={device.id}
            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center space-x-4">
              {isSelectable && (
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => handleDeviceToggle(device.id)}
                  disabled={device.status === 'disconnected'}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                />
              )}
              
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">设备 {device.id}</span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      device.status === 'connected'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {device.status === 'connected' ? '已连接' : '未连接'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {device.name} ({device.phone_name})
                </div>
                {device.last_connected && (
                  <div className="text-xs text-gray-400">
                    最后连接: {new Date(device.last_connected).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {device.status === 'connected' ? (
                <button
                  onClick={() => onDisconnect(device.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  断开
                </button>
              ) : (
                <button
                  onClick={() => onConnect(device.id)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  连接
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {devices.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          暂无设备
        </div>
      )}
    </div>
  );
};
