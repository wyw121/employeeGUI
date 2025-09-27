import { useLocalStorageState } from './useLocalStorageState';
import type { ExportOptions } from '../../utils/exportTypes';

const defaultOptions: ExportOptions = {
  includeAssignmentColumns: true,
  useChineseHeaders: true,
  filenameTemplate: 'batch-result-{view}-{yyyyMMdd_HHmmss}',
};

export function useExportOptions() {
  return useLocalStorageState<ExportOptions>(
    'contactImport.export.options',
    {
      defaultValue: defaultOptions,
      validate: (v: unknown): v is ExportOptions => {
        if (v && typeof v === 'object') return true;
        return false;
      }
    }
  );
}
