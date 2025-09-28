import type { IContactAutomationRepository } from '../../../domain/contact-automation/repositories/IContactAutomationRepository';

export interface ImportOutcome {
  success: boolean;
  message?: string;
  importedCount?: number;
  failedCount?: number;
}

export default class VcfImportApplicationService {
  constructor(private contactAutomationRepo: IContactAutomationRepository) {}

  async importToDevice(deviceId: string, vcfFilePath: string, scriptKey?: string): Promise<ImportOutcome> {
    const key = scriptKey || 'auto';
    if (key === 'huawei_enhanced') {
      try {
        const r = await this.contactAutomationRepo.importVcfHuaweiEnhanced(deviceId, vcfFilePath);
        return {
          success: !!r.success,
          message: r.error_message,
          importedCount: r.success ? undefined : 0,
          failedCount: r.success ? 0 : undefined,
        };
      } catch (e: any) {
        // fallback to multi-brand
        const mb = await this.contactAutomationRepo.importVcfMultiBrand(deviceId, vcfFilePath);
        return {
          success: !!mb.success,
          message: (mb as any).message,
          importedCount: Number((mb as any).imported_contacts ?? 0),
          failedCount: Number((mb as any).failed_contacts ?? 0),
        };
      }
    }

    const mb = await this.contactAutomationRepo.importVcfMultiBrand(deviceId, vcfFilePath);
    return {
      success: !!mb.success,
      message: (mb as any).message,
      importedCount: Number((mb as any).imported_contacts ?? 0),
      failedCount: Number((mb as any).failed_contacts ?? 0),
    };
  }
}
