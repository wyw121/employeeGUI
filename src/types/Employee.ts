// 设备相关类型
export interface Device {
  id: number;
  name: string;
  phone_name: string;
  status: 'connected' | 'disconnected';
  platform?: Platform;
  last_connected?: string;
}

// 员工相关类型
export interface Employee {
  id?: number;
  name: string;
  department: string;
  email: string;
  phone: string;
  position?: string;
  salary?: number;
  hire_date?: string;
}

export interface EmployeeFormData {
  name: string;
  department: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  hire_date: string;
}

// 联系人任务类型
export interface ContactTask {
  id: number;
  name: string;
  status: TaskStatus;
  progress: number;
  device_id?: number;
  platform?: Platform;
  created_at?: string;
  completed_at?: string;
}

// 任务进度
export interface TaskProgress {
  total: number;
  completed: number;
  failed: number;
  remaining: number;
}

// 平台类型
export type Platform = 'xiaohongshu' | 'douyin' | 'kuaishou' | 'bilibili' | 'wechat' | 'qq' | 'weibo';

// 任务类型
export type TaskType = 'contact_follow' | 'precise_acquisition';

// 任务状态
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

// 精准获客任务
export interface PreciseAcquisitionTask {
  id?: number;
  platform: Platform;
  search_keywords: string[];
  competitor_accounts: string[];
  target_keywords: string[];
  target_count: number;
  collected_count: number;
  preference_tags: string[];
  assigned_devices: number[];
  status: TaskStatus;
  cost_per_follow: number;
  created_at?: string;
}

// 用户余额
export interface UserBalance {
  current_balance: number;
  total_spent: number;
  last_updated: string;
}

// 关注统计
export interface FollowStatistics {
  total_follows: number;
  daily_follows: number;
  success_rate: number;
  cost_today: number;
  cost_total: number;
}

// 任务进度
export interface TaskProgress {
  task_id: number;
  device_id: number;
  current_progress: number;
  total_progress: number;
  status: TaskStatus;
  error_message?: string;
}
