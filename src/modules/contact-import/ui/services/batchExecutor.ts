import { buildVcfFromNumbers } from '../../utils/vcf';
import { VcfImportService } from '../../../../services/VcfImportService';

export interface BatchItem {
  deviceId: string;
  industry?: string;
  numbers: Array<{ id: number; phone: string; name: string; }>
}

export interface BatchExecuteOptions {
  markConsumed?: (batchId: string) => Promise<void>;
  perDeviceMaxRetries?: number; // 每台设备最大重试次数（失败后重试），默认 0
  perDeviceRetryDelayMs?: number; // 每次重试间隔，默认 500ms
  interDeviceDelayMs?: number; // 设备之间的节流间隔，默认 0
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

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
  const perDeviceMaxRetries = Math.max(0, options?.perDeviceMaxRetries ?? 0);
  const perDeviceRetryDelayMs = Math.max(0, options?.perDeviceRetryDelayMs ?? 500);
  const interDeviceDelayMs = Math.max(0, options?.interDeviceDelayMs ?? 0);

  for (const batch of batches) {
    try {
      if (!batch.numbers || batch.numbers.length === 0) {
        deviceResults.push({ deviceId: batch.deviceId, success: true, message: '空批次，无需导入', importedContacts: 0, totalContacts: 0 });
        successDevices++;
        continue;
      }
      let attempt = 0;
      let finalSuccess = false;
      let finalMessage: string | undefined = undefined;
      let importedContacts: number | undefined;
      let totalContacts: number | undefined;
      let lastErr: any = null;
      while (attempt <= perDeviceMaxRetries) {
        try {
          const vcfContent = buildVcfFromNumbers(batch.numbers as any);
          const tempPath = VcfImportService.generateTempVcfPath();
          await VcfImportService.writeVcfFile(tempPath, vcfContent);
          const result = await VcfImportService.importVcfFile(tempPath, batch.deviceId);
          finalSuccess = !!result?.success;
          finalMessage = result?.message;
          importedContacts = (result as any)?.importedContacts;
          totalContacts = (result as any)?.totalContacts;
          if (finalSuccess) break;
        } catch (e: any) {
          lastErr = e;
        }
        attempt++;
        if (attempt <= perDeviceMaxRetries && perDeviceRetryDelayMs > 0) await sleep(perDeviceRetryDelayMs);
      }
      if (!finalSuccess && lastErr) {
        finalMessage = String(lastErr);
      }
      deviceResults.push({
        deviceId: batch.deviceId,
        success: finalSuccess,
        message: finalMessage,
        importedContacts,
        totalContacts,
      });
      if (finalSuccess) successDevices++; else failedDevices++;
    } catch (e: any) {
      failedDevices++;
      deviceResults.push({ deviceId: batch.deviceId, success: false, message: String(e) });
    }
    if (interDeviceDelayMs > 0) await sleep(interDeviceDelayMs);
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
