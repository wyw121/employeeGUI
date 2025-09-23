export interface SnapshotInfo {
  xmlContent: string;
  xmlCacheId: string;
  deviceId?: string;
  deviceName?: string;
  timestamp: number;
  elementCount?: number;
  appPackage?: string;
  pageTitle?: string;
}
