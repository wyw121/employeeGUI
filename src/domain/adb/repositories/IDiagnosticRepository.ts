import { DiagnosticResult, DiagnosticCategory } from '../entities/DiagnosticResult';

/**
 * 诊断仓储接口
 * 定义诊断数据访问的抽象契约
 */
export interface IDiagnosticRepository {
  /**
   * 运行所有诊断检查
   */
  runAllDiagnostics(): Promise<DiagnosticResult[]>;

  /**
   * 运行特定类别的诊断
   */
  runDiagnosticsByCategory(category: DiagnosticCategory): Promise<DiagnosticResult[]>;

  /**
   * 运行单个诊断检查
   */
  runSingleDiagnostic(diagnosticId: string): Promise<DiagnosticResult>;

  /**
   * 检查ADB路径
   */
  checkAdbPath(): Promise<DiagnosticResult>;

  /**
   * 检查ADB服务器状态
   */
  checkAdbServer(): Promise<DiagnosticResult>;

  /**
   * 扫描设备
   */
  scanDevices(): Promise<DiagnosticResult>;

  /**
   * 检查USB调试权限
   */
  checkUsbDebugging(): Promise<DiagnosticResult>;

  /**
   * 检查驱动程序
   */
  checkDrivers(): Promise<DiagnosticResult>;

  /**
   * 执行自动修复
   */
  executeAutoFix(diagnosticId: string): Promise<boolean>;

  /**
   * 获取修复建议
   */
  getFixSuggestions(diagnosticResult: DiagnosticResult): Promise<string[]>;
}