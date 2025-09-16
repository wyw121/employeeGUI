/**
 * 诊断结果实体
 * 表示ADB环境诊断的结果
 */
export class DiagnosticResult {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly status: DiagnosticStatus,
    public readonly message: string,
    public readonly details?: string,
    public readonly suggestion?: string,
    public readonly canAutoFix: boolean = false,
    public readonly autoFixAction?: () => Promise<boolean>,
    public readonly timestamp: Date = new Date(),
    public readonly category: DiagnosticCategory = DiagnosticCategory.GENERAL
  ) {}

  /**
   * 创建成功的诊断结果
   */
  static success(id: string, name: string, message: string): DiagnosticResult {
    return new DiagnosticResult(id, name, DiagnosticStatus.SUCCESS, message);
  }

  /**
   * 创建警告的诊断结果
   */
  static warning(
    id: string,
    name: string,
    message: string,
    suggestion?: string
  ): DiagnosticResult {
    return new DiagnosticResult(
      id,
      name,
      DiagnosticStatus.WARNING,
      message,
      undefined,
      suggestion
    );
  }

  /**
   * 创建错误的诊断结果
   */
  static error(
    id: string,
    name: string,
    message: string,
    details?: string,
    suggestion?: string,
    canAutoFix: boolean = false,
    autoFixAction?: () => Promise<boolean>
  ): DiagnosticResult {
    return new DiagnosticResult(
      id,
      name,
      DiagnosticStatus.ERROR,
      message,
      details,
      suggestion,
      canAutoFix,
      autoFixAction
    );
  }

  /**
   * 检查是否为错误状态
   */
  isError(): boolean {
    return this.status === DiagnosticStatus.ERROR;
  }

  /**
   * 检查是否可以自动修复
   */
  isAutoFixable(): boolean {
    return this.canAutoFix && this.autoFixAction !== undefined;
  }

  /**
   * 执行自动修复
   */
  async executeAutoFix(): Promise<boolean> {
    if (!this.isAutoFixable()) {
      throw new Error(`诊断项 ${this.name} 不支持自动修复`);
    }
    return await this.autoFixAction!();
  }

  /**
   * 创建诊断结果副本并更新状态
   */
  withStatus(status: DiagnosticStatus, message?: string): DiagnosticResult {
    return new DiagnosticResult(
      this.id,
      this.name,
      status,
      message || this.message,
      this.details,
      this.suggestion,
      this.canAutoFix,
      this.autoFixAction,
      new Date(),
      this.category
    );
  }
}

/**
 * 诊断状态枚举
 */
export enum DiagnosticStatus {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  RUNNING = 'running'
}

/**
 * 诊断类别枚举
 */
export enum DiagnosticCategory {
  GENERAL = 'general',
  PATH_DETECTION = 'path_detection',
  DEVICE_CONNECTION = 'device_connection',
  SERVER_STATUS = 'server_status',
  PERMISSIONS = 'permissions'
}

/**
 * 诊断摘要值对象
 */
export class DiagnosticSummary {
  constructor(
    public readonly totalChecks: number,
    public readonly successCount: number,
    public readonly warningCount: number,
    public readonly errorCount: number,
    public readonly autoFixableCount: number,
    public readonly lastRun: Date = new Date()
  ) {}

  /**
   * 从诊断结果列表创建摘要
   */
  static fromResults(results: DiagnosticResult[]): DiagnosticSummary {
    const totalChecks = results.length;
    const successCount = results.filter(r => r.status === DiagnosticStatus.SUCCESS).length;
    const warningCount = results.filter(r => r.status === DiagnosticStatus.WARNING).length;
    const errorCount = results.filter(r => r.status === DiagnosticStatus.ERROR).length;
    const autoFixableCount = results.filter(r => r.isAutoFixable()).length;

    return new DiagnosticSummary(
      totalChecks,
      successCount,
      warningCount,
      errorCount,
      autoFixableCount
    );
  }

  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.errorCount > 0;
  }

  /**
   * 检查是否有警告
   */
  hasWarnings(): boolean {
    return this.warningCount > 0;
  }

  /**
   * 检查是否健康（无错误和警告）
   */
  isHealthy(): boolean {
    return !this.hasErrors() && !this.hasWarnings();
  }

  /**
   * 获取健康度百分比
   */
  getHealthPercentage(): number {
    if (this.totalChecks === 0) return 100;
    return Math.round((this.successCount / this.totalChecks) * 100);
  }
}

