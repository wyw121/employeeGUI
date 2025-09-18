/**
 * 基于真实XML数据的智能UI元素分析服务
 * 专门用于增强步骤描述的准确性和可读性
 */

export interface RealElementAnalysis {
  // 基本信息
  elementType: string;
  displayText: string;
  functionality: string;
  confidence: number;
  
  // 智能描述
  smartDescription: string;
  actionDescription: string;
  contextDescription: string;
  
  // 位置和特征
  position: {
    region: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
    isNavigation: boolean;
    isInteractive: boolean;
  };
  
  // 应用特定信息
  appContext: {
    packageName: string;
    appName: string;
    pageType: string;
  };
}

/**
 * 真实XML数据分析服务
 * 基于实际抓取的XML数据提供精确的元素识别
 */
export class RealXMLAnalysisService {
  
  // 小红书特定配置（基于真实XML数据）
  private static readonly XIAOHONGSHU_PATTERNS = {
    packageName: 'com.xingin.xhs',
    bottomNavigation: {
      '首页': {
        bounds: { x: [0, 216], y: [1785, 1920] },
        icon: '🏠',
        description: '小红书主页',
        action: '浏览推荐内容和关注动态',
        confidence: 0.98
      },
      '市集': {
        bounds: { x: [216, 432], y: [1785, 1920] },
        icon: '🛍️',
        description: '小红书市集',
        action: '购买心仪商品和发现好物',
        confidence: 0.95
      },
      '发布': {
        bounds: { x: [432, 648], y: [1785, 1920] },
        icon: '➕',
        description: '内容创作',
        action: '发布新的图文笔记或视频',
        confidence: 0.92
      },
      '消息': {
        bounds: { x: [648, 864], y: [1785, 1920] },
        icon: '💬',
        description: '消息中心',
        action: '查看通知、私信和互动消息',
        confidence: 0.95
      },
      '我': {
        bounds: { x: [864, 1080], y: [1785, 1920] },
        icon: '👤',
        description: '个人中心',
        action: '管理个人资料、设置和收藏',
        confidence: 0.99
      }
    },
    topElements: {
      '搜索': {
        bounds: { x: [945, 1053], y: [84, 192] },
        icon: '🔍',
        description: '搜索功能',
        action: '搜索用户、内容或商品',
        confidence: 0.9
      }
    },
    contentElements: {
      patterns: {
        笔记: { icon: '📝', action: '查看图文笔记内容' },
        视频: { icon: '📺', action: '观看视频内容' },
        点赞: { icon: '❤️', action: '为内容点赞表示喜欢' },
        收藏: { icon: '⭐', action: '收藏内容到个人收藏夹' },
        分享: { icon: '📤', action: '分享内容到其他平台' }
      }
    }
  };

  /**
   * 基于真实XML数据分析元素
   */
  static analyzeElement(
    text: string,
    contentDesc: string,
    bounds: { x: number; y: number; width: number; height: number },
    className: string,
    packageName: string,
    clickable: boolean
  ): RealElementAnalysis {
    
    // 检测应用类型
    const appContext = this.detectAppContext(packageName);
    
    // 基于位置和内容进行智能识别
    const analysis = this.performSmartAnalysis(
      text, contentDesc, bounds, className, packageName, clickable, appContext
    );
    
    return analysis;
  }

  /**
   * 检测应用上下文
   */
  private static detectAppContext(packageName: string): RealElementAnalysis['appContext'] {
    if (packageName === 'com.xingin.xhs') {
      return {
        packageName: 'com.xingin.xhs',
        appName: '小红书',
        pageType: '主页面'
      };
    }
    
    return {
      packageName: packageName || 'unknown',
      appName: '未知应用',
      pageType: '未知页面'
    };
  }

  /**
   * 执行智能分析
   */
  private static performSmartAnalysis(
    text: string,
    contentDesc: string,
    bounds: { x: number; y: number; width: number; height: number },
    className: string,
    packageName: string,
    clickable: boolean,
    appContext: RealElementAnalysis['appContext']
  ): RealElementAnalysis {
    
    const allText = (text + ' ' + contentDesc).toLowerCase();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // 小红书特定分析
    if (packageName === 'com.xingin.xhs') {
      return this.analyzeXiaohongshuElement(
        text, contentDesc, bounds, centerX, centerY, clickable, appContext
      );
    }
    
    // 通用分析
    return this.analyzeGenericElement(
      text, contentDesc, bounds, centerX, centerY, clickable, appContext
    );
  }

  /**
   * 小红书元素专项分析
   */
  private static analyzeXiaohongshuElement(
    text: string,
    contentDesc: string,
    bounds: { x: number; y: number; width: number; height: number },
    centerX: number,
    centerY: number,
    clickable: boolean,
    appContext: RealElementAnalysis['appContext']
  ): RealElementAnalysis {
    
    const patterns = this.XIAOHONGSHU_PATTERNS;
    
    // 底部导航栏识别（基于真实数据）
    if (centerY > 1785) {
      for (const [navText, config] of Object.entries(patterns.bottomNavigation)) {
        if ((text === navText || contentDesc.includes(navText)) &&
            centerX >= config.bounds.x[0] && centerX <= config.bounds.x[1]) {
          
          return {
            elementType: 'navigation',
            displayText: navText,
            functionality: 'navigation_' + navText.toLowerCase(),
            confidence: config.confidence,
            smartDescription: `${config.icon} ${config.description}`,
            actionDescription: config.action,
            contextDescription: `位于小红书底部导航栏的"${navText}"按钮，是应用的主要导航入口`,
            position: {
              region: 'bottom',
              horizontal: this.getHorizontalPosition(centerX),
              isNavigation: true,
              isInteractive: true
            },
            appContext
          };
        }
      }
    }
    
    // 顶部元素识别
    if (centerY < 300) {
      for (const [topText, config] of Object.entries(patterns.topElements)) {
        if (contentDesc.includes(topText) || text.includes(topText)) {
          return {
            elementType: 'action',
            displayText: topText,
            functionality: 'search',
            confidence: config.confidence,
            smartDescription: `${config.icon} ${config.description}`,
            actionDescription: config.action,
            contextDescription: `位于小红书顶部的"${topText}"功能，便于快速查找内容`,
            position: {
              region: 'top',
              horizontal: 'right',
              isNavigation: false,
              isInteractive: true
            },
            appContext
          };
        }
      }
    }
    
    // 内容元素识别
    const contentPatterns = patterns.contentElements.patterns;
    for (const [pattern, config] of Object.entries(contentPatterns)) {
      if (contentDesc.includes(pattern) || text.includes(pattern)) {
        return {
          elementType: 'content',
          displayText: pattern,
          functionality: 'content_interaction',
          confidence: 0.8,
          smartDescription: `${config.icon} ${pattern}相关功能`,
          actionDescription: config.action,
          contextDescription: `小红书内容页面的"${pattern}"功能，用于与内容进行交互`,
          position: {
            region: 'center',
            horizontal: this.getHorizontalPosition(centerX),
            isNavigation: false,
            isInteractive: true
          },
          appContext
        };
      }
    }
    
    // 默认小红书元素
    return this.createDefaultAnalysis(text || contentDesc, bounds, clickable, appContext);
  }

  /**
   * 通用元素分析
   */
  private static analyzeGenericElement(
    text: string,
    contentDesc: string,
    bounds: { x: number; y: number; width: number; height: number },
    centerX: number,
    centerY: number,
    clickable: boolean,
    appContext: RealElementAnalysis['appContext']
  ): RealElementAnalysis {
    
    return this.createDefaultAnalysis(text || contentDesc, bounds, clickable, appContext);
  }

  /**
   * 创建默认分析结果
   */
  private static createDefaultAnalysis(
    displayText: string,
    bounds: { x: number; y: number; width: number; height: number },
    clickable: boolean,
    appContext: RealElementAnalysis['appContext']
  ): RealElementAnalysis {
    
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    return {
      elementType: 'generic',
      displayText: displayText || '未知元素',
      functionality: 'unknown',
      confidence: 0.5,
      smartDescription: `📱 ${displayText || '界面元素'}`,
      actionDescription: clickable ? '点击进行操作' : '查看元素内容',
      contextDescription: `位于${appContext.appName}中的界面元素`,
      position: {
        region: centerY < 640 ? 'top' : centerY > 1280 ? 'bottom' : 'center',
        horizontal: this.getHorizontalPosition(centerX),
        isNavigation: false,
        isInteractive: clickable
      },
      appContext
    };
  }

  /**
   * 获取水平位置
   */
  private static getHorizontalPosition(centerX: number): 'left' | 'center' | 'right' {
    if (centerX < 360) return 'left';
    if (centerX > 720) return 'right';
    return 'center';
  }

  /**
   * 生成增强的步骤描述
   */
  static generateEnhancedStepDescription(analysis: RealElementAnalysis): string {
    let description = '';
    
    // 主要描述（带图标和应用上下文）
    description += `🎯 ${analysis.smartDescription}\n`;
    description += `📱 应用：${analysis.appContext.appName}\n\n`;
    
    // 功能说明
    description += `💡 功能说明：${analysis.actionDescription}\n`;
    
    // 上下文信息
    description += `📍 元素位置：${analysis.contextDescription}\n\n`;
    
    // 操作建议
    if (analysis.position.isInteractive) {
      description += `✅ 建议操作：点击此${analysis.position.isNavigation ? '导航' : '功能'}按钮`;
      if (analysis.position.isNavigation) {
        description += `，将跳转到对应页面`;
      }
      description += '\n';
    } else {
      description += `ℹ️  提示：此元素仅用于显示信息，无法点击操作\n`;
    }
    
    // 置信度信息
    const confidenceText = analysis.confidence >= 0.9 ? '非常高' : 
                          analysis.confidence >= 0.7 ? '高' : 
                          analysis.confidence >= 0.5 ? '中等' : '较低';
    description += `🔍 识别置信度：${(analysis.confidence * 100).toFixed(0)}% (${confidenceText})\n`;
    
    return description;
  }
}