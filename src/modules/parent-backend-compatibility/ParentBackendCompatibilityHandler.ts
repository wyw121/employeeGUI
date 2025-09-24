/**
 * 父节点后端兼容性处理器
 * 
 * 处理父节点增强字段与后端系统的兼容性
 * 确保新的父节点字段能够正确传递给后端执行器
 */

export interface ExtendedParentMatchCriteria {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
  includes?: Record<string, string[]>;
  excludes?: Record<string, string[]>;
  
  // 🆕 父节点增强字段
  parent_class?: string;
  parent_text?: string;
  parent_content_desc?: string;
  parent_resource_id?: string;
  parent_bounds?: string;
  clickable_ancestor_class?: string;
  clickable_ancestor_resource_id?: string;
  clickable_ancestor_bounds?: string;
}

export interface BackendCompatibleParentCriteria {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
  includes?: Record<string, string[]>;
  excludes?: Record<string, string[]>;
}

export class ParentBackendCompatibilityHandler {
  /**
   * 增强匹配条件以支持父节点字段，确保后端兼容性
   */
  static enhanceParentMatchCriteriaForBackend(
    criteria: ExtendedParentMatchCriteria
  ): BackendCompatibleParentCriteria {
    const enhanced: BackendCompatibleParentCriteria = {
      strategy: criteria.strategy,
      fields: [...criteria.fields],
      values: { ...criteria.values },
      includes: criteria.includes ? { ...criteria.includes } : {},
      excludes: criteria.excludes ? { ...criteria.excludes } : {}
    };
    
    console.log('🔧 开始父节点后端兼容性处理...');
    
    // 处理父节点字段
    this.processParentFields(criteria, enhanced);
    
    // 处理可点击祖先字段
    this.processClickableAncestorFields(criteria, enhanced);
    
    // 智能回退：如果没有父节点信息，保持原始字段
    this.applyIntelligentFallback(criteria, enhanced);
    
    console.log('✅ 父节点后端兼容性处理完成:', {
      originalFields: criteria.fields.length,
      enhancedFields: enhanced.fields.length,
      hasParentInfo: this.hasParentInfo(criteria),
      hasClickableAncestor: this.hasClickableAncestor(criteria)
    });
    
    return enhanced;
  }
  
  /**
   * 处理直接父节点字段
   */
  static processParentFields(
    criteria: ExtendedParentMatchCriteria,
    enhanced: BackendCompatibleParentCriteria
  ): void {
    // parent_class -> parent-class
    if (criteria.parent_class) {
      if (!enhanced.fields.includes('parent-class')) {
        enhanced.fields.push('parent-class');
      }
      enhanced.values['parent-class'] = criteria.parent_class;
    }
    
    // parent_text -> parent-text
    if (criteria.parent_text) {
      if (!enhanced.fields.includes('parent-text')) {
        enhanced.fields.push('parent-text');
      }
      enhanced.values['parent-text'] = criteria.parent_text;
    }
    
    // parent_content_desc -> parent-content-desc
    if (criteria.parent_content_desc) {
      if (!enhanced.fields.includes('parent-content-desc')) {
        enhanced.fields.push('parent-content-desc');
      }
      enhanced.values['parent-content-desc'] = criteria.parent_content_desc;
    }
    
    // parent_resource_id -> parent-resource-id
    if (criteria.parent_resource_id) {
      if (!enhanced.fields.includes('parent-resource-id')) {
        enhanced.fields.push('parent-resource-id');
      }
      enhanced.values['parent-resource-id'] = criteria.parent_resource_id;
    }
    
    // parent_bounds -> parent-bounds
    if (criteria.parent_bounds) {
      if (!enhanced.fields.includes('parent-bounds')) {
        enhanced.fields.push('parent-bounds');
      }
      enhanced.values['parent-bounds'] = criteria.parent_bounds;
    }
  }
  
  /**
   * 处理可点击祖先节点字段
   */
  static processClickableAncestorFields(
    criteria: ExtendedParentMatchCriteria,
    enhanced: BackendCompatibleParentCriteria
  ): void {
    // clickable_ancestor_class -> clickable-ancestor-class
    if (criteria.clickable_ancestor_class) {
      if (!enhanced.fields.includes('clickable-ancestor-class')) {
        enhanced.fields.push('clickable-ancestor-class');
      }
      enhanced.values['clickable-ancestor-class'] = criteria.clickable_ancestor_class;
    }
    
    // clickable_ancestor_resource_id -> clickable-ancestor-resource-id
    if (criteria.clickable_ancestor_resource_id) {
      if (!enhanced.fields.includes('clickable-ancestor-resource-id')) {
        enhanced.fields.push('clickable-ancestor-resource-id');
      }
      enhanced.values['clickable-ancestor-resource-id'] = criteria.clickable_ancestor_resource_id;
    }
    
    // clickable_ancestor_bounds -> clickable-ancestor-bounds
    if (criteria.clickable_ancestor_bounds) {
      if (!enhanced.fields.includes('clickable-ancestor-bounds')) {
        enhanced.fields.push('clickable-ancestor-bounds');
      }
      enhanced.values['clickable-ancestor-bounds'] = criteria.clickable_ancestor_bounds;
    }
  }
  
  /**
   * 智能回退机制
   */
  static applyIntelligentFallback(
    original: ExtendedParentMatchCriteria,
    enhanced: BackendCompatibleParentCriteria
  ): void {
    // 如果没有父节点信息，确保原始字段完整保留
    if (!this.hasParentInfo(original) && !this.hasClickableAncestor(original)) {
      console.log('ℹ️ 没有父节点信息，保持原始字段配置');
      return;
    }
    
    // 如果有父节点信息但原始元素信息较弱，优先使用父节点字段
    if (this.hasWeakElementInfo(original) && this.hasStrongParentInfo(original)) {
      console.log('ℹ️ 原始元素信息较弱，优先使用父节点字段');
      this.prioritizeParentFields(enhanced);
    }
  }
  
  /**
   * 检查是否包含父节点信息
   */
  static hasParentInfo(criteria: ExtendedParentMatchCriteria): boolean {
    return !!(criteria.parent_class || 
             criteria.parent_text || 
             criteria.parent_content_desc || 
             criteria.parent_resource_id);
  }
  
  /**
   * 检查是否包含可点击祖先信息
   */
  static hasClickableAncestor(criteria: ExtendedParentMatchCriteria): boolean {
    return !!(criteria.clickable_ancestor_class ||
             criteria.clickable_ancestor_resource_id ||
             criteria.clickable_ancestor_bounds);
  }
  
  /**
   * 检查原始元素信息是否较弱
   */
  static hasWeakElementInfo(criteria: ExtendedParentMatchCriteria): boolean {
    const hasResourceId = criteria.values['resource-id'];
    const hasText = criteria.values['text'];
    const hasContentDesc = criteria.values['content-desc'];
    
    // 如果三个关键字段都没有，认为信息较弱
    return !hasResourceId && !hasText && !hasContentDesc;
  }
  
  /**
   * 检查父节点信息是否较强
   */
  static hasStrongParentInfo(criteria: ExtendedParentMatchCriteria): boolean {
    return !!(criteria.parent_resource_id || 
             criteria.clickable_ancestor_resource_id ||
             (criteria.parent_text && criteria.parent_text.length > 1));
  }
  
  /**
   * 优先使用父节点字段
   */
  static prioritizeParentFields(enhanced: BackendCompatibleParentCriteria): void {
    // 将父节点字段排在前面，提高匹配优先级
    const parentFields = enhanced.fields.filter(f => f.startsWith('parent-') || f.startsWith('clickable-ancestor-'));
    const otherFields = enhanced.fields.filter(f => !f.startsWith('parent-') && !f.startsWith('clickable-ancestor-'));
    
    enhanced.fields = [...parentFields, ...otherFields];
  }
  
  /**
   * 回退父节点字段到原始字段（兼容性回退）
   */
  static fallbackParentFieldsToMainFields(
    criteria: ExtendedParentMatchCriteria
  ): BackendCompatibleParentCriteria {
    console.log('⚠️ 执行父节点字段回退处理...');
    
    const fallback: BackendCompatibleParentCriteria = {
      strategy: criteria.strategy,
      fields: [...criteria.fields],
      values: { ...criteria.values },
      includes: criteria.includes ? { ...criteria.includes } : {},
      excludes: criteria.excludes ? { ...criteria.excludes } : {}
    };
    
    // 如果有父节点resource_id但原始元素没有，使用父节点的作为主字段
    if (!fallback.values['resource-id'] && criteria.parent_resource_id) {
      fallback.values['resource-id'] = criteria.parent_resource_id;
      if (!fallback.fields.includes('resource-id')) {
        fallback.fields.push('resource-id');
      }
    }
    
    // 如果有可点击祖先resource_id但其他都没有，使用祖先的作为主字段  
    if (!fallback.values['resource-id'] && criteria.clickable_ancestor_resource_id) {
      fallback.values['resource-id'] = criteria.clickable_ancestor_resource_id;
      if (!fallback.fields.includes('resource-id')) {
        fallback.fields.push('resource-id');
      }
    }
    
    // 如果有父节点文本但原始元素没有，使用父节点的作为主字段
    if (!fallback.values['text'] && criteria.parent_text) {
      fallback.values['text'] = criteria.parent_text;
      if (!fallback.fields.includes('text')) {
        fallback.fields.push('text');
      }
    }
    
    // 如果有父节点class但原始元素class信息不足，补充class信息
    if (!fallback.values['class'] && criteria.parent_class) {
      fallback.values['class'] = criteria.parent_class;
      if (!fallback.fields.includes('class')) {
        fallback.fields.push('class');
      }
    }
    
    console.log('✅ 父节点字段回退处理完成');
    return fallback;
  }
}

export default ParentBackendCompatibilityHandler;