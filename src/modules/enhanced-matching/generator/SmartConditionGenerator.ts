/**
 * enhanced-matching/generator/SmartConditionGenerator.ts
 * 智能匹配条件生成器 - 解决DefaultMatchingBuilder的字段混淆问题
 */

import { HierarchyAnalyzer } from '../analyzer/HierarchyAnalyzer';
import { 
  SmartMatchingConditions, 
  EnhancedMatchField, 
  MatchingOptimizationOptions,
  NodeHierarchyAnalysis 
} from '../types';

/**
 * 智能匹配条件生成器
 * 替代DefaultMatchingBuilder中存在问题的逻辑
 */
export class SmartConditionGenerator {
  /**
   * 从XML元素生成智能匹配条件
   * @param element 目标元素
   * @param xmlDocument XML文档
   * @param options 优化选项
   */
  static generateSmartConditions(
    element: Element,
    xmlDocument: Document,
    options: MatchingOptimizationOptions = this.getDefaultOptions()
  ): SmartMatchingConditions {
    
    // 1. 分析节点层级结构
    const analysis = HierarchyAnalyzer.analyzeNodeHierarchy(element, xmlDocument);
    
    // 2. 生成智能字段组合
    const enhancedFields = this.generateEnhancedFields(analysis, options);
    
    // 3. 构建匹配条件
    const conditions = this.buildMatchingConditions(enhancedFields, analysis, options);
    
    // 4. 计算整体置信度
    const confidence = this.calculateOverallConfidence(enhancedFields, analysis);

    return {
      ...conditions,
      hierarchy: enhancedFields,
      confidence,
      analysis
    };
  }

  /**
   * 生成增强匹配字段 - 解决父子节点字段混淆
   */
  private static generateEnhancedFields(
    analysis: NodeHierarchyAnalysis,
    options: MatchingOptimizationOptions
  ): EnhancedMatchField[] {
    const fields: EnhancedMatchField[] = [];

    // 优先处理当前节点的语义字段
    this.addSemanticFields(fields, analysis.self, 'self', '当前节点');

    // 根据选项添加父节点字段
    if (options.enableParentContext && analysis.parent) {
      this.addSemanticFields(fields, analysis.parent, 'parent', '父节点');
    }

    // 根据选项添加子节点字段
    if (options.enableChildContext) {
      analysis.children.forEach((child, index) => {
        this.addSemanticFields(fields, child, 'child', `子节点[${index}]`, index);
      });
    }

    // 智能过滤和排序
    return this.optimizeFieldSelection(fields, options);
  }

  /**
   * 添加语义字段 - 避免位置字段混淆
   */
  private static addSemanticFields(
    fields: EnhancedMatchField[],
    attributes: Record<string, string>,
    level: 'self' | 'parent' | 'child' | 'descendant' | 'ancestor' | 'sibling',
    displayPrefix: string,
    depth?: number
  ): void {
    // 定义字段优先级和置信度
    const fieldPriority: Record<string, number> = {
      'resource-id': 0.95,
      'content-desc': 0.90,
      'text': 0.85,
      'class': 0.70,
      'clickable': 0.60,
      'enabled': 0.55,
      'selected': 0.50,
      'package': 0.45,
      'checkable': 0.40,
      'scrollable': 0.35
    };

    Object.entries(attributes).forEach(([fieldName, value]) => {
      if (value && fieldPriority[fieldName]) {
        // 检查字段的实际有效性
        const confidence = this.calculateFieldConfidence(fieldName, value, level, attributes);
        
        if (confidence > 0.3) { // 只添加有效置信度的字段
          fields.push({
            level,
            fieldName,
            displayName: `${displayPrefix}.${fieldName}`,
            description: this.generateFieldDescription(fieldName, level, depth),
            value,
            confidence,
            depth: depth ?? (level === 'parent' ? -1 : level === 'child' ? 1 : 0)
          });
        }
      }
    });
  }

  /**
   * 计算字段置信度 - 考虑上下文相关性
   */
  private static calculateFieldConfidence(
    fieldName: string,
    value: string,
    level: 'self' | 'parent' | 'child' | 'descendant' | 'ancestor' | 'sibling',
    allAttributes: Record<string, string>
  ): number {
    let baseConfidence = 0.7;

    // 根据字段类型调整
    switch (fieldName) {
      case 'resource-id':
        baseConfidence = 0.95;
        break;
      case 'content-desc':
        baseConfidence = 0.90;
        break;
      case 'text':
        baseConfidence = value.length > 1 ? 0.85 : 0.60; // 空文本或单字符降权
        break;
      case 'class':
        baseConfidence = 0.70;
        break;
      case 'clickable':
        // 特别处理clickable字段的上下文相关性
        if (level === 'self' && value === 'true') {
          baseConfidence = 0.80;
        } else if (level === 'parent' && value === 'true') {
          baseConfidence = 0.60; // 父节点的clickable相关性较低
        } else {
          baseConfidence = 0.40;
        }
        break;
    }

    // 根据节点层级调整
    switch (level) {
      case 'self':
        break; // 保持基础置信度
      case 'parent':
        baseConfidence *= 0.85; // 父节点稍微降权
        break;
      case 'child':
        baseConfidence *= 0.90; // 子节点稍微降权
        break;
      default:
        baseConfidence *= 0.75; // 其他层级降权更多
    }

    return Math.min(baseConfidence, 0.95);
  }

  /**
   * 优化字段选择 - 避免冲突和冗余
   */
  private static optimizeFieldSelection(
    fields: EnhancedMatchField[],
    options: MatchingOptimizationOptions
  ): EnhancedMatchField[] {
    // 按置信度排序
    const sortedFields = fields.sort((a, b) => b.confidence - a.confidence);

    // 去重逻辑：避免同一字段在不同层级的冲突
    const deduplicatedFields: EnhancedMatchField[] = [];
    const seenFields = new Set<string>();

    sortedFields.forEach(field => {
      const key = `${field.fieldName}`;
      
      // 如果是高置信度字段，或者该字段名还没出现过
      if (field.confidence > 0.8 || !seenFields.has(key)) {
        deduplicatedFields.push(field);
        seenFields.add(key);
      }
    });

    // 限制字段数量（避免过度匹配）
    const maxFields = options.prioritizeSemanticFields ? 6 : 4;
    return deduplicatedFields.slice(0, maxFields);
  }

  /**
   * 构建最终匹配条件
   */
  private static buildMatchingConditions(
    enhancedFields: EnhancedMatchField[],
    analysis: NodeHierarchyAnalysis,
    options: MatchingOptimizationOptions
  ): Omit<SmartMatchingConditions, 'hierarchy' | 'confidence' | 'analysis'> {
    const fields: string[] = [];
    const values: Record<string, string> = {};
    const includes: Record<string, string[]> = {};
    const excludes: Record<string, string[]> = {};

    // 根据层级生成字段名和值
    enhancedFields.forEach(field => {
      let fieldKey: string;
      
      // 生成层级感知的字段键
      switch (field.level) {
        case 'self':
          fieldKey = field.fieldName;
          break;
        case 'parent':
          fieldKey = `parent_${field.fieldName}`;
          break;
        case 'child':
          if (field.depth !== undefined && field.depth >= 0) {
            fieldKey = `child_${field.depth}_${field.fieldName}`;
          } else {
            fieldKey = `first_child_${field.fieldName}`;
          }
          break;
        default:
          fieldKey = `${field.level}_${field.fieldName}`;
      }

      fields.push(fieldKey);
      values[fieldKey] = field.value;
    });

    // 自动选择匹配策略
    const strategy = this.selectOptimalStrategy(enhancedFields, options);

    return {
      strategy,
      fields,
      values,
      includes,
      excludes
    };
  }

  /**
   * 选择最优匹配策略
   */
  private static selectOptimalStrategy(
    fields: EnhancedMatchField[],
    options: MatchingOptimizationOptions
  ): string {
    const avgConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
    const hasParentFields = fields.some(f => f.level === 'parent');
    const hasChildFields = fields.some(f => f.level === 'child');
    
    // 如果有位置字段且用户允许，使用absolute
    if (!options.excludePositionalFields && fields.some(f => ['bounds', 'index'].includes(f.fieldName))) {
      return 'absolute';
    }
    
    // 如果置信度高且字段齐全，使用strict
    if (avgConfidence > 0.8 && fields.length >= 3) {
      return 'strict';
    }
    
    // 如果有层级字段，使用standard（跨设备友好）
    if (hasParentFields || hasChildFields) {
      return 'standard';
    }
    
    // 默认使用relaxed
    return 'relaxed';
  }

  /**
   * 计算整体置信度
   */
  private static calculateOverallConfidence(
    fields: EnhancedMatchField[],
    analysis: NodeHierarchyAnalysis
  ): number {
    if (fields.length === 0) return 0;

    const avgConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
    
    // 根据字段多样性调整
    const uniqueLevels = new Set(fields.map(f => f.level)).size;
    const diversityBonus = Math.min(uniqueLevels * 0.05, 0.15);
    
    return Math.min(avgConfidence + diversityBonus, 0.98);
  }

  /**
   * 生成字段描述
   */
  private static generateFieldDescription(
    fieldName: string,
    level: 'self' | 'parent' | 'child' | 'descendant' | 'ancestor' | 'sibling',
    depth?: number
  ): string {
    const levelDesc = level === 'child' && depth !== undefined 
      ? `第${depth + 1}层子节点` 
      : {
          'self': '当前节点',
          'parent': '父节点', 
          'child': '子节点',
          'descendant': '后代节点',
          'ancestor': '祖先节点',
          'sibling': '兄弟节点'
        }[level];

    const fieldDesc = {
      'resource-id': 'Android资源ID',
      'content-desc': '无障碍描述',
      'text': '文本内容',
      'class': '组件类型',
      'clickable': '可点击属性',
      'enabled': '启用状态',
      'selected': '选中状态',
      'package': '应用包名'
    }[fieldName] || fieldName;

    return `${levelDesc}的${fieldDesc}`;
  }

  /**
   * 默认优化选项
   */
  private static getDefaultOptions(): MatchingOptimizationOptions {
    return {
      enableParentContext: true,
      enableChildContext: true,
      enableDescendantSearch: false, // 默认关闭深度搜索以提高性能
      maxDepth: 2,
      prioritizeSemanticFields: true,
      excludePositionalFields: true // 默认排除位置字段以提高跨设备兼容性
    };
  }
}