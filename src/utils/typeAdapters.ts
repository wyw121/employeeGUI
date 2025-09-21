// 为了保持向后兼容性，创建一个类型适配器
import { VcfImportResult as TabbedVcfImportResult } from '../components/contact/ContactImportManagerTabbed';
import type { VcfImportResult as LegacyVcfImportResult } from '../types/Contact';

// 类型适配器函数
export const adaptTabbedToLegacyResult = (tabbedResult: TabbedVcfImportResult): LegacyVcfImportResult => {
  return {
    success: tabbedResult.isValid,
    totalContacts: tabbedResult.totalContacts || 0,
    importedContacts: tabbedResult.importedContacts || 0,
    failedContacts: (tabbedResult.totalContacts || 0) - (tabbedResult.importedContacts || 0),
    message: tabbedResult.errorMessage || (tabbedResult.isValid ? '导入成功' : '导入失败')
  };
};

export const adaptTabbedToLegacyResults = (tabbedResults: TabbedVcfImportResult[]): LegacyVcfImportResult[] => {
  return tabbedResults.map(adaptTabbedToLegacyResult);
};