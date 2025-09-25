/**
 * 统一的元素回填到步骤的工具模块
 * 
 * 目标：
 * 1. 统一所有"设置为步骤元素"的回填逻辑
 * 2. 确保所有回填都包含完整参数：策略、字段、值、包含/不包含、预览信息
 * 3. 模块化设计，便于维护和扩展
 * 4. 支持从当前节点详情面板状态构建完整 Criteria
 */

import type { UiNode } from '../../types';
import type { MatchCriteria, MatchStrategy } from './types';
import { buildXPath } from '../../utils';
import { 
  PRESET_FIELDS, 
  inferStrategyFromFields, 
  toBackendStrategy, 
  buildDefaultValues, 
  normalizeFieldsAndValues, 
  normalizeExcludes, 
  normalizeIncludes 
} from './helpers';
import { buildDefaultMatchingFromElement } from '../../../../../../modules/grid-inspector/DefaultMatchingBuilder';

/**
 * 元素回填选项配置
 */
export interface ElementToStepOptions {
  // 当前选择的策略（来自节点详情面板）
  currentStrategy?: MatchStrategy;
  // 当前选择的字段（来自节点详情面板）
  currentFields?: string[];
  // 当前字段的值（来自节点详情面板）
  currentValues?: Record<string, string>;
  // 当前包含条件（来自节点详情面板）
  currentIncludes?: Record<string, string[]>;
  // 当前不包含条件（来自节点详情面板）
  currentExcludes?: Record<string, string[]>;
  // 当前每字段匹配模式（equals|contains|regex）
  currentMatchMode?: Record<string, 'equals' | 'contains' | 'regex'>;
  // 当前每字段“必须匹配”的正则
  currentRegexIncludes?: Record<string, string[]>;
  // 当前每字段“不可匹配”的正则
  currentRegexExcludes?: Record<string, string[]>;
  // 是否强制使用节点的原始值（忽略面板编辑的值）
  forceNodeValues?: boolean;
  // 后备策略（当无法从字段推断时使用）
  fallbackStrategy?: MatchStrategy;
}

/**
 * 完整的回填结果，包含所有必要信息
 */
export interface CompleteStepCriteria extends MatchCriteria {
  // 预览信息，用于后续精确定位
  preview?: {
    xpath: string;
    bounds?: string;
    nodeLabel?: string;
  };
  // 元数据
  metadata?: {
    sourceType: 'node-detail' | 'screen-preview' | 'tree-selection' | 'match-results';
    timestamp: number;
    hasCustomStrategy: boolean;
    hasAdvancedConditions: boolean;
  };
}

/**
 * 从节点和当前面板状态构建完整的回填条件
 */
export function buildCompleteStepCriteria(
  node: UiNode | null,
  options: ElementToStepOptions = {},
  sourceType: CompleteStepCriteria['metadata']['sourceType'] = 'node-detail'
): CompleteStepCriteria | null {
  
  if (!node) {
    console.warn('buildCompleteStepCriteria: node is null');
    return null;
  }

  const {
    currentStrategy,
    currentFields,
    currentValues,
    currentIncludes,
    currentExcludes,
    currentMatchMode,
    currentRegexIncludes,
    currentRegexExcludes,
    forceNodeValues = false,
    fallbackStrategy = 'standard'
  } = options;

  try {
    // 1. 确定策略
    let strategy: MatchStrategy = currentStrategy || fallbackStrategy;
    
    // 2. 确定字段集合
    let fields: string[] = [];
    
    if (currentFields && currentFields.length > 0) {
      // 使用面板当前选择的字段
      fields = [...currentFields];
    } else {
      // 后备：使用策略对应的预设字段
      fields = PRESET_FIELDS[strategy as keyof typeof PRESET_FIELDS] || PRESET_FIELDS.standard;
      // 根据字段重新推断策略（保持一致性）
      strategy = inferStrategyFromFields(fields);
    }

    // 3. 构建字段值
    let values: Record<string, string> = {};
    
    if (forceNodeValues || !currentValues) {
      // 使用节点原始值
      values = buildDefaultValues(node, fields);
    } else {
      // 使用面板编辑的值，但对空值进行节点值补充
      values = { ...currentValues };
      for (const field of fields) {
        if (!values[field] || values[field].trim() === '') {
          const nodeValue = node.attrs?.[field];
          if (nodeValue != null) {
            values[field] = String(nodeValue);
          }
        }
      }
    }

  // 4. 规范化字段和值（移除空值字段）
  let normalized = normalizeFieldsAndValues(fields, values);

    // 4.1 兜底：若规范化后仍无任何有效字段，则按优先级从节点补充一个最小可用字段，避免空条件
    if (!normalized.fields || normalized.fields.length === 0) {
      const candidates: Array<{ key: string; val?: string }> = [
        { key: 'resource-id', val: node.attrs?.['resource-id'] },
        { key: 'text', val: node.attrs?.['text'] },
        { key: 'content-desc', val: node.attrs?.['content-desc'] },
        { key: 'class', val: node.attrs?.['class'] },
        { key: 'bounds', val: node.attrs?.['bounds'] },
      ];
      const picked = candidates.find(c => (c.val ?? '').toString().trim() !== '');
      if (picked) {
        normalized = normalizeFieldsAndValues([picked.key], { [picked.key]: String(picked.val) });
        // 若选择了 bounds，则策略至少应为 absolute
        if (picked.key === 'bounds' && strategy !== 'absolute') {
          strategy = 'absolute';
        }
      } else {
        // 进一步兜底：尝试通过统一构建器从节点常见语义字段合成默认匹配
        const built = buildDefaultMatchingFromElement({
          resource_id: node.attrs?.['resource-id'],
          text: node.attrs?.['text'],
          content_desc: node.attrs?.['content-desc'],
          class_name: node.attrs?.['class'],
          bounds: node.attrs?.['bounds'],
        });
        if (built.fields.length > 0) {
          normalized = normalizeFieldsAndValues(built.fields, built.values);
          strategy = built.strategy as MatchStrategy;
        }
      }
    }

    // 5. 处理包含/不包含条件
    const includes = normalizeIncludes(currentIncludes || {}, normalized.fields);
    const excludes = normalizeExcludes(currentExcludes || {}, normalized.fields);

    // 5.1 处理匹配模式与正则（仅保留已选字段）
    const fieldSet = new Set(normalized.fields);
    const matchMode = Object.fromEntries(
      Object.entries(currentMatchMode || {}).filter(([k]) => fieldSet.has(k))
    ) as Record<string, 'equals' | 'contains' | 'regex'>;
    const regexIncludes = Object.fromEntries(
      Object.entries(currentRegexIncludes || {}).filter(([k]) => fieldSet.has(k))
    ) as Record<string, string[]>;
    const regexExcludes = Object.fromEntries(
      Object.entries(currentRegexExcludes || {}).filter(([k]) => fieldSet.has(k))
    ) as Record<string, string[]>;

    // 6. 构建预览信息
    const preview = {
      xpath: buildXPath(node),
      bounds: node.attrs?.['bounds'],
      nodeLabel: getNodeDisplayLabel(node)
    };

    // 7. 构建元数据
    const metadata = {
      sourceType,
      timestamp: Date.now(),
      hasCustomStrategy: strategy === 'custom',
      hasAdvancedConditions: Object.keys(includes).length > 0 || Object.keys(excludes).length > 0
    };

    // 8. 构建完整的回填条件
    const criteria: CompleteStepCriteria = {
      strategy: normalized.fields.length > 0 ? strategy : fallbackStrategy,
      fields: normalized.fields,
      values: normalized.values,
      includes,
      excludes,
      ...(Object.keys(matchMode).length ? { matchMode } : {}),
      ...(Object.keys(regexIncludes).length ? { regexIncludes } : {}),
      ...(Object.keys(regexExcludes).length ? { regexExcludes } : {}),
      preview,
      metadata
    };

    console.log('🎯 构建完整回填条件:', {
      strategy: criteria.strategy,
      fieldsCount: criteria.fields.length,
      valuesCount: Object.keys(criteria.values).length,
      includesCount: Object.keys(criteria.includes || {}).length,
      excludesCount: Object.keys(criteria.excludes || {}).length,
      sourceType,
      nodeLabel: preview.nodeLabel
    });

    return criteria;

  } catch (error) {
    console.error('构建回填条件失败:', error, { node, options });
    return null;
  }
}

/**
 * 从节点构建智能回填条件（自动推断最佳策略和字段）
 */
export function buildSmartStepCriteria(
  node: UiNode | null,
  sourceType: CompleteStepCriteria['metadata']['sourceType'] = 'tree-selection'
): CompleteStepCriteria | null {
  
  if (!node) return null;

  // 智能分析节点特征，选择最佳策略
  const hasResourceId = !!node.attrs?.['resource-id'];
  const hasText = !!(node.attrs?.['text']?.trim());
  const hasContentDesc = !!(node.attrs?.['content-desc']?.trim());
  const hasBounds = !!node.attrs?.['bounds'];

  let smartStrategy: MatchStrategy = 'standard';
  let smartFields: string[] = [];

  // 智能策略选择逻辑
  if (hasResourceId && hasText) {
    // 有ID有文本，使用strict策略，确保精确匹配
    smartStrategy = 'strict';
    smartFields = ['resource-id', 'text', 'class'];
  } else if (hasResourceId) {
    // 仅有ID，使用relaxed策略，允许一定灵活性
    smartStrategy = 'relaxed';
    smartFields = ['resource-id', 'class'];
  } else if (hasText && hasContentDesc) {
    // 有文本有描述，使用文本匹配
    smartStrategy = 'standard';
    smartFields = ['text', 'content-desc', 'class'];
  } else if (hasBounds) {
    // 仅有位置信息，使用位置策略
    smartStrategy = 'absolute';
    smartFields = ['bounds', 'class'];
  } else {
    // 回退到基本策略
    smartStrategy = 'standard';
    smartFields = ['class', 'package'];
  }

  return buildCompleteStepCriteria(node, {
    currentStrategy: smartStrategy,
    currentFields: smartFields,
    forceNodeValues: true,
    fallbackStrategy: 'standard'
  }, sourceType);
}

/**
 * 快速从匹配结果构建回填条件（使用当前面板配置）
 */
export function buildMatchResultCriteria(
  node: UiNode | null,
  currentStrategy?: MatchStrategy,
  currentFields?: string[]
): CompleteStepCriteria | null {
  
  if (!node) return null;

  return buildCompleteStepCriteria(node, {
    currentStrategy: currentStrategy || 'standard',
    currentFields: currentFields && currentFields.length > 0 ? currentFields : undefined,
    forceNodeValues: true,
  }, 'match-results');
}

/**
 * 获取节点显示标签（用于预览）
 */
function getNodeDisplayLabel(node: UiNode): string {
  const text = node.attrs?.['text']?.trim();
  const resourceId = node.attrs?.['resource-id'];
  const className = node.attrs?.['class'];
  
  if (text) return text;
  if (resourceId) return resourceId.split('/').pop() || resourceId;
  if (className) return className.split('.').pop() || className;
  return node.tag || '未知元素';
}

/**
 * 验证回填条件的完整性
 */
export function validateStepCriteria(criteria: CompleteStepCriteria): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (!criteria.fields || criteria.fields.length === 0) {
    warnings.push('没有选择匹配字段');
  }
  
  if (!criteria.values || Object.keys(criteria.values).length === 0) {
    warnings.push('没有可用的匹配值');
  }
  
  if (!criteria.preview?.xpath) {
    warnings.push('缺少XPath预览信息');
  }
  
  const hasNonEmptyValues = Object.values(criteria.values || {}).some(v => v.trim() !== '');
  if (!hasNonEmptyValues) {
    warnings.push('所有字段值都为空');
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * 格式化回填条件为可读字符串（用于调试和日志）
 */
export function formatCriteriaForDebug(criteria: CompleteStepCriteria): string {
  const parts: string[] = [];
  
  parts.push(`策略: ${criteria.strategy}`);
  parts.push(`字段: [${criteria.fields.join(', ')}]`);
  
  const valueEntries = Object.entries(criteria.values || {});
  if (valueEntries.length > 0) {
    const valueStrings = valueEntries.map(([k, v]) => `${k}="${v}"`);
    parts.push(`值: {${valueStrings.join(', ')}}`);
  }
  
  if (criteria.includes && Object.keys(criteria.includes).length > 0) {
    parts.push(`包含: ${Object.keys(criteria.includes).length}个字段`);
  }
  
  if (criteria.excludes && Object.keys(criteria.excludes).length > 0) {
    parts.push(`不包含: ${Object.keys(criteria.excludes).length}个字段`);
  }
  
  if (criteria.metadata?.sourceType) {
    parts.push(`来源: ${criteria.metadata.sourceType}`);
  }

  return parts.join(' | ');
}