import { 
  DiagnosticResult, 
  DiagnosticSummary, 
  DiagnosticCategory, 
  DiagnosticStatus 
} from '../entities/DiagnosticResult';
import { IDiagnosticRepository } from '../repositories/IDiagnosticRepository';
import { DomainEvent, DiagnosticCompletedEvent } from '../events/DomainEvents';

/**
 * 诊断服务
 * 负责ADB环境的诊断、问题检测和自动修复
 */
export class DiagnosticService {
  private eventHandlers: ((event: DomainEvent) => void)[] = [];
  private lastDiagnosticResults: DiagnosticResult[] = [];

  constructor(private diagnosticRepository: IDiagnosticRepository) {}

  /**
   * 运行完整诊断
   */
  async runFullDiagnostic(): Promise<DiagnosticSummary> {
    try {
      const results = await this.diagnosticRepository.runAllDiagnostics();
      this.lastDiagnosticResults = results;
      
      const summary = DiagnosticSummary.fromResults(results);
      
      // 发送诊断完成事件
      this.publishEvent(new DiagnosticCompletedEvent(
        summary.totalChecks,
        summary.errorCount,
        summary.warningCount
      ));
      
      return summary;
    } catch (error) {
      throw new Error(`诊断执行失败: ${error}`);
    }
  }

  /**
   * 运行快速诊断（只检查关键项目）
   */
  async runQuickDiagnostic(): Promise<DiagnosticSummary> {
    try {
      const criticalChecks = [
        this.diagnosticRepository.checkAdbPath(),
        this.diagnosticRepository.checkAdbServer(),
        this.diagnosticRepository.scanDevices()
      ];
      
      const results = await Promise.all(criticalChecks);
      this.lastDiagnosticResults = results;
      
      const summary = DiagnosticSummary.fromResults(results);
      
      this.publishEvent(new DiagnosticCompletedEvent(
        summary.totalChecks,
        summary.errorCount,
        summary.warningCount
      ));
      
      return summary;
    } catch (error) {
      throw new Error(`快速诊断失败: ${error}`);
    }
  }

  /**
   * 按类别运行诊断
   */
  async runDiagnosticByCategory(category: DiagnosticCategory): Promise<DiagnosticResult[]> {
    try {
      return await this.diagnosticRepository.runDiagnosticsByCategory(category);
    } catch (error) {
      throw new Error(`类别诊断失败: ${error}`);
    }
  }

  /**
   * 运行单个诊断检查
   */
  async runSingleCheck(diagnosticId: string): Promise<DiagnosticResult> {
    try {
      return await this.diagnosticRepository.runSingleDiagnostic(diagnosticId);
    } catch (error) {
      throw new Error(`单项诊断失败: ${error}`);
    }
  }

  /**
   * 获取最后的诊断结果
   */
  getLastDiagnosticResults(): DiagnosticResult[] {
    return [...this.lastDiagnosticResults];
  }

  /**
   * 获取最后的诊断摘要
   */
  getLastDiagnosticSummary(): DiagnosticSummary | null {
    if (this.lastDiagnosticResults.length === 0) {
      return null;
    }
    return DiagnosticSummary.fromResults(this.lastDiagnosticResults);
  }

  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.lastDiagnosticResults.some(result => result.isError());
  }

  /**
   * 检查是否有警告
   */
  hasWarnings(): boolean {
    return this.lastDiagnosticResults.some(result => result.status === DiagnosticStatus.WARNING);
  }

  /**
   * 获取可自动修复的问题
   */
  getAutoFixableIssues(): DiagnosticResult[] {
    return this.lastDiagnosticResults.filter(result => result.isAutoFixable());
  }

  /**
   * 执行单个自动修复
   */
  async executeAutoFix(diagnosticId: string): Promise<boolean> {
    try {
      const success = await this.diagnosticRepository.executeAutoFix(diagnosticId);
      
      if (success) {
        // 重新运行该诊断项目以确认修复
        const updatedResult = await this.runSingleCheck(diagnosticId);
        
        // 更新本地结果
        const index = this.lastDiagnosticResults.findIndex(r => r.id === diagnosticId);
        if (index > -1) {
          this.lastDiagnosticResults[index] = updatedResult;
        }
      }
      
      return success;
    } catch (error) {
      console.error(`Auto fix failed for ${diagnosticId}:`, error);
      return false;
    }
  }

  /**
   * 批量自动修复
   */
  async executeBatchAutoFix(): Promise<{
    total: number;
    success: number;
    failed: { diagnosticId: string; error?: string }[];
  }> {
    const autoFixableIssues = this.getAutoFixableIssues();
    const results = {
      total: autoFixableIssues.length,
      success: 0,
      failed: [] as { diagnosticId: string; error?: string }[]
    };

    for (const issue of autoFixableIssues) {
      try {
        const success = await this.executeAutoFix(issue.id);
        if (success) {
          results.success++;
        } else {
          results.failed.push({ diagnosticId: issue.id });
        }
      } catch (error) {
        results.failed.push({
          diagnosticId: issue.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * 获取修复建议
   */
  async getFixSuggestions(diagnosticResult: DiagnosticResult): Promise<string[]> {
    try {
      return await this.diagnosticRepository.getFixSuggestions(diagnosticResult);
    } catch (error) {
      console.error('Failed to get fix suggestions:', error);
      return diagnosticResult.suggestion ? [diagnosticResult.suggestion] : [];
    }
  }

  /**
   * 获取所有问题的修复建议
   */
  async getAllFixSuggestions(): Promise<Map<string, string[]>> {
    const suggestions = new Map<string, string[]>();
    const problemResults = this.lastDiagnosticResults.filter(r => 
      r.status === DiagnosticStatus.ERROR || r.status === DiagnosticStatus.WARNING
    );

    for (const result of problemResults) {
      try {
        const resultSuggestions = await this.getFixSuggestions(result);
        suggestions.set(result.id, resultSuggestions);
      } catch (error) {
        console.error(`Failed to get suggestions for ${result.id}:`, error);
        suggestions.set(result.id, []);
      }
    }

    return suggestions;
  }

  /**
   * 生成诊断报告
   */
  generateDiagnosticReport(): {
    summary: DiagnosticSummary | null;
    results: DiagnosticResult[];
    autoFixableCount: number;
    healthPercentage: number;
    recommendations: string[];
  } {
    const summary = this.getLastDiagnosticSummary();
    const autoFixableIssues = this.getAutoFixableIssues();
    
    const recommendations: string[] = [];
    
    if (this.hasErrors()) {
      recommendations.push('检测到严重问题，建议立即处理');
      if (autoFixableIssues.length > 0) {
        recommendations.push('部分问题支持自动修复，可以尝试一键修复');
      }
    } else if (this.hasWarnings()) {
      recommendations.push('检测到一些警告，建议关注');
    } else {
      recommendations.push('ADB环境运行良好');
    }

    return {
      summary,
      results: this.getLastDiagnosticResults(),
      autoFixableCount: autoFixableIssues.length,
      healthPercentage: summary?.getHealthPercentage() || 0,
      recommendations
    };
  }

  /**
   * 定期健康检查
   */
  async scheduleHealthCheck(intervalMs: number = 300000): Promise<() => void> { // 5分钟
    let isRunning = true;
    
    const checkHealth = async () => {
      if (!isRunning) return;
      
      try {
        await this.runQuickDiagnostic();
      } catch (error) {
        console.error('Scheduled health check failed:', error);
      }
      
      if (isRunning) {
        setTimeout(checkHealth, intervalMs);
      }
    };
    
    // 启动第一次检查
    setTimeout(checkHealth, intervalMs);
    
    // 返回停止函数
    return () => {
      isRunning = false;
    };
  }

  /**
   * 添加事件处理器
   */
  addEventHandler(handler: (event: DomainEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 移除事件处理器
   */
  removeEventHandler(handler: (event: DomainEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * 发布领域事件
   */
  private publishEvent(event: DomainEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }
}