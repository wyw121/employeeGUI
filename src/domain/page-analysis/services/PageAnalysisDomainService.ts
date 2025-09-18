/**
 * 页面分析领域服务 - 负责页面分析的核心业务逻辑
 */

import { UIElementEntity, ElementType, ElementAction, ElementGroupInfo, ElementGroupType } from '../entities/UIElement';
import { PageInfoEntity, PageType } from '../entities/PageInfo';
import { PageAnalysisEntity, PageAnalysisConfig } from '../entities/PageAnalysis';

/**
 * 页面类型识别服务
 */
export class PageTypeIdentifier {
  /**
   * 根据应用包名和Activity识别页面类型
   */
  identifyPageType(appPackage: string, activityName: string): { pageType: PageType; pageName: string } {
    // 小红书页面识别
    if (appPackage === 'com.xingin.xhs') {
      if (activityName.includes('MainActivity')) {
        return { pageType: PageType.XIAOHONGSHU_HOME, pageName: '小红书首页' };
      }
      if (activityName.includes('ProfileActivity') || activityName.includes('UserActivity')) {
        return { pageType: PageType.XIAOHONGSHU_PROFILE, pageName: '小红书个人中心' };
      }
      if (activityName.includes('MessageActivity') || activityName.includes('ChatActivity')) {
        return { pageType: PageType.XIAOHONGSHU_MESSAGES, pageName: '小红书消息页' };
      }
      if (activityName.includes('SearchActivity')) {
        return { pageType: PageType.XIAOHONGSHU_SEARCH, pageName: '小红书搜索页' };
      }
      if (activityName.includes('DetailActivity') || activityName.includes('NoteActivity')) {
        return { pageType: PageType.XIAOHONGSHU_DETAIL, pageName: '小红书详情页' };
      }
      return { pageType: PageType.UNKNOWN, pageName: '小红书未知页面' };
    }

    // 微信页面识别
    if (appPackage === 'com.tencent.mm') {
      if (activityName.includes('ChatActivity')) {
        return { pageType: PageType.WEIXIN_CHAT, pageName: '微信聊天页' };
      }
      if (activityName.includes('ContactActivity')) {
        return { pageType: PageType.WEIXIN_CONTACTS, pageName: '微信通讯录' };
      }
      return { pageType: PageType.UNKNOWN, pageName: '微信未知页面' };
    }

    // 系统通讯录
    if (appPackage.includes('contact')) {
      return { pageType: PageType.CONTACTS, pageName: '系统通讯录' };
    }

    // 设置页面
    if (appPackage.includes('settings') || activityName.includes('Settings')) {
      return { pageType: PageType.SETTINGS, pageName: '设置页面' };
    }

    return { pageType: PageType.UNKNOWN, pageName: '未知页面' };
  }
}

/**
 * 元素分类器服务
 */
export class ElementClassifier {
  /**
   * 根据XML节点属性确定元素类型
   */
  classifyElementType(
    className: string, 
    text: string, 
    contentDesc: string, 
    resourceId: string
  ): ElementType {
    // 基于类名判断
    if (className.includes('Button')) {
      return ElementType.BUTTON;
    }
    if (className.includes('EditText')) {
      return ElementType.EDIT_TEXT;
    }
    if (className.includes('TextView')) {
      return ElementType.TEXT_VIEW;
    }
    if (className.includes('ImageView')) {
      return ElementType.IMAGE_VIEW;
    }
    if (className.includes('CheckBox')) {
      return ElementType.CHECKBOX;
    }
    if (className.includes('Switch')) {
      return ElementType.SWITCH;
    }
    if (className.includes('Spinner')) {
      return ElementType.SPINNER;
    }
    if (className.includes('WebView')) {
      return ElementType.WEB_VIEW;
    }

    // 基于文本内容和资源ID判断
    const combinedText = `${text} ${contentDesc}`.toLowerCase();
    const resourceIdLower = resourceId.toLowerCase();

    // 导航按钮识别
    if (this.isNavigationButton(combinedText, resourceIdLower)) {
      return ElementType.NAVIGATION_BUTTON;
    }

    // 选项卡按钮识别
    if (this.isTabButton(combinedText, resourceIdLower)) {
      return ElementType.TAB_BUTTON;
    }

    // 列表项识别
    if (this.isListItem(className, resourceIdLower)) {
      return ElementType.LIST_ITEM;
    }

    return ElementType.OTHER;
  }

  private isNavigationButton(text: string, resourceId: string): boolean {
    const navKeywords = ['首页', '我', '消息', '关注', '发现', '购物', '视频', 'home', 'profile', 'message', 'follow'];
    const navResourceIds = ['tab_', 'nav_', 'bottom_'];
    
    return navKeywords.some(keyword => text.includes(keyword)) ||
           navResourceIds.some(id => resourceId.includes(id));
  }

  private isTabButton(text: string, resourceId: string): boolean {
    const tabKeywords = ['tab', '选项', '标签'];
    return tabKeywords.some(keyword => text.includes(keyword) || resourceId.includes(keyword));
  }

  private isListItem(className: string, resourceId: string): boolean {
    return className.includes('ListView') || 
           className.includes('RecyclerView') ||
           resourceId.includes('list_item') ||
           resourceId.includes('recycler_item');
  }

  /**
   * 确定支持的操作列表
   */
  determineSupportedActions(
    elementType: ElementType,
    isClickable: boolean,
    isScrollable: boolean,
    isEditable: boolean,
    isCheckable: boolean
  ): ElementAction[] {
    const actions: ElementAction[] = [];

    // 基本点击操作
    if (isClickable) {
      actions.push(ElementAction.CLICK, ElementAction.LONG_CLICK);
    }

    // 输入操作
    if (isEditable || elementType === ElementType.EDIT_TEXT) {
      actions.push(ElementAction.INPUT_TEXT, ElementAction.CLEAR_TEXT);
    }

    // 滚动操作
    if (isScrollable) {
      actions.push(
        ElementAction.SWIPE_UP,
        ElementAction.SWIPE_DOWN,
        ElementAction.SWIPE_LEFT,
        ElementAction.SWIPE_RIGHT,
        ElementAction.SCROLL_TO
      );
    }

    // 开关操作
    if (elementType === ElementType.SWITCH) {
      actions.push(ElementAction.SET_SWITCH_STATE);
    }

    // 选择操作
    if (elementType === ElementType.SPINNER) {
      actions.push(ElementAction.SELECT_OPTION);
    }

    return actions;
  }
}

/**
 * 元素去重和分组服务
 */
export class ElementDeduplicationService {
  /**
   * 对元素进行智能去重和分组
   */
  deduplicateAndGroup(elements: UIElementEntity[], threshold: number = 0.8): UIElementEntity[] {
    const groups: Map<string, UIElementEntity[]> = new Map();
    
    // 第一轮：按相似性分组
    for (const element of elements) {
      const groupKey = this.generateGroupKey(element);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(element);
    }

    const result: UIElementEntity[] = [];

    // 第二轮：处理每个分组
    for (const [groupKey, groupElements] of groups.entries()) {
      if (groupElements.length === 1) {
        // 单独元素，直接添加
        result.push(this.updateElementGroupInfo(
          groupElements[0],
          groupKey,
          ElementGroupType.INDIVIDUAL,
          0,
          1,
          true
        ));
      } else {
        // 多个相似元素，需要去重
        const processedGroup = this.processDuplicateGroup(groupKey, groupElements, threshold);
        result.push(...processedGroup);
      }
    }

    return result;
  }

  private generateGroupKey(element: UIElementEntity): string {
    // 基于元素类型、文本、类名和位置区域生成分组键
    const region = this.getPositionRegion(element.getCenterPoint().y);
    const normalizedText = this.normalizeText(element.text);
    
    return `${element.elementType}_${normalizedText}_${element.className}_${region}`;
  }

  private normalizeText(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private getPositionRegion(y: number): string {
    if (y < 600) return 'top';
    if (y < 1800) return 'middle';
    return 'bottom';
  }

  private processDuplicateGroup(
    groupKey: string, 
    elements: UIElementEntity[], 
    threshold: number
  ): UIElementEntity[] {
    // 确定分组类型
    const groupType = this.determineGroupType(elements[0]);
    
    // 选择代表元素（通常选择第一个或最具代表性的）
    const representative = this.selectRepresentativeElement(elements);
    
    // 更新所有元素的分组信息
    return elements.map((element, index) => 
      this.updateElementGroupInfo(
        element,
        groupKey,
        groupType,
        index,
        elements.length,
        element.id === representative.id
      )
    );
  }

  private determineGroupType(element: UIElementEntity): ElementGroupType {
    if (element.isNavigationButton()) {
      return ElementGroupType.NAVIGATION_BUTTONS;
    }
    if (element.isSocialButton()) {
      return ElementGroupType.SOCIAL_BUTTONS;
    }
    if (element.elementType === ElementType.TAB_BUTTON) {
      return ElementGroupType.TAB_ITEMS;
    }
    if (element.elementType === ElementType.EDIT_TEXT) {
      return ElementGroupType.INPUT_FIELDS;
    }
    if (element.elementType === ElementType.BUTTON) {
      return ElementGroupType.ACTION_BUTTONS;
    }
    if (element.elementType === ElementType.LIST_ITEM) {
      return ElementGroupType.LIST_ITEMS;
    }
    
    return ElementGroupType.INDIVIDUAL;
  }

  private selectRepresentativeElement(elements: UIElementEntity[]): UIElementEntity {
    // 选择逻辑：
    // 1. 优先选择有文本的元素
    // 2. 优先选择可点击的元素
    // 3. 优先选择位置更靠前的元素
    
    return elements.reduce((best, current) => {
      if (current.text && !best.text) return current;
      if (current.isClickable && !best.isClickable) return current;
      if (current.getCenterPoint().y < best.getCenterPoint().y) return current;
      return best;
    });
  }

  private updateElementGroupInfo(
    element: UIElementEntity,
    groupKey: string,
    groupType: ElementGroupType,
    groupIndex: number,
    groupTotal: number,
    isRepresentative: boolean
  ): UIElementEntity {
    // 创建新的元素实例，更新分组信息
    return new UIElementEntity({
      text: element.text,
      elementType: element.elementType,
      bounds: element.bounds,
      resourceId: element.resourceId,
      className: element.className,
      isClickable: element.isClickable,
      isEditable: element.isEditable,
      isEnabled: element.isEnabled,
      isScrollable: element.isScrollable,
      supportedActions: element.supportedActions,
      groupInfo: {
        groupKey,
        groupType,
        groupIndex,
        groupTotal,
        isRepresentative,
      },
      description: element.description,
      xpath: element.xpath,
      screenshot: element.screenshot,
    });
  }
}

/**
 * 页面分析协调服务
 */
export class PageAnalysisOrchestrator {
  constructor(
    private pageTypeIdentifier: PageTypeIdentifier,
    private elementClassifier: ElementClassifier,
    private deduplicationService: ElementDeduplicationService
  ) {}

  /**
   * 协调完整的页面分析流程
   */
  async orchestrateAnalysis(
    rawXmlData: string,
    appPackage: string,
    activityName: string,
    screenResolution: { width: number; height: number },
    config: PageAnalysisConfig
  ): Promise<PageAnalysisEntity> {
    const startTime = performance.now();

    try {
      // 1. 识别页面类型
      const { pageType, pageName } = this.pageTypeIdentifier.identifyPageType(appPackage, activityName);
      
      // 2. 创建页面信息实体
      const pageInfo = new PageInfoEntity({
        pageName,
        appPackage,
        activityName,
        pageType,
        screenResolution,
      });

      // 3. 解析元素（这部分需要XML解析逻辑）
      const rawElements = this.parseXmlElements(rawXmlData, config);

      // 4. 分类和增强元素
      const classifiedElements = rawElements.map(rawElement => 
        this.enhanceElement(rawElement)
      );

      // 5. 去重和分组
      const deduplicatedElements = config.enableDeduplication 
        ? this.deduplicationService.deduplicateAndGroup(classifiedElements, config.minSimilarityThreshold)
        : classifiedElements;

      // 6. 应用数量限制
      const finalElements = config.maxElements 
        ? deduplicatedElements.slice(0, config.maxElements)
        : deduplicatedElements;

      const analysisTime = performance.now() - startTime;

      return new PageAnalysisEntity({
        pageInfo,
        elements: finalElements,
        config,
        analysisTime,
        success: true,
      });

    } catch (error) {
      const analysisTime = performance.now() - startTime;
      
      return new PageAnalysisEntity({
        pageInfo: new PageInfoEntity({
          pageName: '分析失败',
          appPackage,
          activityName,
          pageType: PageType.UNKNOWN,
          screenResolution,
        }),
        elements: [],
        config,
        analysisTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  private parseXmlElements(xmlData: string, config: PageAnalysisConfig): RawElement[] {
    // TODO: 实现XML解析逻辑
    // 这里应该解析UiAutomator的XML输出
    return [];
  }

  private enhanceElement(rawElement: RawElement): UIElementEntity {
    const elementType = this.elementClassifier.classifyElementType(
      rawElement.className,
      rawElement.text,
      rawElement.contentDesc,
      rawElement.resourceId || ''
    );

    const supportedActions = this.elementClassifier.determineSupportedActions(
      elementType,
      rawElement.clickable,
      rawElement.scrollable,
      rawElement.className.includes('EditText'),
      rawElement.checkable
    );

    const description = this.generateElementDescription(rawElement, elementType);

    return new UIElementEntity({
      text: rawElement.text,
      elementType,
      bounds: rawElement.bounds,
      resourceId: rawElement.resourceId,
      className: rawElement.className,
      isClickable: rawElement.clickable,
      isEditable: rawElement.className.includes('EditText'),
      isEnabled: rawElement.enabled,
      isScrollable: rawElement.scrollable,
      supportedActions,
      groupInfo: {
        groupKey: 'temp',
        groupType: ElementGroupType.INDIVIDUAL,
        groupIndex: 0,
        groupTotal: 1,
        isRepresentative: true,
      },
      description,
    });
  }

  private generateElementDescription(rawElement: RawElement, elementType: ElementType): string {
    const baseText = rawElement.text || rawElement.contentDesc || '无文本';
    
    switch (elementType) {
      case ElementType.BUTTON:
        return `按钮: ${baseText}`;
      case ElementType.EDIT_TEXT:
        return `输入框: ${baseText}`;
      case ElementType.TEXT_VIEW:
        return `文本: ${baseText}`;
      case ElementType.NAVIGATION_BUTTON:
        return `导航按钮: ${baseText}`;
      case ElementType.IMAGE_VIEW:
        return `图片: ${baseText}`;
      default:
        return `${elementType}: ${baseText}`;
    }
  }
}

// 辅助类型
interface RawElement {
  text: string;
  contentDesc: string;
  resourceId?: string;
  className: string;
  bounds: { left: number; top: number; right: number; bottom: number };
  clickable: boolean;
  scrollable: boolean;
  enabled: boolean;
  checkable: boolean;
}