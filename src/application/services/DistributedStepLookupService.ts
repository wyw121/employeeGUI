import { DistributedStep } from '../../domain/distributed-script';
import { LocalStepRepository } from '../../infrastructure/inspector/LocalStepRepository';
import { DistributedScriptManager } from '../../domain/distributed-script/services/DistributedScriptManager';

/**
 * 分布式步骤查找服务
 * 支持从多种数据源获取分布式步骤
 */
export class DistributedStepLookupService {
  private localStepRepo = new LocalStepRepository();
  
  // 全局脚本缓存，可以由SmartScriptBuilderPage设置
  private static globalScriptSteps: DistributedStep[] = [];
  // 会话级导入脚本缓存（存储在 sessionStorage 中，也维护内存镜像以减少解析开销）
  private static importedScriptsCache: any[] | null = null;
  
  /**
   * 设置全局脚本步骤（由SmartScriptBuilderPage调用）
   */
  static setGlobalScriptSteps(steps: DistributedStep[]): void {
    DistributedStepLookupService.globalScriptSteps = steps;
  }
  
  /**
   * 清空全局脚本步骤缓存
   */
  static clearGlobalScriptSteps(): void {
    DistributedStepLookupService.globalScriptSteps = [];
  }

  /**
   * 设置会话导入的分布式脚本列表（覆盖）
   */
  static setImportedScripts(scripts: any[]): void {
    try {
      sessionStorage.setItem('imported_distributed_scripts', JSON.stringify(scripts || []));
      DistributedStepLookupService.importedScriptsCache = scripts || [];
      console.log('💾 已写入导入脚本到 sessionStorage:', scripts?.length || 0);
    } catch (e) {
      console.warn('写入导入脚本到 sessionStorage 失败:', e);
    }
  }

  /**
   * 追加一个导入脚本（不会去重）
   */
  static appendImportedScript(script: any): void {
    try {
      const list = this.getImportedScripts();
      list.push(script);
      sessionStorage.setItem('imported_distributed_scripts', JSON.stringify(list));
      this.importedScriptsCache = list;
      console.log('📥 已追加导入脚本，当前数量:', list.length);
    } catch (e) {
      console.warn('追加导入脚本失败:', e);
    }
  }

  /** 清空导入脚本 */
  static clearImportedScripts(): void {
    try {
      sessionStorage.removeItem('imported_distributed_scripts');
      this.importedScriptsCache = [];
      console.log('🧹 已清空会话导入脚本');
    } catch (e) {
      console.warn('清空导入脚本失败:', e);
    }
  }

  /** 读取导入脚本（带内存镜像） */
  static getImportedScripts(): any[] {
    if (this.importedScriptsCache) return this.importedScriptsCache;
    try {
      const importedScriptsJson = sessionStorage.getItem('imported_distributed_scripts');
      const parsed = importedScriptsJson ? JSON.parse(importedScriptsJson) : [];
      this.importedScriptsCache = Array.isArray(parsed) ? parsed : [];
      return this.importedScriptsCache;
    } catch (e) {
      console.warn('读取导入脚本失败:', e);
      this.importedScriptsCache = [];
      return [];
    }
  }
  
  /**
   * 通过stepId查找分布式步骤
   * 按优先级尝试多种数据源：
   * 1. 全局脚本缓存（当前加载的脚本）
   * 2. 从本地步骤仓储转换
   * 3. 从导入的脚本文件（TODO）
   */
  async findDistributedStepById(stepId: string): Promise<DistributedStep | null> {
    console.log("🔍 查找分布式步骤:", stepId);
    
    // 优先级1: 从全局脚本缓存查找
    const globalStep = this.findFromGlobalScript(stepId);
    if (globalStep) {
      console.log("✅ 从全局脚本缓存找到步骤:", stepId);
      return globalStep;
    }
    
    // 优先级2: 从本地步骤仓储转换
    const convertedStep = await this.convertFromLocalStep(stepId);
    if (convertedStep) {
      console.log("✅ 从本地步骤转换为分布式步骤:", stepId);
      return convertedStep;
    }
    
    // 优先级3: 从导入的脚本会话缓存查找
    const importedStep = await this.findFromImportedScripts(stepId);
    if (importedStep) {
      console.log("✅ 从导入脚本找到步骤:", stepId);
      return importedStep;
    }
    
    console.warn("⚠️ 未找到分布式步骤:", stepId);
    return null;
  }
  
  /**
   * 从全局脚本缓存查找步骤
   */
  private findFromGlobalScript(stepId: string): DistributedStep | null {
    return DistributedStepLookupService.globalScriptSteps.find(step => step.id === stepId) || null;
  }
  
  /**
   * 从本地步骤仓储转换为分布式步骤
   */
  private async convertFromLocalStep(stepId: string): Promise<DistributedStep | null> {
    try {
      const localStep = await this.localStepRepo.get(stepId);
      
      if (!localStep || !localStep.xmlSnapshot) {
        return null;
      }
      
      // 转换为分布式步骤格式
      const distributedStep: DistributedStep = {
        id: localStep.id,
        name: localStep.name || `步骤_${stepId}`,
        actionType: localStep.actionType || 'click',
        params: localStep.params || {},
        locator: localStep.locator || {
          absoluteXPath: '',
          attributes: {},
        },
        createdAt: localStep.createdAt || Date.now(),
        description: `从本地步骤转换: ${localStep.name}`,
        xmlSnapshot: {
          xmlContent: localStep.xmlSnapshot,
          xmlHash: `hash_${stepId}_${Date.now()}`,
          timestamp: Date.now(),
          deviceInfo: {
            deviceId: 'unknown',
            deviceName: 'Local Device',
          },
          pageInfo: {
            appPackage: 'unknown',
            activityName: 'unknown',
            pageTitle: 'Local Page',
          },
        }
      };
      
      return distributedStep;
    } catch (error) {
      console.warn("从本地步骤转换失败:", error);
      return null;
    }
  }
  
  /**
   * 从导入的脚本文件查找步骤
   * TODO: 实现从文件系统或会话存储的脚本文件中查找
   */
  private async findFromImportedScripts(stepId: string): Promise<DistributedStep | null> {
    try {
      const importedScripts = DistributedStepLookupService.getImportedScripts();
      for (const script of importedScripts) {
        const foundStep = script.steps?.find((step: any) => step.id === stepId);
        if (foundStep) return foundStep;
      }
      return null;
    } catch (error) {
      console.warn("从导入脚本查找失败:", error);
      return null;
    }
  }
  
  /**
   * 批量查找多个步骤
   */
  async findMultipleSteps(stepIds: string[]): Promise<Map<string, DistributedStep>> {
    const results = new Map<string, DistributedStep>();
    
    for (const stepId of stepIds) {
      const step = await this.findDistributedStepById(stepId);
      if (step) {
        results.set(stepId, step);
      }
    }
    
    return results;
  }
  
  /**
   * 获取所有可用的步骤（用于调试和管理）
   */
  async getAllAvailableSteps(): Promise<{
    globalSteps: DistributedStep[];
    localStepIds: string[];
    importedStepIds: string[];
  }> {
    // TODO: LocalStepRepository 可能没有 list 方法，需要实现或替换
    const localStepIds: string[] = [];
    
    // TODO: 获取导入脚本的步骤ID
    const importedStepIds: string[] = [];
    
    return {
      globalSteps: [...DistributedStepLookupService.globalScriptSteps],
      localStepIds,
      importedStepIds,
    };
  }
}

/**
 * 单例实例，确保全局状态一致性
 */
export const distributedStepLookupService = new DistributedStepLookupService();