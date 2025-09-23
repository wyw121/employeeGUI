import { DistributedStep } from './DistributedStep';

export interface DistributedScript {
  id: string;
  name: string;
  version: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  
  // 步骤列表（每个步骤都内嵌 XML 快照）
  steps: DistributedStep[];
  
  // 全局 XML 快照池（去重优化）
  xmlSnapshotPool?: Record<string, {
    xmlContent: string;
    xmlHash: string;
    timestamp: number;
    usageCount: number; // 被多少个步骤引用
  }>;
  
  // 脚本元数据
  metadata: {
    targetApp: string;
    targetAppPackage: string;
    author?: string;
    platform: 'android' | 'ios' | 'universal';
    minVersion?: string;
    tags?: string[];
  };
  
  // 运行时配置
  runtime?: {
    maxRetries?: number;
    timeoutMs?: number;
    enableSmartFallback?: boolean;
  };
}