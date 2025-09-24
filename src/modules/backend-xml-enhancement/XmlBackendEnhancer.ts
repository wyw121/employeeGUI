/**
 * 后端XML子节点字段扩展
 * 
 * 为后端XML判断服务添加子节点字段支持
 */

export interface ExtendedMatchCriteria {
  // 标准字段
  strategy: string;
  fields: string[];
  values: Record<string, string>;
  includes?: Record<string, string[]>;
  excludes?: Record<string, string[]>;
  
  // 🆕 子节点字段支持
  enableChildNodeMatching?: boolean;
  childNodeFields?: string[];
  childNodeValues?: Record<string, string>;
}

export class XmlBackendEnhancer {
  /**
   * 将前端的子节点字段转换为后端可识别的格式
   */
  static enhanceMatchCriteriaForBackend(criteria: any): ExtendedMatchCriteria {
    const enhanced: ExtendedMatchCriteria = {
      strategy: criteria.strategy,
      fields: [...criteria.fields],
      values: { ...criteria.values },
      includes: criteria.includes ? { ...criteria.includes } : {},
      excludes: criteria.excludes ? { ...criteria.excludes } : {},
    };
    
    // 检查是否包含子节点字段
    const childNodeFields = ['first_child_text', 'first_child_content_desc', 'first_child_resource_id', 'descendant_text'];
    const hasChildFields = enhanced.fields.some(field => childNodeFields.includes(field));
    
    if (hasChildFields) {
      enhanced.enableChildNodeMatching = true;
      enhanced.childNodeFields = [];
      enhanced.childNodeValues = {};
      
      // 分离子节点字段
      enhanced.fields = enhanced.fields.filter(field => {
        if (childNodeFields.includes(field)) {
          enhanced.childNodeFields!.push(field);
          if (enhanced.values[field]) {
            enhanced.childNodeValues![field] = enhanced.values[field];
            delete enhanced.values[field]; // 从主values中移除
          }
          return false;
        }
        return true;
      });
      
      console.log('🔍 检测到子节点字段，启用子节点匹配模式:', {
        childNodeFields: enhanced.childNodeFields,
        childNodeValues: enhanced.childNodeValues,
        remainingFields: enhanced.fields,
      });
    }
    
    return enhanced;
  }
  
  /**
   * 为子节点字段生成后端匹配逻辑的提示信息
   */
  static generateChildNodeMatchingHints(criteria: ExtendedMatchCriteria): string[] {
    const hints: string[] = [];
    
    if (!criteria.enableChildNodeMatching || !criteria.childNodeFields) {
      return hints;
    }
    
    for (const field of criteria.childNodeFields) {
      const value = criteria.childNodeValues?.[field];
      if (!value) continue;
      
      switch (field) {
        case 'first_child_text':
          hints.push(`子节点文本应包含: "${value}"`);
          break;
        case 'first_child_content_desc':
          hints.push(`子节点内容描述应包含: "${value}"`);
          break;
        case 'first_child_resource_id':
          hints.push(`子节点资源ID应匹配: "${value}"`);
          break;
        case 'descendant_text':
          hints.push(`后代节点文本应包含: "${value}"`);
          break;
      }
    }
    
    return hints;
  }
  
  /**
   * 检查当前后端版本是否支持子节点匹配
   */
  static async checkBackendChildNodeSupport(): Promise<boolean> {
    try {
      // 这里可以调用一个测试接口来检查后端版本
      // 目前假设后端还不支持，需要前端智能处理
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * 前端智能降级：将子节点字段转换为主字段
   * 当后端不支持子节点匹配时使用
   */
  static fallbackChildFieldsToMainFields(criteria: any): any {
    const fallback = { ...criteria };
    
    // 如果有 first_child_text 但没有主 text，使用子节点文本作为主文本
    if (fallback.values.first_child_text && !fallback.values.text) {
      fallback.fields = fallback.fields.map((f: string) => f === 'first_child_text' ? 'text' : f);
      fallback.values.text = fallback.values.first_child_text;
      delete fallback.values.first_child_text;
      
      console.log('📋 智能降级：使用子节点文本作为主文本匹配');
    }
    
    // 如果有 first_child_content_desc 但没有主 content_desc，使用子节点内容描述
    if (fallback.values.first_child_content_desc && !fallback.values.content_desc) {
      fallback.fields = fallback.fields.map((f: string) => f === 'first_child_content_desc' ? 'content-desc' : f);
      fallback.values['content-desc'] = fallback.values.first_child_content_desc;
      delete fallback.values.first_child_content_desc;
      
      console.log('📋 智能降级：使用子节点内容描述作为主内容描述匹配');
    }
    
    // 如果有 descendant_text，尝试与主文本字段结合
    if (fallback.values.descendant_text) {
      if (!fallback.values.text) {
        fallback.fields = fallback.fields.map((f: string) => f === 'descendant_text' ? 'text' : f);
        fallback.values.text = fallback.values.descendant_text;
      }
      delete fallback.values.descendant_text;
      
      console.log('📋 智能降级：使用后代节点文本作为主文本匹配');
    }
    
    return fallback;
  }
}