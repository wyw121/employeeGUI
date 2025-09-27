import type { BatchExecuteResult } from '../services/batchExecutor';
import { toCsv, toCsvWithLabels, downloadCsvWithBom } from '../../utils/csv';
import { buildCsvNameFromTemplate } from '../../utils/filename';
import type { ExportOptions, AssignmentSnapshot } from '../../utils/exportTypes';

// 对外暴露：行数据构建（供导出与预览复用）
export function buildRows(list: NonNullable<BatchExecuteResult['deviceResults']>, assignmentSnapshot?: AssignmentSnapshot, options?: ExportOptions) {
  return list.map(r => ({
    deviceId: r.deviceId,
    success: r.success ? 'success' : 'fail',
    message: r.message ?? '',
    importedContacts: r.importedContacts ?? '',
    totalContacts: r.totalContacts ?? '',
    ...(options?.includeAssignmentColumns && assignmentSnapshot ? {
      industry: assignmentSnapshot[r.deviceId]?.industry ?? '',
      idStart: assignmentSnapshot[r.deviceId]?.idStart ?? '',
      idEnd: assignmentSnapshot[r.deviceId]?.idEnd ?? '',
    } : {}),
  }));
}

export const baseHeaders = ['deviceId', 'success', 'message', 'importedContacts', 'totalContacts'] as const;

// 对外暴露：列 keys 与 labels 计算（供导出与预览复用）
export function buildKeysAndLabels(assignmentSnapshot?: AssignmentSnapshot, options?: ExportOptions): { keys: string[]; labels: string[] } {
  let keys = options?.includeAssignmentColumns && assignmentSnapshot
    ? [...(baseHeaders as unknown as string[]), 'industry', 'idStart', 'idEnd']
    : [...(baseHeaders as unknown as string[])];
  // 先按可见列过滤（如果设置了 visibleColumns）
  if (options?.visibleColumns && options.visibleColumns.length) {
    const set = new Set(options.visibleColumns);
    keys = keys.filter(k => set.has(k));
    // 防御：若全被过滤，回退到原 keys
    if (keys.length === 0) {
      keys = [...(options.includeAssignmentColumns && assignmentSnapshot
        ? [...(baseHeaders as unknown as string[]), 'industry', 'idStart', 'idEnd']
        : [...(baseHeaders as unknown as string[])])];
    }
  }
  // 应用列顺序（未知或遗漏的列自动追加在末尾）
  if (options?.columnOrder && options.columnOrder.length) {
    const orderSet = new Set(options.columnOrder);
    const ordered: string[] = [];
    for (const k of options.columnOrder) if (keys.includes(k)) ordered.push(k);
    for (const k of keys) if (!orderSet.has(k)) ordered.push(k);
    keys = ordered;
  }
  const labelMap = options?.customHeaderMap ?? (options?.useChineseHeaders ? {
    deviceId: '设备ID',
    success: '结果',
    message: '消息',
    importedContacts: '导入数',
    totalContacts: '总数',
    industry: '行业',
    idStart: 'ID起',
    idEnd: 'ID止',
  } : {});
  const labels = keys.map(k => labelMap[k] ?? k);
  return { keys, labels };
}

export function exportAllResultCsv(result: BatchExecuteResult, assignmentSnapshot?: AssignmentSnapshot, options?: ExportOptions) {
  const rows = buildRows(result.deviceResults, assignmentSnapshot, options);
  const { keys, labels } = buildKeysAndLabels(assignmentSnapshot, options);
  const csv = toCsvWithLabels(rows, keys, labels);
  const filename = buildCsvNameFromTemplate(options?.filenameTemplate, { prefix: 'batch-result', view: 'all' });
  downloadCsvWithBom(filename, csv);
}

export function exportCurrentViewCsv(viewData: NonNullable<BatchExecuteResult['deviceResults']>, assignmentSnapshot?: AssignmentSnapshot, viewLabel: string = 'view', options?: ExportOptions) {
  const rows = buildRows(viewData, assignmentSnapshot, options);
  const { keys, labels } = buildKeysAndLabels(assignmentSnapshot, options);
  const csv = toCsvWithLabels(rows, keys, labels);
  const filename = buildCsvNameFromTemplate(options?.filenameTemplate, { prefix: 'batch-result', view: viewLabel });
  downloadCsvWithBom(filename, csv);
}

export function exportFailsOnlyCsv(result: BatchExecuteResult, assignmentSnapshot?: AssignmentSnapshot, options?: ExportOptions) {
  const fails = result.deviceResults.filter(r => !r.success);
  const rows = buildRows(fails, assignmentSnapshot, options);
  const { keys, labels } = buildKeysAndLabels(assignmentSnapshot, options);
  const csv = toCsvWithLabels(rows, keys, labels);
  const filename = buildCsvNameFromTemplate(options?.filenameTemplate, { prefix: 'batch-result-fails', view: 'fail' });
  downloadCsvWithBom(filename, csv);
}

export function exportFailsByReasonCsv(result: BatchExecuteResult, reason: string, assignmentSnapshot?: AssignmentSnapshot, options?: ExportOptions) {
  const fails = result.deviceResults.filter(r => !r.success && (r.message || '').trim() === reason);
  const rows = buildRows(fails, assignmentSnapshot, options);
  const { keys, labels } = buildKeysAndLabels(assignmentSnapshot, options);
  const csv = toCsvWithLabels(rows, keys, labels);
  const filename = buildCsvNameFromTemplate(options?.filenameTemplate, { prefix: 'batch-result-fails-reason', view: 'fail' });
  downloadCsvWithBom(filename, csv);
}

export function exportViewDeviceIdsCsv(viewData: NonNullable<BatchExecuteResult['deviceResults']>) {
  const rows = viewData.map(v => ({ deviceId: v.deviceId }));
  const csv = toCsv(rows, ['deviceId']);
  const filename = buildCsvNameFromTemplate(undefined, { prefix: 'batch-view-deviceIds', view: 'view' });
  downloadCsvWithBom(filename, csv);
}

export function exportFailSummaryCsv(result: BatchExecuteResult) {
  const total = result.deviceResults.length || 1;
  const map = new Map<string, number>();
  for (const d of result.deviceResults) {
    if (d.success) continue;
    const reason = (d.message || '未知错误').trim();
    map.set(reason, (map.get(reason) || 0) + 1);
  }
  const rows = Array.from(map.entries()).map(([reason, count]) => ({
    reason,
    count,
    percent: ((count / total) * 100).toFixed(1) + '%',
  }));
  const csv = toCsv(rows, ['reason', 'count', 'percent']);
  const filename = buildCsvNameFromTemplate(undefined, { prefix: 'batch-fail-summary', view: 'fail' });
  downloadCsvWithBom(filename, csv);
}
