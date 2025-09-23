/**
 * XML数据质量检查器
 * 专门用于分布式脚本的数据完整性验证
 */

export interface XmlValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  checks: Record<string, boolean>;
  issues: XmlValidationIssue[];
  severity: 'critical' | 'major' | 'minor' | 'passed';
  score: number; // 0-100的质量评分
}

export interface ScriptValidationResult {
  isValid: boolean;
  totalSteps: number;
  validSteps: number;
  issues: XmlValidationIssue[];
  warnings: string[];
  compatibilityScore: number;
  recommendations: string[];
}

export class XmlDataValidator {
  /**
   * 验证XML快照的完整性和质量
   */
  static validateXmlSnapshot(xmlSnapshot: {
    xmlContent: string;
    deviceInfo?: any;
    pageInfo?: any;
    timestamp?: number;
  }): ValidationResult {
    const checks = {
      hasXmlContent: this.checkXmlContent(xmlSnapshot.xmlContent),
      hasValidXmlFormat: this.checkXmlFormat(xmlSnapshot.xmlContent),
      hasDeviceInfo: this.checkDeviceInfo(xmlSnapshot.deviceInfo),
      hasPageInfo: this.checkPageInfo(xmlSnapshot.pageInfo),
      hasTimestamp: this.checkTimestamp(xmlSnapshot.timestamp),
      xmlContentSize: this.checkXmlSize(xmlSnapshot.xmlContent),
      xmlStructure: this.checkXmlStructure(xmlSnapshot.xmlContent)
    };

    const issues = this.generateIssues(checks, xmlSnapshot);
    const severity = this.calculateSeverity(checks);
    const score = this.calculateQualityScore(checks);

    return {
      isValid: severity !== 'critical',
      checks,
      issues,
      severity,
      score
    };
  }

  /**
   * 验证分布式脚本的整体质量
   */
  static validateDistributedScript(script: any): ScriptValidationResult {
    console.log('🔍 开始验证分布式脚本:', script.name || 'Unknown');

    if (!script || !script.steps || !Array.isArray(script.steps)) {
      return {
        isValid: false,
        totalSteps: 0,
        validSteps: 0,
        issues: [{
          code: 'INVALID_SCRIPT_FORMAT',
          message: '脚本格式无效或缺少步骤数组',
          severity: 'error'
        }],
        warnings: [],
        compatibilityScore: 0,
        recommendations: ['检查脚本文件格式是否正确']
      };
    }

    const stepValidations = script.steps.map((step: any, index: number) => {
      console.log(`🔍 验证步骤 ${index + 1}/${script.steps.length}: ${step.name || step.id}`);
      
      if (!step.xmlSnapshot) {
        return {
          isValid: false,
          stepIndex: index,
          issues: [{
            code: 'MISSING_XML_SNAPSHOT',
            message: `步骤 ${index + 1} 缺少XML快照`,
            severity: 'error' as const
          }]
        };
      }

      const validation = this.validateXmlSnapshot(step.xmlSnapshot);
      return {
        isValid: validation.isValid,
        stepIndex: index,
        validation,
        issues: validation.issues
      };
    });

    const validSteps = stepValidations.filter(v => v.isValid).length;
    const allIssues = stepValidations.flatMap(v => v.issues || []);
    const warnings = this.getCompatibilityWarnings(script);
    const compatibilityScore = this.calculateCompatibilityScore(script, stepValidations);

    const result = {
      isValid: validSteps === script.steps.length,
      totalSteps: script.steps.length,
      validSteps,
      issues: allIssues,
      warnings,
      compatibilityScore,
      recommendations: this.generateRecommendations(script, stepValidations)
    };

    console.log('✅ 脚本验证完成:', {
      isValid: result.isValid,
      validSteps: `${validSteps}/${script.steps.length}`,
      issuesCount: allIssues.length,
      compatibilityScore: compatibilityScore
    });

    return result;
  }

  /**
   * 快速检查XML快照基本信息
   */
  static quickCheck(step: any): { hasXmlSnapshot: boolean; isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!step.parameters?.xmlContent) {
      issues.push('缺少XML内容');
    }
    
    if (!step.parameters?.deviceInfo?.deviceId) {
      issues.push('缺少设备信息');
    }
    
    if (!step.parameters?.xmlTimestamp) {
      issues.push('缺少时间戳');
    }

    if (step.parameters?.xmlContent && step.parameters.xmlContent.length < 100) {
      issues.push('XML内容过短，可能不完整');
    }

    return {
      hasXmlSnapshot: !!step.parameters?.xmlContent,
      isValid: issues.length === 0,
      issues
    };
  }

  // === 私有检查方法 ===

  private static checkXmlContent(xmlContent: string): boolean {
    return !!xmlContent && xmlContent.length > 100 && xmlContent.trim().startsWith('<');
  }

  private static checkXmlFormat(xmlContent: string): boolean {
    if (!xmlContent) return false;
    
    try {
      // 基本的XML格式检查
      const trimmed = xmlContent.trim();
      const startsWithXml = trimmed.startsWith('<?xml') || trimmed.startsWith('<');
      const hasClosingTags = trimmed.includes('</') || trimmed.endsWith('/>');
      const hasHierarchy = trimmed.includes('<hierarchy') || trimmed.includes('<node');
      
      return startsWithXml && hasClosingTags && hasHierarchy;
    } catch {
      return false;
    }
  }

  private static checkDeviceInfo(deviceInfo: any): boolean {
    return !!deviceInfo && !!deviceInfo.deviceId && !!deviceInfo.deviceName;
  }

  private static checkPageInfo(pageInfo: any): boolean {
    return !!pageInfo && !!pageInfo.appName;
  }

  private static checkTimestamp(timestamp: number): boolean {
    return !!timestamp && timestamp > 0 && timestamp < Date.now() + 24 * 60 * 60 * 1000; // 不能是未来时间
  }

  private static checkXmlSize(xmlContent: string): boolean {
    if (!xmlContent) return false;
    const size = xmlContent.length;
    return size > 100 && size < 2 * 1024 * 1024; // 100B - 2MB
  }

  private static checkXmlStructure(xmlContent: string): boolean {
    if (!xmlContent) return false;
    
    // 检查是否包含UI元素结构
    const hasNodes = xmlContent.includes('<node') || xmlContent.includes('class=');
    const hasBounds = xmlContent.includes('bounds=');
    const hasText = xmlContent.includes('text=') || xmlContent.includes('content-desc=');
    
    return hasNodes && hasBounds;
  }

  private static generateIssues(checks: Record<string, boolean>, xmlSnapshot: any): XmlValidationIssue[] {
    const issues: XmlValidationIssue[] = [];

    if (!checks.hasXmlContent) {
      issues.push({
        code: 'MISSING_XML_CONTENT',
        message: 'XML内容缺失或为空',
        severity: 'error',
        suggestion: '确保在创建步骤时正确保存了页面的XML快照'
      });
    }

    if (!checks.hasValidXmlFormat) {
      issues.push({
        code: 'INVALID_XML_FORMAT',
        message: 'XML格式无效或损坏',
        severity: 'error',
        suggestion: '检查XML内容是否被正确保存，是否存在编码问题'
      });
    }

    if (!checks.hasDeviceInfo) {
      issues.push({
        code: 'MISSING_DEVICE_INFO',
        message: '设备信息缺失',
        severity: 'warning',
        suggestion: '添加设备ID和设备名称以提高跨设备兼容性'
      });
    }

    if (!checks.hasPageInfo) {
      issues.push({
        code: 'MISSING_PAGE_INFO',
        message: '页面信息缺失',
        severity: 'warning',
        suggestion: '添加应用名称和页面标识以便更好地理解脚本上下文'
      });
    }

    if (!checks.hasTimestamp) {
      issues.push({
        code: 'MISSING_TIMESTAMP',
        message: '时间戳缺失',
        severity: 'info',
        suggestion: '添加创建时间戳以便追踪脚本版本'
      });
    }

    if (!checks.xmlContentSize) {
      const size = xmlSnapshot.xmlContent?.length || 0;
      if (size === 0) {
        // 已在上面处理
      } else if (size < 100) {
        issues.push({
          code: 'XML_TOO_SMALL',
          message: `XML内容过小 (${size} 字符)，可能不完整`,
          severity: 'warning',
          suggestion: '检查XML快照是否完整捕获了页面结构'
        });
      } else if (size > 2 * 1024 * 1024) {
        issues.push({
          code: 'XML_TOO_LARGE',
          message: `XML内容过大 (${Math.round(size / 1024)} KB)，可能影响性能`,
          severity: 'warning',
          suggestion: '考虑优化XML内容或使用压缩'
        });
      }
    }

    if (!checks.xmlStructure) {
      issues.push({
        code: 'INVALID_XML_STRUCTURE',
        message: 'XML结构不符合Android UI布局格式',
        severity: 'warning',
        suggestion: '确保XML来源于正确的UI dump命令'
      });
    }

    return issues;
  }

  private static calculateSeverity(checks: Record<string, boolean>): 'critical' | 'major' | 'minor' | 'passed' {
    const criticalChecks = ['hasXmlContent', 'hasValidXmlFormat'];
    const majorChecks = ['xmlContentSize', 'xmlStructure'];
    
    const criticalFailed = criticalChecks.some(check => !checks[check]);
    const majorFailed = majorChecks.some(check => !checks[check]);
    
    if (criticalFailed) return 'critical';
    if (majorFailed) return 'major';
    
    const passedCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;
    
    if (passedCount / totalCount >= 0.8) return 'passed';
    return 'minor';
  }

  private static calculateQualityScore(checks: Record<string, boolean>): number {
    const weights = {
      hasXmlContent: 25,
      hasValidXmlFormat: 25,
      hasDeviceInfo: 15,
      hasPageInfo: 10,
      hasTimestamp: 5,
      xmlContentSize: 15,
      xmlStructure: 15
    };

    let score = 0;
    for (const [check, passed] of Object.entries(checks)) {
      if (passed && weights[check as keyof typeof weights]) {
        score += weights[check as keyof typeof weights];
      }
    }

    return Math.round(score);
  }

  private static getCompatibilityWarnings(script: any): string[] {
    const warnings: string[] = [];

    if (!script.version) {
      warnings.push('脚本未标记版本号，可能存在兼容性问题');
    }

    if (!script.metadata?.platform) {
      warnings.push('未指定目标平台，可能无法在其他平台正常运行');
    }

    const stepsWithoutXml = script.steps?.filter((s: any) => !s.xmlSnapshot).length || 0;
    if (stepsWithoutXml > 0) {
      warnings.push(`${stepsWithoutXml} 个步骤缺少XML快照，跨设备兼容性受限`);
    }

    return warnings;
  }

  private static calculateCompatibilityScore(script: any, stepValidations: any[]): number {
    const factors = {
      hasVersion: script.version ? 20 : 0,
      hasPlatform: script.metadata?.platform ? 15 : 0,
      hasMetadata: script.metadata ? 10 : 0,
      xmlSnapshotCoverage: (stepValidations.filter(v => v.isValid).length / stepValidations.length) * 40,
      hasDeviceInfo: stepValidations.filter(v => v.validation?.checks?.hasDeviceInfo).length / stepValidations.length * 15
    };

    return Math.round(Object.values(factors).reduce((sum, score) => sum + score, 0));
  }

  private static generateRecommendations(script: any, stepValidations: any[]): string[] {
    const recommendations: string[] = [];

    const invalidSteps = stepValidations.filter(v => !v.isValid);
    if (invalidSteps.length > 0) {
      recommendations.push(`修复 ${invalidSteps.length} 个无效步骤的XML快照`);
    }

    if (!script.version) {
      recommendations.push('为脚本添加版本号以便版本管理');
    }

    if (!script.metadata?.platform) {
      recommendations.push('指定目标平台以提高兼容性');
    }

    const missingDeviceInfo = stepValidations.filter(v => !v.validation?.checks?.hasDeviceInfo).length;
    if (missingDeviceInfo > 0) {
      recommendations.push(`为 ${missingDeviceInfo} 个步骤添加设备信息`);
    }

    const largeXmlSteps = stepValidations.filter(v => 
      v.validation?.issues?.some((issue: any) => issue.code === 'XML_TOO_LARGE')
    ).length;
    if (largeXmlSteps > 0) {
      recommendations.push(`优化 ${largeXmlSteps} 个步骤的XML内容大小`);
    }

    return recommendations;
  }
}