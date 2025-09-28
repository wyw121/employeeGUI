import type { ImportOptions } from '../../../application/services/contact-import/VcfImportApplicationService';
import { permissionDialogHook } from './permissionDialogHook';

export function isPermissionAutomationEnabled(): boolean {
  const envVal = (import.meta as any)?.env?.VITE_IMPORT_PERMISSION_AUTOMATION;
  if (envVal === '1' || envVal === 'true') return true;
  try {
    const stored = localStorage.getItem('import_permission_automation');
    return stored === '1' || stored === 'true';
  } catch {
    return false;
  }
}

export function getImportOptions(scriptKey?: string): ImportOptions {
  const opts: ImportOptions = {};
  if (scriptKey) opts.scriptKey = scriptKey;
  if (isPermissionAutomationEnabled()) {
    opts.automationHook = permissionDialogHook;
  }
  return opts;
}
