// 元素字段分析服务
export interface ElementFieldInfo {
  field: string;
  displayName: string;
  type: 'string' | 'boolean' | 'number' | 'coordinate';
  description: string;
  examples: string[];
}

export interface ElementAnalysisResult {
  elementType: string;
  commonFields: ElementFieldInfo[];
  specificFields: ElementFieldInfo[];
  sampleElements: any[];
}

export class ElementFieldAnalyzer {
  // 所有可能的元素字段信息
  private fieldDefinitions: Record<string, ElementFieldInfo> = {
    text: {
      field: 'text',
      displayName: '文本内容',
      type: 'string',
      description: '元素显示的文本内容',
      examples: ['关注', '已关注', '用户名', '按钮文字']
    },
    'resource-id': {
      field: 'resource-id',
      displayName: '资源ID',
      type: 'string',
      description: '元素的资源标识符',
      examples: ['com.xingin.xhs:id/follow_button', 'android:id/content']
    },
    class: {
      field: 'class',
      displayName: '类名',
      type: 'string',
      description: '元素的Android类名',
      examples: ['android.widget.TextView', 'android.widget.Button']
    },
    package: {
      field: 'package',
      displayName: '应用包名',
      type: 'string',
      description: '元素所属的应用包名',
      examples: ['com.xingin.xhs', 'com.android.systemui']
    },
    'content-desc': {
      field: 'content-desc',
      displayName: '内容描述',
      type: 'string',
      description: '元素的无障碍描述',
      examples: ['关注按钮', '返回', '分享']
    },
    clickable: {
      field: 'clickable',
      displayName: '可点击',
      type: 'boolean',
      description: '元素是否可以点击',
      examples: ['true', 'false']
    },
    enabled: {
      field: 'enabled',
      displayName: '启用状态',
      type: 'boolean',
      description: '元素是否启用',
      examples: ['true', 'false']
    },
    focusable: {
      field: 'focusable',
      displayName: '可聚焦',
      type: 'boolean',
      description: '元素是否可以获得焦点',
      examples: ['true', 'false']
    },
    focused: {
      field: 'focused',
      displayName: '已聚焦',
      type: 'boolean',
      description: '元素当前是否有焦点',
      examples: ['true', 'false']
    },
    selected: {
      field: 'selected',
      displayName: '选中状态',
      type: 'boolean',
      description: '元素是否被选中',
      examples: ['true', 'false']
    },
    checkable: {
      field: 'checkable',
      displayName: '可选择',
      type: 'boolean',
      description: '元素是否可以被选择',
      examples: ['true', 'false']
    },
    checked: {
      field: 'checked',
      displayName: '已选择',
      type: 'boolean',
      description: '元素是否已被选择',
      examples: ['true', 'false']
    },
    scrollable: {
      field: 'scrollable',
      displayName: '可滚动',
      type: 'boolean',
      description: '元素是否可以滚动',
      examples: ['true', 'false']
    },
    'long-clickable': {
      field: 'long-clickable',
      displayName: '可长按',
      type: 'boolean',
      description: '元素是否支持长按操作',
      examples: ['true', 'false']
    },
    password: {
      field: 'password',
      displayName: '密码字段',
      type: 'boolean',
      description: '元素是否为密码输入字段',
      examples: ['true', 'false']
    },
    bounds: {
      field: 'bounds',
      displayName: '边界坐标',
      type: 'coordinate',
      description: '元素在屏幕上的位置和大小',
      examples: ['[789,291][957,369]', '[0,0][1080,1920]']
    },
    index: {
      field: 'index',
      displayName: '索引',
      type: 'number',
      description: '元素在父容器中的位置索引',
      examples: ['0', '1', '2']
    },
    NAF: {
      field: 'NAF',
      displayName: 'NAF标记',
      type: 'boolean',
      description: 'Not Accessibility Focusable - 无障碍不可聚焦',
      examples: ['true', 'false']
    },
    
    // 🆕 上下文感知字段 - 用于精准定位
    'anchor-text': {
      field: 'anchor-text',
      displayName: '锚点文本',
      type: 'string',
      description: '同容器内的关键文本标识（如用户名）',
      examples: ['绯衣少年', 'GU', '用户昵称']
    },
    'relative-position': {
      field: 'relative-position',
      displayName: '相对位置',
      type: 'string',
      description: '相对于锚点文本的位置关系',
      examples: ['right', 'below', 'inside']
    },
    'container-class': {
      field: 'container-class',
      displayName: '容器类名',
      type: 'string',
      description: '父容器的类名',
      examples: ['android.widget.LinearLayout', 'androidx.recyclerview.widget.RecyclerView']
    },
    'sibling-count': {
      field: 'sibling-count',
      displayName: '兄弟元素数',
      type: 'number',
      description: '同级元素的总数量',
      examples: ['3', '5', '7']
    },
    'position-in-siblings': {
      field: 'position-in-siblings',
      displayName: '兄弟位置',
      type: 'number',
      description: '在兄弟元素中的位置（从0开始）',
      examples: ['0', '1', '2']
    },
    'context-fingerprint': {
      field: 'context-fingerprint',
      displayName: '上下文指纹',
      type: 'string',
      description: '完整的上下文特征组合',
      examples: ['anchor:用户名+position:right+container:LinearLayout']
    }
  };

  /**
   * 分析关注按钮的字段特征
   */
  analyzeFollowButtons(): ElementAnalysisResult {
    // 基于XML分析的关注按钮特征
    const followButtonSamples = [
      {
        text: '关注',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        package: 'com.xingin.xhs',
        'content-desc': '',
        clickable: 'true',
        enabled: 'true',
        focusable: 'true',
        focused: 'false',
        selected: 'true',
        bounds: '[789,508][957,586]'
      },
      {
        text: '已关注',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        package: 'com.xingin.xhs',
        'content-desc': '',
        clickable: 'true',
        enabled: 'true',
        focusable: 'true',
        focused: 'false',
        selected: 'false',
        bounds: '[789,291][957,369]'
      }
    ];

    return {
      elementType: 'follow_button',
      commonFields: [
        this.fieldDefinitions.text,
        this.fieldDefinitions['resource-id'],
        this.fieldDefinitions.class,
        this.fieldDefinitions.clickable,
        this.fieldDefinitions.enabled,
        this.fieldDefinitions.bounds
      ],
      specificFields: [
        this.fieldDefinitions.selected,
        this.fieldDefinitions.focusable,
        this.fieldDefinitions.package
      ],
      sampleElements: followButtonSamples
    };
  }

  /**
   * 分析用户名元素的字段特征
   */
  analyzeUserNameElements(): ElementAnalysisResult {
    const userNameSamples = [
      {
        text: '绯衣少年',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        package: 'com.xingin.xhs',
        'content-desc': '',
        clickable: 'false',
        enabled: 'true',
        focusable: 'false',
        bounds: '[201,304][381,355]'
      },
      {
        text: 'GU',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        package: 'com.xingin.xhs',
        'content-desc': '',
        clickable: 'false',
        enabled: 'true',
        focusable: 'false',
        bounds: '[201,521][261,572]'
      }
    ];

    return {
      elementType: 'username',
      commonFields: [
        this.fieldDefinitions.text,
        this.fieldDefinitions['resource-id'],
        this.fieldDefinitions.class,
        this.fieldDefinitions.bounds
      ],
      specificFields: [
        this.fieldDefinitions.clickable,
        this.fieldDefinitions.enabled,
        this.fieldDefinitions.package
      ],
      sampleElements: userNameSamples
    };
  }

  /**
   * 分析头像元素的字段特征
   */
  analyzeAvatarElements(): ElementAnalysisResult {
    const avatarSamples = [
      {
        text: '',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.ImageView',
        package: 'com.xingin.xhs',
        'content-desc': '',
        clickable: 'false',
        enabled: 'true',
        focusable: 'false',
        bounds: '[45,267][171,393]'
      }
    ];

    return {
      elementType: 'avatar',
      commonFields: [
        this.fieldDefinitions['resource-id'],
        this.fieldDefinitions.class,
        this.fieldDefinitions.bounds
      ],
      specificFields: [
        this.fieldDefinitions.clickable,
        this.fieldDefinitions.enabled,
        this.fieldDefinitions.package,
        this.fieldDefinitions.NAF
      ],
      sampleElements: avatarSamples
    };
  }

  /**
   * 获取所有元素类型的分析结果
   */
  getAllElementAnalysis(): Record<string, ElementAnalysisResult> {
    return {
      follow_button: this.analyzeFollowButtons(),
      username: this.analyzeUserNameElements(),
      avatar: this.analyzeAvatarElements()
    };
  }

  /**
   * 比较两种元素类型的共同字段
   */
  compareElementTypes(type1: string, type2: string): {
    commonFields: ElementFieldInfo[];
    type1OnlyFields: ElementFieldInfo[];
    type2OnlyFields: ElementFieldInfo[];
  } {
    const analysis = this.getAllElementAnalysis();
    const element1 = analysis[type1];
    const element2 = analysis[type2];

    if (!element1 || !element2) {
      throw new Error(`Unknown element type: ${type1} or ${type2}`);
    }

    const fields1 = [...element1.commonFields, ...element1.specificFields];
    const fields2 = [...element2.commonFields, ...element2.specificFields];

    const commonFields = fields1.filter(f1 => 
      fields2.some(f2 => f2.field === f1.field)
    );

    const type1OnlyFields = fields1.filter(f1 => 
      !fields2.some(f2 => f2.field === f1.field)
    );

    const type2OnlyFields = fields2.filter(f2 => 
      !fields1.some(f1 => f1.field === f2.field)
    );

    return {
      commonFields,
      type1OnlyFields,
      type2OnlyFields
    };
  }

  /**
   * 获取字段的详细信息
   */
  getFieldInfo(fieldName: string): ElementFieldInfo | null {
    return this.fieldDefinitions[fieldName] || null;
  }

  /**
   * 获取所有可用字段
   */
  getAllFields(): ElementFieldInfo[] {
    return Object.values(this.fieldDefinitions);
  }

  /**
   * 🆕 基于上下文的精准匹配字段分析
   * 专门针对动态UI场景，提供基于上下文的元素识别策略
   */
  analyzeContextAwareFields(): ElementAnalysisResult {
    return {
      elementType: 'context-aware',
      commonFields: [
        this.fieldDefinitions['anchor-text'],
        this.fieldDefinitions['relative-position'],
        this.fieldDefinitions['container-class'],
        this.fieldDefinitions.text
      ],
      specificFields: [
        this.fieldDefinitions['sibling-count'],
        this.fieldDefinitions['position-in-siblings'],
        this.fieldDefinitions['context-fingerprint'],
        this.fieldDefinitions.clickable,
        this.fieldDefinitions.bounds
      ],
      sampleElements: [
        {
          'anchor-text': '绯衣少年',
          'relative-position': 'right',
          'container-class': 'android.widget.LinearLayout',
          text: '已关注',
          'sibling-count': 3,
          'position-in-siblings': 2,
          clickable: true,
          description: '用户"绯衣少年"的关注按钮（已关注状态）'
        },
        {
          'anchor-text': 'GU',
          'relative-position': 'right',
          'container-class': 'android.widget.LinearLayout',
          text: '关注',
          'sibling-count': 3,
          'position-in-siblings': 2,
          clickable: true,
          description: '用户"GU"的关注按钮（未关注状态）'
        },
        {
          'anchor-text': 'HaloooCccccc',
          'relative-position': 'right',
          'container-class': 'android.widget.LinearLayout',
          text: '关注',
          'sibling-count': 3,
          'position-in-siblings': 2,
          clickable: true,
          description: '用户"HaloooCccccc"的关注按钮'
        }
      ]
    };
  }

  /**
   * 🎯 获取增强的元素分析结果（包含上下文感知）
   */
  getAllElementAnalysisEnhanced(): Record<string, ElementAnalysisResult> {
    return {
      follow_button: this.analyzeFollowButtons(),
      username: this.analyzeUserNameElements(),
      avatar: this.analyzeAvatarElements(),
      context_aware: this.analyzeContextAwareFields() // 🆕 上下文感知分析
    };
  }

  /**
   * 🔍 推荐最佳匹配策略
   * 基于元素特征推荐使用传统匹配还是上下文感知匹配
   */
  recommendMatchingStrategy(element: any): {
    strategy: 'traditional' | 'context-aware' | 'hybrid';
    reason: string;
    fields: string[];
  } {
    // 如果有唯一的resource-id，推荐传统匹配
    if (element['resource-id'] && 
        element['resource-id'] !== 'com.xingin.xhs:id/0_resource_name_obfuscated') {
      return {
        strategy: 'traditional',
        reason: '元素具有唯一的resource-id，可以直接定位',
        fields: ['resource-id']
      };
    }

    // 如果文本内容唯一，推荐传统匹配
    if (element.text && element.text.length > 0 && 
        !['关注', '已关注', '取消关注'].includes(element.text)) {
      return {
        strategy: 'traditional',
        reason: '元素文本内容具有唯一性',
        fields: ['text', 'class']
      };
    }

    // 如果是常见的按钮文本（如"关注"），推荐上下文感知
    if (['关注', '已关注', '取消关注', '点赞', '收藏', '分享'].includes(element.text)) {
      return {
        strategy: 'context-aware',
        reason: '元素文本内容常见，需要上下文区分',
        fields: ['anchor-text', 'relative-position', 'container-class', 'text']
      };
    }

    // 默认混合策略
    return {
      strategy: 'hybrid',
      reason: '元素特征复杂，建议结合传统和上下文方法',
      fields: ['text', 'class', 'anchor-text', 'relative-position']
    };
  }
}

export const elementFieldAnalyzer = new ElementFieldAnalyzer();