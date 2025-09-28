import { getVcfBatchRecord, listImportSessionRecords, finishImportSessionRecord } from './contactNumberService';
import ServiceFactory from '../../../../application/services/ServiceFactory';
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
        const vcfService = ServiceFactory.getVcfImportApplicationService();
        const outcome = await vcfService.importToDevice(deviceId, batch.vcf_file_path, scriptKey);
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

/**
 * 仅导入该设备“最新一条”待导入会话（按 id 降序取第一条）。
 * 返回结构与批量处理一致，但 total 最大为 1。
 */
export async function processLatestPendingSessionForDevice(
  deviceId: string,
  options: { scriptKey?: string } = {},
): Promise<PendingImportSummary> {
  const { scriptKey } = options;
  const list = await listImportSessionRecords({ deviceId, limit: 50 });
  const pending = (list.items || []).filter(s => s.status === 'pending');
  // 最新优先：id 降序
  pending.sort((a, b) => b.id - a.id);
  const latest = pending[0];

  const empty: PendingImportSummary = { deviceId, total: 0, success: 0, failed: 0, details: [] };
  if (!latest) return empty;

  const summary: PendingImportSummary = { deviceId, total: 1, success: 0, failed: 0, details: [] };
  let detail: PendingImportDetail = {
    sessionId: latest.id,
    batchId: latest.batch_id,
    success: false,
    importedCount: 0,
    failedCount: 0,
  };

  try {
    const batch = await getVcfBatchRecord(latest.batch_id);
    if (!batch || !batch.vcf_file_path) {
      const msg = '未找到对应的 VCF 批次或文件路径为空';
      await finishImportSessionRecord(latest.id, 'failed', 0, 0, msg);
      detail = { ...detail, success: false, message: msg };
      summary.failed = 1;
    } else {
      const vcfService = ServiceFactory.getVcfImportApplicationService();
      const outcome = await vcfService.importToDevice(deviceId, batch.vcf_file_path, scriptKey);
      const ok = !!outcome?.success;
      const importedCount = Number(outcome?.importedCount ?? 0);
      const failedCount = Number(outcome?.failedCount ?? 0);
      const msg = outcome?.message || '';

      await finishImportSessionRecord(latest.id, ok ? 'success' : 'failed', importedCount, failedCount, ok ? undefined : msg);
      if (ok) {
        summary.success = 1;
        markBatchImportedForDevice(deviceId, latest.batch_id);
      } else {
        summary.failed = 1;
      }
      detail = { ...detail, success: ok, importedCount, failedCount, message: msg };
    }
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    try { await finishImportSessionRecord(latest.id, 'failed', 0, 0, errMsg); } catch {}
    detail = { ...detail, success: false, importedCount: 0, failedCount: 0, message: errMsg };
    summary.failed = 1;
  }

  summary.details.push(detail);
  return summary;
}

/**
 * 批量“重新导入”指定的会话行（通常来自 SessionsTable 的多选）。
 * - 对每一行：读取批次以获取 vcf_file_path → 创建新会话 → 导入 → 完成会话。
 * - 顺序执行，避免设备并发冲突；任一失败不中断其余任务。
 * - 返回最后一次创建的会话ID（便于高亮）。
 */
export async function reimportSelectedSessions(
  rows: Array<{ id: number; batch_id: string; device_id: string }>,
  options: { scriptKey?: string; onProgress?: (progress: { index: number; total: number; createdSessionId?: number; rowId: number; ok: boolean; message?: string }) => void } = {},
): Promise<{ total: number; success: number; failed: number; lastCreatedSessionId?: number }>{
  const { scriptKey, onProgress } = options;
  let success = 0;
  let failed = 0;
  let lastCreatedSessionId: number | undefined = undefined;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const batch = await getVcfBatchRecord(r.batch_id);
      if (!batch || !batch.vcf_file_path) {
        failed += 1;
        onProgress?.({ index: i + 1, total: rows.length, rowId: r.id, ok: false, message: '批次缺少 VCF 文件路径' });
        continue;
      }
      // 新建会话记录
      const sessionId = await (await import('./contactNumberService')).createImportSessionRecord(r.batch_id, r.device_id);
      lastCreatedSessionId = sessionId || lastCreatedSessionId;
      const vcfService = ServiceFactory.getVcfImportApplicationService();
      const res = await vcfService.importToDevice(r.device_id, batch.vcf_file_path, scriptKey);
      const status = res.success ? 'success' : 'failed';
      await (await import('./contactNumberService')).finishImportSessionRecord(
        sessionId,
        status as any,
        Number(res.importedCount ?? 0),
        Number(res.failedCount ?? 0),
        res.success ? undefined : res.message,
      );
      if (res.success) {
        success += 1;
        // 轻量前端绑定：标记该批次已被该设备导入
        try { markBatchImportedForDevice(r.device_id, r.batch_id); } catch {}
      } else {
        failed += 1;
      }
      onProgress?.({ index: i + 1, total: rows.length, createdSessionId: sessionId, rowId: r.id, ok: !!res.success, message: res.message });
    } catch (e: any) {
      failed += 1;
      onProgress?.({ index: i + 1, total: rows.length, rowId: r.id, ok: false, message: e?.message || String(e) });
    }
  }

  return { total: rows.length, success, failed, lastCreatedSessionId };
}
