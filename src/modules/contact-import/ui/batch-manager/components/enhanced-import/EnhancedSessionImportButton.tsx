import React, { useState } from 'react';
import { Button, App } from 'antd';
import { ImportStrategyDialog } from '../../../../import-strategies/ui/ImportStrategyDialog';
import { getVcfBatchRecord, createImportSessionRecord, finishImportSessionRecord } from '../../../services/contactNumberService';
import { useAdb } from '../../../../../../application/hooks/useAdb';

interface EnhancedSessionImportButtonProps {
  sessionRow: {
    id: number;
    batch_id: string;
    device_id: string;
    status: string;
  };
  onRefresh?: () => void | Promise<void>;
}

/**
 * 增强的会话导入按钮
 * 智能预选设备和策略，但总是显示策略选择对话框供用户确认
 */
export const EnhancedSessionImportButton: React.FC<EnhancedSessionImportButtonProps> = ({ sessionRow, onRefresh }) => {
  const { message } = App.useApp();
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [vcfFilePath, setVcfFilePath] = useState<string>('');
  const [preparing, setPreparing] = useState(false);

  // 获取ADB设备信息用于设备状态检查
  const { devices } = useAdb();

  /**
   * 准备会话导入：总是显示策略选择对话框，但智能预选设备和策略
   */
  const handleSmartImport = async () => {
    setPreparing(true);
    try {
      // 获取VCF文件路径
      const batch = await getVcfBatchRecord(sessionRow.batch_id);
      if (!batch || !batch.vcf_file_path) {
        throw new Error('批次缺少 VCF 文件路径，无法导入');
      }
      
      // 检查目标设备是否在线
      const targetDevice = devices.find(device => device.id === sessionRow.device_id);
      
      if (targetDevice) {
        console.log('✅ 会话目标设备在线，将在策略对话框中预选:', targetDevice.id);
      } else {
        console.log('⚠️ 会话目标设备不在线，用户需要重新选择:', sessionRow.device_id);
        message.warning(`设备 ${sessionRow.device_id} 未连接，请重新选择设备`);
      }
      
      // 设置VCF文件路径并打开策略选择对话框
      setVcfFilePath(batch.vcf_file_path);
      setStrategyDialogOpen(true);
      
    } catch (error) {
      message.error(`准备导入失败: ${error instanceof Error ? error.message : error}`);
    } finally {
      setPreparing(false);
    }
  };

  /**
   * 更新会话状态
   */
  const updateSessionStatus = async (result: any) => {
    try {
      // 创建新的导入会话记录
      const sessionId = await createImportSessionRecord(sessionRow.batch_id, sessionRow.device_id);
      
      // 更新会话状态
      const status = result.success ? 'success' : 'failed';
      await finishImportSessionRecord(
        sessionId, 
        status as any, 
        result.importedCount ?? 0, 
        result.failedCount ?? 0, 
        result.success ? undefined : result.errorMessage
      );
    } catch (error) {
      message.error(`更新会话状态失败: ${error instanceof Error ? error.message : error}`);
    }
  };

  /**
   * 处理导入成功（来自策略选择对话框）
   */
  const handleImportSuccess = async (result: any) => {
    setStrategyDialogOpen(false);
    setVcfFilePath('');
    
    // 更新会话状态
    await updateSessionStatus(result);
    
    // 显示成功消息
    if (result.success) {
      message.success(`导入成功: ${result.importedCount} 个联系人`);
    }
    
    // 刷新会话列表
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <>
      <Button 
        size="small" 
        type="primary" 
        onClick={handleSmartImport}
        loading={preparing}
        disabled={!sessionRow?.batch_id || !sessionRow?.device_id}
      >
        {preparing ? '准备中...' : '导入'}
      </Button>
      
      <ImportStrategyDialog
        visible={strategyDialogOpen}
        vcfFilePath={vcfFilePath}
        targetDeviceId={sessionRow.device_id} // 传递会话的目标设备ID
        onClose={() => {
          setStrategyDialogOpen(false);
          setVcfFilePath('');
        }}
        onSuccess={handleImportSuccess}
      />
    </>
  );
};