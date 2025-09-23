import { NodeLocator } from '../../inspector/entities/NodeLocator';

export interface StepXmlSnapshot {
  xmlContent: string;
  xmlHash: string;
  timestamp: number;
  deviceInfo?: {
    deviceId: string;
    deviceName?: string;
    resolution?: { width: number; height: number };
  };
  pageInfo?: {
    appPackage: string;
    activityName?: string;
    pageTitle?: string;
  };
}

export interface DistributedStep {
  id: string;
  name: string;
  actionType: string;
  params: Record<string, any>;
  locator: NodeLocator;
  createdAt: number;
  
  // 分布式环境必需：内嵌 XML 快照
  xmlSnapshot: StepXmlSnapshot;
  
  // 可选：步骤级别的说明和标签
  description?: string;
  tags?: string[];
  order?: number;
}