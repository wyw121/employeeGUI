import { invoke } from '@tauri-apps/api/core';
import type { Platform, ContactTask, PreciseAcquisitionTask, UserBalance, FollowStatistics } from '../types';

/**
 * 任务管理API
 * 封装任务相关的Tauri命令调用
 */
export class TaskAPI {
  /**
   * 提交通讯录关注任务
   */
  static async submitContactTask(data: {
    platform: Platform;
    filePath: string;
    selectedDevices: number[];
  }): Promise<ContactTask> {
    try {
      return await invoke<ContactTask>('submit_contact_task', data);
    } catch (error) {
      console.error('Failed to submit contact task:', error);
      throw new Error(`提交通讯录任务失败: ${error}`);
    }
  }

  /**
   * 提交精准获客任务
   */
  static async submitAcquisitionTask(data: {
    platform: Platform;
    searchKeywords: string[];
    competitorAccounts: string[];
    targetKeywords: string[];
    targetCount: number;
    preferenceTags: string[];
    selectedDevices: number[];
  }): Promise<PreciseAcquisitionTask> {
    try {
      return await invoke<PreciseAcquisitionTask>('submit_acquisition_task', data);
    } catch (error) {
      console.error('Failed to submit acquisition task:', error);
      throw new Error(`提交获客任务失败: ${error}`);
    }
  }

  /**
   * 获取任务进度
   */
  static async getTaskProgress(taskId: number): Promise<{
    current_progress: number;
    total_progress: number;
    status: string;
  }> {
    try {
      return await invoke('get_task_progress', { taskId });
    } catch (error) {
      console.error('Failed to get task progress:', error);
      throw new Error(`获取任务进度失败: ${error}`);
    }
  }

  /**
   * 暂停任务
   */
  static async pauseTask(taskId: number): Promise<boolean> {
    try {
      return await invoke<boolean>('pause_task', { taskId });
    } catch (error) {
      console.error('Failed to pause task:', error);
      throw new Error(`暂停任务失败: ${error}`);
    }
  }

  /**
   * 恢复任务
   */
  static async resumeTask(taskId: number): Promise<boolean> {
    try {
      return await invoke<boolean>('resume_task', { taskId });
    } catch (error) {
      console.error('Failed to resume task:', error);
      throw new Error(`恢复任务失败: ${error}`);
    }
  }

  /**
   * 停止任务
   */
  static async stopTask(taskId: number): Promise<boolean> {
    try {
      return await invoke<boolean>('stop_task', { taskId });
    } catch (error) {
      console.error('Failed to stop task:', error);
      throw new Error(`停止任务失败: ${error}`);
    }
  }
}

/**
 * 余额管理API
 */
export class BalanceAPI {
  /**
   * 获取用户余额
   */
  static async getUserBalance(): Promise<UserBalance> {
    try {
      return await invoke<UserBalance>('get_user_balance');
    } catch (error) {
      console.error('Failed to get user balance:', error);
      throw new Error(`获取余额信息失败: ${error}`);
    }
  }

  /**
   * 检查余额是否足够
   */
  static async checkBalance(requiredAmount: number): Promise<boolean> {
    try {
      return await invoke<boolean>('check_balance', { requiredAmount });
    } catch (error) {
      console.error('Failed to check balance:', error);
      return false;
    }
  }
}

/**
 * 统计数据API
 */
export class StatisticsAPI {
  /**
   * 获取关注统计数据
   */
  static async getFollowStatistics(): Promise<FollowStatistics> {
    try {
      return await invoke<FollowStatistics>('get_follow_statistics');
    } catch (error) {
      console.error('Failed to get follow statistics:', error);
      throw new Error(`获取统计数据失败: ${error}`);
    }
  }

  /**
   * 获取今日关注数据
   */
  static async getTodayFollowCount(): Promise<number> {
    try {
      return await invoke<number>('get_today_follow_count');
    } catch (error) {
      console.error('Failed to get today follow count:', error);
      return 0;
    }
  }
}

export default TaskAPI;

