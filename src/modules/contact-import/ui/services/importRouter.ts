import { VcfActions } from './vcfActions';

export interface ImportOutcome {
  success: boolean;
  message?: string;
  importedCount?: number;
  failedCount?: number;
}

/**
 * 根据脚本键选择导入实现：
 * - huawei_enhanced：优先走华为增强管线；失败则回退到 multi-brand
 * - multi_brand/其他/auto：走统一 multi-brand
 * 备注：后续可迁移到应用层服务，避免 UI 层触达 Tauri 细节
 */
export async function importVcfToDeviceByScript(
  deviceId: string,
  vcfFilePath: string,
  scriptKey?: string,
): Promise<ImportOutcome> {
  const key = scriptKey || 'auto';

  // 华为增强：尝试专用命令，失败回退
  if (key === 'huawei_enhanced') {
    try {
      const res: any = await (window as any).__TAURI__?.core?.invoke?.('import_vcf_contacts_huawei_enhanced', {
        deviceId,
        contactsFilePath: vcfFilePath,
      });
      return {
        success: !!res?.success,
        message: res?.message ?? '',
        importedCount: Number(res?.imported_contacts ?? 0),
        failedCount: Number(res?.failed_contacts ?? 0),
      };
    } catch {
      // 回退到 multi-brand
      const outcome = await VcfActions.importVcfToDevice(vcfFilePath, deviceId);
      return outcome;
    }
  }

  // 默认：multi-brand
  const outcome = await VcfActions.importVcfToDevice(vcfFilePath, deviceId);
  return outcome;
}
