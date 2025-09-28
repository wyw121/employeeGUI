import { invoke } from '@tauri-apps/api/core';
import type { IDeviceMetricsRepository } from '../../domain/device/repositories/IDeviceMetricsRepository';

export class TauriDeviceMetricsRepository implements IDeviceMetricsRepository {
  async queryDeviceContactCount(deviceId: string): Promise<number> {
    const candidates = ['get_device_contact_count', 'query_device_contact_count', 'get_contacts_count'];
    for (const cmd of candidates) {
      try {
        const res = await invoke<any>(cmd, { deviceId, device_id: deviceId });
        const n = Number(res?.count ?? res?.contacts ?? res ?? 0);
        if (!Number.isNaN(n) && n >= 0) return n;
      } catch {
        // try next
      }
    }
    return 0;
  }
}
