import { invoke } from '@tauri-apps/api/core';

export interface ImportNumbersResult {
  success: boolean;
  total_files: number;
  total_numbers: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

export async function importNumbersFromTxtFile(filePath: string): Promise<ImportNumbersResult> {
  return invoke<ImportNumbersResult>('import_contact_numbers_from_file', { filePath });
}

export async function importNumbersFromFolder(folderPath: string): Promise<ImportNumbersResult> {
  return invoke<ImportNumbersResult>('import_contact_numbers_from_folder', { folderPath });
}

export interface ContactNumberDto {
  id: number;
  phone: string;
  name: string;
  source_file: string;
  created_at: string;
}

export interface ContactNumberList {
  total: number;
  items: ContactNumberDto[];
}

export async function listContactNumbers(params: { limit?: number; offset?: number; search?: string } = {}): Promise<ContactNumberList> {
  const { limit, offset, search } = params;
  return invoke<ContactNumberList>('list_contact_numbers', { limit, offset, search });
}

export async function fetchContactNumbers(count: number): Promise<ContactNumberDto[]> {
  return invoke<ContactNumberDto[]>('fetch_contact_numbers', { count });
}
