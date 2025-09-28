import type { ImportOutcome, ImportOptions } from '../../../application/services/contact-import/VcfImportApplicationService';

/**
 * 默认的权限弹窗自动点击 Hook（占位实现）。
 * - before: 可在导入前短暂等待/预热；
 * - after: 可在导入后做清理或记录；
 * 实际的“仅一次/始终”点击逻辑可在这里调用 adb 脚本或 tauri 命令。
 */
export const permissionDialogHook: NonNullable<ImportOptions['automationHook']> = {
  async before({ deviceId }) {
    // TODO: 可在此调用后端脚本，提前聚焦目标 App 或准备辅助服务
    console.debug('[permissionDialogHook.before]', deviceId);
  },
  async after({ deviceId, outcome }) {
    // TODO: 在此识别弹窗并自动点击：仅一次/始终
    console.debug('[permissionDialogHook.after]', deviceId, outcome?.success);
  },
};
