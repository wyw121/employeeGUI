/**
 * 页面分析领域实体 - 页面信息
 */

export enum PageType {
  XIAOHONGSHU_HOME = 'xiaohongshu_home',
  XIAOHONGSHU_PROFILE = 'xiaohongshu_profile', 
  XIAOHONGSHU_MESSAGES = 'xiaohongshu_messages',
  XIAOHONGSHU_SEARCH = 'xiaohongshu_search',
  XIAOHONGSHU_DETAIL = 'xiaohongshu_detail',
  WEIXIN_CHAT = 'weixin_chat',
  WEIXIN_CONTACTS = 'weixin_contacts',
  CONTACTS = 'contacts',
  SETTINGS = 'settings',
  UNKNOWN = 'unknown',
}

export interface ScreenResolution {
  width: number;
  height: number;
}

export interface PageInfo {
  readonly id: string;
  readonly pageName: string;
  readonly appPackage: string;
  readonly activityName: string;
  readonly pageType: PageType;
  readonly title?: string;
  readonly screenResolution: ScreenResolution;
  readonly analyzedAt: Date;
}

export class PageInfoEntity implements PageInfo {
  public readonly id: string;
  public readonly pageName: string;
  public readonly appPackage: string;
  public readonly activityName: string;
  public readonly pageType: PageType;
  public readonly title?: string;
  public readonly screenResolution: ScreenResolution;
  public readonly analyzedAt: Date;

  constructor(params: {
    pageName: string;
    appPackage: string;
    activityName: string;
    pageType: PageType;
    title?: string;
    screenResolution: ScreenResolution;
    analyzedAt?: Date;
  }) {
    this.id = this.generateId(params.appPackage, params.activityName);
    this.pageName = params.pageName;
    this.appPackage = params.appPackage;
    this.activityName = params.activityName;
    this.pageType = params.pageType;
    this.title = params.title;
    this.screenResolution = params.screenResolution;
    this.analyzedAt = params.analyzedAt || new Date();
  }

  private generateId(appPackage: string, activityName: string): string {
    return `page_${appPackage}_${activityName}_${Date.now()}`;
  }

  /**
   * 判断是否为小红书页面
   */
  isXiaohongshuPage(): boolean {
    return this.appPackage === 'com.xingin.xhs';
  }

  /**
   * 判断是否为微信页面
   */
  isWeixinPage(): boolean {
    return this.appPackage === 'com.tencent.mm';
  }

  /**
   * 获取页面类型的友好名称
   */
  getPageTypeDisplayName(): string {
    const typeNames: Record<PageType, string> = {
      [PageType.XIAOHONGSHU_HOME]: '小红书首页',
      [PageType.XIAOHONGSHU_PROFILE]: '小红书个人中心',
      [PageType.XIAOHONGSHU_MESSAGES]: '小红书消息页',
      [PageType.XIAOHONGSHU_SEARCH]: '小红书搜索页',
      [PageType.XIAOHONGSHU_DETAIL]: '小红书详情页',
      [PageType.WEIXIN_CHAT]: '微信聊天页',
      [PageType.WEIXIN_CONTACTS]: '微信通讯录',
      [PageType.CONTACTS]: '系统通讯录',
      [PageType.SETTINGS]: '设置页面',
      [PageType.UNKNOWN]: '未知页面',
    };

    return typeNames[this.pageType] || '未知页面';
  }

  /**
   * 转换为普通对象
   */
  toPlainObject(): PageInfo {
    return {
      id: this.id,
      pageName: this.pageName,
      appPackage: this.appPackage,
      activityName: this.activityName,
      pageType: this.pageType,
      title: this.title,
      screenResolution: this.screenResolution,
      analyzedAt: this.analyzedAt,
    };
  }
}