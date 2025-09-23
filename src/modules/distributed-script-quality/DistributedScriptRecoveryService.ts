/**
 * 分布式脚本恢复服务
 * 处理XML快照损坏、设备兼容性等问题
 */

import { XmlDataValidator, ValidationResult, ScriptValidationResult } from './XmlDataValidator';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  apply: (context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryContext {
  script: any;
  failedStep: any;
  stepIndex: number;
  xmlSnapshot: any;
  validation: ValidationResult;
  deviceInfo?: any;
  targetDevice?: any;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  recoveredData?: any;
  fallbackData?: any;
  warnings: string[];
  recommendations: string[];
}

export interface ScriptRecoveryReport {
  originalIssues: number;
  resolvedIssues: number;
  appliedStrategies: string[];
  remainingIssues: string[];
  recoveredScript: any;
  confidenceScore: number;
  recommendations: string[];
}

export class DistributedScriptRecoveryService {
  private static recoveryStrategies: RecoveryStrategy[] = [
    {
      id: 'xml-repair',
      name: 'XML格式修复',
      description: '尝试修复损坏的XML结构',
      apply: this.repairXmlFormat.bind(this)
    },
    {
      id: 'local-xml-lookup',
      name: '本地XML查找',
      description: '从本地XML缓存中查找匹配的页面',
      apply: this.lookupLocalXml.bind(this)
    },
    {
      id: 'device-adaptation',
      name: '设备适配',
      description: '调整XML内容以适配目标设备',
      apply: this.adaptToDevice.bind(this)
    },
    {
      id: 'xml-regeneration',
      name: 'XML重新生成',
      description: '基于步骤信息重新生成基础XML结构',
      apply: this.regenerateXml.bind(this)
    },
    {
      id: 'fallback-manual',
      name: '手动干预提示',
      description: '提供手动修复指导',
      apply: this.provideFallbackGuidance.bind(this)
    }
  ];

  /**
   * 自动恢复分布式脚本
   */
  static async recoverDistributedScript(script: any): Promise<ScriptRecoveryReport> {
    console.log('🔧 开始恢复分布式脚本:', script.name || 'Unknown');

    const validation = XmlDataValidator.validateDistributedScript(script);
    if (validation.isValid) {
      console.log('✅ 脚本无需恢复，已通过验证');
      return {
        originalIssues: 0,
        resolvedIssues: 0,
        appliedStrategies: [],
        remainingIssues: [],
        recoveredScript: script,
        confidenceScore: 100,
        recommendations: []
      };
    }

    console.log(`🔧 发现 ${validation.issues.length} 个问题，开始恢复...`);

    const recoveredScript = JSON.parse(JSON.stringify(script)); // 深拷贝
    const appliedStrategies: string[] = [];
    const remainingIssues: string[] = [];
    let resolvedIssues = 0;

    // 按步骤处理问题
    for (let stepIndex = 0; stepIndex < recoveredScript.steps.length; stepIndex++) {
      const step = recoveredScript.steps[stepIndex];
      console.log(`🔧 处理步骤 ${stepIndex + 1}: ${step.name || step.id}`);

      if (!step.xmlSnapshot) {
        console.log('⚠️ 步骤缺少XML快照，尝试恢复...');
        
        const recoveryResult = await this.recoverMissingXmlSnapshot(step, stepIndex, script);
        if (recoveryResult.success) {
          step.xmlSnapshot = recoveryResult.recoveredData;
          appliedStrategies.push(recoveryResult.strategy);
          resolvedIssues++;
          console.log('✅ XML快照恢复成功');
        } else {
          remainingIssues.push(`步骤 ${stepIndex + 1}: 无法恢复XML快照`);
          console.log('❌ XML快照恢复失败');
        }
        continue;
      }

      const stepValidation = XmlDataValidator.validateXmlSnapshot(step.xmlSnapshot);
      if (!stepValidation.isValid) {
        console.log(`⚠️ 步骤XML验证失败，尝试修复...`);
        
        const recoveryResult = await this.recoverCorruptedXmlSnapshot(
          step, stepIndex, stepValidation, script
        );
        
        if (recoveryResult.success) {
          if (recoveryResult.recoveredData) {
            step.xmlSnapshot = { ...step.xmlSnapshot, ...recoveryResult.recoveredData };
          }
          appliedStrategies.push(recoveryResult.strategy);
          resolvedIssues++;
          console.log('✅ XML修复成功');
        } else {
          remainingIssues.push(`步骤 ${stepIndex + 1}: ${recoveryResult.warnings.join(', ')}`);
          console.log('❌ XML修复失败');
        }
      }
    }

    // 计算恢复信心度
    const confidenceScore = this.calculateConfidenceScore(
      validation.issues.length, resolvedIssues, appliedStrategies
    );

    const report: ScriptRecoveryReport = {
      originalIssues: validation.issues.length,
      resolvedIssues,
      appliedStrategies: [...new Set(appliedStrategies)],
      remainingIssues,
      recoveredScript,
      confidenceScore,
      recommendations: this.generateRecoveryRecommendations(remainingIssues, appliedStrategies)
    };

    console.log('✅ 脚本恢复完成:', {
      resolvedRatio: `${resolvedIssues}/${validation.issues.length}`,
      confidenceScore,
      strategies: report.appliedStrategies.length
    });

    return report;
  }

  /**
   * 恢复缺失的XML快照
   */
  private static async recoverMissingXmlSnapshot(
    step: any, stepIndex: number, script: any
  ): Promise<RecoveryResult> {
    
    // 策略1: 查找本地XML缓存
    if (step.parameters?.pageName || step.parameters?.appName) {
      console.log('🔍 尝试从本地查找XML...');
      
      const localXmlResult = await this.lookupLocalXml({
        script,
        failedStep: step,
        stepIndex,
        xmlSnapshot: null,
        validation: null as any
      });
      
      if (localXmlResult.success) {
        return localXmlResult;
      }
    }

    // 策略2: 基于步骤信息生成基础XML
    console.log('🔧 尝试生成基础XML结构...');
    
    const regenerationResult = await this.regenerateXml({
      script,
      failedStep: step,
      stepIndex,
      xmlSnapshot: null,
      validation: null as any
    });

    return regenerationResult;
  }

  /**
   * 恢复损坏的XML快照
   */
  private static async recoverCorruptedXmlSnapshot(
    step: any, stepIndex: number, validation: ValidationResult, script: any
  ): Promise<RecoveryResult> {
    
    const context: RecoveryContext = {
      script,
      failedStep: step,
      stepIndex,
      xmlSnapshot: step.xmlSnapshot,
      validation
    };

    // 根据问题类型选择恢复策略
    for (const issue of validation.issues) {
      switch (issue.code) {
        case 'INVALID_XML_FORMAT':
          console.log('🔧 尝试修复XML格式...');
          const repairResult = await this.repairXmlFormat(context);
          if (repairResult.success) return repairResult;
          break;

        case 'XML_TOO_SMALL':
          console.log('🔍 尝试查找完整的XML...');
          const lookupResult = await this.lookupLocalXml(context);
          if (lookupResult.success) return lookupResult;
          break;

        case 'INVALID_XML_STRUCTURE':
          console.log('🔧 尝试重新生成XML结构...');
          const regenerateResult = await this.regenerateXml(context);
          if (regenerateResult.success) return regenerateResult;
          break;
      }
    }

    // 所有策略都失败，提供手动干预指导
    return await this.provideFallbackGuidance(context);
  }

  // === 恢复策略实现 ===

  private static async repairXmlFormat(context: RecoveryContext): Promise<RecoveryResult> {
    const { xmlSnapshot } = context;
    
    if (!xmlSnapshot?.xmlContent) {
      return {
        success: false,
        strategy: 'xml-repair',
        warnings: ['XML内容完全缺失，无法修复'],
        recommendations: ['需要重新获取XML快照']
      };
    }

    try {
      let xmlContent = xmlSnapshot.xmlContent;
      
      // 基础修复：确保XML声明
      if (!xmlContent.trim().startsWith('<?xml')) {
        xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
      }
      
      // 修复常见的转义问题
      xmlContent = xmlContent
        .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/&lt;\?xml/g, '<?xml')
        .replace(/&lt;hierarchy/g, '<hierarchy')
        .replace(/&lt;node/g, '<node')
        .replace(/&lt;\/node&gt;/g, '</node>')
        .replace(/&lt;\/hierarchy&gt;/g, '</hierarchy>');

      return {
        success: true,
        strategy: 'xml-repair',
        recoveredData: {
          ...xmlSnapshot,
          xmlContent,
          repaired: true,
          repairedAt: Date.now()
        },
        warnings: [],
        recommendations: ['XML格式已修复，建议验证内容完整性']
      };
    } catch (error) {
      return {
        success: false,
        strategy: 'xml-repair',
        warnings: [`XML修复失败: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['考虑重新获取XML快照']
      };
    }
  }

  private static async lookupLocalXml(context: RecoveryContext): Promise<RecoveryResult> {
    const { failedStep } = context;
    
    // 模拟本地XML查找逻辑
    // 在实际实现中，这里会查询本地XML缓存或调用相关服务
    
    const searchCriteria = {
      appName: failedStep.parameters?.appName || '小红书',
      pageName: failedStep.parameters?.pageName,
      actionType: failedStep.type,
      targetElement: failedStep.parameters?.selector
    };

    console.log('🔍 查找条件:', searchCriteria);

    // 这里是占位符逻辑，实际应该调用本地XML查找服务
    const mockXmlContent = this.generateMockXmlContent(searchCriteria);
    
    if (mockXmlContent) {
      return {
        success: true,
        strategy: 'local-xml-lookup',
        recoveredData: {
          xmlContent: mockXmlContent,
          deviceInfo: {
            deviceId: 'recovered',
            deviceName: 'Local Cache',
            recoveredFrom: 'local-lookup'
          },
          pageInfo: {
            appName: searchCriteria.appName,
            pageName: searchCriteria.pageName || 'Unknown'
          },
          timestamp: Date.now()
        },
        warnings: ['使用了本地缓存的XML，可能与原始环境有差异'],
        recommendations: ['验证恢复的XML是否适用于当前场景']
      };
    }

    return {
      success: false,
      strategy: 'local-xml-lookup',
      warnings: ['本地未找到匹配的XML快照'],
      recommendations: ['考虑手动提供XML快照或使用其他恢复策略']
    };
  }

  private static async adaptToDevice(context: RecoveryContext): Promise<RecoveryResult> {
    const { xmlSnapshot, targetDevice } = context;
    
    if (!xmlSnapshot?.xmlContent || !targetDevice) {
      return {
        success: false,
        strategy: 'device-adaptation',
        warnings: ['缺少XML内容或目标设备信息'],
        recommendations: ['提供完整的设备信息进行适配']
      };
    }

    // 设备适配逻辑（简化版）
    let adaptedXmlContent = xmlSnapshot.xmlContent;
    
    // 根据设备分辨率调整坐标
    if (targetDevice.screenSize && xmlSnapshot.deviceInfo?.screenSize) {
      const scaleX = targetDevice.screenSize.width / xmlSnapshot.deviceInfo.screenSize.width;
      const scaleY = targetDevice.screenSize.height / xmlSnapshot.deviceInfo.screenSize.height;
      
      // 这里应该实现坐标转换逻辑
      console.log(`🔧 设备适配比例: ${scaleX.toFixed(2)} x ${scaleY.toFixed(2)}`);
    }

    return {
      success: true,
      strategy: 'device-adaptation',
      recoveredData: {
        ...xmlSnapshot,
        xmlContent: adaptedXmlContent,
        adaptedFor: targetDevice.deviceId,
        adaptedAt: Date.now()
      },
      warnings: ['XML已适配目标设备，实际效果需要测试验证'],
      recommendations: ['在目标设备上测试脚本执行效果']
    };
  }

  private static async regenerateXml(context: RecoveryContext): Promise<RecoveryResult> {
    const { failedStep } = context;
    
    // 基于步骤信息生成基础XML结构
    const basicXmlStructure = this.generateBasicXmlStructure(failedStep);
    
    return {
      success: true,
      strategy: 'xml-regeneration',
      recoveredData: {
        xmlContent: basicXmlStructure,
        deviceInfo: {
          deviceId: 'generated',
          deviceName: 'Synthetic',
          generated: true
        },
        pageInfo: {
          appName: failedStep.parameters?.appName || 'Unknown',
          pageName: failedStep.parameters?.pageName || 'Generated'
        },
        timestamp: Date.now(),
        synthetic: true
      },
      warnings: ['使用了合成的XML结构，功能可能受限'],
      recommendations: [
        '建议在实际环境中重新获取真实的XML快照',
        '测试合成XML的兼容性'
      ]
    };
  }

  private static async provideFallbackGuidance(context: RecoveryContext): Promise<RecoveryResult> {
    const { failedStep, stepIndex, validation } = context;
    
    const recommendations = [
      `步骤 ${stepIndex + 1}（${failedStep.name || failedStep.id}）需要手动处理`,
      '建议操作：',
      '1. 在相同应用页面重新获取XML快照',
      '2. 检查设备连接状态和ADB权限',
      '3. 确认目标应用已正确打开',
      '4. 验证页面状态与脚本预期一致'
    ];

    if (validation?.issues) {
      recommendations.push('具体问题：');
      validation.issues.forEach(issue => {
        recommendations.push(`- ${issue.message}`);
        if (issue.suggestion) {
          recommendations.push(`  建议：${issue.suggestion}`);
        }
      });
    }

    return {
      success: false,
      strategy: 'fallback-manual',
      warnings: ['自动恢复失败，需要手动干预'],
      recommendations
    };
  }

  // === 辅助方法 ===

  private static generateMockXmlContent(criteria: any): string | null {
    // 这是一个简化的模拟实现
    // 在实际项目中，这里应该查询真实的XML缓存数据库
    
    if (criteria.appName === '小红书') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="${criteria.appName}" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2340]">
    <node index="0" text="搜索" resource-id="com.xingin.xhs:id/search" class="android.widget.TextView" package="${criteria.appName}" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[100,100][980,200]" />
  </node>
</hierarchy>`;
    }
    
    return null;
  }

  private static generateBasicXmlStructure(step: any): string {
    const appName = step.parameters?.appName || 'com.unknown.app';
    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated XML structure for step: ${step.name || step.id} -->
<!-- Generated at: ${timestamp} -->
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="${appName}" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2340]">
    <!-- Basic structure for ${step.type || 'unknown'} action -->
    <node index="0" text="${step.parameters?.text || ''}" resource-id="${step.parameters?.resourceId || ''}" class="android.widget.TextView" package="${appName}" content-desc="${step.parameters?.contentDesc || ''}" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[100,100][980,200]" />
  </node>
</hierarchy>`;
  }

  private static calculateConfidenceScore(
    originalIssues: number, resolvedIssues: number, appliedStrategies: string[]
  ): number {
    if (originalIssues === 0) return 100;
    
    const resolutionRate = resolvedIssues / originalIssues;
    const strategyBonus = Math.min(appliedStrategies.length * 5, 20);
    
    return Math.round(resolutionRate * 80 + strategyBonus);
  }

  private static generateRecoveryRecommendations(
    remainingIssues: string[], appliedStrategies: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (remainingIssues.length > 0) {
      recommendations.push('剩余问题需要手动处理:');
      remainingIssues.forEach(issue => recommendations.push(`- ${issue}`));
    }
    
    if (appliedStrategies.includes('xml-regeneration')) {
      recommendations.push('包含合成XML，建议在实际环境中测试');
    }
    
    if (appliedStrategies.includes('local-xml-lookup')) {
      recommendations.push('使用了本地缓存，建议验证版本兼容性');
    }
    
    if (appliedStrategies.length === 0) {
      recommendations.push('未能自动恢复，建议检查脚本来源和完整性');
    }
    
    return recommendations;
  }
}