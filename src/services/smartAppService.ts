import { invoke } from '@tauri-apps/api/core';
import type { AppInfo, AppLaunchResult } from '../types/smartComponents';

/**
 * 智能应用管理服务
 * 提供设备应用发现、搜索、启动等功能
 */
export class SmartAppService {
  private cachedApps: Map<string, AppInfo[]> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取设备上的所有应用
   */
  async getDeviceApps(deviceId: string, includeSystemApps = false): Promise<AppInfo[]> {
    try {
      const apps = await invoke<AppInfo[]>('get_device_apps', {
        deviceId,
        includeSystemApps
      });
      
      // 缓存结果
      this.cachedApps.set(deviceId, apps);
      
      return apps;
    } catch (error) {
      console.error('获取设备应用失败:', error);
      
      // 返回缓存的结果
      const cached = this.cachedApps.get(deviceId);
      if (cached) {
        console.warn('使用缓存的应用列表');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * 搜索设备应用
   */
  async searchDeviceApps(deviceId: string, query: string): Promise<AppInfo[]> {
    try {
      return await invoke<AppInfo[]>('search_device_apps', {
        deviceId,
        query
      });
    } catch (error) {
      console.error('搜索设备应用失败:', error);
      throw error;
    }
  }

  /**
   * 启动设备应用
   */
  async launchDeviceApp(deviceId: string, packageName: string): Promise<AppLaunchResult> {
    try {
      return await invoke<AppLaunchResult>('launch_device_app', {
        deviceId,
        packageName
      });
    } catch (error) {
      console.error('启动应用失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存的设备应用
   */
  async getCachedDeviceApps(deviceId: string): Promise<AppInfo[]> {
    try {
      return await invoke<AppInfo[]>('get_cached_device_apps', {
        deviceId
      });
    } catch (error) {
      console.error('获取缓存应用失败:', error);
      return [];
    }
  }

  /**
   * 获取热门应用列表
   */
  async getPopularApps(): Promise<AppInfo[]> {
    try {
      return await invoke<AppInfo[]>('get_popular_apps');
    } catch (error) {
      console.error('获取热门应用失败:', error);
      return [];
    }
  }

  /**
   * 按类别过滤应用
   */
  filterAppsByCategory(apps: AppInfo[], category: 'all' | 'user' | 'system'): AppInfo[] {
    switch (category) {
      case 'user':
        return apps.filter(app => !app.is_system_app);
      case 'system':
        return apps.filter(app => app.is_system_app);
      default:
        return apps;
    }
  }

  /**
   * 按安装状态过滤应用
   */
  filterAppsByStatus(apps: AppInfo[], status: 'all' | 'enabled' | 'disabled'): AppInfo[] {
    switch (status) {
      case 'enabled':
        return apps.filter(app => app.is_enabled);
      case 'disabled':
        return apps.filter(app => !app.is_enabled);
      default:
        return apps;
    }
  }

  /**
   * 智能搜索应用
   * 支持应用名称、包名、拼音首字母等搜索方式
   */
  intelligentSearch(apps: AppInfo[], query: string): AppInfo[] {
    if (!query.trim()) {
      return apps;
    }

    const lowercaseQuery = query.toLowerCase();
    
    return apps.filter(app => {
      // 应用名称匹配
      if (app.app_name.toLowerCase().includes(lowercaseQuery)) {
        return true;
      }
      
      // 包名匹配
      if (app.package_name.toLowerCase().includes(lowercaseQuery)) {
        return true;
      }
      
      // 拼音首字母匹配 (简单实现)
      const firstLetters = this.getFirstLetters(app.app_name);
      if (firstLetters.includes(lowercaseQuery)) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * 获取应用名称的拼音首字母 (简化实现)
   */
  private getFirstLetters(text: string): string {
    // 简单的拼音首字母提取，实际项目中可以使用更完善的库
    const pinyinMap: Record<string, string> = {
      '微': 'w', '信': 'x', '支': 'z', '付': 'f',
      '淘': 't', '小': 'x', '红': 'h', '书': 's',
      '抖': 'd', '音': 'y', '快': 'k', '手': 's',
      '腾': 't', '讯': 'x', '视': 's', '频': 'p',
      '网': 'w', '易': 'y', '云': 'y', '乐': 'l'
    };
    
    return text.split('').map(char => pinyinMap[char] || char).join('').toLowerCase();
  }

  /**
   * 按使用频率排序应用 (根据应用名称和常见程度)
   */
  sortAppsByPopularity(apps: AppInfo[]): AppInfo[] {
    const popularityScores: Record<string, number> = {
      // 社交通讯
      'com.tencent.mm': 100,           // 微信
      'com.tencent.mobileqq': 95,      // QQ
      'com.sina.weibo': 85,            // 微博
      'com.zhiliaoapp.musically': 90,  // 抖音
      'com.ss.android.ugc.aweme': 90,  // 抖音
      
      // 支付购物
      'com.eg.android.AlipayGphone': 95,  // 支付宝
      'com.taobao.taobao': 85,            // 淘宝
      'com.jingdong.app.mall': 80,        // 京东
      
      // 出行地图
      'com.autonavi.minimap': 85,         // 高德地图
      'com.baidu.BaiduMap': 80,           // 百度地图
      'com.didi.psnger': 75,              // 滴滴出行
      
      // 视频娱乐
      'com.youku.phone': 70,              // 优酷
      'com.tencent.qqlive': 75,           // 腾讯视频
      'tv.danmaku.bili': 85,              // 哔哩哔哩
      
      // 工具类
      'com.tencent.qqmusic': 70,          // QQ音乐
      'com.netease.cloudmusic': 75,       // 网易云音乐
    };

    return [...apps].sort((a, b) => {
      const scoreA = popularityScores[a.package_name] || 0;
      const scoreB = popularityScores[b.package_name] || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // 如果受欢迎程度相同，按应用名称排序
      return a.app_name.localeCompare(b.app_name);
    });
  }

  /**
   * 清除设备应用缓存
   */
  clearCache(deviceId?: string): void {
    if (deviceId) {
      this.cachedApps.delete(deviceId);
    } else {
      this.cachedApps.clear();
    }
  }

  /**
   * 检查应用是否为常用应用
   */
  isPopularApp(packageName: string): boolean {
    const popularApps = [
      'com.tencent.mm', 'com.tencent.mobileqq', 'com.sina.weibo',
      'com.zhiliaoapp.musically', 'com.ss.android.ugc.aweme',
      'com.eg.android.AlipayGphone', 'com.taobao.taobao',
      'com.jingdong.app.mall', 'com.autonavi.minimap',
      'com.baidu.BaiduMap', 'tv.danmaku.bili'
    ];
    
    return popularApps.includes(packageName);
  }

  /**
   * 获取应用图标URL (如果支持)
   */
  getAppIconUrl(packageName: string): string | null {
    // 这里可以实现获取应用图标的逻辑
    // 可能需要后端支持提取应用图标
    return null;
  }
}

// 导出服务实例
export const smartAppService = new SmartAppService();