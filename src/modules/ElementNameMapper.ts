/**
 * 元素名称映射服务
 * 用于管理用户自定义的元素名称映射和匹配规则
 * 
 * 功能特性：
 * - 🏷️ 智能元素命名：用户可自定义元素显示名称
 * - 🔍 匹配规则管理：灵活配置元素匹配约束字段
 * - 💾 映射规则缓存：本地持久化用户配置
 * - 🎯 批量匹配应用：同类元素自动应用命名规则
 */

import { message } from 'antd';

// ========== 类型定义 ==========

/**
 * 元素匹配约束字段配置
 */
export interface MatchingConstraints {
  /** 启用文本匹配 (text) */
  enableTextMatch: boolean;
  /** 启用资源ID匹配 (resource_id) */
  enableResourceIdMatch: boolean;
  /** 启用类名匹配 (class_name) */
  enableClassNameMatch: boolean;
  /** 启用内容描述匹配 (content_desc) */
  enableContentDescMatch: boolean;
  /** 启用坐标范围匹配 (bounds) */
  enableBoundsMatch: boolean;
  /** 启用元素类型匹配 (element_type) */
  enableElementTypeMatch: boolean;
  /** 启用可点击属性匹配 (clickable) */
  enableClickableMatch: boolean;
  /** 启用父元素匹配 (parent) */
  enableParentMatch: boolean;
  /** 启用兄弟元素匹配 (siblings) */
  enableSiblingMatch: boolean;
}

/**
 * 元素特征指纹（用于匹配）
 */
export interface ElementFingerprint {
  text?: string;
  resource_id?: string;
  class_name?: string;
  content_desc?: string;
  element_type?: string;
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  clickable?: boolean;
  /** 🆕 父元素信息 */
  parent?: {
    element_type?: string;
    resource_id?: string;
    class_name?: string;
    text?: string;
  };
  /** 🆕 兄弟元素信息 */
  siblings?: Array<{
    element_type?: string;
    resource_id?: string;
    text?: string;
    position?: 'before' | 'after';
  }>;
  /** 匹配约束配置 */
  constraints: MatchingConstraints;
}

/**
 * 元素名称映射规则
 */
export interface ElementNameMapping {
  /** 唯一标识符 */
  id: string;
  /** 用户自定义显示名称 */
  displayName: string;
  /** 元素特征指纹 */
  fingerprint: ElementFingerprint;
  /** 创建时间 */
  createdAt: number;
  /** 最后使用时间 */
  lastUsedAt: number;
  /** 使用次数 */
  usageCount: number;
  /** 备注说明 */
  notes?: string;
}

/**
 * UI元素接口（兼容现有代码）
 */
export interface UIElement {
  id?: string;
  text?: string;
  element_type?: string;
  resource_id?: string;
  content_desc?: string;
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  clickable?: boolean;
  smartDescription?: string;
  smartAnalysis?: any;
  /** 🆕 父元素信息 */
  parent?: {
    element_type?: string;
    resource_id?: string;
    class_name?: string;
    text?: string;
  };
  /** 🆕 兄弟元素信息 */
  siblings?: Array<{
    element_type?: string;
    resource_id?: string;
    text?: string;
    position?: 'before' | 'after';
  }>;
}

// ========== 核心服务类 ==========

/**
 * 元素名称映射管理器
 */
export class ElementNameMapper {
  private static readonly STORAGE_KEY = 'element_name_mappings';
  private static mappings: ElementNameMapping[] = [];
  
  static {
    this.loadMappingsFromStorage();
  }

  // ========== 主要功能接口 ==========

  /**
   * 获取元素的显示名称（主要入口）
   */
  static getDisplayName(element: UIElement): string {
    console.log('🏷️ ElementNameMapper.getDisplayName 查找元素显示名称:', element);
    console.log('🔍 当前映射缓存数量:', this.mappings.length);
    
    // 1. 尝试从映射缓存中匹配
    const mapping = this.findBestMatch(element);
    if (mapping) {
      // 更新使用统计
      this.updateUsageStats(mapping.id);
      console.log(`✅ 使用缓存映射: "${mapping.displayName}" (ID: ${mapping.id})`);
      return mapping.displayName;
    } else {
      console.log('❌ 在映射缓存中未找到匹配项');
    }

    // 2. 使用智能分析生成默认名称
    const smartName = this.generateSmartDisplayName(element);
    console.log(`🤖 生成智能名称: "${smartName}"`);
    return smartName;
  }

  /**
   * 🆕 强制刷新缓存并重新加载映射数据
   * 用于保存新映射后立即生效
   */
  static refreshCache(): void {
    console.log('🔄 强制刷新元素名称映射缓存...');
    this.loadMappingsFromStorage();
    console.log(`✅ 缓存已刷新，当前映射数量: ${this.mappings.length}`);
  }

  /**
   * 创建新的名称映射规则
   */
  static createMapping(
    element: UIElement, 
    displayName: string, 
    constraints: MatchingConstraints,
    notes?: string
  ): ElementNameMapping {
    // 🔍 检查是否存在相同元素的映射
    const existingMapping = this.findBestMatch(element);
    
    if (existingMapping) {
      console.log('🔄 发现现有映射，执行更新操作:', existingMapping.displayName, '->', displayName);
      
      // 更新现有映射
      existingMapping.displayName = displayName.trim();
      existingMapping.lastUsedAt = Date.now();
      existingMapping.usageCount += 1;
      if (notes !== undefined) {
        existingMapping.notes = notes;
      }
      
      this.saveMappingsToStorage();
      console.log('✅ 映射规则更新成功:', existingMapping);
      message.success(`映射规则已更新: "${displayName}"`);
      
      return existingMapping;
    }

    // 如果没有现有映射，创建新的
    const mapping: ElementNameMapping = {
      id: this.generateId(),
      displayName: displayName.trim(),
      fingerprint: {
        text: element.text,
        resource_id: element.resource_id,
        class_name: (element as any).class_name,
        content_desc: element.content_desc,
        element_type: element.element_type,
        bounds: element.bounds,
        clickable: element.clickable,
        parent: element.parent,
        siblings: element.siblings,
        constraints
      },
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      usageCount: 1,
      notes
    };

    this.mappings.push(mapping);
    this.saveMappingsToStorage();
    
    console.log('💾 创建新映射规则:', mapping);
    message.success(`映射规则创建成功: "${displayName}"`);
    
    return mapping;
  }

  /**
   * 更新映射规则
   */
  static updateMapping(
    id: string, 
    updates: Partial<Pick<ElementNameMapping, 'displayName' | 'notes'>> & 
             { constraints?: Partial<MatchingConstraints> }
  ): boolean {
    const mappingIndex = this.mappings.findIndex(m => m.id === id);
    if (mappingIndex === -1) {
      message.error('映射规则不存在');
      return false;
    }

    const mapping = this.mappings[mappingIndex];
    
    if (updates.displayName) {
      mapping.displayName = updates.displayName.trim();
    }
    
    if (updates.notes !== undefined) {
      mapping.notes = updates.notes;
    }
    
    if (updates.constraints) {
      mapping.fingerprint.constraints = {
        ...mapping.fingerprint.constraints,
        ...updates.constraints
      };
    }

    this.saveMappingsToStorage();
    message.success('映射规则更新成功');
    
    return true;
  }

  /**
   * 删除映射规则
   */
  static deleteMapping(id: string): boolean {
    const initialLength = this.mappings.length;
    this.mappings = this.mappings.filter(m => m.id !== id);
    
    if (this.mappings.length < initialLength) {
      this.saveMappingsToStorage();
      message.success('映射规则删除成功');
      return true;
    }
    
    message.error('映射规则不存在');
    return false;
  }

  /**
   * 获取所有映射规则
   */
  static getAllMappings(): ElementNameMapping[] {
    return [...this.mappings].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  /**
   * 清空所有映射规则
   */
  static clearAllMappings(): void {
    this.mappings = [];
    this.saveMappingsToStorage();
    message.success('所有映射规则已清空');
  }

  // ========== 内部辅助方法 ==========

  /**
   * 查找最佳匹配的映射规则
   */
  private static findBestMatch(element: UIElement): ElementNameMapping | null {
    console.log('🔍 开始寻找最佳匹配，可用映射数量:', this.mappings.length);
    let bestMatch: ElementNameMapping | null = null;
    let highestScore = 0;
    let latestCreatedAt = 0;

    for (const mapping of this.mappings) {
      const score = this.calculateMatchScore(element, mapping.fingerprint);
      console.log(`📊 映射 "${mapping.displayName}" 的匹配度: ${(score * 100).toFixed(1)}%`);
      
      if (score >= 0.8) { // 匹配阈值80%
        // 🆕 优先级规则：分数更高的优先，分数相同时最新的优先
        const shouldUpdate = score > highestScore || 
                           (score === highestScore && mapping.createdAt > latestCreatedAt);
        
        if (shouldUpdate) {
          highestScore = score;
          bestMatch = mapping;
          latestCreatedAt = mapping.createdAt;
          console.log(`🎯 新的最佳匹配: "${mapping.displayName}" (${(score * 100).toFixed(1)}%) - 创建时间: ${new Date(mapping.createdAt).toLocaleString()}`);
        }
      }
    }

    if (bestMatch) {
      console.log(`✅ 最终最佳匹配 (${(highestScore * 100).toFixed(1)}%):`, bestMatch);
    } else {
      console.log('❌ 未找到符合条件的匹配项（阈值80%）');
    }

    return bestMatch;
  }

  /**
   * 计算元素与指纹的匹配度评分 (0-1)
   */
  private static calculateMatchScore(element: UIElement, fingerprint: ElementFingerprint): number {
    const constraints = fingerprint.constraints;
    let totalWeight = 0;
    let matchWeight = 0;
    const debugInfo = []; // 🆕 用于调试的详细信息

    // 🔧 优化后的匹配算法：只对有效属性计算权重
    
    // 文本匹配 (text) - 权重: 0.25
    if (constraints.enableTextMatch) {
      const hasValidText = (element.text && element.text.trim() !== '') && (fingerprint.text && fingerprint.text.trim() !== '');
      if (hasValidText) {
        totalWeight += 0.25;
        const matched = element.text === fingerprint.text;
        if (matched) {
          matchWeight += 0.25;
          debugInfo.push(`✅ 文本匹配: "${element.text}" = "${fingerprint.text}" (+0.25)`);
        } else {
          debugInfo.push(`❌ 文本不匹配: "${element.text}" ≠ "${fingerprint.text}"`);
        }
      } else {
        debugInfo.push(`⚪ 文本为空或无效，跳过匹配`);
      }
    }

    // 资源ID匹配 (resource_id) - 权重: 0.2
    if (constraints.enableResourceIdMatch) {
      const hasValidResourceId = element.resource_id && fingerprint.resource_id && 
                                element.resource_id !== 'undefined' && fingerprint.resource_id !== 'undefined';
      if (hasValidResourceId) {
        totalWeight += 0.2;
        const matched = element.resource_id === fingerprint.resource_id;
        if (matched) {
          matchWeight += 0.2;
          debugInfo.push(`✅ 资源ID匹配: "${element.resource_id}" = "${fingerprint.resource_id}" (+0.2)`);
        } else {
          debugInfo.push(`❌ 资源ID不匹配: "${element.resource_id}" ≠ "${fingerprint.resource_id}"`);
        }
      } else {
        debugInfo.push(`⚪ 资源ID为空或无效，跳过匹配`);
      }
    }

    // 可点击属性匹配 (clickable) - 权重: 0.15
    if (constraints.enableClickableMatch) {
      const hasValidClickable = element.clickable !== undefined && fingerprint.clickable !== undefined;
      if (hasValidClickable) {
        totalWeight += 0.15;
        const matched = element.clickable === fingerprint.clickable;
        if (matched) {
          matchWeight += 0.15;
          debugInfo.push(`✅ 可点击属性匹配: ${element.clickable} = ${fingerprint.clickable} (+0.15)`);
        } else {
          debugInfo.push(`❌ 可点击属性不匹配: ${element.clickable} ≠ ${fingerprint.clickable}`);
        }
      } else {
        debugInfo.push(`⚪ 可点击属性未定义，跳过匹配`);
      }
    }

    // 内容描述匹配 (content_desc) - 权重: 0.15
    if (constraints.enableContentDescMatch) {
      const hasValidContentDesc = element.content_desc && fingerprint.content_desc && 
                                 element.content_desc.trim() !== '' && fingerprint.content_desc.trim() !== '';
      if (hasValidContentDesc) {
        totalWeight += 0.15;
        const matched = element.content_desc === fingerprint.content_desc;
        if (matched) {
          matchWeight += 0.15;
          debugInfo.push(`✅ 内容描述匹配: "${element.content_desc}" = "${fingerprint.content_desc}" (+0.15)`);
        } else {
          debugInfo.push(`❌ 内容描述不匹配: "${element.content_desc}" ≠ "${fingerprint.content_desc}"`);
        }
      } else {
        debugInfo.push(`⚪ 内容描述为空，跳过匹配`);
      }
    }

    // 类名匹配 (class_name) - 权重: 0.1
    if (constraints.enableClassNameMatch) {
      const elementClass = (element as any).class_name;
      const hasValidClassName = elementClass && fingerprint.class_name && 
                               elementClass.trim() !== '' && fingerprint.class_name.trim() !== '';
      if (hasValidClassName) {
        totalWeight += 0.1;
        const matched = elementClass === fingerprint.class_name;
        if (matched) {
          matchWeight += 0.1;
          debugInfo.push(`✅ 类名匹配: "${elementClass}" = "${fingerprint.class_name}" (+0.1)`);
        } else {
          debugInfo.push(`❌ 类名不匹配: "${elementClass}" ≠ "${fingerprint.class_name}"`);
        }
      } else {
        debugInfo.push(`⚪ 类名为空，跳过匹配`);
      }
    }

    // 元素类型匹配 (element_type) - 权重: 0.1
    if (constraints.enableElementTypeMatch) {
      const hasValidElementType = element.element_type && fingerprint.element_type && 
                                 element.element_type.trim() !== '' && fingerprint.element_type.trim() !== '';
      if (hasValidElementType) {
        totalWeight += 0.1;
        const matched = element.element_type === fingerprint.element_type;
        if (matched) {
          matchWeight += 0.1;
          debugInfo.push(`✅ 元素类型匹配: "${element.element_type}" = "${fingerprint.element_type}" (+0.1)`);
        } else {
          debugInfo.push(`❌ 元素类型不匹配: "${element.element_type}" ≠ "${fingerprint.element_type}"`);
        }
      } else {
        debugInfo.push(`⚪ 元素类型为空，跳过匹配`);
      }
    }

    // 🆕 父元素匹配 (parent) - 权重: 0.05
    if (constraints.enableParentMatch) {
      const hasValidParent = element.parent && fingerprint.parent;
      if (hasValidParent) {
        totalWeight += 0.05;
        const matched = this.compareParentElements(element.parent, fingerprint.parent);
        if (matched) {
          matchWeight += 0.05;
          debugInfo.push(`✅ 父元素匹配 (+0.05)`);
        } else {
          debugInfo.push(`❌ 父元素不匹配`);
        }
      } else {
        debugInfo.push(`⚪ 父元素信息缺失，跳过匹配`);
      }
    }

    // 坐标范围匹配 (bounds) - 权重: 0.02 (最低，因为坐标可能变动)
    if (constraints.enableBoundsMatch) {
      const hasValidBounds = element.bounds && fingerprint.bounds;
      if (hasValidBounds) {
        totalWeight += 0.02;
        const matched = this.compareBounds(element.bounds, fingerprint.bounds);
        if (matched) {
          matchWeight += 0.02;
          debugInfo.push(`✅ 坐标匹配 (+0.02)`);
        } else {
          debugInfo.push(`❌ 坐标不匹配`);
        }
      } else {
        debugInfo.push(`⚪ 坐标信息缺失，跳过匹配`);
      }
    }

    // 兄弟元素匹配 (siblings) - 权重: 0.03
    if (constraints.enableSiblingMatch) {
      const hasValidSiblings = element.siblings && fingerprint.siblings && 
                              element.siblings.length > 0 && fingerprint.siblings.length > 0;
      if (hasValidSiblings) {
        totalWeight += 0.03;
        const matched = this.compareSiblingElements(element.siblings, fingerprint.siblings);
        if (matched) {
          matchWeight += 0.03;
          debugInfo.push(`✅ 兄弟元素匹配 (+0.03)`);
        } else {
          debugInfo.push(`❌ 兄弟元素不匹配`);
        }
      } else {
        debugInfo.push(`⚪ 兄弟元素信息缺失，跳过匹配`);
      }
    }

    // 如果没有启用任何约束，返回0分
    if (totalWeight === 0) {
      debugInfo.push(`⚠️ 没有有效属性可匹配，返回0分`);
      return 0;
    }

    const finalScore = matchWeight / totalWeight;
    
    // 🆕 输出详细的匹配分析（仅在有一定匹配度时输出，减少噪音）
    if (finalScore > 0.1) {
      console.log(`🔍 智能匹配分析 (${(finalScore * 100).toFixed(1)}%):`);
      debugInfo.forEach(info => console.log(`   ${info}`));
      console.log(`   📊 有效权重: ${totalWeight.toFixed(2)}, 匹配权重: ${matchWeight.toFixed(2)}`);
      console.log(`   🎯 匹配度: ${matchWeight.toFixed(2)} ÷ ${totalWeight.toFixed(2)} = ${(finalScore * 100).toFixed(1)}%`);
    }

    return finalScore;
  }

  /**
   * 🆕 比较父元素信息
   */
  private static compareParentElements(
    parent1?: UIElement['parent'], 
    parent2?: UIElement['parent']
  ): boolean {
    if (!parent1 || !parent2) return false;

    // 比较父元素的关键属性
    return (
      (parent1.element_type === parent2.element_type) ||
      (parent1.resource_id && parent2.resource_id && parent1.resource_id === parent2.resource_id) ||
      (parent1.class_name && parent2.class_name && parent1.class_name === parent2.class_name)
    );
  }

  /**
   * 🆕 比较兄弟元素信息
   */
  private static compareSiblingElements(
    siblings1?: UIElement['siblings'], 
    siblings2?: UIElement['siblings']
  ): boolean {
    if (!siblings1 || !siblings2 || siblings1.length === 0 || siblings2.length === 0) {
      return false;
    }

    // 简单匹配：检查是否有相同的兄弟元素
    return siblings1.some(s1 => 
      siblings2.some(s2 => 
        s1.resource_id === s2.resource_id || 
        s1.text === s2.text ||
        s1.element_type === s2.element_type
      )
    );
  }

  /**
   * 🆕 比较坐标范围（允许一定偏差）
   */
  private static compareBounds(
    bounds1?: UIElement['bounds'], 
    bounds2?: UIElement['bounds']
  ): boolean {
    if (!bounds1 || !bounds2) return false;

    const tolerance = 10; // 允许10像素偏差
    return (
      Math.abs(bounds1.left - bounds2.left) <= tolerance &&
      Math.abs(bounds1.top - bounds2.top) <= tolerance &&
      Math.abs(bounds1.right - bounds2.right) <= tolerance &&
      Math.abs(bounds1.bottom - bounds2.bottom) <= tolerance
    );
  }

  /**
   * 生成智能显示名称（降级方案）
   */
  private static generateSmartDisplayName(element: UIElement): string {
    // 优先使用元素文本
    if (element.text?.trim()) {
      return element.text.trim();
    }

    // 使用内容描述
    if (element.content_desc?.trim()) {
      return element.content_desc.trim();
    }

    // 根据元素类型生成通用名称
    const elementType = element.element_type || '元素';
    if (elementType.includes('Button')) {
      return '未知按钮';
    } else if (elementType.includes('Text')) {
      return '文本元素';
    } else if (elementType.includes('Edit')) {
      return '输入框';
    } else if (elementType.includes('Image')) {
      return '图片元素';
    } else {
      return `未知${elementType}`;
    }
  }

  /**
   * 更新使用统计
   */
  private static updateUsageStats(mappingId: string): void {
    const mapping = this.mappings.find(m => m.id === mappingId);
    if (mapping) {
      mapping.lastUsedAt = Date.now();
      mapping.usageCount += 1;
      this.saveMappingsToStorage();
    }
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========== 数据持久化 ==========

  /**
   * 从本地存储加载映射规则
   */
  private static loadMappingsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.mappings = JSON.parse(stored);
        console.log(`📚 加载了 ${this.mappings.length} 条映射规则`);
      }
    } catch (error) {
      console.error('❌ 加载映射规则失败:', error);
      this.mappings = [];
    }
  }

  /**
   * 保存映射规则到本地存储
   */
  private static saveMappingsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.mappings));
      console.log(`💾 保存了 ${this.mappings.length} 条映射规则`);
    } catch (error) {
      console.error('❌ 保存映射规则失败:', error);
      message.error('映射规则保存失败');
    }
  }
}

// ========== 默认约束配置 ==========

/**
 * 默认匹配约束配置
 */
export const DEFAULT_MATCHING_CONSTRAINTS: MatchingConstraints = {
  enableTextMatch: true,
  enableResourceIdMatch: true,
  enableClassNameMatch: false,
  enableContentDescMatch: true,
  enableBoundsMatch: false,
  enableElementTypeMatch: true,
  enableClickableMatch: true, // 🆕 默认启用，因为同类元素都有相同可点击属性
  enableParentMatch: false,
  enableSiblingMatch: false,
};

// ========== 导出 ==========

export default ElementNameMapper;