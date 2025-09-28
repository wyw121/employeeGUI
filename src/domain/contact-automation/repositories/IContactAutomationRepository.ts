export interface MultiBrandImportResult {
  success: boolean;
  total_contacts?: number;
  imported_contacts?: number;
  failed_contacts?: number;
  used_strategy?: string;
  used_method?: string;
  duration_seconds?: number;
  message?: string;
}

export interface HuaweiEnhancedImportResult {
  success: boolean;
  method_name?: string;
  duration_seconds?: number;
  error_message?: string;
}

export interface ImportOutcome {
  success: boolean;
  message?: string;
  importedCount?: number;
  failedCount?: number;
}

export interface IContactAutomationRepository {
  importVcfMultiBrand(deviceId: string, contactsFilePath: string): Promise<MultiBrandImportResult>;
  importVcfHuaweiEnhanced(deviceId: string, contactsFilePath: string): Promise<HuaweiEnhancedImportResult>;
}

export default IContactAutomationRepository;
