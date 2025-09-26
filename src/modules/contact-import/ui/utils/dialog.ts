import { open } from '@tauri-apps/plugin-dialog';

export async function selectTxtFile(): Promise<string | null> {
  const selected = await open({ multiple: false, filters: [{ name: 'Text', extensions: ['txt'] }] });
  if (!selected) return null;
  return Array.isArray(selected) ? (selected[0] as string) : (selected as string);
}

export async function selectFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected) return null;
  return Array.isArray(selected) ? (selected[0] as string) : (selected as string);
}
