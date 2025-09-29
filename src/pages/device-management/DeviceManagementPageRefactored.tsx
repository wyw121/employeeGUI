/**
 * 设备管理页面 - 使用全局ADB Provider
 * 迁移示例：从直接调用useAdb()改为使用useGlobalAdb()
 */
import { Plus, Smartphone } from 'lucide-react';
import React from 'react';
import { DeviceList } from '../../components/device';
import { PageWrapper } from '../../components/layout';
import { useDevices } from '../../providers'; // 使用全局Provider的设备Hook

/**
 * 设备管理页面（重构版）
 * 不再直接调用useAdb()，而是使用全局Provider
 */
export const DeviceManagementPageRefactored: React.FC = () => {
  // ✅ 使用全局Provider - 不重复初始化ADB
  const { devices, refreshDevices } = useDevices();
  
  const isLoading = false; // 可以从useGlobalAdb()获取loading状态
  const connectedCount = devices.filter(d => d.isOnline()).length;

  return (
    <PageWrapper
      title="设备管理"
      subtitle="管理最多10台设备的连接状态，确保任务正常执行"
      icon={<Smartphone className="w-6 h-6 text-indigo-600" />}
      onRefresh={refreshDevices}
      actions={
        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" />
          添加设备
        </button>
      }
    >
      <div className="mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span>在线设备: </span>
          <span className="ml-1 font-semibold text-green-600">{connectedCount}</span>
          <span className="mx-1">/</span>
          <span className="font-semibold">{devices.length}</span>
        </div>
      </div>
      
      <DeviceList 
        devices={devices} 
        isLoading={isLoading}
      />
    </PageWrapper>
  );
};

export default DeviceManagementPageRefactored;