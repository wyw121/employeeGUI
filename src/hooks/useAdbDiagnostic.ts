/**
 * ADB诊断相关的React Hook
 * 管理诊断状态、进度和结果
 */
import { useState, useCallback } from 'react';
import { 
  EnhancedAdbDiagnosticService, 
  DiagnosticResult
} from '../services/adb-diagnostic/EnhancedAdbDiagnosticService';

export interface UseAdbDiagnosticReturn {
  isRunning: boolean;
  diagnosticResults: DiagnosticResult[];
  progress: number;
  currentStep: string;
  runFullDiagnostic: () => Promise<void>;
  runQuickCheck: () => Promise<void>;
  autoFixIssues: () => Promise<void>;
  clearResults: () => void;
}

export const useAdbDiagnostic = (): UseAdbDiagnosticReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const diagnosticService = EnhancedAdbDiagnosticService.getInstance();

  const runFullDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setDiagnosticResults([]);
    
    try {
      const results = await diagnosticService.runFullDiagnostic((progressInfo) => {
        setCurrentStep(`步骤 ${progressInfo.currentStep}/${progressInfo.totalSteps}`);
        setProgress(progressInfo.progress);
      });
      
      setDiagnosticResults(results);
      setProgress(100);
    } catch (error) {
      console.error('诊断过程中出现错误:', error);
    } finally {
      setIsRunning(false);
    }
  }, [diagnosticService]);

  const runQuickCheck = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('快速检查');
    
    try {
      const results = await diagnosticService.runQuickCheck();
      setDiagnosticResults(results);
      setProgress(100);
    } catch (error) {
      console.error('快速检查出现错误:', error);
    } finally {
      setIsRunning(false);
    }
  }, [diagnosticService]);

  const autoFixIssues = useCallback(async () => {
    if (diagnosticResults.length === 0) return;
    
    try {
      const fixableResults = diagnosticResults.filter(r => r.canAutoFix);
      await diagnosticService.autoFixIssues(fixableResults);
      
      // 重新运行快速检查以验证修复结果
      await runQuickCheck();
    } catch (error) {
      console.error('自动修复出现错误:', error);
    }
  }, [diagnosticResults, runQuickCheck, diagnosticService]);

  const clearResults = useCallback(() => {
    setDiagnosticResults([]);
    setProgress(0);
    setCurrentStep('');
  }, []);

  return {
    isRunning,
    diagnosticResults,
    progress,
    currentStep,
    runFullDiagnostic,
    runQuickCheck,
    autoFixIssues,
    clearResults
  };
};