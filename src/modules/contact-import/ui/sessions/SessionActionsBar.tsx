import React, { useMemo, useState } from 'react';
import { Button, Space, Tooltip, Checkbox, App } from 'antd';
import { ReloadOutlined, FolderOpenOutlined, ImportOutlined, FileExcelOutlined, FileTextOutlined, ThunderboltOutlined, SyncOutlined } from '@ant-design/icons';
import type { VcfBatchDto, ContactNumberList } from '../services/contactNumberService';
import { createImportSessionRecord, finishImportSessionRecord, markContactNumbersUsedByIdRange } from '../services/contactNumberService';
import { VcfActions } from '../services/vcfActions';
import ServiceFactory from '../../../../application/services/ServiceFactory';
import { useAdb } from '../../../../application/hooks/useAdb';
import { toCsvWithLabels } from '../../utils/csv';
import { buildCsvNameFromTemplate } from '../../utils/filename';
import { invoke } from '@tauri-apps/api/core';
import { fetchUnclassifiedNumbers } from '../services/unclassifiedService';
import { VcfImportService } from '../../../../services/VcfImportService';
import { buildVcfFromNumbers } from '../../utils/vcf';
import { createVcfBatchWithNumbers } from '../../../vcf-sessions/services/vcfSessionService';
import { bindBatchToDevice, markBatchImportedForDevice } from '../services/deviceBatchBinding';

interface Props {
  mode: 'all' | 'by-batch' | 'by-device' | 'no-batch';
  batch?: VcfBatchDto | null;
  numbers?: ContactNumberList | null;
  targetDeviceId?: string; // 从筛选器传入的目标设备ID
  onRefresh?: () => void | Promise<void>;
  onActionDone?: (opts?: { lastSessionId?: number }) => void | Promise<void>;
}

const SessionActionsBar: React.FC<Props> = ({ mode, batch, numbers, targetDeviceId, onRefresh, onActionDone }) => {
  const { message } = App.useApp();
  const { selectedDevice } = useAdb();
  const [loading, setLoading] = useState<string | null>(null);
  const [markAfterImport, setMarkAfterImport] = useState<boolean>(false);
  
  // 使用筛选器中的设备ID，如果没有则使用全局选中的设备
  const deviceId = targetDeviceId || selectedDevice?.id || '';

  const onRegenerate = async () => {
    if (mode !== 'by-batch' || !batch) return message.warning('请先选择一个批次');
    if (!numbers || numbers.items.length === 0) return message.warning('该批次暂无号码');
    try {
      setLoading('regen');
      const path = await VcfActions.regenerateVcfForBatch(batch, numbers.items as any);
      message.success(`VCF已生成: ${path}`);
      await onActionDone?.();
    } catch (e: any) {
      message.error(`生成失败: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  const onReveal = async () => {
    const path = batch?.vcf_file_path;
    if (!path) return message.warning('没有可定位的VCF路径');
    try {
      setLoading('reveal');
      await VcfActions.revealVcfFile(path);
    } catch (e: any) {
      message.error(`定位失败: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  const onReimport = async () => {
    const path = batch?.vcf_file_path;
    if (!path) return message.warning('没有可导入的VCF路径');
    try {
      setLoading('import');
      // 1) 创建导入会话
      const sessionId = batch ? await createImportSessionRecord(batch.batch_id, deviceId) : -1;
      if (sessionId > 0) {
        // 立即刷新一次；弹出进度提示
        message.info(`已创建导入会话 #${sessionId}，正在导入...`);
        try { await onRefresh?.(); } catch {}
      }
      const vcfService = ServiceFactory.getVcfImportApplicationService();
      const res = await vcfService.importToDevice(deviceId, path);
      // 2) 成功时尝试标记号码使用范围
      if (res.success && batch?.source_start_id != null && batch?.source_end_id != null) {
        try {
          await markContactNumbersUsedByIdRange(batch.source_start_id!, batch.source_end_id!, batch.batch_id);
        } catch (e) {
          console.warn('标记号码使用失败:', e);
        }
      }
      // 3) 完成会话
      if (sessionId > 0) {
        const status = res.success ? 'success' : 'failed';
        await finishImportSessionRecord(sessionId, status as any, res.importedCount ?? 0, res.failedCount ?? 0, res.success ? undefined : res.message);
      }
      if (res.success) {
        message.success('导入成功');
        await onActionDone?.({ lastSessionId: sessionId > 0 ? sessionId : undefined });
      } else {
        message.error(`导入失败: ${res.message}`);
      }
    } catch (e: any) {
      message.error(`导入异常: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  const onExportCsv = async () => {
    if (!numbers || numbers.items.length === 0) return message.warning('当前没有可导出的号码');
    try {
      setLoading('exportCsv');
      const rows = numbers.items.map(n => ({ id: n.id, phone: n.phone, name: n.name ?? '', source: n.source_file ?? '', created_at: n.created_at }));
      const csv = toCsvWithLabels(rows, ['id', 'phone', 'name', 'source', 'created_at'], ['ID', '号码', '姓名', '来源', '时间']);
      const filename = buildCsvNameFromTemplate(undefined, { prefix: batch ? `numbers-${batch.batch_id}` : 'numbers-view' });
      await invoke('write_file', { path: filename, content: csv });
      await invoke('reveal_in_file_manager', { path: filename });
      message.success(`已导出 CSV 至: ${filename}`);
    } catch (e: any) {
      message.error(`导出失败: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  const onExportVcf = async () => {
    if (!numbers || numbers.items.length === 0) return message.warning('当前没有可导出的号码');
    if (!batch) return message.warning('请选择批次以确定 VCF 文件名');
    try {
      setLoading('exportVcf');
      const path = await VcfActions.regenerateVcfForBatch(batch, numbers.items as any);
      await invoke('reveal_in_file_manager', { path });
      message.success(`已导出 VCF 至: ${path}`);
    } catch (e: any) {
      message.error(`导出失败: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  // 设备信息显示（只读）
  const deviceInfo = useMemo(() => {
    if (targetDeviceId) return `目标设备: ${targetDeviceId}`;
    if (selectedDevice) return `当前设备: ${selectedDevice.model || selectedDevice.id}`;
    return '未选择设备';
  }, [targetDeviceId, selectedDevice]);

  // 会话模态快捷操作：从未分类快速生成100并导入
  const onQuickImportUnclassified = async () => {
    const deviceId = targetDeviceId || selectedDevice?.id;
    if (!deviceId) return message.warning('请先在上方筛选器选择设备');
    try {
      setLoading('quick');
      // 1) 取未分类未消费号码
      const unclassified = await fetchUnclassifiedNumbers(100, true);
      if (!unclassified.length) {
        message.warning('没有可用的未分类号码');
        return;
      }
      // 2) 生成临时VCF
      const vcfContent = buildVcfFromNumbers(unclassified as any);
      const tempPath = VcfImportService.generateTempVcfPath();
      await VcfImportService.writeVcfFile(tempPath, vcfContent);
      // 3) 批次与映射 + 绑定
      const ids = unclassified.map(n => n.id).sort((a, b) => a - b);
      const startId = ids[0];
      const endId = ids[ids.length - 1];
      const batchId = `vcf_${deviceId}_${startId}_${endId}_${Date.now()}`;
      let mappingOk = true;
      try {
        await createVcfBatchWithNumbers({ batchId, vcfFilePath: tempPath, sourceStartId: startId, sourceEndId: endId, numberIds: ids });
        bindBatchToDevice(deviceId, batchId);
      } catch (e) {
        mappingOk = false;
        console.warn('记录批次映射或绑定失败（不影响导入）：', e);
      }
      // 4) 会话记录 + 导入
      let sessionId: number | null = null;
      try {
        sessionId = await createImportSessionRecord(batchId, deviceId);
        if (sessionId && sessionId > 0) {
          message.info(`已创建导入会话 #${sessionId}，正在导入...`);
          try { await onRefresh?.(); } catch {}
        }
      } catch (e) {
        console.warn('创建导入会话失败（不中断导入）：', e);
      }
      const vcfService = ServiceFactory.getVcfImportApplicationService();
      const outcome = await vcfService.importToDevice(deviceId, tempPath);
      try {
        if (sessionId != null) {
          const status = outcome.success ? 'success' : 'failed';
          await finishImportSessionRecord(sessionId, status as any, outcome.importedCount ?? 0, outcome.failedCount ?? 0, outcome.success ? undefined : outcome.message);
        }
        if (outcome.success) {
          markBatchImportedForDevice(deviceId, batchId);
          // 5) 可选：成功后标记已使用（仅当ID连续时才使用区间接口）
          if (markAfterImport) {
            const isContiguous = ids.length === (endId - startId + 1);
            if (isContiguous) {
              try {
                await markContactNumbersUsedByIdRange(startId, endId, batchId);
                message.success('导入成功，已标记号码为已使用');
              } catch (e) {
                message.warning('导入成功，但标记已使用失败，可稍后在批量执行中标记');
              }
            } else {
              message.info('导入成功。号码ID非连续，跳过“标记已使用”（避免误标）。');
            }
          } else {
            message.success('导入成功');
          }
          if (!mappingOk) {
            message.warning('导入成功，但批次映射保存失败（后端未记录）。');
          }
        } else {
          message.error(outcome.message || '导入失败');
        }
      } finally {
        await onActionDone?.({ lastSessionId: sessionId ?? undefined });
      }
    } catch (e: any) {
      message.error(`导入异常: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Space wrap>
      <span style={{ color: '#666', fontSize: '14px' }}>
        {deviceInfo}
      </span>
      {!!deviceId && (
        <>
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={onQuickImportUnclassified} loading={loading==='quick'}>
            从未分类快速生成100并导入
          </Button>
          <Checkbox checked={markAfterImport} onChange={e => setMarkAfterImport(e.target.checked)}>
            导入成功后标记已使用
          </Checkbox>
        </>
      )}
      <Tooltip title="刷新会话/号码列表">
        <Button icon={<SyncOutlined />} onClick={() => onRefresh?.()} disabled={!onRefresh}>
          刷新
        </Button>
      </Tooltip>
      <Button icon={<ReloadOutlined />} onClick={onRegenerate} loading={loading==='regen'} disabled={mode!=='by-batch'}>
        再生成VCF
      </Button>
      <Button icon={<FolderOpenOutlined />} onClick={onReveal} loading={loading==='reveal'} disabled={!batch?.vcf_file_path}>
        定位VCF
      </Button>
      <Button type="primary" icon={<ImportOutlined />} onClick={onReimport} loading={loading==='import'} disabled={!batch?.vcf_file_path || !deviceId}>
        再导入到设备
      </Button>
      <Tooltip title="导出当前号码为 CSV">
        <Button icon={<FileExcelOutlined />} onClick={onExportCsv} loading={loading==='exportCsv'}>
          导出CSV
        </Button>
      </Tooltip>
      <Tooltip title="导出当前号码为 VCF（按批次命名）">
        <Button icon={<FileTextOutlined />} onClick={onExportVcf} loading={loading==='exportVcf'} disabled={!batch}>
          导出VCF
        </Button>
      </Tooltip>
    </Space>
  );
};

export default SessionActionsBar;