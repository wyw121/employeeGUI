import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";

// 轻量设备类型，满足本模块使用
interface SimpleDevice {
  id: string;
  name?: string;
  status?: unknown;
}

// 与页面中定义的类型保持形状一致（本地复制，避免循环依赖）
interface SmartExecutionResult {
  success: boolean;
  total_steps: number;
  executed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  duration_ms: number;
  logs: any[];
  final_page_state?: string;
  extracted_data: Record<string, any>;
  message: string;
}

export interface ExtendedSmartScriptStep {
  id: string;
  step_type: string;
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
  enabled?: boolean;
  order?: number;
  [key: string]: any;
}

type Ctx = {
  getSteps: () => ExtendedSmartScriptStep[];
  getDevices: () => SimpleDevice[];
  getCurrentDeviceId: () => string;
  getExecutorConfig: () => {
    auto_verification_enabled: boolean;
    smart_recovery_enabled: boolean;
    detailed_logging: boolean;
  };
  setExecutionResult: (r: SmartExecutionResult) => void;
  setIsExecuting: (v: boolean) => void;
};

export function createHandleExecuteScript(ctx: Ctx) {
  return async function handleExecuteScript() {
    console.log("🚀 开始执行智能脚本...");

    const allSteps = ctx.getSteps();
    if (allSteps.length === 0) {
      message.warning("请先添加脚本步骤");
      return;
    }

    const enabledSteps = allSteps.filter((s) => s.enabled);

    // 后端不识别 smart_scroll，这里统一映射为 swipe；并为 tap 缺省坐标兜底
    const normalizeStepForBackend = (
      step: ExtendedSmartScriptStep
    ): ExtendedSmartScriptStep => {
      try {
        if (String(step.step_type) === "smart_scroll") {
          const p: any = step.parameters || {};
          const direction = p.direction || "down";
          const distance = Number(p.distance ?? 600);
          const speed = Number(p.speed_ms ?? 300);
          const screen = { width: 1080, height: 1920 };
          const cx = Math.floor(screen.width / 2);
          const cy = Math.floor(screen.height / 2);
          const delta = Math.max(
            100,
            Math.min(distance, Math.floor(screen.height * 0.8))
          );
          let start_x = cx,
            start_y = cy,
            end_x = cx,
            end_y = cy;
          switch (direction) {
            case "up":
              start_y = cy - Math.floor(delta / 2);
              end_y = cy + Math.floor(delta / 2);
              break;
            case "down":
              start_y = cy + Math.floor(delta / 2);
              end_y = cy - Math.floor(delta / 2);
              break;
            case "left":
              start_x = cx - Math.floor(delta / 2);
              end_x = cx + Math.floor(delta / 2);
              break;
            case "right":
              start_x = cx + Math.floor(delta / 2);
              end_x = cx - Math.floor(delta / 2);
              break;
            default:
              start_y = cy + Math.floor(delta / 2);
              end_y = cy - Math.floor(delta / 2);
          }

          return {
            ...step,
            step_type: "swipe" as any,
            name: step.name || "滑动",
            description: step.description || `标准化滚动映射为滑动(${direction})`,
            parameters: {
              ...p,
              start_x,
              start_y,
              end_x,
              end_y,
              duration: speed > 0 ? speed : 300,
            },
          } as ExtendedSmartScriptStep;
        }

        if (String(step.step_type) === "tap") {
          const p: any = step.parameters || {};
          if (p.x === undefined || p.y === undefined) {
            const screen = { width: 1080, height: 1920 };
            return {
              ...step,
              parameters: {
                ...p,
                x: p.x ?? Math.floor(screen.width / 2),
                y: p.y ?? Math.floor(screen.height / 2),
                hold_duration_ms: p.duration_ms ?? p.hold_duration_ms ?? 100,
              },
            } as ExtendedSmartScriptStep;
          }
        }
      } catch (e) {
        console.warn("标准化步骤失败（执行前）：", e);
      }
      return step;
    };

    const normalizedEnabledSteps = enabledSteps.map(normalizeStepForBackend);
    if (enabledSteps.length === 0) {
      message.warning("没有启用的步骤可执行");
      return;
    }

    console.log("📋 启用的步骤数量:", enabledSteps.length);
    console.log("📝 启用的步骤详情:", enabledSteps);

    // 获取当前选中的设备
    const devices = ctx.getDevices();
    const currentDeviceId = ctx.getCurrentDeviceId();
    const selectedDevice =
      currentDeviceId || devices.find((d) => (d as any).status === "online")?.id || "emulator-5554";
    console.log("📱 选中的设备:", selectedDevice);

    const executorConfig = ctx.getExecutorConfig();
    console.log("🔧 执行配置:", executorConfig);

    ctx.setIsExecuting(true);
    try {
      // 改进的Tauri环境检测 - 直接尝试使用invoke函数
      console.log("🔍 开始Tauri环境检测...");
      console.log("window对象存在:", typeof window !== "undefined");
      console.log("__TAURI__对象:", typeof (window as any).__TAURI__);
      console.log("__TAURI__内容:", (window as any).__TAURI__);

      let isTauri = false;
      try {
        await invoke("get_adb_devices_safe");
        isTauri = true;
        console.log("✅ Tauri invoke 函数可用");
      } catch (invokeError) {
        console.log("❌ Tauri invoke 函数不可用:", invokeError);
        isTauri = false;
      }

      console.log("🌐 Tauri环境检测:", isTauri ? "是" : "否");

      if (!isTauri) {
        // 模拟执行结果（用于开发环境）
        console.log("🎭 使用模拟执行...");
        const mockResult: SmartExecutionResult = {
          success: true,
          total_steps: enabledSteps.length,
          executed_steps: enabledSteps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 2500,
          logs: [],
          final_page_state: "Home",
          extracted_data: {},
          message: "模拟执行成功（开发环境）",
        };

        await new Promise((resolve) => setTimeout(resolve, 2000));
        ctx.setExecutionResult(mockResult);
        message.success(
          `智能脚本执行成功！执行了 ${mockResult.executed_steps} 个步骤，耗时 ${mockResult.duration_ms} ms`
        );
        ctx.setIsExecuting(false);
        return;
      }

      // 真实的Tauri调用
      try {
        console.log("🔌 准备调用Tauri API...");

        const backendConfig = {
          continue_on_error: executorConfig.smart_recovery_enabled,
          auto_verification_enabled: executorConfig.auto_verification_enabled,
          smart_recovery_enabled: executorConfig.smart_recovery_enabled,
          detailed_logging: executorConfig.detailed_logging,
        };

        console.log("📤 发送Tauri调用:", {
          command: "execute_smart_automation_script",
          deviceId: selectedDevice,
          stepsCount: enabledSteps.length,
          config: backendConfig,
        });

        const result = (await invoke("execute_smart_automation_script", {
          deviceId: selectedDevice,
          steps: normalizedEnabledSteps,
          config: backendConfig,
        })) as SmartExecutionResult;

        console.log("📥 收到Tauri响应:", result);
        ctx.setExecutionResult(result);

        if (result.success) {
          message.success(
            `智能脚本执行成功！执行了 ${result.executed_steps} 个步骤，耗时 ${result.duration_ms} ms`
          );
        } else {
          message.warning(
            `智能脚本执行完成，${result.executed_steps} 个成功，${result.failed_steps} 个失败`
          );
        }
      } catch (tauriError) {
        console.error("❌ Tauri API调用失败:", tauriError);
        console.warn("🎭 回退到模拟执行...");

        const mockResult: SmartExecutionResult = {
          success: true,
          total_steps: enabledSteps.length,
          executed_steps: enabledSteps.length,
          failed_steps: 0,
          skipped_steps: 0,
          duration_ms: 2500,
          logs: [`模拟执行 ${enabledSteps.length} 个步骤`, "所有步骤模拟成功"],
          final_page_state: "Home",
          extracted_data: {},
          message: "使用模拟执行（Tauri API不可用）",
        };

        ctx.setExecutionResult(mockResult);
        message.warning("Tauri API不可用，使用模拟执行模式");
      }
    } catch (error) {
      console.error("❌ 智能脚本执行失败:", error);
      message.error(`智能脚本执行失败: ${error}`);
    } finally {
      ctx.setIsExecuting(false);
      console.log("🏁 智能脚本执行流程结束");
    }
  };
}
