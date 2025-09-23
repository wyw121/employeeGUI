/**
 * 分布式脚本质量检查模块入口
 * 提供完整的质量检查、验证和恢复功能
 */

export { XmlDataValidator } from './XmlDataValidator';
export type { 
  XmlValidationIssue, 
  ValidationResult, 
  ScriptValidationResult 
} from './XmlDataValidator';

export { DistributedScriptRecoveryService } from './DistributedScriptRecoveryService';
export type { 
  RecoveryStrategy, 
  RecoveryContext, 
  RecoveryResult, 
  ScriptRecoveryReport 
} from './DistributedScriptRecoveryService';

export { DistributedScriptQualityPanel } from './DistributedScriptQualityPanel';

/**
 * 快速质量检查函数
 * 用于在组件中快速验证脚本质量
 */
export const quickQualityCheck = (script: any) => {
  const validation = XmlDataValidator.validateDistributedScript(script);
  return {
    isValid: validation.isValid,
    score: validation.compatibilityScore,
    issues: validation.issues.length,
    validSteps: validation.validSteps,
    totalSteps: validation.totalSteps
  };
};

/**
 * 自动修复脚本
 * 一键式脚本修复函数
 */
export const autoFixScript = async (script: any) => {
  console.log('🔧 开始自动修复脚本...');
  
  try {
    const recovery = await DistributedScriptRecoveryService.recoverDistributedScript(script);
    
    return {
      success: recovery.resolvedIssues > 0,
      fixedScript: recovery.recoveredScript,
      report: {
        originalIssues: recovery.originalIssues,
        resolvedIssues: recovery.resolvedIssues,
        confidenceScore: recovery.confidenceScore,
        appliedStrategies: recovery.appliedStrategies,
        remainingIssues: recovery.remainingIssues,
        recommendations: recovery.recommendations
      }
    };
  } catch (error) {
    console.error('❌ 自动修复失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      report: null
    };
  }
};

/**
 * 分布式脚本质量等级
 */
export enum ScriptQualityLevel {
  EXCELLENT = 'excellent',   // 90-100分
  GOOD = 'good',            // 70-89分
  FAIR = 'fair',            // 50-69分
  POOR = 'poor',            // 30-49分
  CRITICAL = 'critical'     // 0-29分
}

/**
 * 获取脚本质量等级
 */
export const getScriptQualityLevel = (compatibilityScore: number): ScriptQualityLevel => {
  if (compatibilityScore >= 90) return ScriptQualityLevel.EXCELLENT;
  if (compatibilityScore >= 70) return ScriptQualityLevel.GOOD;
  if (compatibilityScore >= 50) return ScriptQualityLevel.FAIR;
  if (compatibilityScore >= 30) return ScriptQualityLevel.POOR;
  return ScriptQualityLevel.CRITICAL;
};

/**
 * 获取质量等级的显示信息
 */
export const getQualityLevelInfo = (level: ScriptQualityLevel) => {
  const info = {
    [ScriptQualityLevel.EXCELLENT]: {
      label: '优秀',
      color: '#52c41a',
      description: '脚本质量优秀，跨设备兼容性很好'
    },
    [ScriptQualityLevel.GOOD]: {
      label: '良好', 
      color: '#1890ff',
      description: '脚本质量良好，建议进行小幅优化'
    },
    [ScriptQualityLevel.FAIR]: {
      label: '一般',
      color: '#faad14', 
      description: '脚本质量一般，需要适度改进'
    },
    [ScriptQualityLevel.POOR]: {
      label: '较差',
      color: '#fa8c16',
      description: '脚本质量较差，建议重大改进'
    },
    [ScriptQualityLevel.CRITICAL]: {
      label: '严重',
      color: '#ff4d4f',
      description: '脚本存在严重问题，需要立即修复'
    }
  };
  
  return info[level];
};

/**
 * 质量检查配置
 */
export interface QualityCheckConfig {
  enableAutoFix: boolean;
  strictMode: boolean;
  checkXmlIntegrity: boolean;
  checkDeviceCompatibility: boolean;
  checkPerformance: boolean;
}

/**
 * 默认质量检查配置
 */
export const DEFAULT_QUALITY_CONFIG: QualityCheckConfig = {
  enableAutoFix: true,
  strictMode: false,
  checkXmlIntegrity: true,
  checkDeviceCompatibility: true,
  checkPerformance: true
};

// 导入重新导出为便于使用
import { XmlDataValidator } from './XmlDataValidator';
import { DistributedScriptRecoveryService } from './DistributedScriptRecoveryService';