/**
 * 批量匹配执行引擎
 * 支持多种执行策略的批量UI元素匹配和操作
 */

import { CustomMatchingRule, MatchingResult, MatchedElement } from '../types/customMatching';
import { CustomMatchingEngine } from './customMatchingEngine';

// ========== 类型定义 ==========

/**
 * UI元素原始数据结构（从XML解析）
 */
interface RawUIElement {
  text: string;
  'resource-id': string;
  class: string;
  'content-desc': string;
  bounds: string; // "[left,top][right,bottom]" 格式
  clickable: string;
  enabled: string;
  focusable: string;
  focused: string;
  selected: string;
  scrollable: string;
  'long-clickable': string;
  checkable: string;
  checked: string;
  password: string;
  [key: string]: string;
}

// ========== 类型定义 ==========

export interface BatchAction {
  type: 'click' | 'longPress' | 'swipe' | 'input' | 'extract';
  data?: any;
}

export interface ExecutionStrategy {
  mode: 'sequential' | 'parallel' | 'first_only' | 'random_one';
  delayBetweenActions?: number;
  maxConcurrency?: number;
  continueOnError?: boolean;
}

export interface MatchPreview {
  currentMatches: MatchedElement[];
  matchCount: number;
  previewElements: PreviewElement[];
  confidence: number;
  lastUpdated: string;
}

export interface PreviewElement {
  id: string;
  text: string;
  bounds: string;
  confidence: number;
  matchedConditions: string[];
  elementType: string;
}

export interface BatchExecutionResult {
  success: boolean;
  totalElements: number;
  successfulOperations: number;
  failedOperations: number;
  results: ExecutionResult[];
  executionTime: number;
  strategy: ExecutionStrategy;
}

export interface ExecutionResult {
  elementId: string;
  success: boolean;
  action: BatchAction;
  error?: string;
  executionTime: number;
  coordinates?: { x: number; y: number };
}

// ========== 匹配模板定义 ==========

export const MATCHING_TEMPLATES = {
  xiaohongshu_follow: {
    name: '小红书关注按钮',
    description: '匹配小红书页面中的关注/已关注按钮',
    rule: {
      id: 'xiaohongshu_follow_template',
      name: '小红书关注按钮',
      enabled: true,
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
        resourceId: {
          mode: 'contains' as const,
          value: 'com.xingin.xhs'
        },
        bounds: {
          x: { min: 700, max: 1000 }
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
    example: '匹配页面中所有可点击的关注按钮'
  },
  
  generic_buttons: {
    name: '通用按钮',
    description: '匹配所有可点击的按钮元素',
    rule: {
      id: 'generic_buttons_template',
      name: '通用按钮',
      enabled: true,
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
    example: '匹配页面中所有可点击的按钮'
  },

  position_based: {
    name: '位置区域匹配',
    description: '基于屏幕位置区域匹配元素',
    rule: {
      id: 'position_based_template',
      name: '位置区域匹配',
      enabled: true,
      conditions: {
        bounds: {
          x: { min: 0, max: 1080 },
          y: { min: 0, max: 2400 }
        },
        attributes: {
          clickable: true
        }
      },
      options: {
        maxMatches: 5,
        order: 'position' as const,
        deduplicate: true
      }
    },
    example: '匹配指定屏幕区域内的可点击元素'
  }
};

// ========== 主要服务类 ==========

export class BatchMatchingEngine {
  private matchingEngine: CustomMatchingEngine;
  private previewCache = new Map<string, MatchPreview>();
  
  constructor() {
    this.matchingEngine = new CustomMatchingEngine();
  }

  // ========== 实时预览功能 ==========

  /**
   * 实时预览匹配结果
   */
  async previewMatches(rule: CustomMatchingRule): Promise<MatchPreview> {
    try {
      console.log('🔍 开始预览匹配结果:', rule.name);
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(rule);
      const cached = this.previewCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        console.log('📋 使用缓存的预览结果');
        return cached;
      }

      // 执行匹配
      const matchingResult = await this.matchingEngine.match(rule, await this.getCurrentUIRawElements());
      
      // 转换为预览格式
      const preview: MatchPreview = {
        currentMatches: matchingResult.elements,
        matchCount: matchingResult.totalMatches,
        previewElements: this.convertToPreviewElements(matchingResult.elements),
        confidence: this.calculateOverallConfidence(matchingResult.elements),
        lastUpdated: new Date().toISOString()
      };

      // 更新缓存
      this.previewCache.set(cacheKey, preview);
      
      console.log(`✅ 预览完成，匹配到 ${preview.matchCount} 个元素`);
      return preview;

    } catch (error) {
      console.error('❌ 预览匹配失败:', error);
      return {
        currentMatches: [],
        matchCount: 0,
        previewElements: [],
        confidence: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 获取当前UI原始元素数据 (模拟实现，实际需要调用ADB)
   */
  private async getCurrentUIRawElements(): Promise<RawUIElement[]> {
    // TODO: 集成ADB获取实际UI元素
    // 这里返回模拟数据用于演示
    return [
      {
        text: '关注',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        'content-desc': '',
        bounds: '[789,508][957,586]',
        clickable: 'true',
        enabled: 'true',
        focusable: 'false',
        focused: 'false',
        selected: 'false',
        scrollable: 'false',
        'long-clickable': 'false',
        checkable: 'false',
        checked: 'false',
        password: 'false'
      },
      {
        text: '关注',
        'resource-id': 'com.xingin.xhs:id/0_resource_name_obfuscated',
        class: 'android.widget.TextView',
        'content-desc': '',
        bounds: '[789,725][957,803]',
        clickable: 'true',
        enabled: 'true',
        focusable: 'false',
        focused: 'false',
        selected: 'false',
        scrollable: 'false',
        'long-clickable': 'false',
        checkable: 'false',
        checked: 'false',
        password: 'false'
      }
    ];
  }

  /**
   * 获取当前UI元素 (转换为MatchedElement格式)
   */
  private async getCurrentUIElements(): Promise<MatchedElement[]> {
    const rawElements = await this.getCurrentUIRawElements();
    return rawElements.map((raw, index) => this.convertRawToMatched(raw, index));
  }

  /**
   * 转换原始元素为匹配元素格式
   */
  private convertRawToMatched(raw: RawUIElement, index: number): MatchedElement {
    // 解析bounds字符串 "[left,top][right,bottom]"
    const boundsMatch = raw.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    let bounds;
    
    if (boundsMatch) {
      const [, left, top, right, bottom] = boundsMatch.map(Number);
      bounds = {
        left, top, right, bottom,
        width: right - left,
        height: bottom - top,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2
      };
    } else {
      bounds = {
        left: 0, top: 0, right: 0, bottom: 0,
        width: 0, height: 0, centerX: 0, centerY: 0
      };
    }

    return {
      id: `element_${index}`,
      text: raw.text,
      className: raw.class,
      resourceId: raw['resource-id'],
      contentDesc: raw['content-desc'],
      bounds,
      attributes: {
        clickable: raw.clickable === 'true',
        enabled: raw.enabled === 'true',
        focusable: raw.focusable === 'true',
        focused: raw.focused === 'true',
        selected: raw.selected === 'true',
        scrollable: raw.scrollable === 'true',
        longClickable: raw['long-clickable'] === 'true',
        checkable: raw.checkable === 'true',
        checked: raw.checked === 'true',
        password: raw.password === 'true'
      },
      confidence: 1.0,
      matchedConditions: []
    };
  }

  // ========== 批量执行功能 ==========

  /**
   * 执行批量操作
   */
  async executeBatchActions(
    rule: CustomMatchingRule, 
    action: BatchAction, 
    strategy: ExecutionStrategy = { mode: 'sequential', delayBetweenActions: 1000 }
  ): Promise<BatchExecutionResult> {
    console.log(`🚀 开始批量执行: ${rule.name}, 动作: ${action.type}, 策略: ${strategy.mode}`);
    
    const startTime = Date.now();
    const results: ExecutionResult[] = [];
    
    try {
      // 1. 获取匹配元素
      const matchingResult = await this.matchingEngine.match(rule, await this.getCurrentUIRawElements());
      const elements = matchingResult.elements;
      
      if (elements.length === 0) {
        console.log('⚠️ 没有找到匹配的元素');
        return {
          success: false,
          totalElements: 0,
          successfulOperations: 0,
          failedOperations: 0,
          results: [],
          executionTime: Date.now() - startTime,
          strategy
        };
      }

      console.log(`📊 找到 ${elements.length} 个匹配元素，准备执行操作`);

      // 2. 根据策略执行操作
      switch (strategy.mode) {
        case 'sequential':
          await this.executeSequential(elements, action, strategy, results);
          break;
        case 'parallel':
          await this.executeParallel(elements, action, strategy, results);
          break;
        case 'first_only':
          await this.executeFirstOnly(elements, action, strategy, results);
          break;
        case 'random_one':
          await this.executeRandomOne(elements, action, strategy, results);
          break;
      }

      // 3. 统计结果
      const successfulOperations = results.filter(r => r.success).length;
      const failedOperations = results.filter(r => !r.success).length;
      
      const finalResult: BatchExecutionResult = {
        success: successfulOperations > 0,
        totalElements: elements.length,
        successfulOperations,
        failedOperations,
        results,
        executionTime: Date.now() - startTime,
        strategy
      };

      console.log(`✅ 批量执行完成: 成功 ${successfulOperations}/${elements.length}, 耗时 ${finalResult.executionTime}ms`);
      return finalResult;

    } catch (error) {
      console.error('❌ 批量执行失败:', error);
      return {
        success: false,
        totalElements: 0,
        successfulOperations: 0,
        failedOperations: 1,
        results: [{
          elementId: 'error',
          success: false,
          action,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }],
        executionTime: Date.now() - startTime,
        strategy
      };
    }
  }

  // ========== 执行策略实现 ==========

  /**
   * 顺序执行策略
   */
  private async executeSequential(
    elements: MatchedElement[], 
    action: BatchAction, 
    strategy: ExecutionStrategy,
    results: ExecutionResult[]
  ): Promise<void> {
    console.log('🔄 使用顺序执行策略');
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      try {
        console.log(`🎯 执行第 ${i + 1}/${elements.length} 个元素: ${element.text}`);
        
        const result = await this.executeAction(element, action);
        results.push(result);
        
        // 延迟等待
        if (strategy.delayBetweenActions && i < elements.length - 1) {
          console.log(`⏱️ 等待 ${strategy.delayBetweenActions}ms...`);
          await this.delay(strategy.delayBetweenActions);
        }

        // 错误处理
        if (!result.success && !strategy.continueOnError) {
          console.log('🛑 遇到错误，停止执行');
          break;
        }

      } catch (error) {
        console.error(`❌ 执行元素 ${element.id} 时出错:`, error);
        results.push({
          elementId: element.id,
          success: false,
          action,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0
        });

        if (!strategy.continueOnError) {
          break;
        }
      }
    }
  }

  /**
   * 并发执行策略
   */
  private async executeParallel(
    elements: MatchedElement[], 
    action: BatchAction, 
    strategy: ExecutionStrategy,
    results: ExecutionResult[]
  ): Promise<void> {
    console.log('⚡ 使用并发执行策略');
    
    const maxConcurrency = strategy.maxConcurrency || 3;
    const chunks = this.chunkArray(elements, maxConcurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(element => this.executeAction(element, action));
      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            elementId: chunk[index].id,
            success: false,
            action,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            executionTime: 0
          });
        }
      });

      // 批次间延迟
      if (strategy.delayBetweenActions) {
        await this.delay(strategy.delayBetweenActions);
      }
    }
  }

  /**
   * 仅执行第一个策略
   */
  private async executeFirstOnly(
    elements: MatchedElement[], 
    action: BatchAction, 
    strategy: ExecutionStrategy,
    results: ExecutionResult[]
  ): Promise<void> {
    console.log('🥇 使用仅执行第一个策略');
    
    if (elements.length > 0) {
      const result = await this.executeAction(elements[0], action);
      results.push(result);
    }
  }

  /**
   * 随机执行一个策略
   */
  private async executeRandomOne(
    elements: MatchedElement[], 
    action: BatchAction, 
    strategy: ExecutionStrategy,
    results: ExecutionResult[]
  ): Promise<void> {
    console.log('🎲 使用随机执行一个策略');
    
    if (elements.length > 0) {
      const randomIndex = Math.floor(Math.random() * elements.length);
      const randomElement = elements[randomIndex];
      console.log(`🎯 随机选择第 ${randomIndex + 1} 个元素: ${randomElement.text}`);
      
      const result = await this.executeAction(randomElement, action);
      results.push(result);
    }
  }

  // ========== 辅助方法 ==========

  /**
   * 执行单个动作
   */
  private async executeAction(element: MatchedElement, action: BatchAction): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🎬 执行动作 ${action.type} 于元素 ${element.text} (${element.bounds.centerX}, ${element.bounds.centerY})`);
      
      // TODO: 集成实际的ADB操作
      // 这里模拟执行过程
      await this.delay(100); // 模拟执行时间
      
      const success = Math.random() > 0.1; // 90% 成功率模拟
      
      return {
        elementId: element.id,
        success,
        action,
        executionTime: Date.now() - startTime,
        coordinates: { x: element.bounds.centerX, y: element.bounds.centerY },
        error: success ? undefined : '模拟执行失败'
      };

    } catch (error) {
      return {
        elementId: element.id,
        success: false,
        action,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 转换为预览元素格式
   */
  private convertToPreviewElements(elements: MatchedElement[]): PreviewElement[] {
    return elements.map(element => ({
      id: element.id,
      text: element.text || '(无文本)',
      bounds: `[${element.bounds.left},${element.bounds.top}][${element.bounds.right},${element.bounds.bottom}]`,
      confidence: element.confidence,
      matchedConditions: element.matchedConditions,
      elementType: element.className
    }));
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(elements: MatchedElement[]): number {
    if (elements.length === 0) return 0;
    
    const totalConfidence = elements.reduce((sum, elem) => sum + elem.confidence, 0);
    return totalConfidence / elements.length;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(rule: CustomMatchingRule): string {
    return `${rule.id}_${JSON.stringify(rule.conditions)}_${Date.now()}`;
  }

  /**
   * 检查缓存是否有效 (5秒内)
   */
  private isCacheValid(preview: MatchPreview): boolean {
    const now = Date.now();
    const cacheTime = new Date(preview.lastUpdated).getTime();
    return (now - cacheTime) < 5000; // 5秒缓存
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== 用户配置管理 ==========

  /**
   * 保存用户规则
   */
  saveUserRule(rule: CustomMatchingRule): void {
    try {
      const existingRules = this.loadUserRules();
      const updatedRules = existingRules.filter(r => r.id !== rule.id);
      updatedRules.push(rule);
      
      localStorage.setItem('batchMatchingRules', JSON.stringify(updatedRules));
      console.log('💾 用户规则已保存:', rule.name);
      
    } catch (error) {
      console.error('❌ 保存用户规则失败:', error);
    }
  }

  /**
   * 加载用户规则
   */
  loadUserRules(): CustomMatchingRule[] {
    try {
      const stored = localStorage.getItem('batchMatchingRules');
      return stored ? JSON.parse(stored) : [];
      
    } catch (error) {
      console.error('❌ 加载用户规则失败:', error);
      return [];
    }
  }

  /**
   * 删除用户规则
   */
  deleteUserRule(ruleId: string): boolean {
    try {
      const existingRules = this.loadUserRules();
      const updatedRules = existingRules.filter(r => r.id !== ruleId);
      
      localStorage.setItem('batchMatchingRules', JSON.stringify(updatedRules));
      console.log('🗑️ 用户规则已删除:', ruleId);
      return true;
      
    } catch (error) {
      console.error('❌ 删除用户规则失败:', error);
      return false;
    }
  }

  /**
   * 获取匹配模板
   */
  getMatchingTemplate(templateKey: keyof typeof MATCHING_TEMPLATES): CustomMatchingRule {
    const template = MATCHING_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`未找到匹配模板: ${templateKey}`);
    }
    
    return {
      ...template.rule,
      id: `${template.rule.id}_${Date.now()}` // 确保唯一ID
    };
  }

  /**
   * 获取所有可用模板
   */
  getAllTemplates() {
    return Object.entries(MATCHING_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description,
      example: template.example
    }));
  }
}

export default BatchMatchingEngine;