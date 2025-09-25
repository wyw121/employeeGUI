// 为了保持向后兼容性，创建一个类型适配器
// 统一依赖共享类型定义，避免从组件导入类型导致构建失败
import type { VcfImportResult } from '../types/Contact';

// 将任意“Tab页导入结果形状”适配为共享的 VcfImportResult
// 说明：某些历史组件可能返回 { success/totalContacts/importedContacts/failedContacts/message }
// 也可能返回 { isValid/totalContacts/importedContacts/errorMessage } 等变体
// 这里做一层容错映射，以共享模型为准输出
export const adaptTabbedToLegacyResult = (tabbedResult: any): VcfImportResult => {
  // 首先尝试读取共享字段；若不存在则从旧字段回退
  const success: boolean =
    typeof tabbedResult?.success === 'boolean'
      ? tabbedResult.success
      : Boolean(tabbedResult?.isValid);

  const importedContacts: number =
    typeof tabbedResult?.importedContacts === 'number'
      ? tabbedResult.importedContacts
      : 0;

  const totalContacts: number =
    typeof tabbedResult?.totalContacts === 'number'
      ? tabbedResult.totalContacts
      : importedContacts; // 最少回退为 imported

  const failedContacts: number =
    typeof tabbedResult?.failedContacts === 'number'
      ? tabbedResult.failedContacts
      : Math.max(0, (totalContacts || 0) - (importedContacts || 0));

  const message: string =
    typeof tabbedResult?.message === 'string'
      ? tabbedResult.message
      : typeof tabbedResult?.errorMessage === 'string'
      ? tabbedResult.errorMessage
      : success
      ? '导入成功'
      : '导入失败';

  return {
    success,
    totalContacts: totalContacts || 0,
    importedContacts: importedContacts || 0,
    failedContacts,
    message,
  };
};

export const adaptTabbedToLegacyResults = (tabbedResults: any[]): VcfImportResult[] => {
  return (tabbedResults || []).map(adaptTabbedToLegacyResult);
};