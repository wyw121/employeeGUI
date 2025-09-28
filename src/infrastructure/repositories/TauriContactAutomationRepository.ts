import { invoke, isTauri } from '@tauri-apps/api/core';
import type {
  IContactAutomationRepository,
  MultiBrandImportResult,
  HuaweiEnhancedImportResult,
} from '../../domain/contact-automation/repositories/IContactAutomationRepository';

export class TauriContactAutomationRepository implements IContactAutomationRepository {
  async importVcfMultiBrand(deviceId: string, contactsFilePath: string): Promise<MultiBrandImportResult> {
    if (!isTauri()) throw new Error('Not running in Tauri environment');
    const res = await invoke<MultiBrandImportResult>('import_vcf_contacts_multi_brand', {
      deviceId,
      contactsFilePath,
    } as any);
    return res;
  }

  async importVcfHuaweiEnhanced(deviceId: string, contactsFilePath: string): Promise<HuaweiEnhancedImportResult> {
    if (!isTauri()) throw new Error('Not running in Tauri environment');
    const res = await invoke<HuaweiEnhancedImportResult>('import_vcf_contacts_huawei_enhanced', {
      deviceId,
      contactsFilePath,
    } as any);
    return res;
  }
}

export default TauriContactAutomationRepository;
