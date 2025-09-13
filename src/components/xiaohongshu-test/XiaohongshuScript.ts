/**
 * 小红书自动关注流程脚本
 * 
 * 关注逻辑:
 * 1. 打开小红书app
 * 2. 点击左上角菜单按钮
 * 3. 点击【发现好友】
 * 4. 点击【通讯录】
 * 5. 出现通讯录好友，开始逐个点击关注按钮
 */

import { invoke } from '@tauri-apps/api/core';
import { adbManager } from './AdbManager';

// 小红书UI元素坐标和选择器配置
export const XIAOHONGSHU_UI_CONFIG = {
  // 应用包名
  PACKAGE_NAME: 'com.xingin.xhs',
  
  // 主要UI元素
  ELEMENTS: {
    // 左上角菜单按钮
    MENU_BUTTON: {
      description: '左上角菜单按钮',
      selector: 'android.widget.ImageView[@content-desc="个人中心"]',
      coordinates: { x: 60, y: 100 }, // 备用坐标
    },
    
    // 发现好友按钮
    DISCOVER_FRIENDS: {
      description: '发现好友',
      text: '发现好友',
      selector: 'android.widget.TextView[@text="发现好友"]',
    },
    
    // 通讯录按钮
    CONTACTS_TAB: {
      description: '通讯录选项卡',
      text: '通讯录',
      selector: 'android.widget.TextView[@text="通讯录"]',
    },
    
    // 关注按钮
    FOLLOW_BUTTON: {
      description: '关注按钮',
      text: '关注',
      selector: 'android.widget.Button[@text="关注"]',
    },
    
    // 已关注按钮
    FOLLOWING_BUTTON: {
      description: '已关注按钮',
      text: '已关注',
      selector: 'android.widget.Button[@text="已关注"]',
    },
    
    // 返回按钮
    BACK_BUTTON: {
      description: '返回按钮',
      selector: 'android.widget.ImageButton[@content-desc="返回"]',
    }
  },
  
  // 操作延时配置
  DELAYS: {
    APP_LAUNCH: 5000,        // 应用启动等待时间
    PAGE_LOAD: 3000,         // 页面加载等待时间
    CLICK_DELAY: 1500,       // 点击操作间隔
    FOLLOW_DELAY: 2000,      // 关注操作间隔
    SCROLL_DELAY: 1000,      // 滚动间隔
  },
  
  // 滚动配置
  SCROLL: {
    START_X: 540,            // 滚动起始X坐标
    START_Y: 1400,           // 滚动起始Y坐标
    END_X: 540,              // 滚动结束X坐标
    END_Y: 800,              // 滚动结束Y坐标
    DURATION: 500,           // 滚动持续时间
  }
};

// 关注步骤枚举
export enum FollowStep {
  LAUNCH_APP = 'launch_app',
  CLICK_MENU = 'click_menu',
  CLICK_DISCOVER_FRIENDS = 'click_discover_friends',
  CLICK_CONTACTS = 'click_contacts',
  FIND_FRIENDS = 'find_friends',
  FOLLOW_FRIENDS = 'follow_friends',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 关注结果类型
export interface FollowStepResult {
  step: FollowStep;
  success: boolean;
  message: string;
  screenshot?: string;
  coordinates?: { x: number; y: number };
  elementFound?: boolean;
}

// 好友信息类型
export interface XiaohongshuFriend {
  name: string;
  username?: string;
  isFollowing: boolean;
  followButtonCoords?: { x: number; y: number };
  avatar?: string;
}

/**
 * 小红书自动关注脚本类
 */
export class XiaohongshuAutoFollowScript {
  private deviceId: string;
  private isRunning: boolean = false;
  private currentStep: FollowStep = FollowStep.LAUNCH_APP;
  private stepResults: FollowStepResult[] = [];
  private followedCount: number = 0;
  private failedCount: number = 0;
  private maxFollowCount: number = 50;

  constructor(deviceId: string, maxFollowCount: number = 50) {
    this.deviceId = deviceId;
    this.maxFollowCount = maxFollowCount;
  }

  /**
   * 开始执行关注流程
   */
  async startFollowProcess(): Promise<{
    success: boolean;
    followedCount: number;
    failedCount: number;
    steps: FollowStepResult[];
    message: string;
  }> {
    this.isRunning = true;
    this.stepResults = [];
    this.followedCount = 0;
    this.failedCount = 0;

    try {
      console.log('🚀 开始小红书自动关注流程');

      // 步骤1: 启动小红书应用
      const launchResult = await this.launchXiaohongshuApp();
      if (!launchResult.success) {
        throw new Error(`启动应用失败: ${launchResult.message}`);
      }

      // 步骤2: 点击左上角菜单按钮
      const menuResult = await this.clickMenuButton();
      if (!menuResult.success) {
        throw new Error(`点击菜单按钮失败: ${menuResult.message}`);
      }

      // 步骤3: 点击发现好友
      const discoverResult = await this.clickDiscoverFriends();
      if (!discoverResult.success) {
        throw new Error(`点击发现好友失败: ${discoverResult.message}`);
      }

      // 步骤4: 点击通讯录
      const contactsResult = await this.clickContactsTab();
      if (!contactsResult.success) {
        throw new Error(`点击通讯录失败: ${contactsResult.message}`);
      }

      // 步骤5: 查找并关注好友
      const followResult = await this.followContactFriends();
      if (!followResult.success) {
        console.warn(`关注好友过程中出现问题: ${followResult.message}`);
      }

      const success = this.followedCount > 0;
      const message = success 
        ? `关注完成: 成功${this.followedCount}个，失败${this.failedCount}个`
        : '未能关注任何好友';

      return {
        success,
        followedCount: this.followedCount,
        failedCount: this.failedCount,
        steps: this.stepResults,
        message
      };

    } catch (error) {
      const errorMessage = `关注流程失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌', errorMessage);
      
      this.addStepResult({
        step: FollowStep.ERROR,
        success: false,
        message: errorMessage
      });

      return {
        success: false,
        followedCount: this.followedCount,
        failedCount: this.failedCount,
        steps: this.stepResults,
        message: errorMessage
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 步骤1: 启动小红书应用
   */
  private async launchXiaohongshuApp(): Promise<FollowStepResult> {
    console.log('📱 启动小红书应用...');
    this.currentStep = FollowStep.LAUNCH_APP;

    try {
      // 启动应用
      await invoke('execute_adb_command', {
        deviceId: this.deviceId,
        command: `shell am start -n ${XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME}/.activity.SplashActivity`
      });

      // 等待应用启动
      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.APP_LAUNCH);

      // 验证应用是否启动成功
      const currentApp = await this.getCurrentApp();
      const isLaunched = currentApp.includes(XIAOHONGSHU_UI_CONFIG.PACKAGE_NAME);

      const result: FollowStepResult = {
        step: FollowStep.LAUNCH_APP,
        success: isLaunched,
        message: isLaunched ? '小红书应用启动成功' : '小红书应用启动失败',
      };

      this.addStepResult(result);
      return result;

    } catch (error) {
      const result: FollowStepResult = {
        step: FollowStep.LAUNCH_APP,
        success: false,
        message: `启动应用失败: ${error}`
      };
      this.addStepResult(result);
      return result;
    }
  }

  /**
   * 步骤2: 点击左上角菜单按钮
   */
  private async clickMenuButton(): Promise<FollowStepResult> {
    console.log('🎯 点击左上角菜单按钮...');
    this.currentStep = FollowStep.CLICK_MENU;

    try {
      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);

      // 尝试通过UI元素查找菜单按钮
      const menuElement = await this.findElement(XIAOHONGSHU_UI_CONFIG.ELEMENTS.MENU_BUTTON.selector);
      
      let clickResult = false;
      if (menuElement) {
        clickResult = await this.clickElement(menuElement);
      } else {
        // 备用方案：使用坐标点击
        console.log('🔄 备用方案：使用坐标点击菜单按钮');
        const coords = XIAOHONGSHU_UI_CONFIG.ELEMENTS.MENU_BUTTON.coordinates;
        clickResult = await this.clickCoordinates(coords.x, coords.y);
      }

      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.CLICK_DELAY);

      const result: FollowStepResult = {
        step: FollowStep.CLICK_MENU,
        success: clickResult,
        message: clickResult ? '成功点击菜单按钮' : '点击菜单按钮失败',
        elementFound: !!menuElement
      };

      this.addStepResult(result);
      return result;

    } catch (error) {
      const result: FollowStepResult = {
        step: FollowStep.CLICK_MENU,
        success: false,
        message: `点击菜单按钮失败: ${error}`
      };
      this.addStepResult(result);
      return result;
    }
  }

  /**
   * 步骤3: 点击发现好友
   */
  private async clickDiscoverFriends(): Promise<FollowStepResult> {
    console.log('👥 点击发现好友...');
    this.currentStep = FollowStep.CLICK_DISCOVER_FRIENDS;

    try {
      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);

      // 查找发现好友按钮
      const discoverElement = await this.findElementByText(XIAOHONGSHU_UI_CONFIG.ELEMENTS.DISCOVER_FRIENDS.text);
      
      let clickResult = false;
      if (discoverElement) {
        clickResult = await this.clickElement(discoverElement);
      } else {
        throw new Error('未找到发现好友按钮');
      }

      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.CLICK_DELAY);

      const result: FollowStepResult = {
        step: FollowStep.CLICK_DISCOVER_FRIENDS,
        success: clickResult,
        message: clickResult ? '成功点击发现好友' : '点击发现好友失败',
        elementFound: !!discoverElement
      };

      this.addStepResult(result);
      return result;

    } catch (error) {
      const result: FollowStepResult = {
        step: FollowStep.CLICK_DISCOVER_FRIENDS,
        success: false,
        message: `点击发现好友失败: ${error}`
      };
      this.addStepResult(result);
      return result;
    }
  }

  /**
   * 步骤4: 点击通讯录
   */
  private async clickContactsTab(): Promise<FollowStepResult> {
    console.log('📞 点击通讯录选项卡...');
    this.currentStep = FollowStep.CLICK_CONTACTS;

    try {
      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);

      // 查找通讯录选项卡
      const contactsElement = await this.findElementByText(XIAOHONGSHU_UI_CONFIG.ELEMENTS.CONTACTS_TAB.text);
      
      let clickResult = false;
      if (contactsElement) {
        clickResult = await this.clickElement(contactsElement);
      } else {
        throw new Error('未找到通讯录选项卡');
      }

      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.PAGE_LOAD);

      const result: FollowStepResult = {
        step: FollowStep.CLICK_CONTACTS,
        success: clickResult,
        message: clickResult ? '成功点击通讯录' : '点击通讯录失败',
        elementFound: !!contactsElement
      };

      this.addStepResult(result);
      return result;

    } catch (error) {
      const result: FollowStepResult = {
        step: FollowStep.CLICK_CONTACTS,
        success: false,
        message: `点击通讯录失败: ${error}`
      };
      this.addStepResult(result);
      return result;
    }
  }

  /**
   * 步骤5: 关注通讯录好友
   */
  private async followContactFriends(): Promise<FollowStepResult> {
    console.log('❤️ 开始关注通讯录好友...');
    this.currentStep = FollowStep.FOLLOW_FRIENDS;

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = 10;
      
      while (scrollAttempts < maxScrollAttempts && this.followedCount < this.maxFollowCount) {
        const followResult = await this.processCurrentPageFollows();
        
        if (!followResult.hasButtons) {
          console.log('📜 当前页面无关注按钮，尝试滚动加载更多...');
          await this.scrollDown();
          scrollAttempts++;
          continue;
        }

        // 如果还需要继续关注，滚动到下一页
        if (this.followedCount < this.maxFollowCount) {
          await this.scrollDown();
          scrollAttempts++;
        }
      }

      const result: FollowStepResult = {
        step: FollowStep.FOLLOW_FRIENDS,
        success: this.followedCount > 0,
        message: `关注操作完成: 成功${this.followedCount}个，失败${this.failedCount}个`
      };

      this.addStepResult(result);
      return result;

    } catch (error) {
      const result: FollowStepResult = {
        step: FollowStep.FOLLOW_FRIENDS,
        success: false,
        message: `关注好友失败: ${error}`
      };
      this.addStepResult(result);
      return result;
    }
  }

  /**
   * 处理当前页面的关注操作
   */
  private async processCurrentPageFollows(): Promise<{ hasButtons: boolean }> {
    const followButtons = await this.findFollowButtons();
    
    if (followButtons.length === 0) {
      return { hasButtons: false };
    }

    // 逐个点击关注按钮
    for (const button of followButtons) {
      if (this.followedCount >= this.maxFollowCount) break;
      
      try {
        const followResult = await this.clickFollowButton(button);
        if (followResult) {
          this.followedCount++;
          console.log(`✅ 成功关注第 ${this.followedCount} 个好友`);
        } else {
          this.failedCount++;
          console.log(`❌ 关注失败，失败计数: ${this.failedCount}`);
        }
        
        await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.FOLLOW_DELAY);
      } catch (error) {
        this.failedCount++;
        console.error(`关注操作出错: ${error}`);
      }
    }

    return { hasButtons: true };
  }

  // ============ 辅助方法 ============

  /**
   * 获取当前运行的应用
   */
  private async getCurrentApp(): Promise<string> {
    try {
      const currentApp = await adbManager.getCurrentApp(this.deviceId);
      return currentApp || '';
    } catch (error) {
      console.error('获取当前应用失败:', error);
      return '';
    }
  }

  /**
   * 查找UI元素
   */
  private async findElement(selector: string): Promise<any> {
    try {
      const xmlContent = await adbManager.getUILayout(this.deviceId);
      if (!xmlContent) return null;
      
      // 简单的选择器匹配
      if (xmlContent.includes(selector)) {
        return { selector, found: true };
      }
      return null;
    } catch (error) {
      console.error(`查找元素失败 ${selector}:`, error);
      return null;
    }
  }

  /**
   * 通过文本查找元素
   */
  private async findElementByText(text: string): Promise<any> {
    try {
      const element = await adbManager.findElementByText(this.deviceId, text);
      return element;
    } catch (error) {
      console.error(`通过文本查找元素失败 ${text}:`, error);
      return null;
    }
  }

  /**
   * 点击元素
   */
  private async clickElement(element: any): Promise<boolean> {
    try {
      if (element && element.center) {
        return await adbManager.clickCoordinates(this.deviceId, element.center.x, element.center.y);
      } else if (element && element.found) {
        // 如果没有坐标信息，返回true表示找到了元素
        console.log('找到元素但无坐标信息:', element);
        return true;
      }
      return false;
    } catch (error) {
      console.error('点击元素失败:', error);
      return false;
    }
  }

  /**
   * 点击坐标
   */
  private async clickCoordinates(x: number, y: number): Promise<boolean> {
    try {
      const success = await adbManager.clickCoordinates(this.deviceId, x, y);
      if (success) {
        console.log(`✅ 点击坐标 (${x}, ${y})`);
      }
      return success;
    } catch (error) {
      console.error(`点击坐标失败 (${x}, ${y}):`, error);
      return false;
    }
  }

  /**
   * 查找关注按钮
   */
  private async findFollowButtons(): Promise<Array<{ x: number; y: number }>> {
    try {
      const xmlContent = await adbManager.getUILayout(this.deviceId);
      if (!xmlContent) return [];

      const elements = adbManager.parseUIElements(xmlContent);
      const followButtons = elements.filter(el => 
        el.text === '关注' && el.clickable && el.enabled
      );

      const buttonCoords = followButtons.map(button => ({
        x: button.center.x,
        y: button.center.y
      }));

      console.log(`🔍 找到 ${buttonCoords.length} 个关注按钮`);
      return buttonCoords;

    } catch (error) {
      console.error('查找关注按钮失败:', error);
      return [];
    }
  }

  /**
   * 点击关注按钮
   */
  private async clickFollowButton(button: { x: number; y: number }): Promise<boolean> {
    try {
      return await this.clickCoordinates(button.x, button.y);
    } catch (error) {
      console.error('点击关注按钮失败:', error);
      return false;
    }
  }

  /**
   * 向下滚动
   */
  private async scrollDown(): Promise<void> {
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
        console.log('📜 页面向下滚动');
      }
      await this.sleep(XIAOHONGSHU_UI_CONFIG.DELAYS.SCROLL_DELAY);
    } catch (error) {
      console.error('滚动失败:', error);
    }
  }

  /**
   * 添加步骤结果
   */
  private addStepResult(result: FollowStepResult): void {
    this.stepResults.push(result);
    console.log(`📋 步骤 ${result.step}: ${result.message}`);
  }

  /**
   * 休眠
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止关注流程
   */
  public stop(): void {
    this.isRunning = false;
    console.log('⏹️ 关注流程已停止');
  }

  /**
   * 获取当前状态
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      currentStep: this.currentStep,
      followedCount: this.followedCount,
      failedCount: this.failedCount,
      totalSteps: this.stepResults.length
    };
  }
}