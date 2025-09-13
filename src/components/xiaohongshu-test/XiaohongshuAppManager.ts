/**
 * 小红书应用专用工具类
 * 提供小红书应用相关的操作方法
 */

import { adbManager } from './AdbManager';
import { XIAOHONGSHU_UI_CONFIG } from './XiaohongshuScript';

export interface XiaohongshuAppStatus {
  isInstalled: boolean;
  isRunning: boolean;
  currentActivity?: string;
  version?: string;
}

export interface NavigationResult {
  success: boolean;
  message: string;
  currentPage?: string;
}

/**
 * 小红书应用管理器
 */
export class XiaohongshuAppManager {
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /**
   * 检查小红书应用状态
   */
  async checkAppStatus(): Promise<XiaohongshuAppStatus> {
    try {
      const isInstalled = await adbManager.isAppInstalled(this.deviceId, XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME);
      const currentApp = await adbManager.getCurrentApp(this.deviceId);
      const isRunning = currentApp === XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME;

      return {
        isInstalled,
        isRunning,
        currentActivity: isRunning ? currentApp : undefined
      };
    } catch (error) {
      console.error('检查小红书应用状态失败:', error);
      return {
        isInstalled: false,
        isRunning: false
      };
    }
  }

  /**
   * 启动小红书应用
   */
  async launchApp(): Promise<boolean> {
    try {
      const success = await adbManager.launchApp(
        this.deviceId, 
        XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME,
        '.activity.SplashActivity'
      );

      if (success) {
        // 等待应用启动
        await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.APP_LAUNCH);
        
        // 验证启动成功
        const status = await this.checkAppStatus();
        return status.isRunning;
      }

      return false;
    } catch (error) {
      console.error('启动小红书应用失败:', error);
      return false;
    }
  }

  /**
   * 导航到个人中心菜单
   */
  async navigateToMenu(): Promise<NavigationResult> {
    try {
      console.log('🎯 导航到个人中心菜单...');

      // 尝试查找菜单按钮
      const menuElement = await adbManager.findElementByText(this.deviceId, '个人中心');
      
      if (menuElement && menuElement.clickable) {
        const success = await adbManager.clickCoordinates(
          this.deviceId, 
          menuElement.center.x, 
          menuElement.center.y
        );
        
        if (success) {
          await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);
          return { success: true, message: '成功导航到个人中心菜单', currentPage: 'menu' };
        }
      }

      // 备用方案：使用固定坐标点击
      console.log('🔄 使用备用坐标点击菜单按钮');
      const coords = XIAOHONGSHU_UI_CONFIG.ELEMENTS.MENU_BUTTON.coordinates;
      const success = await adbManager.clickCoordinates(this.deviceId, coords.x, coords.y);
      
      if (success) {
        await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);
        return { success: true, message: '通过备用坐标成功导航到菜单', currentPage: 'menu' };
      }

      return { success: false, message: '无法找到或点击菜单按钮' };

    } catch (error) {
      return { success: false, message: `导航到菜单失败: ${error}` };
    }
  }

  /**
   * 导航到发现好友页面
   */
  async navigateToDiscoverFriends(): Promise<NavigationResult> {
    try {
      console.log('👥 导航到发现好友页面...');

      const discoverElement = await adbManager.findElementByText(this.deviceId, '发现好友');
      
      if (discoverElement && discoverElement.clickable) {
        const success = await adbManager.clickCoordinates(
          this.deviceId, 
          discoverElement.center.x, 
          discoverElement.center.y
        );
        
        if (success) {
          await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);
          return { success: true, message: '成功导航到发现好友页面', currentPage: 'discover_friends' };
        }
      }

      return { success: false, message: '无法找到发现好友按钮' };

    } catch (error) {
      return { success: false, message: `导航到发现好友失败: ${error}` };
    }
  }

  /**
   * 导航到通讯录页面
   */
  async navigateToContacts(): Promise<NavigationResult> {
    try {
      console.log('📞 导航到通讯录页面...');

      const contactsElement = await adbManager.findElementByText(this.deviceId, '通讯录');
      
      if (contactsElement && contactsElement.clickable) {
        const success = await adbManager.clickCoordinates(
          this.deviceId, 
          contactsElement.center.x, 
          contactsElement.center.y
        );
        
        if (success) {
          await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);
          return { success: true, message: '成功导航到通讯录页面', currentPage: 'contacts' };
        }
      }

      return { success: false, message: '无法找到通讯录选项卡' };

    } catch (error) {
      return { success: false, message: `导航到通讯录失败: ${error}` };
    }
  }

  /**
   * 获取当前页面的关注按钮
   */
  async getFollowButtons(): Promise<Array<{ x: number; y: number; friendName?: string }>> {
    try {
      const xmlContent = await adbManager.getUILayout(this.deviceId);
      if (!xmlContent) return [];

      const elements = adbManager.parseUIElements(xmlContent);
      const followButtons: Array<{ x: number; y: number; friendName?: string }> = [];

      // 查找关注按钮
      elements.forEach((element) => {
        if (element.text === '关注' && element.clickable && element.enabled) {
          // 尝试找到附近的用户名
          const nearbyElements = elements.filter(el => 
            Math.abs(el.center.y - element.center.y) < 100 && // 垂直距离小于100像素
            el.text && 
            el.text !== '关注' &&
            el.text.length > 0 &&
            !el.text.includes('小红书') &&
            !el.text.includes('用户')
          );

          const friendName = nearbyElements.length > 0 ? nearbyElements[0].text : undefined;

          followButtons.push({
            x: element.center.x,
            y: element.center.y,
            friendName
          });
        }
      });

      console.log(`🔍 找到 ${followButtons.length} 个关注按钮`);
      return followButtons;

    } catch (error) {
      console.error('获取关注按钮失败:', error);
      return [];
    }
  }

  /**
   * 点击关注按钮
   */
  async clickFollowButton(x: number, y: number): Promise<boolean> {
    try {
      const success = await adbManager.clickCoordinates(this.deviceId, x, y);
      if (success) {
        console.log(`✅ 点击关注按钮 (${x}, ${y})`);
        // 等待关注操作完成
        await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.FOLLOW_DELAY);
      }
      return success;
    } catch (error) {
      console.error(`点击关注按钮失败 (${x}, ${y}):`, error);
      return false;
    }
  }

  /**
   * 滚动页面加载更多好友
   */
  async scrollToLoadMore(): Promise<boolean> {
    try {
      const config = XIAOHONGSHU_UI_CONFIG.SCROLL;
      const success = await adbManager.swipe(
        this.deviceId,
        config.START_X,
        config.START_Y,
        config.END_X,
        config.END_Y,
        config.DURATION
      );
      
      if (success) {
        console.log('📜 滚动页面加载更多');
        await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.SCROLL_DELAY);
      }
      
      return success;
    } catch (error) {
      console.error('滚动加载失败:', error);
      return false;
    }
  }

  /**
   * 检查是否已经关注了某个用户
   */
  async isUserFollowed(x: number, y: number): Promise<boolean> {
    try {
      // 通过检查按钮附近是否有"已关注"文本来判断
      const xmlContent = await adbManager.getUILayout(this.deviceId);
      if (!xmlContent) return false;

      const elements = adbManager.parseUIElements(xmlContent);
      
      // 查找附近的"已关注"按钮
      const nearbyFollowedButton = elements.find(el => 
        el.text === '已关注' &&
        Math.abs(el.center.x - x) < 50 && // 水平距离小于50像素
        Math.abs(el.center.y - y) < 50    // 垂直距离小于50像素
      );

      return !!nearbyFollowedButton;
    } catch (error) {
      console.error('检查关注状态失败:', error);
      return false;
    }
  }

  /**
   * 批量关注当前页面的所有好友
   */
  async followAllCurrentPage(maxCount?: number): Promise<{
    followedCount: number;
    failedCount: number;
    skippedCount: number;
  }> {
    const results = {
      followedCount: 0,
      failedCount: 0,
      skippedCount: 0
    };

    try {
      const followButtons = await this.getFollowButtons();
      const actualMaxCount = maxCount || followButtons.length;

      for (let i = 0; i < Math.min(followButtons.length, actualMaxCount); i++) {
        const button = followButtons[i];

        // 检查是否已经关注
        const isFollowed = await this.isUserFollowed(button.x, button.y);
        if (isFollowed) {
          console.log(`⏭️ 跳过已关注用户 ${button.friendName || '未知'}`);
          results.skippedCount++;
          continue;
        }

        // 点击关注
        const success = await this.clickFollowButton(button.x, button.y);
        if (success) {
          results.followedCount++;
          console.log(`✅ 成功关注 ${button.friendName || '用户'} (${results.followedCount})`);
        } else {
          results.failedCount++;
          console.log(`❌ 关注失败 ${button.friendName || '用户'}`);
        }

        // 避免操作过快
        await adbManager.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.FOLLOW_DELAY);
      }

      return results;
    } catch (error) {
      console.error('批量关注失败:', error);
      return results;
    }
  }

  /**
   * 完整的关注流程
   */
  async executeFullFollowProcess(maxFollowCount: number = 50): Promise<{
    success: boolean;
    followedCount: number;
    failedCount: number;
    skippedCount: number;
    message: string;
    steps: string[];
  }> {
    const steps: string[] = [];
    let totalFollowed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    try {
      // 步骤1: 启动应用
      steps.push('启动小红书应用');
      const launchSuccess = await this.launchApp();
      if (!launchSuccess) {
        throw new Error('启动应用失败');
      }

      // 步骤2: 导航到菜单
      steps.push('导航到个人中心菜单');
      const menuResult = await this.navigateToMenu();
      if (!menuResult.success) {
        throw new Error(menuResult.message);
      }

      // 步骤3: 导航到发现好友
      steps.push('导航到发现好友页面');
      const discoverResult = await this.navigateToDiscoverFriends();
      if (!discoverResult.success) {
        throw new Error(discoverResult.message);
      }

      // 步骤4: 导航到通讯录
      steps.push('导航到通讯录页面');
      const contactsResult = await this.navigateToContacts();
      if (!contactsResult.success) {
        throw new Error(contactsResult.message);
      }

      // 步骤5: 批量关注
      steps.push('开始批量关注好友');
      let scrollAttempts = 0;
      const maxScrollAttempts = 10;

      while (totalFollowed < maxFollowCount && scrollAttempts < maxScrollAttempts) {
        const pageResults = await this.followAllCurrentPage(maxFollowCount - totalFollowed);
        
        totalFollowed += pageResults.followedCount;
        totalFailed += pageResults.failedCount;
        totalSkipped += pageResults.skippedCount;

        if (pageResults.followedCount === 0 && pageResults.skippedCount === 0) {
          // 如果当前页面没有可关注的用户，尝试滚动
          const scrollSuccess = await this.scrollToLoadMore();
          if (!scrollSuccess) {
            break;
          }
          scrollAttempts++;
        } else {
          // 如果还需要继续关注，滚动到下一页
          if (totalFollowed < maxFollowCount) {
            await this.scrollToLoadMore();
            scrollAttempts++;
          }
        }
      }

      steps.push(`关注流程完成: 成功${totalFollowed}个，失败${totalFailed}个，跳过${totalSkipped}个`);

      return {
        success: totalFollowed > 0,
        followedCount: totalFollowed,
        failedCount: totalFailed,
        skippedCount: totalSkipped,
        message: `关注完成: 成功${totalFollowed}个，失败${totalFailed}个，跳过${totalSkipped}个`,
        steps
      };

    } catch (error) {
      const errorMessage = `关注流程失败: ${error}`;
      steps.push(errorMessage);

      return {
        success: false,
        followedCount: totalFollowed,
        failedCount: totalFailed,
        skippedCount: totalSkipped,
        message: errorMessage,
        steps
      };
    }
  }
}

// 导出工厂函数
export const createXiaohongshuAppManager = (deviceId: string) => {
  return new XiaohongshuAppManager(deviceId);
};