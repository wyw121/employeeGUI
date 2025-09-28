/**
 * 联系人导入工具（Legacy Adapter）
 *
 * 重要：本文件直接调用 Tauri invoke 执行导入等动作，属于历史路径。
 * 根据《ADB 架构统一报告/开发指导文档》，新代码必须通过统一接口 useAdb() → 应用服务访问，
 * 不应在 UI 或模块层直接使用 invoke。
 *
 * 迁移建议：
 * - 优先使用 src/modules/contact-import/hooks/useUnifiedContactImport 与 UnifiedAdbDeviceManager。
 * - 若功能仍需保留，请逐步将调用迁移到应用服务（ServiceFactory.getAdbApplicationService()）
 *   或 contact-import 模块的公共 API，避免平行实现与状态分裂。
 *
 * 注意：为避免破坏现有功能，本文件暂不移除；新代码请勿再新增依赖。
 */

import { invoke } from '@tauri-apps/api/core';

export interface ContactImportOptions {
  deviceId: string;
  vcfContent: string;
  batchSize?: number;
  delayBetweenBatches?: number;
  verifyImport?: boolean;
  backupBeforeImport?: boolean;
}

export interface ContactImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
  sessionId?: string;
  backupPath?: string;
}

/**
 * 导入联系人到设备
 */
export async function importContactsToDevice(
  options: ContactImportOptions
): Promise<ContactImportResult> {
  try {
    // 调用后端Tauri命令执行导入
    const result = await invoke<ContactImportResult>('import_contacts_to_device', {
      deviceId: options.deviceId,
      vcfContent: options.vcfContent,
      batchSize: options.batchSize || 50,
      delayBetweenBatches: options.delayBetweenBatches || 1000,
      verifyImport: options.verifyImport !== false,
      backupBeforeImport: options.backupBeforeImport !== false,
    });
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: `导入失败: ${error}`,
      importedCount: 0,
      failedCount: 0
    };
  }
}

/**
 * 删除导入的联系人
 */
export async function deleteImportedContacts(
  deviceId: string,
  sessionId: string,
  createBackup: boolean = true
): Promise<ContactImportResult> {
  try {
    const result = await invoke<ContactImportResult>('delete_imported_contacts', {
      deviceId,
      sessionId,
      createBackup
    });
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: `删除失败: ${error}`,
      importedCount: 0,
      failedCount: 0
    };
  }
}

/**
 * 备份现有联系人
 */
export async function backupExistingContacts(
  deviceId: string,
  backupPath?: string
): Promise<ContactImportResult> {
  try {
    const result = await invoke<ContactImportResult>('backup_device_contacts', {
      deviceId,
      backupPath: backupPath || './contact_backups'
    });
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: `备份失败: ${error}`,
      importedCount: 0,
      failedCount: 0
    };
  }
}

/**
 * 获取设备联系人数量
 */
export async function getDeviceContactCount(deviceId: string): Promise<number> {
  try {
    const payload = { device_id: deviceId, deviceId } as any;
    try { console.debug('[contactImporter.getDeviceContactCount] invoke payload:', payload); } catch {}
    const count = await invoke<number>('get_device_contact_count', payload);
    return Math.max(0, Number(count || 0));
  } catch (error) {
    console.error('获取设备联系人数量失败:', error);
    return 0;
  }
}

/**
 * 验证设备联系人导入状态
 */
export async function verifyContactImport(
  deviceId: string,
  expectedContacts: number
): Promise<{ success: boolean; actualCount: number; message: string }> {
  try {
    const actualCount = await getDeviceContactCount(deviceId);
    const success = actualCount >= expectedContacts;
    
    return {
      success,
      actualCount,
      message: success 
        ? `验证成功: 设备有 ${actualCount} 个联系人`
        : `验证失败: 期望至少 ${expectedContacts} 个，实际 ${actualCount} 个`
    };
  } catch (error) {
    return {
      success: false,
      actualCount: 0,
      message: `验证失败: ${error}`
    };
  }
}