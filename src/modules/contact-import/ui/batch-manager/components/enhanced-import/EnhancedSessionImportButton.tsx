import React, { useState } from 'react';
import { Button, App } from 'antd';
import { ImportStrategyDialog } from '../../../../import-strategies/ui/ImportStrategyDialog';
import { getVcfBatchRecord, createImportSessionRecord, finishImportSessionRecord } from '../../../services/contactNumberService';

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
 * 支持策略选择的导入功能
 */
export const EnhancedSessionImportButton: React.FC<EnhancedSessionImportButtonProps> = ({ sessionRow, onRefresh }) => {
  const { message } = App.useApp();
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [vcfFilePath, setVcfFilePath] = useState<string>('');
  const [preparing, setPreparing] = useState(false);

  /**
   * 准备会话导入
   */
  const prepareSessionImport = async () => {
    setPreparing(true);
    try {
      // 获取VCF文件路径
      const batch = await getVcfBatchRecord(sessionRow.batch_id);
      if (!batch || !batch.vcf_file_path) {
        throw new Error('批次缺少 VCF 文件路径，无法导入');
      }
      
      setVcfFilePath(batch.vcf_file_path);
      setStrategyDialogOpen(true);
    } catch (error) {
      message.error(`准备导入失败: ${error instanceof Error ? error.message : error}`);
    } finally {
      setPreparing(false);
    }
  };

  /**
   * 处理导入成功
   */
  const handleImportSuccess = async (result: any) => {
    setStrategyDialogOpen(false);
    setVcfFilePath('');
    
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
      
      message.success(`导入成功: ${result.importedCount} 个联系人`);
      
      // 刷新会话列表
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      message.error(`更新会话状态失败: ${error instanceof Error ? error.message : error}`);
    }
  };

  return (
    <>
      <Button 
        size="small" 
        type="primary" 
        onClick={prepareSessionImport}
        loading={preparing}
        disabled={!sessionRow?.batch_id || !sessionRow?.device_id}
      >
        {preparing ? '准备中...' : '导入'}
      </Button>
      
      <ImportStrategyDialog
        visible={strategyDialogOpen}
        vcfFilePath={vcfFilePath}
        onClose={() => {
          setStrategyDialogOpen(false);
          setVcfFilePath('');
        }}
        onSuccess={handleImportSuccess}
      />
    </>
  );
};