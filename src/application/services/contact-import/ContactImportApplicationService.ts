import { fetchContactNumbersByIdRange, fetchContactNumbersByIdRangeUnconsumed, markContactNumbersUsedByIdRange, ContactNumberDto } from '../../../modules/contact-import/ui/services/contactNumberService';

export interface DeviceAssignmentConfig {
  deviceId: string;
  industry?: string;
  idStart?: number;
  idEnd?: number;
}

export interface VcfBatchItem {
  deviceId: string;
  industry?: string;
  numbers: ContactNumberDto[];
}

export class ContactImportApplicationService {
  /**
   * 根据设备分配配置，生成每台设备对应的一批联系人（用于后续生成VCF）。
   * 约定：使用号码池的ID区间进行提取；不做持久化消耗，仅返回。 
   */
  async generateVcfBatches(assignments: Record<string, { industry?: string; idStart?: number; idEnd?: number }>, options?: { onlyUnconsumed?: boolean }): Promise<VcfBatchItem[]> {
    const deviceIds = Object.keys(assignments || {});
    const batches: VcfBatchItem[] = [];

    for (const deviceId of deviceIds) {
      const cfg = assignments[deviceId] || {};
      const start = cfg.idStart ?? -1;
      const end = cfg.idEnd ?? -1;
      if (start >= 0 && end >= 0 && end >= start) {
        const numbers = options?.onlyUnconsumed
          ? await fetchContactNumbersByIdRangeUnconsumed(start, end)
          : await fetchContactNumbersByIdRange(start, end);
        batches.push({ deviceId, industry: cfg.industry, numbers });
      } else {
        // 未配置区间则返回空集，留给上层处理
        batches.push({ deviceId, industry: cfg.industry, numbers: [] });
      }
    }

    return batches;
  }

  /**
   * 导入完成后按ID区间标记号码为已使用（批次消费策略）
   */
  async markConsumed(assignments: Record<string, { idStart?: number; idEnd?: number }>, batchId: string): Promise<number> {
    let total = 0;
    for (const deviceId of Object.keys(assignments || {})) {
      const cfg = assignments[deviceId] || {};
      const start = cfg.idStart ?? -1;
      const end = cfg.idEnd ?? -1;
      if (start >= 0 && end >= 0 && end >= start) {
        const affected = await markContactNumbersUsedByIdRange(start, end, batchId);
        total += affected || 0;
      }
    }
    return total;
  }
}

export default ContactImportApplicationService;
