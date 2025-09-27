import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ISmartScriptRepository } from "../../domain/smart-script/repositories/ISmartScriptRepository";
import type { SmartExecutionResult } from "../../types/execution";
import type { ExtendedSmartScriptStep } from "../../types/loopScript";

export class TauriSmartScriptRepository implements ISmartScriptRepository {
  async executeOnDevice(
    deviceId: string,
    steps: ExtendedSmartScriptStep[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ): Promise<SmartExecutionResult> {
    if (!isTauri()) {
      // 浏览器环境下返回模拟结果
      return {
        success: true,
        total_steps: steps.length,
        executed_steps: steps.length,
        failed_steps: 0,
        skipped_steps: 0,
        duration_ms: 1200,
        logs: ["模拟执行（非Tauri环境）"],
        final_page_state: undefined,
        extracted_data: {},
        message: "模拟执行成功",
      };
    }

    const backendConfig = {
      continue_on_error: !!config?.continue_on_error,
      auto_verification_enabled: !!config?.auto_verification_enabled,
      smart_recovery_enabled: !!config?.smart_recovery_enabled,
      detailed_logging: !!config?.detailed_logging,
    };

    const result = await invoke<SmartExecutionResult>("execute_smart_automation_script", {
      deviceId,
      steps,
      config: backendConfig,
    });
    return result;
  }

  async executeOnDevices(
    deviceIds: string[],
    steps: ExtendedSmartScriptStep[],
    config?: Partial<{
      continue_on_error: boolean;
      auto_verification_enabled: boolean;
      smart_recovery_enabled: boolean;
      detailed_logging: boolean;
    }>
  ): Promise<Record<string, SmartExecutionResult>> {
    if (!isTauri()) {
      // 浏览器环境下返回模拟 map
      const mock: Record<string, SmartExecutionResult> = {};
      for (const id of deviceIds) {
        mock[id] = {
          success: true,
          total_steps: steps.length,
          executed_steps: steps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 1200,
          logs: ["模拟执行（非Tauri环境）"],
          final_page_state: undefined,
          extracted_data: {},
          message: `模拟执行成功 (${id})`,
        };
      }
      return mock;
    }

    const backendConfig = {
      continue_on_error: !!config?.continue_on_error,
      auto_verification_enabled: !!config?.auto_verification_enabled,
      smart_recovery_enabled: !!config?.smart_recovery_enabled,
      detailed_logging: !!config?.detailed_logging,
    };

    const result = await invoke<Record<string, SmartExecutionResult>>("execute_smart_automation_script_multi", {
      deviceIds,
      steps,
      config: backendConfig,
    });
    return result;
  }
}

export default TauriSmartScriptRepository;
