import type { SmartExecutionResult } from "../../../types/execution";
import type { ExtendedSmartScriptStep } from "../../../types/loopScript";

/**
 * 智能脚本执行仓储接口
 * - 提供单设备与多设备整脚本执行能力
 */
export interface ISmartScriptRepository {
  /**
   * 在单台设备上执行整套脚本
   */
  executeOnDevice(
    deviceId: string,
    steps: ExtendedSmartScriptStep[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ): Promise<SmartExecutionResult>;

  /**
   * 在多台设备上执行整套脚本（顺序或并发由后端决定，这里仅为接口）
   * 返回 Map: deviceId -> 执行结果
   */
  executeOnDevices(
    deviceIds: string[],
    steps: ExtendedSmartScriptStep[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ): Promise<Record<string, SmartExecutionResult>>;
}

export default ISmartScriptRepository;
