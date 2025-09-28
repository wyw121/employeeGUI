import type { IContactAutomationRepository } from '../../../domain/contact-automation/repositories/IContactAutomationRepository';

export interface ImportOutcome {
  success: boolean;
  message?: string;
  importedCount?: number;
  failedCount?: number;
}

export interface ImportOptions {
  scriptKey?: string;
  // 自动化脚本 Hook：可在导入前/后执行（比如处理权限弹窗：仅一次/始终）
  automationHook?: {
    before?: (ctx: { deviceId: string; vcfFilePath: string }) => Promise<void> | void;
    after?: (ctx: { deviceId: string; vcfFilePath: string; outcome: ImportOutcome }) => Promise<void> | void;
  };
}

export default class VcfImportApplicationService {
  constructor(private contactAutomationRepo: IContactAutomationRepository) {}

  async importToDevice(deviceId: string, vcfFilePath: string, scriptKeyOrOptions?: string | ImportOptions): Promise<ImportOutcome> {
    const opts: ImportOptions = typeof scriptKeyOrOptions === 'string' ? { scriptKey: scriptKeyOrOptions } : (scriptKeyOrOptions || {});
    const key = opts.scriptKey || 'auto';
    // 导入前 Hook
    try { await opts.automationHook?.before?.({ deviceId, vcfFilePath }); } catch {}
    if (key === 'huawei_enhanced') {
      try {
        const r = await this.contactAutomationRepo.importVcfHuaweiEnhanced(deviceId, vcfFilePath);
        const outcome: ImportOutcome = {
          success: !!r.success,
          message: r.error_message,
          importedCount: r.success ? undefined : 0,
          failedCount: r.success ? 0 : undefined,
        };
        try { await opts.automationHook?.after?.({ deviceId, vcfFilePath, outcome }); } catch {}
        return outcome;
      } catch (e: any) {
        // fallback to multi-brand
        const mb = await this.contactAutomationRepo.importVcfMultiBrand(deviceId, vcfFilePath);
        const outcome: ImportOutcome = {
          success: !!mb.success,
          message: (mb as any).message,
          importedCount: Number((mb as any).imported_contacts ?? 0),
          failedCount: Number((mb as any).failed_contacts ?? 0),
        };
        try { await opts.automationHook?.after?.({ deviceId, vcfFilePath, outcome }); } catch {}
        return outcome;
      }
    }

    const mb = await this.contactAutomationRepo.importVcfMultiBrand(deviceId, vcfFilePath);
    const outcome: ImportOutcome = {
      success: !!mb.success,
      message: (mb as any).message,
      importedCount: Number((mb as any).imported_contacts ?? 0),
      failedCount: Number((mb as any).failed_contacts ?? 0),
    };
    try { await opts.automationHook?.after?.({ deviceId, vcfFilePath, outcome }); } catch {}
    return outcome;
  }
}
