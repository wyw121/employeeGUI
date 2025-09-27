import React, { useMemo, useState } from 'react';
import { Button, Space, message, Select, Tooltip } from 'antd';
import { ReloadOutlined, FolderOpenOutlined, ImportOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import type { VcfBatchDto, ContactNumberList } from '../../services/contactNumberService';
import { createImportSessionRecord, finishImportSessionRecord, markContactNumbersUsedByIdRange } from '../../services/contactNumberService';
import { VcfActions } from '../../services/vcfActions';
import { useAdb } from '../../../../../application/hooks/useAdb';
import { toCsvWithLabels } from '../../../utils/csv';
import { buildCsvNameFromTemplate } from '../../../utils/filename';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  mode: 'all' | 'by-batch' | 'no-batch';
  batch?: VcfBatchDto | null;
  numbers?: ContactNumberList | null;
  onActionDone?: (opts?: { lastSessionId?: number }) => void | Promise<void>;
}

const ActionsBar: React.FC<Props> = ({ mode, batch, numbers, onActionDone }) => {
  const { devices, selectedDevice, selectDevice } = useAdb();
  const [loading, setLoading] = useState<string | null>(null);
  const deviceId = selectedDevice?.id ?? '';

  const deviceOptions = useMemo(() => devices.map(d => ({ label: `${d.model ?? d.id}`, value: d.id })), [devices]);

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
  // 定位文件无需刷新
    } catch (e: any) {
      message.error(`定位失败: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

  const onReimport = async () => {
    const path = batch?.vcf_file_path;
    if (!path) return message.warning('没有可导入的VCF路径');
    if (!deviceId) return message.warning('请选择设备');
    try {
      setLoading('import');
      // 1) 创建导入会话
  const sessionId = batch ? await createImportSessionRecord(batch.batch_id, deviceId) : -1;
      const res = await VcfActions.importVcfToDevice(path, deviceId);
      // 2) 成功时尝试标记号码使用范围（若批次记录携带起止ID）
      if (res.success && batch?.source_start_id != null && batch?.source_end_id != null) {
        try {
          await markContactNumbersUsedByIdRange(batch.source_start_id!, batch.source_end_id!, batch.batch_id);
        } catch (e) {
          // 忽略标记失败，不影响主流程
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

  return (
    <Space wrap>
      <Tooltip title="选择导入设备">
        <Select
          style={{ width: 220 }}
          placeholder="选择设备"
          value={deviceId || undefined}
          options={deviceOptions}
          onChange={selectDevice}
        />
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

export default ActionsBar;
