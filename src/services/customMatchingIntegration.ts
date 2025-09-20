/**
 * 自定义匹配规则集成模块
 * 将CustomMatchingEngine集成到SmartScriptExecutor中，支持循环执行和批量操作
 */

import { 
  customMatchingEngine,
  CustomMatchingRule, 
  MatchingResult, 
  PREDEFINED_RULES 
} from '../services/customMatchingEngine';

import {
  SmartScriptStep,
  StepActionType // 修正导入名称
} from '../modules/smart-script-management/types';

/**
 * 扩展的脚本步骤，支持自定义匹配规则
 */
export interface EnhancedScriptStep extends SmartScriptStep {
  /** 自定义匹配规则配置 */
  customMatching?: CustomMatchingConfiguration;
}

export interface CustomMatchingConfiguration {
  /** 是否启用自定义匹配 */
  enabled: boolean;
  
  /** 使用的匹配规则 */
  rule: CustomMatchingRule;
  
  /** 批量执行配置 */
  batchExecution?: {
    /** 批量执行模式 */
    mode: 'sequential' | 'parallel' | 'first_only' | 'random_one';
    
    /** 每批次间隔时间(毫秒) */
    intervalMs?: number;
    
    /** 最大并发数(parallel模式) */
    maxConcurrency?: number;
    
    /** 失败时是否继续 */
    continueOnError?: boolean;
  };
}

/**
 * 自定义匹配规则管理器
 */
export class CustomMatchingManager {
  private static instance: CustomMatchingManager;
  private ruleCache = new Map<string, CustomMatchingRule>();
  
  public static getInstance(): CustomMatchingManager {
    if (!CustomMatchingManager.instance) {
      CustomMatchingManager.instance = new CustomMatchingManager();
    }
    return CustomMatchingManager.instance;
  }
  
  /**
   * 注册自定义规则
   */
  public registerRule(rule: CustomMatchingRule): void {
    this.ruleCache.set(rule.id, rule);
    console.log(`📝 已注册自定义匹配规则: ${rule.name} (${rule.id})`);
  }
  
  /**
   * 获取规则
   */
  public getRule(ruleId: string): CustomMatchingRule | undefined {
    return this.ruleCache.get(ruleId);
  }
  
  /**
   * 创建预定义规则
   */
  public createPredefinedRule(type: keyof typeof PREDEFINED_RULES): CustomMatchingRule {
    const rule = customMatchingEngine.createPredefinedRule(type as keyof typeof PREDEFINED_RULES);
    this.registerRule(rule);
    return rule;
  }
  
  /**
   * 解析UI XML并应用匹配规则
   */
  public async matchElementsFromXML(
    xmlContent: string, 
    rule: CustomMatchingRule
  ): Promise<MatchingResult> {
    try {
      // 解析XML内容
      const elements = this.parseXMLToElements(xmlContent);
      
      // 执行匹配
      const result = await customMatchingEngine.match(rule, elements);
      
      console.log(`🎯 匹配完成: 规则 "${rule.name}", 找到 ${result.totalMatches} 个匹配元素`);
      
      return result;
    } catch (error) {
      console.error('❌ XML匹配失败:', error);
      throw error;
    }
  }
  
  /**
   * 将XML解析为UI元素数组
   */
  private parseXMLToElements(xmlContent: string): any[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      const elements: any[] = [];
      
      // 递归遍历所有node元素
      const traverseNodes = (node: Element) => {
        if (node.tagName === 'node') {
          const element = {
            text: node.getAttribute('text') || '',
            'resource-id': node.getAttribute('resource-id') || '',
            'class': node.getAttribute('class') || '',
            'content-desc': node.getAttribute('content-desc') || '',
            bounds: node.getAttribute('bounds') || '[0,0][0,0]',
            clickable: node.getAttribute('clickable') || 'false',
            enabled: node.getAttribute('enabled') || 'false',
            focusable: node.getAttribute('focusable') || 'false',
            focused: node.getAttribute('focused') || 'false',
            selected: node.getAttribute('selected') || 'false',
            scrollable: node.getAttribute('scrollable') || 'false',
            'long-clickable': node.getAttribute('long-clickable') || 'false',
            checkable: node.getAttribute('checkable') || 'false',
            checked: node.getAttribute('checked') || 'false',
            password: node.getAttribute('password') || 'false'
          };
          elements.push(element);
        }
        
        // 递归处理子节点
        for (let i = 0; i < node.children.length; i++) {
          traverseNodes(node.children[i]);
        }
      };
      
      traverseNodes(doc.documentElement);
      
      console.log(`📊 从XML解析得到 ${elements.length} 个UI元素`);
      return elements;
    } catch (error) {
      console.error('❌ XML解析失败:', error);
      return [];
    }
  }
  
  /**
   * 扩展脚本步骤，支持自定义匹配
   */
  public enhanceScriptStep(
    step: SmartScriptStep,
    matchingConfig: CustomMatchingConfiguration
  ): EnhancedScriptStep {
    return {
      ...step,
      customMatching: matchingConfig
    };
  }
  
  /**
   * 批量执行匹配结果
   */
  public async executeBatchActions(
    matchingResult: MatchingResult,
    action: StepActionType,
    config: CustomMatchingConfiguration['batchExecution'] = { mode: 'sequential' }
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const results: SingleExecutionResult[] = [];
    const elements = matchingResult.elements;
    
    console.log(`🚀 开始批量执行: ${action}, 目标数量: ${elements.length}, 模式: ${config.mode}`);
    
    try {
      switch (config.mode) {
        case 'sequential':
          // 顺序执行
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            try {
              const result = await this.executeActionOnElement(element, action);
              results.push({ elementId: element.id, success: true, result });
              
              // 间隔延迟
              if (config.intervalMs && i < elements.length - 1) {
                await this.sleep(config.intervalMs);
              }
            } catch (error) {
              results.push({ 
                elementId: element.id, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              
              if (!config.continueOnError) {
                break;
              }
            }
          }
          break;
          
        case 'parallel':
          // 并行执行
          const maxConcurrency = config.maxConcurrency || 3;
          const chunks = this.chunkArray(elements, maxConcurrency);
          
          for (const chunk of chunks) {
            const promises = chunk.map(async (element: any) => {
              try {
                const result = await this.executeActionOnElement(element, action);
                return { elementId: element.id, success: true, result };
              } catch (error) {
                return { 
                  elementId: element.id, 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            });
            
            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults);
            
            // 批次间隔
            if (config.intervalMs) {
              await this.sleep(config.intervalMs);
            }
          }
          break;
          
        case 'first_only':
          // 只执行第一个
          if (elements.length > 0) {
            const element = elements[0];
            try {
              const result = await this.executeActionOnElement(element, action);
              results.push({ elementId: element.id, success: true, result });
            } catch (error) {
              results.push({ 
                elementId: element.id, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;
          
        case 'random_one':
          // 随机执行一个
          if (elements.length > 0) {
            const randomIndex = Math.floor(Math.random() * elements.length);
            const element = elements[randomIndex];
            try {
              const result = await this.executeActionOnElement(element, action);
              results.push({ elementId: element.id, success: true, result });
            } catch (error) {
              results.push({ 
                elementId: element.id, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      const duration = Date.now() - startTime;
      
      console.log(`✅ 批量执行完成: ${successCount} 成功, ${failureCount} 失败, 耗时 ${duration}ms`);
      
      return {
        totalElements: elements.length,
        executedElements: results.length,
        successCount,
        failureCount,
        duration,
        results,
        config
      };
    } catch (error) {
      console.error('❌ 批量执行失败:', error);
      throw error;
    }
  }
  
  /**
   * 在单个元素上执行操作
   */
  private async executeActionOnElement(element: any, action: StepActionType): Promise<any> {
    // 这里需要调用实际的ADB操作
    // 暂时返回模拟结果
    console.log(`🎯 在元素 ${element.id} 上执行操作: ${action}`);
    
    // 根据操作类型执行不同的ADB命令
    switch (action) {
      case StepActionType.TAP:
        return this.executeTapAction(element);
      case StepActionType.INPUT:
        return this.executeInputAction(element);
      case StepActionType.SWIPE:
        return this.executeScrollAction(element);
      default:
        throw new Error(`不支持的操作类型: ${action}`);
    }
  }
  
  private async executeTapAction(element: any): Promise<any> {
    // 实际应该调用ADB tap命令
    const { centerX, centerY } = element.bounds;
    console.log(`👆 点击坐标: (${centerX}, ${centerY})`);
    
    // TODO: 实际的ADB调用
    // await invoke('adb_tap', { x: centerX, y: centerY });
    
    return { action: 'tap', x: centerX, y: centerY };
  }
  
  private async executeInputAction(element: any): Promise<any> {
    console.log(`⌨️ 在元素 ${element.id} 中输入文本`);
    // TODO: 实际的ADB input命令
    return { action: 'input' };
  }
  
  private async executeScrollAction(element: any): Promise<any> {
    console.log(`📜 滚动元素 ${element.id}`);
    // TODO: 实际的ADB scroll命令
    return { action: 'scroll' };
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export interface BatchExecutionResult {
  totalElements: number;
  executedElements: number;
  successCount: number;
  failureCount: number;
  duration: number;
  results: SingleExecutionResult[];
  config: CustomMatchingConfiguration['batchExecution'];
}

export interface SingleExecutionResult {
  elementId: string;
  success: boolean;
  result?: any;
  error?: string;
}

// 导出单例实例
export const customMatchingManager = CustomMatchingManager.getInstance();