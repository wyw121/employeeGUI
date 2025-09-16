import { useState, useEffect, useCallback } from 'react';
import {
  enhancedAdbDiagnosticService,
  DiagnosticResult,
  DiagnosticProgress,
  AutoFixResult,
  SystemInfo
} from '../../../services/adb-diagnostic/EnhancedAdbDiagnosticService';
import { LogCategory } from '../../../services/adb-diagnostic/LogManager';
import { useLogManager } from './useLogManager';

export interface UseAdbDiagnosticReturn {
  // 诊断状态
  isRunning: boolean;
  progress: DiagnosticProgress | null;
  
  // 诊断结果
  diagnosticResults: DiagnosticResult[];
  systemInfo: SystemInfo | null;
  
  // 诊断操作
  runFullDiagnostic: () => Promise<DiagnosticResult[]>;
  runQuickCheck: () => Promise<DiagnosticResult[]>;
  autoFixIssues: (results?: DiagnosticResult[]) => Promise<AutoFixResult[]>;
  
  // 系统信息
  refreshSystemInfo: () => Promise<void>;
  
  // 状态管理
  clearResults: () => void;
  
  // 统计信息
  getResultsStats: () => {
    total: number;
    success: number;
    warning: number;
    error: number;
    canAutoFix: number;
  };
}

/**
 * useAdbDiagnostic Hook
 * 提供 ADB 诊断功能的响应式接口
 */
export const useAdbDiagnostic = (): UseAdbDiagnosticReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<DiagnosticProgress | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  const { info, warn, error } = useLogManager();

  // 初始化时获取系统信息和上次诊断结果
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 获取系统信息
        const sysInfo = await enhancedAdbDiagnosticService.getSystemInfo();
        setSystemInfo(sysInfo);
        
        // 获取上次诊断结果
        const lastResults = enhancedAdbDiagnosticService.getLastDiagnosticResults();
        setDiagnosticResults(lastResults);
        
        info(LogCategory.SYSTEM, 'useAdbDiagnostic', 'ADB 诊断服务已初始化');
      } catch (err) {
        warn(LogCategory.SYSTEM, 'useAdbDiagnostic', '初始化失败', { error: err });
      }
    };

    initializeData();
  }, [info, warn]);

  // 运行完整诊断
  const runFullDiagnostic = useCallback(async (): Promise<DiagnosticResult[]> => {
    if (isRunning) {
      throw new Error('诊断已在运行中');
    }

    setIsRunning(true);
    setProgress(null);
    setDiagnosticResults([]);

    info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '开始完整诊断');

    try {
      const results = await enhancedAdbDiagnosticService.runFullDiagnostic(
        (progressInfo: DiagnosticProgress) => {
          setProgress(progressInfo);
          setDiagnosticResults(progressInfo.allResults);
        }
      );

      setDiagnosticResults(results);
      
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '完整诊断完成', {
        total: results.length,
        errors: errorCount,
        warnings: warningCount
      });

      return results;
    } catch (err) {
      error(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '完整诊断失败', { error: err });
      throw err;
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  }, [isRunning, info, error]);

  // 运行快速检查
  const runQuickCheck = useCallback(async (): Promise<DiagnosticResult[]> => {
    info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '开始快速检查');

    try {
      const results = await enhancedAdbDiagnosticService.runQuickCheck();
      setDiagnosticResults(results);
      
      info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '快速检查完成', {
        total: results.length
      });

      return results;
    } catch (err) {
      error(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '快速检查失败', { error: err });
      throw err;
    }
  }, [info, error]);

  // 自动修复问题
  const autoFixIssues = useCallback(async (results?: DiagnosticResult[]): Promise<AutoFixResult[]> => {
    const targetResults = results || diagnosticResults;
    
    info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '开始自动修复');

    try {
      const fixResults = await enhancedAdbDiagnosticService.autoFixIssues(targetResults);
      
      const successCount = fixResults.filter(r => r.success).length;
      info(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '自动修复完成', {
        total: fixResults.length,
        success: successCount
      });

      return fixResults;
    } catch (err) {
      error(LogCategory.DIAGNOSTIC, 'useAdbDiagnostic', '自动修复失败', { error: err });
      throw err;
    }
  }, [diagnosticResults, info, error]);

  // 刷新系统信息
  const refreshSystemInfo = useCallback(async (): Promise<void> => {
    try {
      const sysInfo = await enhancedAdbDiagnosticService.getSystemInfo();
      setSystemInfo(sysInfo);
      info(LogCategory.SYSTEM, 'useAdbDiagnostic', '系统信息已刷新');
    } catch (err) {
      warn(LogCategory.SYSTEM, 'useAdbDiagnostic', '刷新系统信息失败', { error: err });
      throw err;
    }
  }, [info, warn]);

  // 清除结果
  const clearResults = useCallback(() => {
    setDiagnosticResults([]);
    setProgress(null);
    info(LogCategory.USER_ACTION, 'useAdbDiagnostic', '诊断结果已清除');
  }, [info]);

  // 获取结果统计
  const getResultsStats = useCallback(() => {
    const stats = {
      total: diagnosticResults.length,
      success: 0,
      warning: 0,
      error: 0,
      canAutoFix: 0
    };

    diagnosticResults.forEach(result => {
      if (result.status === 'success') stats.success++;
      else if (result.status === 'warning') stats.warning++;
      else if (result.status === 'error') stats.error++;
      
      if (result.canAutoFix) stats.canAutoFix++;
    });

    return stats;
  }, [diagnosticResults]);

  return {
    // 状态
    isRunning,
    progress,
    
    // 数据
    diagnosticResults,
    systemInfo,
    
    // 操作
    runFullDiagnostic,
    runQuickCheck,
    autoFixIssues,
    
    // 系统信息
    refreshSystemInfo,
    
    // 管理
    clearResults,
    getResultsStats
  };
};