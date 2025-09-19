/**
 * ADB 精准定位策略服务
 * 定义元素定位的精准度等级和自动化操作的最佳实践
 */

export interface ElementStability {
  /** 稳定性等级: high | medium | low */
  level: 'high' | 'medium' | 'low';
  /** 稳定性分数 (0-100) */
  score: number;
  /** 不稳定因素说明 */
  risks: string[];
}

export interface AdbCommand {
  /** 命令类型 */
  type: 'tap' | 'input' | 'swipe' | 'long_press' | 'ui_automator';
  /** 具体命令 */
  command: string;
  /** 优先级 (数值越高优先级越高) */
  priority: number;
  /** 成功率预估 */
  reliability: number;
}

export interface PrecisionLevel {
  /** 精准度等级名称 */
  name: string;
  /** 精准度分数 */
  score: number;
  /** 需要的字段组合 */
  requiredFields: string[];
  /** 可选的辅助字段 */
  optionalFields: string[];
  /** 生成的ADB命令 */
  adbCommands: AdbCommand[];
}

/**
 * ADB 精准定位策略服务
 */
export class AdbPrecisionStrategy {
  
  /**
   * 字段稳定性评估映射表
   * 基于实际Android自动化经验的稳定性排名
   */
  private static readonly FIELD_STABILITY: Record<string, ElementStability> = {
    // 🔥 高稳定性字段 - 开发者明确指定，很少变化
    'resource-id': {
      level: 'high',
      score: 95,
      risks: ['应用更新时可能混淆', '某些视图动态生成ID']
    },
    'text': {
      level: 'high', 
      score: 90,
      risks: ['多语言本地化', '动态内容变化', '特殊字符转义']
    },
    'content-desc': {
      level: 'high',
      score: 85,
      risks: ['无障碍描述可能为空', '开发者不一定设置']
    },

    // ⚡ 中等稳定性字段 - 相对稳定但可能变化
    'class': {
      level: 'medium',
      score: 75,
      risks: ['自定义控件类名复杂', '框架升级可能变化']
    },
    'clickable': {
      level: 'medium',
      score: 70,
      risks: ['动态启用/禁用', '状态依赖']
    },
    'enabled': {
      level: 'medium',
      score: 70,
      risks: ['业务逻辑控制', '状态频繁变化']
    },
    'focusable': {
      level: 'medium',
      score: 65,
      risks: ['焦点管理策略变化', '键盘导航设计']
    },
    'scrollable': {
      level: 'medium',
      score: 65,
      risks: ['内容长度动态变化', '滚动状态依赖']
    },

    // ⚠️ 低稳定性字段 - 频繁变化，不推荐单独使用
    'bounds': {
      level: 'low',
      score: 40,
      risks: ['屏幕尺寸差异', '分辨率适配', '动态布局', '键盘弹出影响']
    },
    'index': {
      level: 'low',
      score: 35,
      risks: ['列表动态增删', '视图层级变化', '异步加载顺序']
    },
    'checked': {
      level: 'low',
      score: 30,
      risks: ['用户交互状态', '业务逻辑控制']
    },
    'selected': {
      level: 'low',
      score: 30,
      risks: ['选择状态频繁变化', '多选场景复杂']
    },
    'focused': {
      level: 'low',
      score: 25,
      risks: ['焦点状态瞬时变化', '用户操作影响']
    },
    'password': {
      level: 'low',
      score: 20,
      risks: ['安全策略变化', '很少单独作为定位依据']
    }
  };

  /**
   * 精准度等级定义
   */
  private static readonly PRECISION_LEVELS: PrecisionLevel[] = [
    {
      name: '🎯 极高精准 (Pinpoint)',
      score: 95,
      requiredFields: ['resource-id'],
      optionalFields: ['text', 'class'],
      adbCommands: [
        {
          type: 'ui_automator',
          command: 'adb shell uiautomator2 d.click(resourceId="{{resource-id}}")',
          priority: 100,
          reliability: 0.95
        }
      ]
    },
    {
      name: '🔥 高精准 (High)',
      score: 85,
      requiredFields: ['text'],
      optionalFields: ['class', 'clickable', 'content-desc'],
      adbCommands: [
        {
          type: 'ui_automator',
          command: 'adb shell uiautomator2 d.click(text="{{text}}")',
          priority: 90,
          reliability: 0.85
        },
        {
          type: 'ui_automator',
          command: 'adb shell uiautomator2 d.click(textContains="{{text}}")',
          priority: 80,
          reliability: 0.80
        }
      ]
    },
    {
      name: '⚡ 中精准 (Medium)',
      score: 70,
      requiredFields: ['content-desc'],
      optionalFields: ['class', 'clickable', 'bounds'],
      adbCommands: [
        {
          type: 'ui_automator',
          command: 'adb shell uiautomator2 d.click(description="{{content-desc}}")',
          priority: 70,
          reliability: 0.70
        }
      ]
    },
    {
      name: '📍 坐标定位 (Coordinate)',
      score: 50,
      requiredFields: ['bounds'],
      optionalFields: ['class', 'clickable'],
      adbCommands: [
        {
          type: 'tap',
          command: 'adb shell input tap {{center_x}} {{center_y}}',
          priority: 50,
          reliability: 0.60
        }
      ]
    },
    {
      name: '🔍 复合定位 (Composite)',
      score: 80,
      requiredFields: ['class', 'clickable'],
      optionalFields: ['enabled', 'focusable', 'text', 'content-desc'],
      adbCommands: [
        {
          type: 'ui_automator',
          command: 'adb shell uiautomator2 d.click(className="{{class}}", clickable=true)',
          priority: 60,
          reliability: 0.65
        }
      ]
    }
  ];

  /**
   * 评估元素的定位精准度
   */
  static evaluateElementPrecision(elementData: Record<string, any>): {
    bestStrategy: PrecisionLevel;
    allStrategies: PrecisionLevel[];
    overallScore: number;
    recommendations: string[];
  } {
    const availableFields = Object.keys(elementData).filter(key => 
      elementData[key] !== '' && elementData[key] !== null && elementData[key] !== undefined
    );

    // 计算每种策略的可用性和得分
    const evaluatedStrategies = this.PRECISION_LEVELS.map(strategy => {
      const hasRequiredFields = strategy.requiredFields.every(field => 
        availableFields.includes(field) && elementData[field] !== ''
      );

      if (!hasRequiredFields) {
        return { ...strategy, score: 0, feasible: false };
      }

      // 计算实际可用字段的稳定性加权分数
      const fieldStabilityScore = strategy.requiredFields.reduce((sum, field) => {
        const stability = this.FIELD_STABILITY[field];
        return sum + (stability ? stability.score : 0);
      }, 0) / strategy.requiredFields.length;

      // 可选字段加成
      const optionalBonus = strategy.optionalFields.filter(field => 
        availableFields.includes(field) && elementData[field] !== ''
      ).length * 5;

      const finalScore = Math.min(100, fieldStabilityScore + optionalBonus);

      return {
        ...strategy,
        score: finalScore,
        feasible: true,
        availableOptionalFields: strategy.optionalFields.filter(field => 
          availableFields.includes(field) && elementData[field] !== ''
        )
      };
    }).filter(strategy => strategy.feasible);

    // 按得分排序
    evaluatedStrategies.sort((a, b) => b.score - a.score);

    const bestStrategy = evaluatedStrategies[0];
    const overallScore = bestStrategy ? bestStrategy.score : 0;

    // 生成建议
    const recommendations = this.generateRecommendations(elementData, evaluatedStrategies);

    return {
      bestStrategy,
      allStrategies: evaluatedStrategies,
      overallScore,
      recommendations
    };
  }

  /**
   * 生成ADB自动化命令
   */
  static generateAdbCommands(elementData: Record<string, any>): AdbCommand[] {
    const { bestStrategy } = this.evaluateElementPrecision(elementData);
    
    if (!bestStrategy) {
      return [];
    }

    return bestStrategy.adbCommands.map(command => {
      let finalCommand = command.command;

      // 替换模板变量
      Object.keys(elementData).forEach(key => {
        const placeholder = `{{${key}}}`;
        if (finalCommand.includes(placeholder)) {
          finalCommand = finalCommand.replace(placeholder, elementData[key]);
        }
      });

      // 特殊处理坐标计算
      if (command.command.includes('{{center_x}}') || command.command.includes('{{center_y}}')) {
        const bounds = elementData.bounds;
        if (bounds && bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)) {
          const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
          const left = parseInt(match[1]);
          const top = parseInt(match[2]);
          const right = parseInt(match[3]);
          const bottom = parseInt(match[4]);
          
          const centerX = Math.floor((left + right) / 2);
          const centerY = Math.floor((top + bottom) / 2);
          
          finalCommand = finalCommand
            .replace('{{center_x}}', centerX.toString())
            .replace('{{center_y}}', centerY.toString());
        }
      }

      return {
        ...command,
        command: finalCommand
      };
    });
  }

  /**
   * 生成优化建议
   */
  private static generateRecommendations(
    elementData: Record<string, any>, 
    strategies: any[]
  ): string[] {
    const recommendations: string[] = [];

    const hasResourceId = elementData['resource-id'] && elementData['resource-id'] !== '';
    const hasText = elementData['text'] && elementData['text'] !== '';
    const hasContentDesc = elementData['content-desc'] && elementData['content-desc'] !== '';

    // 基于可用字段给出建议
    if (hasResourceId) {
      recommendations.push('✅ 拥有 resource-id，这是最稳定的定位方式');
    } else {
      recommendations.push('⚠️ 缺少 resource-id，建议要求开发者添加ID属性');
    }

    if (hasText) {
      recommendations.push('✅ 拥有 text 内容，适合文本匹配');
      if (elementData.text.length > 20) {
        recommendations.push('💡 文本较长，建议使用 textContains 进行部分匹配');
      }
    } else if (!hasResourceId) {
      recommendations.push('⚠️ 缺少文本内容，增加定位难度');
    }

    if (hasContentDesc) {
      recommendations.push('✅ 拥有 content-desc，有利于无障碍访问');
    } else {
      recommendations.push('💡 建议添加 content-desc 提高定位稳定性');
    }

    // 稳定性警告
    const unstableFields = Object.keys(elementData).filter(key => {
      const stability = this.FIELD_STABILITY[key];
      return stability && stability.level === 'low' && elementData[key] !== '';
    });

    if (unstableFields.length > 0 && !hasResourceId && !hasText) {
      recommendations.push(`⚠️ 主要依赖不稳定字段: ${unstableFields.join(', ')}，自动化可能不稳定`);
    }

    // 最佳实践建议
    if (strategies.length > 0) {
      const bestScore = strategies[0].score;
      if (bestScore >= 90) {
        recommendations.push('🎯 定位精准度极高，自动化成功率 > 90%');
      } else if (bestScore >= 70) {
        recommendations.push('⚡ 定位精准度良好，自动化成功率 70-90%');
      } else {
        recommendations.push('📍 定位精准度一般，建议优化元素属性或使用多重定位策略');
      }
    }

    return recommendations;
  }

  /**
   * 获取字段稳定性信息
   */
  static getFieldStability(fieldName: string): ElementStability | null {
    return this.FIELD_STABILITY[fieldName] || null;
  }

  /**
   * 获取所有支持的字段稳定性排名
   */
  static getAllFieldStability(): Array<{ field: string; stability: ElementStability }> {
    return Object.entries(this.FIELD_STABILITY)
      .map(([field, stability]) => ({ field, stability }))
      .sort((a, b) => b.stability.score - a.stability.score);
  }

  /**
   * 推荐最佳字段组合
   */
  static recommendFieldCombination(availableFields: string[]): {
    primary: string[];
    secondary: string[];
    fallback: string[];
    score: number;
  } {
    const high = availableFields.filter(f => this.FIELD_STABILITY[f]?.level === 'high');
    const medium = availableFields.filter(f => this.FIELD_STABILITY[f]?.level === 'medium');
    const low = availableFields.filter(f => this.FIELD_STABILITY[f]?.level === 'low');

    // 计算组合得分
    const score = high.length * 30 + medium.length * 15 + low.length * 5;

    return {
      primary: high,
      secondary: medium,
      fallback: low,
      score: Math.min(100, score)
    };
  }
}