import { invoke } from "@tauri-apps/api/core";
import { buildVcfFromNumbers } from "../../utils/vcf";
import type { ContactNumberDto, VcfBatchDto } from "./contactNumberService";

export interface ImportOutcome {
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
}

export const VcfActions = {
  async regenerateVcfForBatch(batch: VcfBatchDto, numbers: ContactNumberDto[]): Promise<string> {
    const content = buildVcfFromNumbers(numbers);
    const path = batch.vcf_file_path || `contacts_batch_${batch.batch_id}.vcf`;
    await invoke("write_file", { path, content });
    return path;
  },

  async revealVcfFile(path: string): Promise<void> {
    await invoke("reveal_in_file_manager", { path });
  },

  async importVcfToDevice(vcfPath: string, deviceId: string): Promise<ImportOutcome> {
    try {
      const res = await invoke<any>("import_vcf_contacts_multi_brand", {
        deviceId: deviceId,
        contactsFilePath: vcfPath,
      });
      return {
        success: !!res?.success,
        message: res?.message ?? "",
        importedCount: typeof res?.imported_contacts === 'number' ? res.imported_contacts : 0,
        failedCount: typeof res?.failed_contacts === 'number' ? res.failed_contacts : 0,
      };
    } catch (e: any) {
      return { success: false, message: e?.toString?.() ?? String(e), importedCount: 0, failedCount: 0 };
    }
  },
};
