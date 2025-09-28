import { getVcfBatchRecord, listImportSessionRecords, finishImportSessionRecord } from './contactNumberService';
import { importVcfToDeviceByScript } from './importRouter';
import { markBatchImportedForDevice } from './deviceBatchBinding';

export interface PendingImportDetail {
  sessionId: number;
  batchId: string;
  success: boolean;
  importedCount: number;
  failedCount: number;
  message?: string;
}

export interface PendingImportSummary {
  deviceId: string;
  total: number;
  success: number;
  failed: number;
  details: PendingImportDetail[];
}

/**
 * 顺序导入指定设备的待导入会话（pending sessions），为每条会话回写状态与计数。
 * - 会按照会话 id 升序处理（更早的会话优先）。
 * - 任一会话失败不会中断整个流程。
 * - 成功时会更新前端轻量绑定状态（markBatchImportedForDevice）。
 */
export async function processPendingSessionsForDevice(
  deviceId: string,
  options: { limit?: number; scriptKey?: string; onProgress?: (progress: { index: number; total: number; detail: PendingImportDetail }) => void } = {},
): Promise<PendingImportSummary> {
  const { limit = 1000, scriptKey, onProgress } = options;

  // 拉取该设备的会话列表并筛选 pending
  const list = await listImportSessionRecords({ deviceId, limit });
  const pending = (list.items || []).filter(s => s.status === 'pending');
  // 旧到新处理：id 升序（或 started_at 更早的优先）
  pending.sort((a, b) => a.id - b.id);

  const summary: PendingImportSummary = {
    deviceId,
    total: pending.length,
    success: 0,
    failed: 0,
    details: [],
  };

  for (let i = 0; i < pending.length; i++) {
    const s = pending[i];
    let detail: PendingImportDetail = {
      sessionId: s.id,
      batchId: s.batch_id,
      success: false,
      importedCount: 0,
      failedCount: 0,
    };

    try {
      const batch = await getVcfBatchRecord(s.batch_id);
      if (!batch || !batch.vcf_file_path) {
        const msg = '未找到对应的 VCF 批次或文件路径为空';
        await finishImportSessionRecord(s.id, 'failed', 0, 0, msg);
        detail = { ...detail, success: false, message: msg };
        summary.failed += 1;
      } else {
        const outcome = await importVcfToDeviceByScript(deviceId, batch.vcf_file_path, scriptKey);
        const ok = !!outcome?.success;
        const importedCount = Number(outcome?.importedCount ?? 0);
        const failedCount = Number(outcome?.failedCount ?? 0);
        const msg = outcome?.message || '';

        await finishImportSessionRecord(s.id, ok ? 'success' : 'failed', importedCount, failedCount, ok ? undefined : msg);

        if (ok) {
          summary.success += 1;
          markBatchImportedForDevice(deviceId, s.batch_id);
        } else {
          summary.failed += 1;
        }
        detail = { ...detail, success: ok, importedCount, failedCount, message: msg };
      }
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      try {
        await finishImportSessionRecord(s.id, 'failed', 0, 0, errMsg);
      } catch {}
      detail = { ...detail, success: false, importedCount: 0, failedCount: 0, message: errMsg };
      summary.failed += 1;
    }

    summary.details.push(detail);
    try { onProgress?.({ index: i + 1, total: pending.length, detail }); } catch {}
  }

  return summary;
}
