import type { IDeviceMetricsRepository } from '../../../domain/device/repositories/IDeviceMetricsRepository';

export default class DeviceMetricsApplicationService {
  constructor(private repo: IDeviceMetricsRepository) {}

  async getContactCount(deviceId: string): Promise<number> {
    return this.repo.queryDeviceContactCount(deviceId);
  }

  /**
   * 简单校验：导入前后对比联系人计数的增量
   */
  async validateImportDelta(deviceId: string, before: number): Promise<{ after: number; delta: number; ok: boolean }>{
    const after = await this.getContactCount(deviceId);
    const delta = after - before;
    return { after, delta, ok: delta > 0 };
  }
}
