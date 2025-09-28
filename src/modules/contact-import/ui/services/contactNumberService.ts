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
  // 可选的业务元数据（后端可能为 NULL）
  industry?: string | null;
  used?: number | null; // 0/1
  used_at?: string | null;
  used_batch?: string | null; // VCF 批次ID
  status?: 'not_imported' | 'imported' | 'vcf_generated' | '' | null;
  imported_device_id?: string | null;
}

export interface ContactNumberList {
  total: number;
  items: ContactNumberDto[];
}

export async function listContactNumbers(params: { limit?: number; offset?: number; search?: string; industry?: string; status?: string } = {}): Promise<ContactNumberList> {
  const { limit, offset, search, industry, status } = params;
  // 混合大小写键，兼容后端命名差异；行业“未分类”用特殊键传递 __UNCLASSIFIED__
  const payload = { limit, offset, search, industry, status, Industry: industry, Status: status } as const;
  return invoke<ContactNumberList>('list_contact_numbers', payload as any);
}

export async function fetchContactNumbers(count: number): Promise<ContactNumberDto[]> {
  return invoke<ContactNumberDto[]>('fetch_contact_numbers', { count });
}

export async function fetchContactNumbersByIdRange(startId: number, endId: number): Promise<ContactNumberDto[]> {
  if (endId < startId) return [];
  return invoke<ContactNumberDto[]>('fetch_contact_numbers_by_id_range', { start_id: startId, end_id: endId, startId, endId });
}

export async function fetchContactNumbersByIdRangeUnconsumed(startId: number, endId: number): Promise<ContactNumberDto[]> {
  if (endId < startId) return [];
  return invoke<ContactNumberDto[]>('fetch_contact_numbers_by_id_range_unconsumed', { start_id: startId, end_id: endId, startId, endId });
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
  // 可选：批次统一分类（若后端在创建批次时写入）
  industry?: string | null;
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
  // 可选：该会话所对应号码集的行业/分类（前端选择后通过后端记录）
  industry?: string | null;
}

export interface ImportSessionList {
  total: number;
  items: ImportSessionDto[];
}

// 分配结果（与后端 AllocationResultDto 对齐）
export interface AllocationResultDto {
  device_id: string;
  batch_id: string;
  vcf_file_path: string;
  number_count: number;
  number_ids: number[];
  session_id: number;
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

export async function listNumbersByVcfBatchFiltered(batchId: string, params: { industry?: string; status?: string; limit?: number; offset?: number } = {}): Promise<ContactNumberList> {
  const { industry, status, limit, offset } = params;
  const ind = industry && industry.trim() && industry.trim() !== '不限' ? industry.trim() : undefined;
  const payload = { batch_id: batchId, batchId, industry: ind, Industry: ind, status, Status: status, limit, offset } as const;
  return invoke<ContactNumberList>('list_numbers_by_vcf_batch_filtered', payload as any);
}

export async function listNumbersWithoutVcfBatch(params: { limit?: number; offset?: number; industry?: string; status?: string } = {}): Promise<ContactNumberList> {
  const { limit, offset, industry, status } = params;
  const payload = { limit, offset, industry, status, Industry: industry, Status: status } as const;
  return invoke<ContactNumberList>('list_numbers_without_vcf_batch', payload as any);
}

// ---- 行业下拉缓存（避免仅当前页可见行业） ----
let cachedIndustries: string[] | null = null;
export async function getDistinctIndustries(forceRefresh = false): Promise<string[]> {
  if (cachedIndustries && !forceRefresh) return cachedIndustries;
  const list = await invoke<string[]>('get_distinct_industries_cmd');
  cachedIndustries = list;
  return list;
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

export async function listImportSessionRecords(params: { deviceId?: string; batchId?: string; industry?: string; limit?: number; offset?: number } = {}): Promise<ImportSessionList> {
  const { deviceId, batchId, industry, limit, offset } = params;
  // 兼容大小写键并传递行业过滤（空串与“不限”不传）
  const ind = industry && industry.trim() && industry.trim() !== '不限' ? industry.trim() : undefined;
  return invoke<ImportSessionList>('list_import_session_records', { device_id: deviceId, batch_id: batchId, industry: ind, Industry: ind, limit, offset });
}

// 为设备在数据库层分配号码并创建 VCF 批次与 pending 会话
export async function allocateNumbersToDevice(deviceId: string, count: number = 100, industry?: string): Promise<AllocationResultDto> {
  // 兼容 snake/camel 命名；industry 为空或“不限”时不传递
  const ind = industry && industry.trim() && industry.trim() !== '不限' ? industry.trim() : undefined;
  const payload = { device_id: deviceId, deviceId, count, industry: ind, Industry: ind } as const;
  return invoke<AllocationResultDto>('allocate_numbers_to_device_cmd', payload as any);
}

// ---- 新增：会话分类编辑 & 成功回滚为失败 ----

export async function updateImportSessionIndustry(sessionId: number, industry?: string | null): Promise<void> {
  const ind = industry && industry.trim() ? industry.trim() : undefined;
  const payload = { session_id: sessionId, sessionId, industry: ind, Industry: ind } as const;
  return invoke<void>('update_import_session_industry_cmd', payload as any);
}

export async function revertImportSessionToFailed(sessionId: number, reason?: string): Promise<number> {
  const payload = { session_id: sessionId, sessionId, reason } as const;
  return invoke<number>('revert_import_session_to_failed_cmd', payload as any);
}
