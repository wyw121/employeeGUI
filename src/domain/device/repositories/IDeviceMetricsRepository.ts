export interface IDeviceMetricsRepository {
  queryDeviceContactCount(deviceId: string): Promise<number>;
}
