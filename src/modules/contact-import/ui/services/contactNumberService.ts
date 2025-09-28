import { invoke } from '@tauri-apps/api/core';

export interface ImportNumbersResult {
  success: boolean;
  total_files: number;
  total_numbers: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

export async function importNumbersFromTxtFile(filePath: string): Promise<ImportNumbersResult> {
  return invoke<ImportNumbersResult>('import_contact_numbers_from_file', { filePath });
}

export async function importNumbersFromFolder(folderPath: string): Promise<ImportNumbersResult> {
  return invoke<ImportNumbersResult>('import_contact_numbers_from_folder', { folderPath });
}

export async function importNumbersFromFolders(folderPaths: string[]): Promise<ImportNumbersResult> {
  // 顺序执行并聚合结果，避免并发导致数据库锁竞争（如使用SQLite）
  const aggregate: ImportNumbersResult = { success: true, total_files: 0, total_numbers: 0, inserted: 0, duplicates: 0, errors: [] };
  for (const dir of folderPaths) {
    try {
      const res = await importNumbersFromFolder(dir);
      aggregate.total_files += res.total_files;
      aggregate.total_numbers += res.total_numbers;
      aggregate.inserted += res.inserted;
      aggregate.duplicates += res.duplicates;
      if (!res.success) {
        aggregate.success = false;
        aggregate.errors.push(...(res.errors || []));
      }
    } catch (e: any) {
      aggregate.success = false;
      aggregate.errors.push(String(e?.message || e));
    }
  }
  return aggregate;
}

export interface ContactNumberDto {
  id: number;
  phone: string;
  name: string;
  source_file: string;
  created_at: string;
}

export interface ContactNumberList {
  total: number;
  items: ContactNumberDto[];
}

export async function listContactNumbers(params: { limit?: number; offset?: number; search?: string } = {}): Promise<ContactNumberList> {
  const { limit, offset, search } = params;
  return invoke<ContactNumberList>('list_contact_numbers', { limit, offset, search });
}

export async function fetchContactNumbers(count: number): Promise<ContactNumberDto[]> {
  return invoke<ContactNumberDto[]>('fetch_contact_numbers', { count });
}

export async function fetchContactNumbersByIdRange(startId: number, endId: number): Promise<ContactNumberDto[]> {
  if (endId < startId) return [];
  return invoke<ContactNumberDto[]>('fetch_contact_numbers_by_id_range', { start_id: startId, end_id: endId });
}

export async function fetchContactNumbersByIdRangeUnconsumed(startId: number, endId: number): Promise<ContactNumberDto[]> {
  if (endId < startId) return [];
  return invoke<ContactNumberDto[]>('fetch_contact_numbers_by_id_range_unconsumed', { start_id: startId, end_id: endId });
}

export async function markContactNumbersUsedByIdRange(startId: number, endId: number, batchId: string): Promise<number> {
  if (endId < startId) return 0;
  return invoke<number>('mark_contact_numbers_used_by_id_range', { start_id: startId, end_id: endId, batch_id: batchId });
}

// -------- 批次与导入会话：前端服务封装 --------

export interface VcfBatchDto {
  batch_id: string;
  created_at: string;
  vcf_file_path: string;
  source_start_id?: number | null;
  source_end_id?: number | null;
}

export interface VcfBatchList {
  total: number;
  items: VcfBatchDto[];
}

export interface ImportSessionDto {
  id: number;
  batch_id: string;
  device_id: string;
  status: 'pending' | 'success' | 'failed';
  imported_count: number;
  failed_count: number;
  started_at: string;
  finished_at?: string | null;
  error_message?: string | null;
}

export interface ImportSessionList {
  total: number;
  items: ImportSessionDto[];
}

export async function createVcfBatchRecord(params: { batchId: string; vcfFilePath: string; sourceStartId?: number; sourceEndId?: number; }): Promise<void> {
  const { batchId, vcfFilePath, sourceStartId, sourceEndId } = params;
  return invoke<void>('create_vcf_batch_record', { batch_id: batchId, vcf_file_path: vcfFilePath, source_start_id: sourceStartId, source_end_id: sourceEndId });
}

export async function listVcfBatchRecords(params: { limit?: number; offset?: number } = {}): Promise<VcfBatchList> {
  const { limit, offset } = params;
  return invoke<VcfBatchList>('list_vcf_batch_records', { limit, offset });
}

export async function getVcfBatchRecord(batchId: string): Promise<VcfBatchDto | null> {
  const res = await invoke<VcfBatchDto | null>('get_vcf_batch_record', { batch_id: batchId });
  return res;
}

export async function listNumbersByVcfBatch(batchId: string, onlyUsed?: boolean, params: { limit?: number; offset?: number } = {}): Promise<ContactNumberList> {
  const { limit, offset } = params;
  // 兼容后端参数命名差异：同时发送 snake_case 与 camelCase，避免 "missing required key batchId" 错误
  const payload = { batch_id: batchId, batchId, only_used: onlyUsed, onlyUsed, limit, offset } as const;
  console.debug('[numbers] listNumbersByVcfBatch payload (mixed):', payload);
  return invoke<ContactNumberList>('list_numbers_by_vcf_batch', payload as any);
}

export async function listNumbersWithoutVcfBatch(params: { limit?: number; offset?: number } = {}): Promise<ContactNumberList> {
  const { limit, offset } = params;
  return invoke<ContactNumberList>('list_numbers_without_vcf_batch', { limit, offset });
}

export async function createImportSessionRecord(batchId: string, deviceId: string): Promise<number> {
  const payload = { batch_id: batchId, batchId, device_id: deviceId, deviceId } as const;
  console.debug('[importSession] createImportSessionRecord payload (mixed):', payload);
  return invoke<number>('create_import_session_record', payload as any);
}

export async function finishImportSessionRecord(sessionId: number, status: 'success' | 'failed', importedCount: number, failedCount: number, errorMessage?: string): Promise<void> {
  const payload = {
    session_id: sessionId,
    sessionId,
    status,
    imported_count: importedCount,
    importedCount,
    failed_count: failedCount,
    failedCount,
    error_message: errorMessage,
    errorMessage,
  } as const;
  console.debug('[importSession] finishImportSessionRecord payload (mixed):', payload);
  return invoke<void>('finish_import_session_record', payload as any);
}

export async function listImportSessionRecords(params: { deviceId?: string; batchId?: string; limit?: number; offset?: number } = {}): Promise<ImportSessionList> {
  const { deviceId, batchId, limit, offset } = params;
  return invoke<ImportSessionList>('list_import_session_records', { device_id: deviceId, batch_id: batchId, limit, offset });
}
