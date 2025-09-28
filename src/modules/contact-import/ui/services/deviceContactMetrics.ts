import { invoke } from '@tauri-apps/api/core';

export async function queryDeviceContactCount(deviceId: string): Promise<number> {
  // 兼容多命令名：新旧后端可能命名不同
  const candidates = [
    'get_device_contact_count', // 假设新命令
    'query_device_contact_count', // 假设旧命令
    'get_contacts_count', // 备用
  ];
  for (const cmd of candidates) {
    try {
      const res = await invoke<any>(cmd, { deviceId, device_id: deviceId });
      const n = Number(res?.count ?? res?.contacts ?? res ?? 0);
      if (!Number.isNaN(n) && n >= 0) return n;
    } catch {
      // 尝试下一个命令
    }
  }
  // 最后兜底返回 0
  return 0;
}
