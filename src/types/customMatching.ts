/**
 * 自定义UI元素匹配规则系统
 * 支持通配符、正则表达式、位置范围匹配，实现"单条命令针对多个目标"功能
 */

export interface CustomMatchingRule {
  /** 规则唯一标识 */
  id: string;
  
  /** 规则名称 */
  name: string;
  
  /** 规则描述 */
  description?: string;
  
  /** 匹配条件 */
  conditions: MatchingConditions;
  
  /** 匹配选项 */
  options: MatchingOptions;
  
  /** 是否启用该规则 */
  enabled: boolean;
}

export interface MatchingConditions {
  /** 文本匹配规则 */
  text?: TextMatchRule;
  
  /** 类名匹配规则 */
  className?: TextMatchRule;
  
  /** 资源ID匹配规则 */
  resourceId?: TextMatchRule;
  
  /** 内容描述匹配规则 */
  contentDesc?: TextMatchRule;
  
  /** 位置范围匹配 */
  bounds?: BoundsMatchRule;
  
  /** 属性匹配 */
  attributes?: AttributeMatchRule;
}

export interface TextMatchRule {
  /** 匹配模式 */
  mode: 'exact' | 'wildcard' | 'regex' | 'contains' | 'startsWith' | 'endsWith';
  
  /** 匹配值 */
  value: string;
  
  /** 是否大小写敏感 */
  caseSensitive?: boolean;
}

export interface BoundsMatchRule {
  /** X坐标范围 */
  x?: RangeRule;
  
  /** Y坐标范围 */
  y?: RangeRule;
  
  /** 宽度范围 */
  width?: RangeRule;
  
  /** 高度范围 */
  height?: RangeRule;
}

export interface RangeRule {
  /** 最小值 */
  min?: number;
  
  /** 最大值 */
  max?: number;
  
  /** 精确值 */
  exact?: number;
}

export interface AttributeMatchRule {
  /** 是否可点击 */
  clickable?: boolean;
  
  /** 是否启用 */
  enabled?: boolean;
  
  /** 是否可聚焦 */
  focusable?: boolean;
  
  /** 是否选中 */
  selected?: boolean;
  
  /** 是否可滚动 */
  scrollable?: boolean;
  
  /** 是否长按 */
  longClickable?: boolean;
}

export interface MatchingOptions {
  /** 最大匹配数量，0表示无限制 */
  maxMatches: number;
  
  /** 匹配顺序 */
  order: 'document' | 'position' | 'size' | 'random';
  
  /** 是否去重 */
  deduplicate: boolean;
  
  /** 过滤条件 */
  filters?: MatchingFilter[];
}

export interface MatchingFilter {
  /** 过滤器类型 */
  type: 'exclude_text' | 'exclude_bounds' | 'require_parent' | 'require_sibling';
  
  /** 过滤器参数 */
  params: any;
}

export interface MatchingResult {
  /** 匹配的元素信息 */
  elements: MatchedElement[];
  
  /** 匹配规则ID */
  ruleId: string;
  
  /** 匹配总数 */
  totalMatches: number;
  
  /** 是否达到最大匹配数 */
  limitReached: boolean;
  
  /** 匹配耗时(毫秒) */
  duration: number;
}

export interface MatchedElement {
  /** 元素唯一标识 */
  id: string;
  
  /** 元素文本 */
  text: string;
  
  /** 元素类名 */
  className: string;
  
  /** 资源ID */
  resourceId: string;
  
  /** 内容描述 */
  contentDesc: string;
  
  /** 位置信息 */
  bounds: ElementBounds;
  
  /** 元素属性 */
  attributes: ElementAttributes;
  
  /** 匹配置信度 */
  confidence: number;
  
  /** 匹配的具体条件 */
  matchedConditions: string[];
}

export interface ElementBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ElementAttributes {
  clickable: boolean;
  enabled: boolean;
  focusable: boolean;
  focused: boolean;
  selected: boolean;
  scrollable: boolean;
  longClickable: boolean;
  checkable: boolean;
  checked: boolean;
  password: boolean;
}

/**
 * 预定义的常用匹配规则模板
 */
export const PREDEFINED_RULES = {
  /** 关注按钮匹配规则 */
  FOLLOW_BUTTONS: {
    name: '关注按钮',
    description: '匹配所有关注/已关注按钮',
    conditions: {
      text: {
        mode: 'wildcard' as const,
        value: '关注*',
        caseSensitive: false
      },
      className: {
        mode: 'exact' as const,
        value: 'android.widget.TextView'
      },
      bounds: {
        x: { min: 780, max: 970 }
      },
      attributes: {
        clickable: true,
        enabled: true
      }
    },
    options: {
      maxMatches: 10,
      order: 'document' as const,
      deduplicate: true
    }
  },
  
  /** 通用按钮匹配 */
  GENERIC_BUTTONS: {
    name: '通用按钮',
    description: '匹配所有可点击的按钮元素',
    conditions: {
      className: {
        mode: 'contains' as const,
        value: 'Button'
      },
      attributes: {
        clickable: true,
        enabled: true
      }
    },
    options: {
      maxMatches: 0,
      order: 'document' as const,
      deduplicate: true
    }
  },
  
  /** 输入框匹配 */
  INPUT_FIELDS: {
    name: '输入框',
    description: '匹配所有输入框元素',
    conditions: {
      className: {
        mode: 'regex' as const,
        value: 'EditText|TextField'
      },
      attributes: {
        focusable: true,
        enabled: true
      }
    },
    options: {
      maxMatches: 0,
      order: 'document' as const,
      deduplicate: true
    }
  }
};