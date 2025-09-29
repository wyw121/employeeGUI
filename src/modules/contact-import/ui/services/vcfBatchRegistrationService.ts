import { createVcfBatchWithNumbers } from '../../../vcf-sessions/services/vcfSessionService';
import { bindBatchToDevice } from './deviceBatchBinding';
import { createImportSessionRecord } from './contactNumberService';

export interface RegisterGeneratedBatchParams {
  deviceId: string;
  batchId: string;
  vcfFilePath: string;
  numberIds: number[];
  sourceStartId?: number;
  sourceEndId?: number;
}

export interface RegisterGeneratedBatchResult {
  batchId: string;
  sessionId: number | null;
  mappingOk: boolean;
}

export async function registerGeneratedBatch({
  deviceId,
  batchId,
  vcfFilePath,
  numberIds,
  sourceStartId,
  sourceEndId,
}: RegisterGeneratedBatchParams): Promise<RegisterGeneratedBatchResult> {
  let mappingOk = true;
  try {
    await createVcfBatchWithNumbers({
      batchId,
      vcfFilePath,
      sourceStartId,
      sourceEndId,
      numberIds,
    });
    bindBatchToDevice(deviceId, batchId);
  } catch (error) {
    mappingOk = false;
    console.warn('[vcf] registerGeneratedBatch: bind batch failed', error);
  }

  let sessionId: number | null = null;
  try {
    sessionId = await createImportSessionRecord(batchId, deviceId);
  } catch (error) {
    console.warn('[vcf] registerGeneratedBatch: create session record failed', error);
  }

  return {
    batchId,
    sessionId,
    mappingOk,
  };
}
