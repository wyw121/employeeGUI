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
  return invoke<number>('create_vcf_batch_with_numbers_cmd', {
    batch_id: batchId,
    vcf_file_path: vcfFilePath,
    source_start_id: sourceStartId,
    source_end_id: sourceEndId,
    number_ids: numberIds,
  });
}

export async function listNumbersForVcfBatch(batchId: string, params: { limit?: number; offset?: number } = {}): Promise<ContactNumberList> {
  const { limit, offset } = params;
  return invoke<ContactNumberList>('list_numbers_for_vcf_batch_cmd', { batch_id: batchId, limit, offset });
}

export async function tagNumbersIndustryByVcfBatch(batchId: string, industry: string): Promise<number> {
  return invoke<number>('tag_numbers_industry_by_vcf_batch_cmd', { batch_id: batchId, industry });
}
