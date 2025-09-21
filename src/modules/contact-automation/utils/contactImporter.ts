/**
 * 联系人导入工具
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
    const count = await invoke<number>('get_device_contact_count', { deviceId });
    return count;
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