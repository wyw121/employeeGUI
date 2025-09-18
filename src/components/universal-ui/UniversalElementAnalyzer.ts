/**
 * 通用UI元素智能分析器
 * 支持多种Android应用的UI元素识别和语义分析
 */

export interface ElementContext {
  // 元素基础信息
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  bounds: string;
  clickable: boolean;
  selected: boolean;
  enabled: boolean;
  focusable: boolean;
  scrollable: boolean;
  checkable: boolean;
  checked: boolean;
  
  // 位置信息
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // 设备信息
  screenWidth: number;
  screenHeight: number;
  
  // 上下文信息（可选，用于更精确的分析）
  parentElements?: ElementContext[];
  siblingElements?: ElementContext[];
  childElements?: ElementContext[];
}

export interface ElementAnalysisResult {
  // 元素类型
  elementType: 'navigation_tab' | 'action_button' | 'content_item' | 'search_bar' | 
              'text_input' | 'image_button' | 'list_item' | 'menu_item' | 
              'tab_button' | 'toggle_button' | 'info_text' | 'icon' | 'unknown';
  
  // 功能描述
  functionality: string;
  
  // 用户友好的描述
  userDescription: string;
  
  // 操作建议
  actionSuggestion: string;
  
  // 置信度 (0-1)
  confidence: number;
  
  // 详细分析信息
  analysisDetails: {
    positionAnalysis: string;
    textAnalysis: string;
    contextAnalysis: string;
    interactionAnalysis: string;
    semanticAnalysis: string;
  };
  
  // 额外的元数据
  metadata: {
    category: 'navigation' | 'interaction' | 'content' | 'input' | 'display' | 'system';
    priority: 'high' | 'medium' | 'low';
    commonUseCase: string[];
  };
}

/**
 * 应用特定的配置和映射
 */
export class AppSpecificMappings {
  
  // 小红书应用配置
  static readonly XIAOHONGSHU_CONFIG = {
    packageName: 'com.xingin.xhs',
    bottomNavigation: {
      '首页': { icon: '🏠', function: 'navigate_to_home', description: '浏览推荐内容和关注动态' },
      '市集': { icon: '🛍️', function: 'navigate_to_shopping', description: '购买商品和浏览店铺' },
      '发布': { icon: '➕', function: 'create_content', description: '发布新的笔记或视频' },
      '消息': { icon: '💬', function: 'view_messages', description: '查看私信、评论和通知' },
      '我': { icon: '👤', function: 'view_profile', description: '个人中心和设置' }
    },
    topTabs: {
      '关注': { function: 'view_following', description: '查看关注用户的最新内容' },
      '发现': { function: 'discover_content', description: '发现推荐和热门内容' },
      '视频': { function: 'view_videos', description: '观看短视频内容' }
    },
    commonButtons: {
      '搜索': { function: 'search', description: '搜索用户、内容或商品' },
      '点赞': { function: 'like_content', description: '为内容点赞' },
      '收藏': { function: 'bookmark_content', description: '收藏内容到个人收藏夹' },
      '分享': { function: 'share_content', description: '分享内容到其他平台' },
      '关注': { function: 'follow_user', description: '关注用户获取更新' },
      '购买': { function: 'purchase_item', description: '购买商品' }
    }
  };
  
  // 微信应用配置
  static readonly WECHAT_CONFIG = {
    packageName: 'com.tencent.mm',
    bottomNavigation: {
      '微信': { icon: '💬', function: 'chat_list', description: '查看聊天列表和消息' },
      '通讯录': { icon: '📞', function: 'contacts', description: '管理联系人' },
      '发现': { icon: '🔍', function: 'discover', description: '朋友圈、小程序等功能' },
      '我': { icon: '👤', function: 'profile', description: '个人设置和钱包' }
    },
    commonButtons: {
      '发送': { function: 'send_message', description: '发送消息' },
      '语音': { function: 'voice_message', description: '录制语音消息' },
      '视频通话': { function: 'video_call', description: '发起视频通话' },
      '转账': { function: 'transfer_money', description: '转账给联系人' },
      '收付款': { function: 'payment', description: '扫码支付或收款' }
    }
  };
  
  // 淘宝应用配置
  static readonly TAOBAO_CONFIG = {
    packageName: 'com.taobao.taobao',
    bottomNavigation: {
      '首页': { icon: '🏠', function: 'home_browse', description: '浏览商品推荐' },
      '微淘': { icon: '📱', function: 'social_shopping', description: '关注店铺和达人' },
      '消息': { icon: '💬', function: 'messages', description: '查看订单和客服消息' },
      '购物车': { icon: '🛒', function: 'shopping_cart', description: '管理购物车商品' },
      '我的淘宝': { icon: '👤', function: 'user_center', description: '订单、收藏和设置' }
    },
    commonButtons: {
      '搜索': { function: 'search_products', description: '搜索商品' },
      '立即购买': { function: 'buy_now', description: '直接购买商品' },
      '加入购物车': { function: 'add_to_cart', description: '添加到购物车' },
      '收藏': { function: 'favorite_item', description: '收藏商品或店铺' },
      '联系卖家': { function: 'contact_seller', description: '咨询商品信息' }
    }
  };
  
  // 通用Android应用模式
  static readonly GENERIC_PATTERNS = {
    navigation: {
      patterns: ['首页', '主页', 'Home', '发现', 'Discover', '我的', 'Profile', '设置', 'Settings'],
      bottomArea: { minY: 0.8 }, // 屏幕底部80%以下
      characteristics: { clickable: true, textLength: [1, 6] }
    },
    search: {
      patterns: ['搜索', 'Search', '查找', 'Find', '🔍'],
      contentDescPatterns: ['搜索', 'search'],
      characteristics: { clickable: true, className: ['EditText', 'SearchView'] }
    },
    actions: {
      patterns: ['确定', '确认', 'OK', '取消', 'Cancel', '提交', 'Submit', '保存', 'Save'],
      characteristics: { clickable: true, className: ['Button'] }
    },
    social: {
      patterns: ['点赞', '收藏', '分享', 'Like', 'Share', '关注', 'Follow', '评论', 'Comment'],
      characteristics: { clickable: true }
    },
    ecommerce: {
      patterns: ['购买', '下单', '支付', 'Buy', 'Pay', '加购物车', 'Cart', '立即购买'],
      characteristics: { clickable: true, importance: 'high' }
    }
  };
}

/**
 * 通用UI元素分析器
 */
export class UniversalElementAnalyzer {
  
  /**
   * 主要分析入口函数
   */
  static analyzeElement(element: ElementContext, packageName?: string): ElementAnalysisResult {
    const result: ElementAnalysisResult = {
      elementType: 'unknown',
      functionality: '',
      userDescription: '',
      actionSuggestion: '',
      confidence: 0,
      analysisDetails: {
        positionAnalysis: '',
        textAnalysis: '',
        contextAnalysis: '',
        interactionAnalysis: '',
        semanticAnalysis: ''
      },
      metadata: {
        category: 'display',
        priority: 'low',
        commonUseCase: []
      }
    };
    
    // 1. 基础分析
    result.analysisDetails.positionAnalysis = this.analyzePosition(element);
    result.analysisDetails.textAnalysis = this.analyzeText(element);
    result.analysisDetails.contextAnalysis = this.analyzeContext(element);
    result.analysisDetails.interactionAnalysis = this.analyzeInteraction(element);
    result.analysisDetails.semanticAnalysis = this.analyzeSemantics(element, packageName);
    
    // 2. 应用特定分析
    if (packageName) {
      this.performAppSpecificAnalysis(element, packageName, result);
    }
    
    // 3. 通用模式分析
    this.performGenericPatternAnalysis(element, result);
    
    // 4. 后处理和置信度计算
    this.finalizeAnalysis(element, result);
    
    return result;
  }
  
  /**
   * 位置分析
   */
  private static analyzePosition(element: ElementContext): string {
    const { position, screenWidth, screenHeight } = element;
    const centerX = position.x + position.width / 2;
    const centerY = position.y + position.height / 2;
    
    // 计算相对位置
    const relativeX = centerX / screenWidth;
    const relativeY = centerY / screenHeight;
    
    let analysis = `位置: (${position.x}, ${position.y}), 尺寸: ${position.width}x${position.height}`;
    
    // 垂直区域判断
    if (relativeY < 0.15) {
      analysis += ' - 顶部区域（状态栏/标题栏）';
    } else if (relativeY > 0.85) {
      analysis += ' - 底部区域（导航栏/操作栏）';
    } else if (relativeY > 0.75) {
      analysis += ' - 底部操作区域';
    } else {
      analysis += ' - 主内容区域';
    }
    
    // 水平区域判断
    if (relativeX < 0.2) {
      analysis += '，左侧';
    } else if (relativeX > 0.8) {
      analysis += '，右侧';
    } else {
      analysis += '，中央';
    }
    
    // 尺寸判断
    const area = position.width * position.height;
    const screenArea = screenWidth * screenHeight;
    const areaRatio = area / screenArea;
    
    if (areaRatio > 0.1) {
      analysis += '，大型元素';
    } else if (areaRatio < 0.001) {
      analysis += '，小型元素（可能是图标）';
    }
    
    return analysis;
  }
  
  /**
   * 文本内容分析
   */
  private static analyzeText(element: ElementContext): string {
    const { text, contentDesc } = element;
    const displayText = text || contentDesc;
    
    if (!displayText) {
      return '无文本内容（可能是图标、图片或装饰元素）';
    }
    
    let analysis = `显示文本: "${displayText}"`;
    
    // 文本长度分析
    if (displayText.length === 1) {
      analysis += ' - 单字符（可能是图标或缩写）';
    } else if (displayText.length <= 4) {
      analysis += ' - 短文本（可能是按钮或标签）';
    } else if (displayText.length <= 20) {
      analysis += ' - 中等长度文本';
    } else {
      analysis += ' - 长文本（可能是描述或内容）';
    }
    
    // 数字检测
    if (/^\d+$/.test(displayText)) {
      analysis += ' - 纯数字（可能是数量、ID或统计）';
    } else if (/\d+/.test(displayText)) {
      analysis += ' - 包含数字';
    }
    
    // 特殊字符检测
    if (/[📱💬🏠👤🔍➕🛍️🛒]/u.test(displayText)) {
      analysis += ' - 包含表情符号或图标';
    }
    
    return analysis;
  }
  
  /**
   * 上下文环境分析
   */
  private static analyzeContext(element: ElementContext): string {
    let analysis = '';
    
    // 分析兄弟元素（如果提供）
    if (element.siblingElements && element.siblingElements.length > 0) {
      const siblingTexts = element.siblingElements
        .map(s => s.text || s.contentDesc)
        .filter(t => t)
        .slice(0, 5); // 只取前5个
      
      if (siblingTexts.length > 0) {
        analysis += `同级元素: [${siblingTexts.join(', ')}]`;
        
        // 检查是否为导航栏组合
        const navKeywords = ['首页', '发现', '我的', '消息', '市集'];
        const matchingNav = siblingTexts.filter(t => navKeywords.some(nav => t.includes(nav)));
        if (matchingNav.length >= 2) {
          analysis += ' - 检测到导航栏组合';
        }
      }
    }
    
    // 分析父元素类型
    if (element.parentElements && element.parentElements.length > 0) {
      const parentClass = element.parentElements[0].className;
      if (parentClass.includes('RecyclerView') || parentClass.includes('ListView')) {
        analysis += ' | 位于列表容器中';
      } else if (parentClass.includes('TabLayout') || parentClass.includes('Tab')) {
        analysis += ' | 位于标签容器中';
      } else if (parentClass.includes('BottomNavigationView')) {
        analysis += ' | 位于底部导航栏中';
      }
    }
    
    return analysis || '无上下文信息';
  }
  
  /**
   * 交互能力分析
   */
  private static analyzeInteraction(element: ElementContext): string {
    const { clickable, focusable, scrollable, checkable, enabled } = element;
    
    let capabilities = [];
    let analysis = '';
    
    if (!enabled) {
      analysis += '已禁用状态';
      return analysis;
    }
    
    if (clickable) capabilities.push('可点击');
    if (focusable) capabilities.push('可聚焦');
    if (scrollable) capabilities.push('可滚动');
    if (checkable) capabilities.push('可选择');
    
    if (capabilities.length === 0) {
      analysis = '静态元素（仅展示信息）';
    } else {
      analysis = `交互能力: ${capabilities.join('、')}`;
    }
    
    // 根据交互能力推断用途
    if (clickable && !scrollable) {
      analysis += ' - 可能是按钮或可点击项';
    } else if (scrollable) {
      analysis += ' - 可能是列表或内容容器';
    } else if (focusable && !clickable) {
      analysis += ' - 可能是输入框';
    }
    
    return analysis;
  }
  
  /**
   * 语义分析
   */
  private static analyzeSemantics(element: ElementContext, packageName?: string): string {
    const displayText = element.text || element.contentDesc;
    if (!displayText) return '无语义信息';
    
    let semantics = [];
    
    // 功能语义检测
    const functionalKeywords = {
      navigation: ['首页', '主页', '返回', '前进', '导航'],
      action: ['确定', '取消', '提交', '保存', '删除', '编辑', '发送'],
      social: ['点赞', '分享', '关注', '评论', '收藏'],
      search: ['搜索', '查找', '筛选'],
      ecommerce: ['购买', '下单', '支付', '购物车', '收藏夹'],
      communication: ['消息', '通知', '聊天', '电话', '视频'],
      media: ['播放', '暂停', '音乐', '视频', '图片', '相册'],
      settings: ['设置', '配置', '选项', '偏好', '账户']
    };
    
    for (const [category, keywords] of Object.entries(functionalKeywords)) {
      if (keywords.some(keyword => displayText.includes(keyword))) {
        semantics.push(category);
      }
    }
    
    // 情感语义检测
    const emotionalKeywords = {
      positive: ['喜欢', '赞', '好的', '优秀', '推荐'],
      negative: ['不喜欢', '差评', '删除', '取消', '拒绝'],
      neutral: ['查看', '打开', '选择', '切换']
    };
    
    for (const [sentiment, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => displayText.includes(keyword))) {
        semantics.push(`情感-${sentiment}`);
      }
    }
    
    return semantics.length > 0 ? `语义标签: ${semantics.join(', ')}` : '通用文本';
  }
  
  /**
   * 应用特定分析
   */
  private static performAppSpecificAnalysis(element: ElementContext, packageName: string, result: ElementAnalysisResult): void {
    const displayText = element.text || element.contentDesc;
    if (!displayText) return;
    
    let appConfig = null;
    
    // 选择应用配置
    switch (packageName) {
      case 'com.xingin.xhs':
        appConfig = AppSpecificMappings.XIAOHONGSHU_CONFIG;
        break;
      case 'com.tencent.mm':
        appConfig = AppSpecificMappings.WECHAT_CONFIG;
        break;
      case 'com.taobao.taobao':
        appConfig = AppSpecificMappings.TAOBAO_CONFIG;
        break;
    }
    
    if (!appConfig) return;
    
    // 底部导航检测
    if (appConfig.bottomNavigation && appConfig.bottomNavigation[displayText]) {
      const navInfo = appConfig.bottomNavigation[displayText];
      const isBottomArea = (element.position.y / element.screenHeight) > 0.8;
      
      if (isBottomArea && element.clickable) {
        result.elementType = 'navigation_tab';
        result.functionality = navInfo.function;
        result.userDescription = `${navInfo.icon} ${displayText} - ${navInfo.description}`;
        result.actionSuggestion = `点击进入${displayText}页面`;
        result.confidence = Math.max(result.confidence, 0.9);
        result.metadata.category = 'navigation';
        result.metadata.priority = 'high';
        result.metadata.commonUseCase.push('页面导航', '主要功能入口');
        
        if (element.selected) {
          result.userDescription += '（当前页面）';
          result.actionSuggestion = '当前已在此页面';
        }
        return;
      }
    }
    
    // 顶部标签检测
    if (appConfig.topTabs && appConfig.topTabs[displayText]) {
      const tabInfo = appConfig.topTabs[displayText];
      const isTopArea = (element.position.y / element.screenHeight) < 0.3;
      
      if (isTopArea && element.clickable) {
        result.elementType = 'tab_button';
        result.functionality = tabInfo.function;
        result.userDescription = `📂 ${displayText} - ${tabInfo.description}`;
        result.actionSuggestion = `切换到${displayText}标签页`;
        result.confidence = Math.max(result.confidence, 0.85);
        result.metadata.category = 'navigation';
        result.metadata.priority = 'medium';
        result.metadata.commonUseCase.push('内容切换', '标签页导航');
        return;
      }
    }
    
    // 通用按钮检测
    if (appConfig.commonButtons && appConfig.commonButtons[displayText]) {
      const buttonInfo = appConfig.commonButtons[displayText];
      if (element.clickable) {
        result.elementType = 'action_button';
        result.functionality = buttonInfo.function;
        result.userDescription = `🔘 ${displayText} - ${buttonInfo.description}`;
        result.actionSuggestion = `点击${displayText}`;
        result.confidence = Math.max(result.confidence, 0.8);
        result.metadata.category = 'interaction';
        result.metadata.priority = displayText.includes('购买') || displayText.includes('支付') ? 'high' : 'medium';
        result.metadata.commonUseCase.push('用户操作', buttonInfo.function);
        return;
      }
    }
  }
  
  /**
   * 通用模式分析
   */
  private static performGenericPatternAnalysis(element: ElementContext, result: ElementAnalysisResult): void {
    if (result.confidence > 0.8) return; // 如果应用特定分析已经有高置信度，跳过通用分析
    
    const displayText = element.text || element.contentDesc;
    const patterns = AppSpecificMappings.GENERIC_PATTERNS;
    
    // 导航模式检测
    if (displayText && patterns.navigation.patterns.some(pattern => displayText.includes(pattern))) {
      const isBottomArea = (element.position.y / element.screenHeight) > patterns.navigation.bottomArea.minY;
      const textLengthMatch = displayText.length >= patterns.navigation.characteristics.textLength[0] && 
                              displayText.length <= patterns.navigation.characteristics.textLength[1];
      
      if (isBottomArea && element.clickable && textLengthMatch) {
        result.elementType = 'navigation_tab';
        result.functionality = 'navigate';
        result.userDescription = `🧭 导航按钮 - ${displayText}`;
        result.actionSuggestion = `点击导航到${displayText}`;
        result.confidence = Math.max(result.confidence, 0.7);
        result.metadata.category = 'navigation';
        result.metadata.priority = 'high';
      }
    }
    
    // 搜索模式检测
    if (displayText && patterns.search.patterns.some(pattern => displayText.includes(pattern))) {
      if (element.clickable) {
        result.elementType = 'search_bar';
        result.functionality = 'search';
        result.userDescription = `🔍 搜索功能 - ${displayText}`;
        result.actionSuggestion = '点击打开搜索';
        result.confidence = Math.max(result.confidence, 0.75);
        result.metadata.category = 'interaction';
        result.metadata.priority = 'medium';
      }
    }
    
    // 操作按钮模式检测
    if (displayText && patterns.actions.patterns.some(pattern => displayText.includes(pattern))) {
      if (element.clickable && element.className.includes('Button')) {
        result.elementType = 'action_button';
        result.functionality = 'action';
        result.userDescription = `⚡ 操作按钮 - ${displayText}`;
        result.actionSuggestion = `执行${displayText}操作`;
        result.confidence = Math.max(result.confidence, 0.65);
        result.metadata.category = 'interaction';
        result.metadata.priority = displayText.includes('确定') || displayText.includes('提交') ? 'high' : 'medium';
      }
    }
    
    // 社交功能模式检测
    if (displayText && patterns.social.patterns.some(pattern => displayText.includes(pattern))) {
      if (element.clickable) {
        result.elementType = 'action_button';
        result.functionality = 'social_action';
        result.userDescription = `💝 社交操作 - ${displayText}`;
        result.actionSuggestion = `执行${displayText}操作`;
        result.confidence = Math.max(result.confidence, 0.7);
        result.metadata.category = 'interaction';
        result.metadata.priority = 'medium';
        result.metadata.commonUseCase.push('社交互动');
      }
    }
    
    // 电商功能模式检测
    if (displayText && patterns.ecommerce.patterns.some(pattern => displayText.includes(pattern))) {
      if (element.clickable) {
        result.elementType = 'action_button';
        result.functionality = 'ecommerce_action';
        result.userDescription = `💰 电商操作 - ${displayText}`;
        result.actionSuggestion = `执行${displayText}操作`;
        result.confidence = Math.max(result.confidence, 0.75);
        result.metadata.category = 'interaction';
        result.metadata.priority = 'high';
        result.metadata.commonUseCase.push('购物流程', '支付操作');
      }
    }
  }
  
  /**
   * 最终分析和置信度计算
   */
  private static finalizeAnalysis(element: ElementContext, result: ElementAnalysisResult): void {
    // 如果置信度仍然很低，提供默认分析
    if (result.confidence < 0.4) {
      const displayText = element.text || element.contentDesc;
      
      if (element.clickable) {
        result.elementType = 'action_button';
        result.functionality = 'unknown_action';
        result.userDescription = displayText ? `可点击元素 - ${displayText}` : '未识别的可点击元素';
        result.actionSuggestion = '点击执行操作';
        result.confidence = 0.4;
        result.metadata.category = 'interaction';
        result.metadata.priority = 'low';
      } else if (displayText) {
        result.elementType = 'info_text';
        result.functionality = 'display_info';
        result.userDescription = `信息文本 - ${displayText}`;
        result.actionSuggestion = '仅供查看';
        result.confidence = 0.3;
        result.metadata.category = 'display';
        result.metadata.priority = 'low';
      } else {
        result.elementType = 'unknown';
        result.functionality = 'unknown';
        result.userDescription = '未识别的UI元素';
        result.actionSuggestion = '元素功能不明确';
        result.confidence = 0.2;
        result.metadata.category = 'display';
        result.metadata.priority = 'low';
      }
    }
    
    // 调整置信度基于多个因素
    let confidenceBonus = 0;
    
    // 文本清晰度加分
    const displayText = element.text || element.contentDesc;
    if (displayText && displayText.length > 0 && displayText.length <= 10) {
      confidenceBonus += 0.1;
    }
    
    // 交互能力加分
    if (element.clickable && element.enabled) {
      confidenceBonus += 0.1;
    }
    
    // 位置合理性加分
    const relativeY = (element.position.y + element.position.height / 2) / element.screenHeight;
    if ((result.elementType === 'navigation_tab' && relativeY > 0.8) ||
        (result.elementType === 'tab_button' && relativeY < 0.3)) {
      confidenceBonus += 0.15;
    }
    
    result.confidence = Math.min(1.0, result.confidence + confidenceBonus);
  }
  
  /**
   * 批量分析XML中的所有元素
   */
  static analyzeXMLElements(xmlContent: string, packageName?: string): ElementAnalysisResult[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // 获取屏幕尺寸
    const rootNode = xmlDoc.querySelector('hierarchy node');
    let screenWidth = 1080, screenHeight = 1920; // 默认值
    
    if (rootNode) {
      const bounds = rootNode.getAttribute('bounds');
      if (bounds) {
        const match = bounds.match(/\[0,0\]\[(\d+),(\d+)\]/);
        if (match) {
          screenWidth = parseInt(match[1]);
          screenHeight = parseInt(match[2]);
        }
      }
    }
    
    // 选择可点击元素和重要的显示元素
    const nodes = xmlDoc.querySelectorAll('node[clickable="true"], node[text], node[content-desc]');
    const results: ElementAnalysisResult[] = [];
    
    nodes.forEach(node => {
      const elementContext = this.parseNodeToElementContext(node, xmlDoc, screenWidth, screenHeight);
      // 过滤掉无意义的元素
      if (elementContext.text || elementContext.contentDesc || elementContext.clickable) {
        const analysis = this.analyzeElement(elementContext, packageName);
        results.push(analysis);
      }
    });
    
    return results.sort((a, b) => b.confidence - a.confidence); // 按置信度降序排序
  }
  
  /**
   * 将XML节点解析为ElementContext
   */
  private static parseNodeToElementContext(node: Element, xmlDoc: Document, screenWidth: number, screenHeight: number): ElementContext {
    // 解析bounds字符串 [x1,y1][x2,y2]
    const boundsStr = node.getAttribute('bounds') || '';
    const boundsMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    
    let position = { x: 0, y: 0, width: 0, height: 0 };
    if (boundsMatch) {
      const [, x1, y1, x2, y2] = boundsMatch.map(Number);
      position = {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1
      };
    }
    
    return {
      text: node.getAttribute('text') || '',
      contentDesc: node.getAttribute('content-desc') || '',
      resourceId: node.getAttribute('resource-id') || '',
      className: node.getAttribute('class') || '',
      bounds: boundsStr,
      clickable: node.getAttribute('clickable') === 'true',
      selected: node.getAttribute('selected') === 'true',
      enabled: node.getAttribute('enabled') === 'true',
      focusable: node.getAttribute('focusable') === 'true',
      scrollable: node.getAttribute('scrollable') === 'true',
      checkable: node.getAttribute('checkable') === 'true',
      checked: node.getAttribute('checked') === 'true',
      position,
      screenWidth,
      screenHeight
    };
  }
}

/**
 * 步骤描述生成器
 */
export class SmartStepDescriptionGenerator {
  /**
   * 根据元素分析结果生成详细的步骤描述
   */
  static generateStepDescription(analysis: ElementAnalysisResult, element: ElementContext): string {
    let description = '';
    
    // 标题和基本描述
    description += `🎯 ${analysis.userDescription}\n\n`;
    
    // 位置信息
    const positionDesc = this.generatePositionDescription(element.position, element.screenWidth, element.screenHeight);
    description += `📍 位置信息：${positionDesc}\n`;
    
    // 功能说明
    if (analysis.functionality !== 'unknown') {
      description += `⚙️ 功能标识：${analysis.functionality}\n`;
    }
    
    // 操作建议
    description += `✅ 操作建议：${analysis.actionSuggestion}\n`;
    
    // 置信度和分类
    description += `🔍 识别置信度：${(analysis.confidence * 100).toFixed(0)}% | `;
    description += `分类：${analysis.metadata.category} | `;
    description += `优先级：${analysis.metadata.priority}\n`;
    
    // 使用场景
    if (analysis.metadata.commonUseCase.length > 0) {
      description += `💡 常见用途：${analysis.metadata.commonUseCase.join('、')}\n`;
    }
    
    // 详细分析信息（调试用，可选显示）
    if (analysis.confidence < 0.7) {
      description += `\n🔬 详细分析：\n`;
      description += `- ${analysis.analysisDetails.positionAnalysis}\n`;
      description += `- ${analysis.analysisDetails.textAnalysis}\n`;
      description += `- ${analysis.analysisDetails.interactionAnalysis}`;
    }
    
    return description;
  }
  
  /**
   * 生成位置描述
   */
  private static generatePositionDescription(
    position: { x: number; y: number; width: number; height: number },
    screenWidth: number,
    screenHeight: number
  ): string {
    const centerX = position.x + position.width / 2;
    const centerY = position.y + position.height / 2;
    const relativeX = centerX / screenWidth;
    const relativeY = centerY / screenHeight;
    
    // 垂直位置描述
    let verticalDesc = '';
    if (relativeY < 0.15) {
      verticalDesc = '屏幕顶部';
    } else if (relativeY > 0.85) {
      verticalDesc = '屏幕底部';
    } else if (relativeY > 0.75) {
      verticalDesc = '下方区域';
    } else if (relativeY < 0.25) {
      verticalDesc = '上方区域';
    } else {
      verticalDesc = '中央区域';
    }
    
    // 水平位置描述
    let horizontalDesc = '';
    if (relativeX < 0.25) {
      horizontalDesc = '左侧';
    } else if (relativeX > 0.75) {
      horizontalDesc = '右侧';
    } else {
      horizontalDesc = '中央';
    }
    
    return `${verticalDesc}${horizontalDesc}，坐标(${position.x}, ${position.y})，尺寸${position.width}×${position.height}`;
  }
  
  /**
   * 生成简短的操作描述（用于步骤标题）
   */
  static generateShortDescription(analysis: ElementAnalysisResult): string {
    const { userDescription, elementType, functionality } = analysis;
    
    // 根据元素类型生成简短描述
    switch (elementType) {
      case 'navigation_tab':
        return `导航至${userDescription.split(' - ')[0].replace(/[🏠📱💬👤🔍➕🛍️🛒]/g, '').trim()}`;
      
      case 'action_button':
        if (functionality.includes('search')) return '执行搜索操作';
        if (functionality.includes('like')) return '点赞内容';
        if (functionality.includes('share')) return '分享内容';
        if (functionality.includes('follow')) return '关注用户';
        if (functionality.includes('purchase') || functionality.includes('buy')) return '购买商品';
        return `执行${userDescription.split(' - ')[0].replace(/[⚡🔘💝💰]/g, '').trim()}操作`;
      
      case 'search_bar':
        return '打开搜索功能';
      
      case 'tab_button':
        return `切换到${userDescription.split(' - ')[0].replace(/📂/g, '').trim()}`;
      
      case 'text_input':
        return '输入文本';
      
      default:
        return userDescription.split(' - ')[0].replace(/[🎯📍⚙️✅🔍💡🔬]/g, '').trim() || '执行操作';
    }
  }
}

/**
 * 导出主要类和接口
 */
export default UniversalElementAnalyzer;