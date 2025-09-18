/**
 * 页面分析仓储接口定义
 */

import { PageAnalysisEntity } from '../entities/PageAnalysis';

/**
 * 页面分析仓储接口
 * 负责页面分析数据的持久化和检索
 */
export interface IPageAnalysisRepository {
  /**
   * 保存页面分析结果
   */
  save(analysis: PageAnalysisEntity): Promise<void>;

  /**
   * 根据ID查找页面分析结果
   */
  findById(id: string): Promise<PageAnalysisEntity | null>;

  /**
   * 查找设备的分析历史
   */
  findByDeviceId(deviceId: string, limit?: number): Promise<PageAnalysisEntity[]>;

  /**
   * 查找指定应用的分析历史
   */
  findByAppPackage(appPackage: string, limit?: number): Promise<PageAnalysisEntity[]>;

  /**
   * 查找指定页面类型的分析历史
   */
  findByPageType(pageType: string, limit?: number): Promise<PageAnalysisEntity[]>;

  /**
   * 删除过期的分析记录
   */
  cleanupOldRecords(olderThanDays: number): Promise<number>;

  /**
   * 获取分析统计信息
   */
  getStatistics(): Promise<RepositoryStatistics>;
}

/**
 * 设备UI状态仓储接口
 * 负责管理设备当前的UI状态信息
 */
export interface IDeviceUIStateRepository {
  /**
   * 获取设备当前的UI XML
   */
  getCurrentUIXml(deviceId: string): Promise<string>;

  /**
   * 获取设备当前应用信息
   */
  getCurrentAppInfo(deviceId: string): Promise<CurrentAppInfo>;

  /**
   * 获取设备屏幕分辨率
   */
  getScreenResolution(deviceId: string): Promise<{ width: number; height: number }>;

  /**
   * 执行UI操作
   */
  executeUIAction(deviceId: string, action: UIActionCommand): Promise<ActionResult>;

  /**
   * 截屏
   */
  takeScreenshot(deviceId: string): Promise<string>; // 返回Base64编码的图片
}

export interface RepositoryStatistics {
  totalAnalyses: number;
  uniqueApps: number;
  uniqueDevices: number;
  averageAnalysisTime: number;
  mostAnalyzedApp: string;
  recentAnalysisCount: number;
}

export interface CurrentAppInfo {
  packageName: string;
  activityName: string;
  appName: string;
  version?: string;
}

export interface UIActionCommand {
  type: 'click' | 'input' | 'swipe' | 'long_click';
  x?: number;
  y?: number;
  text?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
  executionTime: number;
}