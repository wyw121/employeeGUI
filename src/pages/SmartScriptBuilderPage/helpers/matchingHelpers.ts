import { buildDefaultMatchingFromElement } from '../../../modules/grid-inspector/DefaultMatchingBuilder';
import { saveLatestMatching } from '../../../components/universal-ui/views/grid-view/matchingCache';
import { XmlEnhancementService } from '../../../modules/xml-enhancement';

export interface ElementLikeForMatching {
  resource_id?: string;
  text?: string;
  content_desc?: string;
  class_name?: string;
  bounds?: any;
  
  // 🆕 父节点字段支持
  parent_class?: string;
  parent_text?: string;
  parent_resource_id?: string;
  parent_content_desc?: string;
  
  // 🆕 子节点字段支持
  first_child_text?: string;
  first_child_content_desc?: string;
  first_child_resource_id?: string;
  descendant_texts?: string[];
}

export interface BuiltMatchingResult {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
}

/**
 * 构建默认匹配并写入最近匹配缓存；保持现有行为与策略完全一致。
 * 支持子节点信息增强，解决"父容器可点击但子容器有意义文本"的问题。
 * 返回构建结果；若无有效字段则返回 null。
 */
export function buildAndCacheDefaultMatchingFromElement(
  element: ElementLikeForMatching,
  options?: {
    xmlContext?: string;
    enableChildNodeExtraction?: boolean;
    enableParentNodeExtraction?: boolean; // 🆕 父节点提取选项
  }
): BuiltMatchingResult | null {
  let enhancedElement = element;
  
  // 🆕 如果启用子节点提取且有XML上下文，进行增强
  if (options?.enableChildNodeExtraction && options?.xmlContext) {
    try {
      const enhancementService = new XmlEnhancementService();
      enhancedElement = enhancementService.enhanceElement(element, options.xmlContext);
      
      console.log('🔍 子节点信息增强结果:', {
        originalText: element.text,
        enhancedText: enhancedElement.text,
        firstChildText: (enhancedElement as any).first_child_text,
        descendantTexts: (enhancedElement as any).descendant_texts
      });
    } catch (error) {
      console.warn('子节点增强失败:', error);
    }
  }
  
  // 🆕 如果启用父节点提取且有XML上下文，进行同步父节点增强
  if (options?.enableParentNodeExtraction && options?.xmlContext) {
    try {
      // 注意：暂时禁用动态导入，等模块创建完成后启用
      console.log('父节点增强功能开发中，暂时跳过');
      // TODO: 待父节点模块完善后启用
    } catch (error) {
      console.warn('父节点增强失败:', error);
    }
  }
  
  const built = buildDefaultMatchingFromElement({
    resource_id: enhancedElement.resource_id,
    text: enhancedElement.text,
    content_desc: enhancedElement.content_desc,
    class_name: enhancedElement.class_name,
    bounds: enhancedElement.bounds,
    
    // 🆕 父节点字段传递
    parent_class: (enhancedElement as any).parent_class,
    parent_text: (enhancedElement as any).parent_text,
    parent_resource_id: (enhancedElement as any).parent_resource_id,
    parent_content_desc: (enhancedElement as any).parent_content_desc,
    
    // 🆕 子节点字段传递
    first_child_text: (enhancedElement as any).first_child_text,
    first_child_content_desc: (enhancedElement as any).first_child_content_desc,
    first_child_resource_id: (enhancedElement as any).first_child_resource_id,
    descendant_texts: (enhancedElement as any).descendant_texts,
  }) as BuiltMatchingResult;

  if (!built || !built.fields || built.fields.length === 0) {
    return null;
  }

  // 同步到最近匹配缓存（用于 Grid Inspector 自动恢复）
  saveLatestMatching({ strategy: built.strategy, fields: built.fields });
  
  return built;
}

/**
 * 便捷函数：从XML上下文增强元素并构建匹配配置
 * 专门用于解决子容器文本问题
 */
export function buildEnhancedMatchingFromElementAndXml(
  element: ElementLikeForMatching,
  xmlContext: string
): BuiltMatchingResult | null {
  return buildAndCacheDefaultMatchingFromElement(element, {
    xmlContext,
    enableChildNodeExtraction: true,
  });
}

/**
 * 🆕 便捷函数：从XML上下文增强元素并构建父节点增强的匹配配置
 * 专门用于解决父容器点击但子元素有文本的问题
 */
export async function buildParentEnhancedMatchingFromElementAndXml(
  element: ElementLikeForMatching,
  xmlContext: string
): Promise<BuiltMatchingResult | null> {
  try {
    // 动态导入父节点增强服务 - 使用绝对路径
    const { ParentXmlEnhancementService } = await import('../../../modules/parent-xml-enhancement/ParentXmlEnhancementService');
    
    // 使用父节点增强服务处理元素
    const parentEnhanced = ParentXmlEnhancementService.enhanceElementWithParentInfo(element, xmlContext);
    
    if (parentEnhanced) {
      console.log('👨‍👦 父节点信息增强成功:', {
        parentClass: parentEnhanced.parent_class,
        parentResourceId: parentEnhanced.parent_resource_id,
        clickableAncestorClass: parentEnhanced.clickable_ancestor_class
      });
      
      // 构建增强后的匹配配置
      const built = buildDefaultMatchingFromElement({
        resource_id: parentEnhanced.resource_id,
        text: parentEnhanced.text,
        content_desc: parentEnhanced.content_desc,
        class_name: parentEnhanced.class_name,
        bounds: parentEnhanced.bounds,
        
        // 🆕 父节点字段
        parent_class: parentEnhanced.parent_class,
        parent_text: parentEnhanced.parent_text,
        parent_resource_id: parentEnhanced.parent_resource_id,
        parent_content_desc: parentEnhanced.parent_content_desc,
        
        // 🆕 可点击祖先信息
        clickable_ancestor_class: parentEnhanced.clickable_ancestor_class,
        clickable_ancestor_resource_id: parentEnhanced.clickable_ancestor_resource_id,
      }) as BuiltMatchingResult;

      if (built && built.fields && built.fields.length > 0) {
        // 同步到最近匹配缓存
        saveLatestMatching({ strategy: built.strategy, fields: built.fields });
        return built;
      }
    }
  } catch (error) {
    console.warn('父节点增强失败:', error);
  }
  
  // 回退到常规匹配
  return buildAndCacheDefaultMatchingFromElement(element);
}

export default buildAndCacheDefaultMatchingFromElement;
