import { DistributedScript, DistributedStep, StepXmlSnapshot } from '../index';

/**
 * 分布式脚本管理器
 * 负责脚本的导出/导入、XML快照的嵌入/提取、跨设备兼容性处理
 */
export class DistributedScriptManager {
  
  /**
   * 创建包含 XML 快照的分布式步骤
   */
  static createDistributedStep(
    stepData: Omit<DistributedStep, 'xmlSnapshot'>,
    xmlContent: string,
    deviceInfo?: StepXmlSnapshot['deviceInfo'],
    pageInfo?: StepXmlSnapshot['pageInfo']
  ): DistributedStep {
    const xmlHash = this.computeXmlHash(xmlContent);
    
    return {
      ...stepData,
      xmlSnapshot: {
        xmlContent,
        xmlHash,
        timestamp: Date.now(),
        deviceInfo,
        pageInfo,
      }
    };
  }

  /**
   * 导出脚本为自包含的 JSON 文件
   * 自动优化：相同 XML 快照去重到全局池
   */
  static exportScript(script: DistributedScript): string {
    const optimized = this.optimizeXmlSnapshots(script);
    return JSON.stringify(optimized, null, 2);
  }

  /**
   * 从 JSON 导入脚本
   * 自动恢复：将全局池的 XML 快照分发回步骤
   */
  static importScript(jsonContent: string): DistributedScript {
    const script = JSON.parse(jsonContent) as DistributedScript;
    return this.restoreXmlSnapshots(script);
  }

  /**
   * 为现有步骤创建 XML 快照（兼容旧版本升级）
   */
  static attachXmlSnapshot(
    step: any, // 旧版本步骤格式
    xmlContent: string,
    deviceInfo?: StepXmlSnapshot['deviceInfo'],
    pageInfo?: StepXmlSnapshot['pageInfo']
  ): DistributedStep {
    return {
      id: step.id,
      name: step.name,
      actionType: step.actionType || step.step_type,
      params: step.parameters || step.params || {},
      locator: this.extractLocator(step),
      createdAt: step.createdAt || Date.now(),
      description: step.description,
      tags: step.tags,
      order: step.order,
      xmlSnapshot: {
        xmlContent,
        xmlHash: this.computeXmlHash(xmlContent),
        timestamp: Date.now(),
        deviceInfo,
        pageInfo,
      }
    };
  }

  /**
   * 从步骤中提取节点定位器（兼容多种格式）
   */
  private static extractLocator(step: any): import('../../inspector/entities/NodeLocator').NodeLocator {
    // 如果已有标准 locator
    if (step.locator) return step.locator;
    
    // 从旧版本参数构造
    const params = step.parameters || step.params || {};
    return {
      absoluteXPath: params.xpath || params.element_xpath,
      predicateXPath: params.predicate_xpath,
      attributes: {
        resourceId: params.resource_id || params.element_resource_id,
        text: params.text || params.element_text,
        contentDesc: params.content_desc || params.element_content_desc,
        className: params.class_name || params.element_class,
        packageName: params.package_name,
      },
      bounds: params.bounds || params.element_bounds,
    };
  }

  /**
   * XML 去重优化：相同内容的 XML 放到全局池
   */
  private static optimizeXmlSnapshots(script: DistributedScript): DistributedScript {
    const xmlPool: Record<string, any> = {};
    const optimizedSteps: DistributedStep[] = [];

    for (const step of script.steps) {
      const hash = step.xmlSnapshot.xmlHash;
      
      // 添加到全局池
      if (!xmlPool[hash]) {
        xmlPool[hash] = {
          xmlContent: step.xmlSnapshot.xmlContent,
          xmlHash: hash,
          timestamp: step.xmlSnapshot.timestamp,
          usageCount: 0,
        };
      }
      xmlPool[hash].usageCount++;

      // 步骤中只保留引用
      optimizedSteps.push({
        ...step,
        xmlSnapshot: {
          xmlHash: hash,
          timestamp: step.xmlSnapshot.timestamp,
          deviceInfo: step.xmlSnapshot.deviceInfo,
          pageInfo: step.xmlSnapshot.pageInfo,
          xmlContent: '', // 清空，指向全局池
        }
      });
    }

    return {
      ...script,
      steps: optimizedSteps,
      xmlSnapshotPool: xmlPool,
    };
  }

  /**
   * 恢复 XML 快照：从全局池分发回步骤
   */
  private static restoreXmlSnapshots(script: DistributedScript): DistributedScript {
    if (!script.xmlSnapshotPool) return script; // 没有全局池，直接返回

    const restoredSteps = script.steps.map(step => ({
      ...step,
      xmlSnapshot: {
        ...step.xmlSnapshot,
        xmlContent: script.xmlSnapshotPool![step.xmlSnapshot.xmlHash]?.xmlContent || step.xmlSnapshot.xmlContent,
      }
    }));

    return {
      ...script,
      steps: restoredSteps,
    };
  }

  /**
   * 计算 XML 内容哈希（简化版）
   */
  private static computeXmlHash(xmlContent: string): string {
    let hash = 0;
    for (let i = 0; i < xmlContent.length; i++) {
      const char = xmlContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 验证脚本完整性
   */
  static validateScript(script: DistributedScript): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!script.steps || script.steps.length === 0) {
      errors.push('脚本必须包含至少一个步骤');
    }

    for (const step of script.steps || []) {
      if (!step.xmlSnapshot || !step.xmlSnapshot.xmlContent) {
        errors.push(`步骤 ${step.name} 缺少 XML 快照`);
      }
      if (!step.locator) {
        errors.push(`步骤 ${step.name} 缺少节点定位器`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}