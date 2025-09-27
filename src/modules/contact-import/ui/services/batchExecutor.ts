import { buildVcfFromNumbers } from '../../utils/vcf';
import { VcfImportService } from '../../../../services/VcfImportService';

export interface BatchItem {
  deviceId: string;
  industry?: string;
  numbers: Array<{ id: number; phone: string; name: string; }>
}

export interface BatchExecuteOptions {
  markConsumed?: (batchId: string) => Promise<void>;
}

export interface BatchExecuteResult {
  totalDevices: number;
  totalNumbers: number;
  successDevices: number;
  failedDevices: number;
  deviceResults: Array<{
    deviceId: string;
    success: boolean;
    message?: string;
    importedContacts?: number;
    totalContacts?: number;
  }>;
}

export async function executeBatches(batches: BatchItem[], options?: BatchExecuteOptions): Promise<BatchExecuteResult> {
  const deviceResults: BatchExecuteResult['deviceResults'] = [];
  let successDevices = 0;
  let failedDevices = 0;
  const totalNumbers = batches.reduce((a, b) => a + (b.numbers?.length || 0), 0);

  // 生成一个批次ID用于消费标记
  const batchId = `batch_${Date.now()}`;

  for (const batch of batches) {
    try {
      if (!batch.numbers || batch.numbers.length === 0) {
        deviceResults.push({ deviceId: batch.deviceId, success: true, message: '空批次，无需导入', importedContacts: 0, totalContacts: 0 });
        successDevices++;
        continue;
      }
      const vcfContent = buildVcfFromNumbers(batch.numbers as any);
      const tempPath = VcfImportService.generateTempVcfPath();
      await VcfImportService.writeVcfFile(tempPath, vcfContent);
      const result = await VcfImportService.importVcfFile(tempPath, batch.deviceId);
      const success = !!result?.success;
      deviceResults.push({
        deviceId: batch.deviceId,
        success,
        message: result?.message,
        importedContacts: (result as any)?.importedContacts,
        totalContacts: (result as any)?.totalContacts,
      });
      if (success) successDevices++; else failedDevices++;
    } catch (e: any) {
      failedDevices++;
      deviceResults.push({ deviceId: batch.deviceId, success: false, message: String(e) });
    }
  }

  // 消费标记（可选）
  if (options?.markConsumed) {
    try {
      await options.markConsumed(batchId);
    } catch (e) {
      // 记录但不阻断
      console.error('markConsumed failed:', e);
    }
  }

  return {
    totalDevices: batches.length,
    totalNumbers,
    successDevices,
    failedDevices,
    deviceResults,
  };
}
