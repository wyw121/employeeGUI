import { useCallback } from 'react';
import { message } from 'antd';
import { Device } from '../../../../domain/adb/entities/Device';
import ServiceFactory from '../../../../application/services/ServiceFactory';

/**
 * 设备操作专用Hook
 * 专注于设备相关的业务操作
 */
export const useDeviceOperations = (devices: Device[]) => {
  // 设备验证
  const validateDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        message.error(`设备 ${deviceId} 未找到`);
        return false;
      }
      
      if (!device.isOnline) {
        message.error(`设备 ${deviceId} 未连接`);
        return false;
      }
      
      return true;
    } catch (error) {
      message.error(`设备验证失败: ${error}`);
      return false;
    }
  }, [devices]);

  // 批量设备验证
  const validateDevices = useCallback(async (deviceIds: string[]): Promise<string[]> => {
    const validDevices: string[] = [];
    
    for (const deviceId of deviceIds) {
      if (await validateDevice(deviceId)) {
        validDevices.push(deviceId);
      }
    }
    
    return validDevices;
  }, [validateDevice]);

  // 获取在线设备
  const getOnlineDevices = useCallback((): Device[] => {
    return devices.filter(device => device.isOnline);
  }, [devices]);

  // 获取设备状态文本
  const getDeviceStatusText = useCallback((device: Device): string => {
    if (device.isOnline) {
      return '在线';
    }
    return '离线';
  }, []);

  return {
    validateDevice,
    validateDevices,
    getOnlineDevices,
    getDeviceStatusText,
  };
};

/**
 * 批量操作专用Hook
 * 专注于批次相关的业务操作
 */
export const useBatchOperations = () => {
  // 批量分配号码
  const batchAssignNumbers = useCallback(async (
    deviceIds: string[], 
    assignments: Record<string, { industry?: string; idStart?: number; idEnd?: number }>
  ) => {
    try {
      message.loading('正在批量分配号码...', 0);
      
      // 这里实现批量分配逻辑
      for (const deviceId of deviceIds) {
        const assignment = assignments[deviceId];
        if (assignment) {
          // 模拟分配过程
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      message.destroy();
      message.success(`成功为 ${deviceIds.length} 个设备分配号码`);
    } catch (error) {
      message.destroy();
      message.error(`批量分配失败: ${error}`);
    }
  }, []);

  // 批量生成VCF
  const batchGenerateVcf = useCallback(async (deviceIds: string[]) => {
    try {
      message.loading(`正在为 ${deviceIds.length} 个设备批量生成VCF...`, 0);
      
      const results = [];
      for (const deviceId of deviceIds) {
        try {
          // 模拟VCF生成
          await new Promise(resolve => setTimeout(resolve, 800));
          results.push({ deviceId, success: true });
        } catch (error) {
          results.push({ deviceId, success: false, error });
        }
      }
      
      message.destroy();
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        message.success(`批量VCF生成完成: ${successCount} 个设备成功`);
      } else {
        message.warning(`批量VCF生成完成: ${successCount} 个成功, ${failCount} 个失败`);
      }
      
      return results;
    } catch (error) {
      message.destroy();
      message.error(`批量VCF生成失败: ${error}`);
      return [];
    }
  }, []);

  // 批量导入
  const batchImport = useCallback(async (deviceIds: string[]) => {
    try {
      message.loading(`正在批量导入到 ${deviceIds.length} 个设备...`, 0);
      
      const results = [];
      for (const deviceId of deviceIds) {
        try {
          // 模拟导入过程
          await new Promise(resolve => setTimeout(resolve, 1200));
          results.push({ deviceId, success: true });
        } catch (error) {
          results.push({ deviceId, success: false, error });
        }
      }
      
      message.destroy();
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        message.success(`批量导入完成: ${successCount} 个设备成功`);
      } else {
        message.warning(`批量导入完成: ${successCount} 个成功, ${failCount} 个失败`);
      }
      
      return results;
    } catch (error) {
      message.destroy();
      message.error(`批量导入失败: ${error}`);
      return [];
    }
  }, []);

  return {
    batchAssignNumbers,
    batchGenerateVcf,
    batchImport,
  };
};