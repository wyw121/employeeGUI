// 智能脚本管理模块 - React Hooks

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { 
  SmartScript, 
  ScriptListItem, 
  ScriptExecutionResult,
  ScriptTemplate 
} from '../types';
import { ScriptManagementService, LocalStorageService } from '../services/scriptService';
import { ScriptSerializer } from '../utils/serializer';

/**
 * 脚本管理Hook
 */
export function useScriptManager() {
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载脚本列表
  const loadScriptList = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 先尝试从缓存获取
      const cachedScripts = LocalStorageService.getCachedScriptList();
      if (cachedScripts) {
        setScripts(cachedScripts);
      }

      // 从后端获取最新数据
      const scriptList = await ScriptManagementService.getScriptList();
      setScripts(scriptList);
      
      // 更新缓存
      LocalStorageService.cacheScriptList(scriptList);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取脚本列表失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除脚本
  const deleteScript = useCallback(async (scriptId: string) => {
    try {
      await ScriptManagementService.deleteScript(scriptId);
      message.success('脚本删除成功');
      
      // 更新本地列表
      setScripts(prev => prev.filter(script => script.id !== scriptId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '删除脚本失败';
      message.error(errorMsg);
      throw err;
    }
  }, []);

  // 复制脚本
  const duplicateScript = useCallback(async (scriptId: string, newName?: string) => {
    try {
      const newScript = await ScriptManagementService.duplicateScript(scriptId, newName);
      message.success('脚本复制成功');
      
      // 刷新列表
      await loadScriptList();
      return newScript;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '复制脚本失败';
      message.error(errorMsg);
      throw err;
    }
  }, [loadScriptList]);

  // 初始化时加载
  useEffect(() => {
    loadScriptList();
  }, [loadScriptList]);

  return {
    scripts,
    loading,
    error,
    loadScriptList,
    deleteScript,
    duplicateScript
  };
}

/**
 * 脚本编辑器Hook
 */
export function useScriptEditor() {
  const [currentScript, setCurrentScript] = useState<SmartScript | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // 创建新脚本
  const createNewScript = useCallback(() => {
    const newScript: SmartScript = {
      id: `script_${Date.now()}`,
      name: '新建脚本',
      description: '',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: '用户',
      category: '通用',
      tags: ['智能脚本'],
      steps: [],
      config: {
        continue_on_error: true,
        auto_verification_enabled: true,
        smart_recovery_enabled: true,
        detailed_logging: true,
        default_timeout_ms: 10000,
        default_retry_count: 3,
        page_recognition_enabled: true,
        screenshot_on_error: true
      },
      metadata: {
        execution_count: 0,
        success_rate: 0,
        average_duration_ms: 0,
        target_devices: [],
        dependencies: []
      }
    };
    
    setCurrentScript(newScript);
    setIsDirty(false);
  }, []);

  // 加载脚本
  const loadScript = useCallback(async (scriptId: string): Promise<SmartScript> => {
    setLoading(true);
    try {
      const script = await ScriptManagementService.loadScript(scriptId);
      setCurrentScript(script);
      setIsDirty(false);
      message.success('脚本加载成功');
      return script;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载脚本失败';
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存脚本
  const saveScript = useCallback(async (scriptData?: Partial<SmartScript>) => {
    if (!currentScript) {
      throw new Error('没有可保存的脚本');
    }

    setSaving(true);
    try {
      const scriptToSave = scriptData ? { ...currentScript, ...scriptData } : currentScript;
      const savedScript = await ScriptManagementService.saveScript(scriptToSave);
      setCurrentScript(savedScript);
      setIsDirty(false);
      message.success('脚本保存成功');
      return savedScript;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '保存脚本失败';
      message.error(errorMsg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentScript]);

  // 从UI状态保存脚本
  const saveFromUIState = useCallback(async (
    name: string,
    description: string,
    steps: any[],
    config: any,
    metadata?: any
  ) => {
    setSaving(true);
    try {
      const serializedScript = ScriptSerializer.serializeScript(
        name,
        description,
        steps,
        config,
        { ...currentScript?.metadata, ...metadata }
      );
      
      const savedScript = await ScriptManagementService.saveScript(serializedScript);
      setCurrentScript(savedScript);
      setIsDirty(false);
      message.success('脚本保存成功');
      return savedScript;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '保存脚本失败';
      message.error(errorMsg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentScript?.metadata]);

  // 更新脚本内容
  const updateScript = useCallback((updates: Partial<SmartScript>) => {
    if (currentScript) {
      setCurrentScript(prev => prev ? { ...prev, ...updates } : null);
      setIsDirty(true);
    }
  }, [currentScript]);

  // 自动保存草稿
  const saveDraft = useCallback(() => {
    if (currentScript && isDirty) {
      LocalStorageService.saveDraft(currentScript.id, currentScript);
    }
  }, [currentScript, isDirty]);

  // 加载草稿
  const loadDraft = useCallback((scriptId: string) => {
    const draft = LocalStorageService.loadDraft(scriptId);
    if (draft) {
      setCurrentScript(draft);
      setIsDirty(true);
      message.info('已加载草稿版本');
      return true;
    }
    return false;
  }, []);

  // 清理草稿
  const clearDraft = useCallback(() => {
    if (currentScript) {
      LocalStorageService.deleteDraft(currentScript.id);
    }
  }, [currentScript]);

  // 定期自动保存草稿
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000); // 30秒自动保存
    return () => clearInterval(interval);
  }, [saveDraft]);

  return {
    currentScript,
    isDirty,
    saving,
    loading,
    createNewScript,
    loadScript,
    saveScript,
    saveFromUIState,
    updateScript,
    saveDraft,
    loadDraft,
    clearDraft
  };
}

/**
 * 脚本执行Hook
 */
export function useScriptExecutor() {
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ScriptExecutionResult | null>(null);

  // 执行脚本
  const executeScript = useCallback(async (
    scriptId: string,
    deviceId: string,
    options?: { config?: any }
  ) => {
    setExecuting(true);
    setExecutionResult(null);
    
    try {
      const result = await ScriptManagementService.executeScript(scriptId, deviceId, options);
      setExecutionResult(result);
      
      if (result.success) {
        message.success(`脚本执行成功！执行了 ${result.executed_steps}/${result.total_steps} 个步骤`);
      } else {
        message.error(`脚本执行失败：${result.message}`);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '脚本执行失败';
      message.error(errorMsg);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, []);

  // 从UI状态执行脚本
  const executeFromUIState = useCallback(async (
    steps: any[],
    config: any,
    deviceId: string
  ) => {
    setExecuting(true);
    setExecutionResult(null);
    
    try {
      // 创建临时脚本对象
      const tempScript = ScriptSerializer.serializeScript(
        '临时脚本',
        '从构建器直接执行',
        steps,
        config
      );

      // 先保存临时脚本
      const savedScript = await ScriptManagementService.saveScript(tempScript);
      
      // 执行脚本
      const result = await ScriptManagementService.executeScript(savedScript.id, deviceId);
      setExecutionResult(result);
      
      if (result.success) {
        message.success(`脚本执行成功！执行了 ${result.executed_steps}/${result.total_steps} 个步骤`);
      } else {
        message.error(`脚本执行失败：${result.message}`);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '脚本执行失败';
      message.error(errorMsg);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, []);

  return {
    executing,
    executionResult,
    executeScript,
    executeFromUIState
  };
}

/**
 * 脚本模板Hook
 */
export function useScriptTemplates() {
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const templateList = await ScriptManagementService.getTemplateList();
      setTemplates(templateList);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取模板列表失败';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 从模板创建脚本
  const createFromTemplate = useCallback(async (
    templateId: string,
    scriptName: string,
    scriptDescription?: string
  ) => {
    try {
      const newScript = await ScriptManagementService.createFromTemplate(
        templateId,
        scriptName,
        scriptDescription
      );
      message.success('从模板创建脚本成功');
      return newScript;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '从模板创建脚本失败';
      message.error(errorMsg);
      throw err;
    }
  }, []);

  // 初始化时加载
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    loadTemplates,
    createFromTemplate
  };
}