/**
 * 页面分析领域实体 - UI元素
 */

export enum ElementType {
  BUTTON = 'button',
  EDIT_TEXT = 'edit_text',
  TEXT_VIEW = 'text_view',
  IMAGE_VIEW = 'image_view',
  LIST_ITEM = 'list_item',
  NAVIGATION_BUTTON = 'navigation_button',
  TAB_BUTTON = 'tab_button',
  SWITCH = 'switch',
  CHECKBOX = 'checkbox',
  SPINNER = 'spinner',
  WEB_VIEW = 'web_view',
  OTHER = 'other',
}

export enum ElementAction {
  CLICK = 'click',
  LONG_CLICK = 'long_click',
  INPUT_TEXT = 'input_text',
  CLEAR_TEXT = 'clear_text',
  SWIPE_UP = 'swipe_up',
  SWIPE_DOWN = 'swipe_down',
  SWIPE_LEFT = 'swipe_left',
  SWIPE_RIGHT = 'swipe_right',
  SCROLL_TO = 'scroll_to',
  SET_SWITCH_STATE = 'set_switch_state',
  SELECT_OPTION = 'select_option',
}

export enum ElementGroupType {
  NAVIGATION_BUTTONS = 'navigation_buttons',
  ACTION_BUTTONS = 'action_buttons',
  LIST_ITEMS = 'list_items',
  TAB_ITEMS = 'tab_items',
  SOCIAL_BUTTONS = 'social_buttons',
  INPUT_FIELDS = 'input_fields',
  INDIVIDUAL = 'individual',
}

export interface ElementBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ElementGroupInfo {
  groupKey: string;
  groupType: ElementGroupType;
  groupIndex: number;
  groupTotal: number;
  isRepresentative: boolean;
}

export interface UIElement {
  readonly id: string;
  readonly text: string;
  readonly elementType: ElementType;
  readonly bounds: ElementBounds;
  readonly resourceId?: string;
  readonly className: string;
  readonly isClickable: boolean;
  readonly isEditable: boolean;
  readonly isEnabled: boolean;
  readonly isScrollable: boolean;
  readonly supportedActions: ElementAction[];
  readonly groupInfo: ElementGroupInfo;
  readonly description: string;
  readonly xpath?: string;
  readonly screenshot?: string; // Base64编码的截图
}

export class UIElementEntity implements UIElement {
  public readonly id: string;
  public readonly text: string;
  public readonly elementType: ElementType;
  public readonly bounds: ElementBounds;
  public readonly resourceId?: string;
  public readonly className: string;
  public readonly isClickable: boolean;
  public readonly isEditable: boolean;
  public readonly isEnabled: boolean;
  public readonly isScrollable: boolean;
  public readonly supportedActions: ElementAction[];
  public readonly groupInfo: ElementGroupInfo;
  public readonly description: string;
  public readonly xpath?: string;
  public readonly screenshot?: string;

  constructor(params: {
    text: string;
    elementType: ElementType;
    bounds: ElementBounds;
    resourceId?: string;
    className: string;
    isClickable: boolean;
    isEditable: boolean;
    isEnabled: boolean;
    isScrollable: boolean;
    supportedActions: ElementAction[];
    groupInfo: ElementGroupInfo;
    description: string;
    xpath?: string;
    screenshot?: string;
  }) {
    this.id = this.generateId(params);
    this.text = params.text;
    this.elementType = params.elementType;
    this.bounds = params.bounds;
    this.resourceId = params.resourceId;
    this.className = params.className;
    this.isClickable = params.isClickable;
    this.isEditable = params.isEditable;
    this.isEnabled = params.isEnabled;
    this.isScrollable = params.isScrollable;
    this.supportedActions = params.supportedActions;
    this.groupInfo = params.groupInfo;
    this.description = params.description;
    this.xpath = params.xpath;
    this.screenshot = params.screenshot;
  }

  private generateId(params: any): string {
    const key = `${params.className}_${params.text}_${params.bounds.left}_${params.bounds.top}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * 获取元素中心点坐标
   */
  getCenterPoint(): { x: number; y: number } {
    return {
      x: Math.floor((this.bounds.left + this.bounds.right) / 2),
      y: Math.floor((this.bounds.top + this.bounds.bottom) / 2),
    };
  }

  /**
   * 获取元素尺寸
   */
  getSize(): { width: number; height: number } {
    return {
      width: this.bounds.right - this.bounds.left,
      height: this.bounds.bottom - this.bounds.top,
    };
  }

  /**
   * 判断元素是否可见（基于尺寸）
   */
  isVisible(): boolean {
    const size = this.getSize();
    return size.width > 0 && size.height > 0;
  }

  /**
   * 判断是否为导航按钮
   */
  isNavigationButton(): boolean {
    const navTexts = ['首页', '我', '消息', '关注', '发现', '购物', '视频'];
    return this.elementType === ElementType.NAVIGATION_BUTTON || 
           navTexts.some(text => this.text.includes(text));
  }

  /**
   * 判断是否为社交按钮
   */
  isSocialButton(): boolean {
    const socialTexts = ['点赞', '评论', '分享', '收藏', '关注', '取消关注'];
    return socialTexts.some(text => this.text.includes(text));
  }

  /**
   * 获取推荐的操作
   */
  getRecommendedAction(): ElementAction {
    if (this.isEditable) {
      return ElementAction.INPUT_TEXT;
    }
    if (this.isClickable) {
      return ElementAction.CLICK;
    }
    if (this.isScrollable) {
      return ElementAction.SWIPE_DOWN;
    }
    return ElementAction.CLICK;
  }

  /**
   * 判断与另一个元素是否相似（用于去重）
   */
  isSimilarTo(other: UIElementEntity, threshold: number = 0.8): boolean {
    // 文本相似度
    const textSimilarity = this.calculateTextSimilarity(this.text, other.text);
    
    // 类型匹配
    const typeMatch = this.elementType === other.elementType;
    
    // 位置相近（同一个区域）
    const positionSimilar = this.isInSameRegion(other);
    
    // 综合判断
    return textSimilarity >= threshold && typeMatch && positionSimilar;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private isInSameRegion(other: UIElementEntity): boolean {
    const thisCenter = this.getCenterPoint();
    const otherCenter = other.getCenterPoint();
    
    // 定义区域阈值
    const regionThreshold = 100;
    
    return Math.abs(thisCenter.x - otherCenter.x) < regionThreshold &&
           Math.abs(thisCenter.y - otherCenter.y) < regionThreshold;
  }

  /**
   * 转换为普通对象
   */
  toPlainObject(): UIElement {
    return {
      id: this.id,
      text: this.text,
      elementType: this.elementType,
      bounds: this.bounds,
      resourceId: this.resourceId,
      className: this.className,
      isClickable: this.isClickable,
      isEditable: this.isEditable,
      isEnabled: this.isEnabled,
      isScrollable: this.isScrollable,
      supportedActions: this.supportedActions,
      groupInfo: this.groupInfo,
      description: this.description,
      xpath: this.xpath,
      screenshot: this.screenshot,
    };
  }
}