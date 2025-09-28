import { invoke } from '@tauri-apps/api/core';
import type { ContactNumberList } from '../../contact-import/ui/services/contactNumberService';

export async function createVcfBatchWithNumbers(params: {
  batchId: string;
  vcfFilePath: string;
  sourceStartId?: number;
  sourceEndId?: number;
  numberIds: number[];
}): Promise<number> {
  const { batchId, vcfFilePath, sourceStartId, sourceEndId, numberIds } = params;
  // 直接一次性包含两种命名风格，最大化兼容性
  const payload = {
    batch_id: batchId,
    batchId,
    vcf_file_path: vcfFilePath,
    vcfFilePath,
    source_start_id: sourceStartId,
    sourceStartId,
    source_end_id: sourceEndId,
    sourceEndId,
    number_ids: numberIds,
    numberIds,
  } as const;
  console.debug('[vcfSession] createVcfBatchWithNumbers payload (mixed):', {
    batch_id: payload.batch_id,
    batchId: payload.batchId,
    source_start_id: payload.source_start_id,
    sourceStartId: payload.sourceStartId,
    source_end_id: payload.source_end_id,
    sourceEndId: payload.sourceEndId,
    number_ids_len: payload.number_ids.length,
  });
  return invoke<number>('create_vcf_batch_with_numbers_cmd', payload as any);
}

export async function listNumbersForVcfBatch(batchId: string, params: { limit?: number; offset?: number } = {}): Promise<ContactNumberList> {
  const { limit, offset } = params;
  return invoke<ContactNumberList>('list_numbers_for_vcf_batch_cmd', { batch_id: batchId, limit, offset });
}

export async function tagNumbersIndustryByVcfBatch(batchId: string, industry: string): Promise<number> {
  return invoke<number>('tag_numbers_industry_by_vcf_batch_cmd', { batch_id: batchId, industry });
}
