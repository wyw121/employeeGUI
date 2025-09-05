/**
 * 通讯录联系相关的类型定义
 */

// 通讯录联系人信息
export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  qq?: string;
  platform?: Platform;
  tags?: string[];
  notes?: string;
  lastContactTime?: Date;
  contactCount?: number;
}

// 通讯录文档信息
export interface ContactDocument {
  id: string;
  filename: string;
  filepath: string;
  uploadTime: Date;
  totalContacts: number;
  processedContacts: number;
  status: DocumentStatus;
  format: DocumentFormat;
}

// 文档状态
export type DocumentStatus =
  | 'uploading'
  | 'parsing'
  | 'parsed'
  | 'processing'
  | 'completed'
  | 'error';

// 文档格式
export type DocumentFormat =
  | 'txt'
  | 'csv'
  | 'excel'
  | 'vcf'
  | 'json';

// 通讯录联系任务
export interface ContactTask {
  id: string;
  documentId: string;
  deviceId: string;
  platform: Platform;
  contacts: Contact[];
  status: TaskStatus;
  progress: TaskProgress;
  settings: ContactTaskSettings;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// 联系任务设置
export interface ContactTaskSettings {
  batchSize: number;          // 每批联系数量
  intervalSeconds: number;    // 联系间隔（秒）
  message?: string;           // 联系消息模板
  autoReply?: boolean;        // 是否自动回复
  skipExisting?: boolean;     // 跳过已联系的用户
  maxRetries: number;         // 最大重试次数
}

// ADB设备操作相关
export interface AdbOperation {
  id: string;
  deviceId: string;
  type: AdbOperationType;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ADB操作类型
export type AdbOperationType =
  | 'tap'
  | 'swipe'
  | 'input'
  | 'screenshot'
  | 'install'
  | 'uninstall'
  | 'shell'
  | 'custom';

// 平台类型 (与Employee.ts保持一致)
export type Platform = 'xiaohongshu' | 'douyin' | 'kuaishou' | 'bilibili' | 'wechat' | 'qq' | 'weibo';

// 任务状态 (重用Employee.ts中的定义)
export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// 任务进度 (重用Employee.ts中的定义)
export interface TaskProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

// 联系统计
export interface ContactStatistics {
  totalContacts: number;
  successfulContacts: number;
  failedContacts: number;
  successRate: number;
  avgResponseTime: number;
  platformBreakdown: {
    [key in Platform]?: {
      total: number;
      successful: number;
      failed: number;
    };
  };
}
