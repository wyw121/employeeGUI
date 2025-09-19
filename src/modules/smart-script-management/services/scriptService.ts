// 智能脚本管理模块 - 脚本管理服务

import { invoke } from '@tauri-apps/api/core';
import { 
  SmartScript, 
  ScriptListItem, 
  ScriptExecutionResult, 
  ScriptTemplate,
  ScriptExportData 
} from '../types';

/**
 * 脚本管理服务 - 负责与后端的所有脚本操作
 */
export class ScriptManagementService {
  
  /**
   * 保存脚本
   */
  static async saveScript(script: SmartScript): Promise<SmartScript> {
    try {
      const result = await invoke('save_smart_script', {
        script: script
      }) as SmartScript;
      
      console.log('✅ 脚本保存成功:', result.id);
      return result;
    } catch (error) {
      console.error('❌ 保存脚本失败:', error);
      throw new Error(`保存脚本失败: ${error}`);
    }
  }

  /**
   * 加载脚本
   */
  static async loadScript(scriptId: string): Promise<SmartScript> {
    try {
      console.log('🔍 调用load_smart_script，参数:', { scriptId: scriptId });
      const result = await invoke('load_smart_script', {
        scriptId: scriptId
      }) as SmartScript;
      
      console.log('✅ 脚本加载成功:', result.name);
      return result;
    } catch (error) {
      console.error('❌ 加载脚本失败:', error);
      throw new Error(`加载脚本失败: ${error}`);
    }
  }

  /**
   * 删除脚本
   */
  static async deleteScript(scriptId: string): Promise<void> {
    try {
      await invoke('delete_smart_script', {
        scriptId: scriptId
      });
      
      console.log('✅ 脚本删除成功:', scriptId);
    } catch (error) {
      console.error('❌ 删除脚本失败:', error);
      throw new Error(`删除脚本失败: ${error}`);
    }
  }

  /**
   * 获取脚本列表
   */
  static async getScriptList(): Promise<ScriptListItem[]> {
    try {
      const result = await invoke('list_smart_scripts') as ScriptListItem[];
      
      console.log('✅ 脚本列表获取成功:', result.length);
      return result;
    } catch (error) {
      console.error('❌ 获取脚本列表失败:', error);
      throw new Error(`获取脚本列表失败: ${error}`);
    }
  }

  /**
   * 执行脚本
   */
  static async executeScript(
    scriptId: string, 
    deviceId: string,
    options?: { config?: any }
  ): Promise<ScriptExecutionResult> {
    try {
      // 先加载脚本
      const script = await this.loadScript(scriptId);
      
      // 执行脚本
      const result = await invoke('execute_smart_automation_script', {
        deviceId: deviceId,
        steps: script.steps,
        config: script.config,
        ...options
      }) as ScriptExecutionResult;
      
      console.log('✅ 脚本执行完成:', result.success);
      return result;
    } catch (error) {
      console.error('❌ 脚本执行失败:', error);
      throw new Error(`脚本执行失败: ${error}`);
    }
  }

  /**
   * 导出脚本
   */
  static async exportScript(scriptId: string): Promise<ScriptExportData> {
    try {
      const result = await invoke('export_smart_script', {
        scriptId: scriptId
      }) as ScriptExportData;
      
      console.log('✅ 脚本导出成功');
      return result;
    } catch (error) {
      console.error('❌ 导出脚本失败:', error);
      throw new Error(`导出脚本失败: ${error}`);
    }
  }

  /**
   * 导入脚本
   */
  static async importScript(exportData: ScriptExportData): Promise<SmartScript[]> {
    try {
      const result = await invoke('import_smart_script', {
        export_data: exportData
      }) as SmartScript[];
      
      console.log('✅ 脚本导入成功:', result.length);
      return result;
    } catch (error) {
      console.error('❌ 导入脚本失败:', error);
      throw new Error(`导入脚本失败: ${error}`);
    }
  }

  /**
   * 获取脚本模板列表
   */
  static async getTemplateList(): Promise<ScriptTemplate[]> {
    try {
      const result = await invoke('list_script_templates') as ScriptTemplate[];
      
      console.log('✅ 模板列表获取成功:', result.length);
      return result;
    } catch (error) {
      console.error('❌ 获取模板列表失败:', error);
      throw new Error(`获取模板列表失败: ${error}`);
    }
  }

  /**
   * 从模板创建脚本
   */
  static async createFromTemplate(
    templateId: string, 
    scriptName: string,
    scriptDescription?: string
  ): Promise<SmartScript> {
    try {
      const result = await invoke('create_script_from_template', {
        template_id: templateId,
        script_name: scriptName,
        script_description: scriptDescription
      }) as SmartScript;
      
      console.log('✅ 从模板创建脚本成功:', result.name);
      return result;
    } catch (error) {
      console.error('❌ 从模板创建脚本失败:', error);
      throw new Error(`从模板创建脚本失败: ${error}`);
    }
  }

  /**
   * 复制脚本
   */
  static async duplicateScript(
    scriptId: string, 
    newName?: string
  ): Promise<SmartScript> {
    try {
      // 加载原脚本
      const originalScript = await this.loadScript(scriptId);
      
      // 创建副本
      const duplicatedScript: SmartScript = {
        ...originalScript,
        id: `script_${Date.now()}`,
        name: newName || `${originalScript.name} (副本)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_executed_at: undefined,
        metadata: {
          ...originalScript.metadata,
          execution_count: 0,
          success_rate: 0
        }
      };
      
      // 保存副本
      return await this.saveScript(duplicatedScript);
    } catch (error) {
      console.error('❌ 复制脚本失败:', error);
      throw new Error(`复制脚本失败: ${error}`);
    }
  }

  /**
   * 更新脚本元数据
   */
  static async updateScriptMetadata(
    scriptId: string, 
    metadata: Partial<SmartScript>
  ): Promise<SmartScript> {
    try {
      // 加载现有脚本
      const existingScript = await this.loadScript(scriptId);
      
      // 合并元数据
      const updatedScript: SmartScript = {
        ...existingScript,
        ...metadata,
        id: scriptId, // 确保ID不变
        updated_at: new Date().toISOString()
      };
      
      // 保存更新的脚本
      return await this.saveScript(updatedScript);
    } catch (error) {
      console.error('❌ 更新脚本元数据失败:', error);
      throw new Error(`更新脚本元数据失败: ${error}`);
    }
  }
}

/**
 * 本地存储服务 - 用于缓存和临时存储
 */
export class LocalStorageService {
  private static readonly CACHE_PREFIX = 'smart_script_';
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 缓存脚本列表
   */
  static cacheScriptList(scripts: ScriptListItem[]): void {
    const cacheData = {
      data: scripts,
      timestamp: Date.now()
    };
    localStorage.setItem(`${this.CACHE_PREFIX}list`, JSON.stringify(cacheData));
  }

  /**
   * 获取缓存的脚本列表
   */
  static getCachedScriptList(): ScriptListItem[] | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}list`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      if (age > this.CACHE_EXPIRY) {
        localStorage.removeItem(`${this.CACHE_PREFIX}list`);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('获取缓存脚本列表失败:', error);
      return null;
    }
  }

  /**
   * 保存草稿
   */
  static saveDraft(draftId: string, data: any): void {
    const draftData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`${this.CACHE_PREFIX}draft_${draftId}`, JSON.stringify(draftData));
  }

  /**
   * 加载草稿
   */
  static loadDraft(draftId: string): any | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}draft_${draftId}`);
      if (!cached) return null;

      const draftData = JSON.parse(cached);
      return draftData.data;
    } catch (error) {
      console.error('加载草稿失败:', error);
      return null;
    }
  }

  /**
   * 删除草稿
   */
  static deleteDraft(draftId: string): void {
    localStorage.removeItem(`${this.CACHE_PREFIX}draft_${draftId}`);
  }

  /**
   * 清除所有缓存
   */
  static clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}