/**
 * Tauri 页面分析仓储实现
 */

import { invoke } from '@tauri-apps/api/core';
import { 
  IPageAnalysisRepository, 
  IDeviceUIStateRepository,
  UIActionCommand,
  ActionResult,
  CurrentAppInfo,
  RepositoryStatistics
} from '../../domain/page-analysis/repositories/IPageAnalysisRepository';
import { PageAnalysisEntity } from '../../domain/page-analysis/entities/PageAnalysis';

/**
 * Tauri 页面分析仓储
 */
export class TauriPageAnalysisRepository implements IPageAnalysisRepository {
  async save(analysis: PageAnalysisEntity): Promise<void> {
    try {
      await invoke('save_page_analysis', {
        analysisData: {
          id: analysis.id,
          pageInfo: analysis.pageInfo,
          elements: analysis.elements.map(element => ({
            id: element.id,
            elementType: element.elementType,
            text: element.text,
            bounds: element.bounds,
            xpath: element.xpath,
            resourceId: element.resourceId,
            className: element.className,
            isClickable: element.isClickable,
            isScrollable: element.isScrollable,
            isEnabled: element.isEnabled,
            groupInfo: element.groupInfo,
          })),
          statistics: analysis.statistics,
          config: analysis.config,
          analysisTime: analysis.analysisTime,
          success: analysis.success,
          errorMessage: analysis.errorMessage,
        }
      });
    } catch (error) {
      console.error('保存页面分析结果失败:', error);
      throw new Error(`保存页面分析失败: ${error}`);
    }
  }

  async findById(id: string): Promise<PageAnalysisEntity | null> {
    try {
      const result = await invoke('get_page_analysis_by_id', { analysisId: id });
      return result as PageAnalysisEntity | null;
    } catch (error) {
      console.error('获取页面分析结果失败:', error);
      return null;
    }
  }

  async findByDeviceId(deviceId: string, limit?: number): Promise<PageAnalysisEntity[]> {
    try {
      const results = await invoke('get_page_analyses_by_device', { deviceId, limit });
      return results as PageAnalysisEntity[];
    } catch (error) {
      console.error('获取设备页面分析历史失败:', error);
      return [];
    }
  }

  async findByAppPackage(appPackage: string, limit?: number): Promise<PageAnalysisEntity[]> {
    try {
      const results = await invoke('get_page_analyses_by_app', { appPackage, limit });
      return results as PageAnalysisEntity[];
    } catch (error) {
      console.error('获取应用页面分析历史失败:', error);
      return [];
    }
  }

  async findByPageType(pageType: string, limit?: number): Promise<PageAnalysisEntity[]> {
    try {
      const results = await invoke('get_page_analyses_by_type', { pageType, limit });
      return results as PageAnalysisEntity[];
    } catch (error) {
      console.error('获取页面类型分析历史失败:', error);
      return [];
    }
  }

  async cleanupOldRecords(olderThanDays: number): Promise<number> {
    try {
      const result = await invoke('cleanup_old_page_analyses', { olderThanDays });
      return result as number;
    } catch (error) {
      console.error('清理旧页面分析记录失败:', error);
      return 0;
    }
  }

  async getStatistics(): Promise<RepositoryStatistics> {
    try {
      const result = await invoke('get_page_analysis_statistics');
      return result as RepositoryStatistics;
    } catch (error) {
      console.error('获取页面分析统计失败:', error);
      throw new Error(`获取页面分析统计失败: ${error}`);
    }
  }

  async findRecent(deviceId: string, limit: number): Promise<PageAnalysisEntity[]> {
    return this.findByDeviceId(deviceId, limit);
  }

  async delete(id: string): Promise<void> {
    try {
      await invoke('delete_page_analysis', { analysisId: id });
    } catch (error) {
      console.error('删除页面分析失败:', error);
      throw new Error(`删除页面分析失败: ${error}`);
    }
  }

  async deleteByDeviceId(deviceId: string): Promise<void> {
    try {
      await invoke('delete_page_analyses_by_device', { deviceId });
    } catch (error) {
      console.error('删除设备页面分析历史失败:', error);
      throw new Error(`删除设备页面分析历史失败: ${error}`);
    }
  }
}

/**
 * Tauri 设备UI状态仓储
 */
export class TauriDeviceUIStateRepository implements IDeviceUIStateRepository {
  async getCurrentUIXml(deviceId: string): Promise<string> {
    try {
      const result = await invoke('get_device_ui_xml', { deviceId });
      return result as string;
    } catch (error) {
      console.error('获取设备UI XML失败:', error);
      throw new Error(`获取设备UI XML失败: ${error}`);
    }
  }

  async getCurrentAppInfo(deviceId: string): Promise<CurrentAppInfo> {
    try {
      const result = await invoke('get_current_app_info', { deviceId });
      const appInfo = result as { packageName: string; activityName: string; appName?: string };
      return {
        packageName: appInfo.packageName,
        activityName: appInfo.activityName,
        appName: appInfo.appName || appInfo.packageName, // 如果没有appName，使用packageName
      };
    } catch (error) {
      console.error('获取当前应用信息失败:', error);
      throw new Error(`获取当前应用信息失败: ${error}`);
    }
  }

  async getScreenResolution(deviceId: string): Promise<{ width: number; height: number }> {
    try {
      const result = await invoke('get_screen_resolution', { deviceId });
      return result as { width: number; height: number };
    } catch (error) {
      console.error('获取屏幕分辨率失败:', error);
      throw new Error(`获取屏幕分辨率失败: ${error}`);
    }
  }

  async executeUIAction(deviceId: string, command: UIActionCommand): Promise<ActionResult> {
    try {
      const result = await invoke('execute_ui_action', { 
        deviceId, 
        command: {
          type: command.type,
          x: command.x,
          y: command.y,
          text: command.text,
          direction: command.direction,
          duration: command.duration,
        }
      });
      return result as ActionResult;
    } catch (error) {
      console.error('执行UI操作失败:', error);
      throw new Error(`执行UI操作失败: ${error}`);
    }
  }

  async takeScreenshot(deviceId: string): Promise<string> {
    try {
      const result = await invoke('capture_device_screenshot', { deviceId });
      return result as string;
    } catch (error) {
      console.error('截取设备屏幕失败:', error);
      throw new Error(`截取设备屏幕失败: ${error}`);
    }
  }

  async captureScreenshot(deviceId: string): Promise<string> {
    return this.takeScreenshot(deviceId);
  }
}