import { message, Modal } from "antd";
import type { ExtendedSmartScriptStep, LoopConfig } from "../../../../types/loopScript";
import { SmartActionType } from "../../../../types/smartComponents";

/**
 * 循环管理器 - 处理循环创建、删除、更新等核心逻辑
 * 
 * 功能包括：
 * - 创建新循环（生成循环开始和结束步骤）
 * - 删除循环（清理相关步骤和配置）
 * - 更新循环配置（同步步骤参数）
 */
export class LoopManager {
  /**
   * 创建新循环
   * @param currentStepsLength 当前步骤总数，用于计算order
   * @returns 包含循环配置和步骤的对象
   */
  static createLoop(currentStepsLength: number): {
    loopConfig: LoopConfig;
    loopStartStep: ExtendedSmartScriptStep;
    loopEndStep: ExtendedSmartScriptStep;
  } {
    const loopId = `loop_${Date.now()}`;
    const startStepId = `step_${Date.now()}_start`;
    const endStepId = `step_${Date.now()}_end`;

    // 创建循环配置
    const loopConfig: LoopConfig = {
      loopId,
      name: "新循环",
      iterations: 3,
      enabled: true,
      description: "智能循环",
    };

    // 创建循环开始步骤
    const loopStartStep: ExtendedSmartScriptStep = {
      id: startStepId,
      step_type: SmartActionType.LOOP_START,
      name: "循环开始",
      description: `开始执行 ${loopConfig.name}`,
      parameters: {
        loop_id: loopId,
        loop_name: loopConfig.name,
        loop_count: loopConfig.iterations,
        is_infinite_loop: false, // 初始化为非无限循环
      },
      enabled: true,
      order: currentStepsLength + 1,
      find_condition: null,
      verification: null,
      retry_config: null,
      fallback_actions: [],
      pre_conditions: [],
      post_conditions: [],
    };

    // 创建循环结束步骤
    const loopEndStep: ExtendedSmartScriptStep = {
      id: endStepId,
      step_type: SmartActionType.LOOP_END,
      name: "循环结束",
      description: `结束执行 ${loopConfig.name}`,
      parameters: {
        loop_id: loopId,
        loop_name: loopConfig.name,
        loop_count: loopConfig.iterations, // 确保循环结束步骤也有相同的循环次数
        is_infinite_loop: false, // 初始化为非无限循环
      },
      enabled: true,
      order: currentStepsLength + 2,
      find_condition: null,
      verification: null,
      retry_config: null,
      fallback_actions: [],
      pre_conditions: [],
      post_conditions: [],
    };

    return {
      loopConfig,
      loopStartStep,
      loopEndStep,
    };
  }

  /**
   * 删除循环的处理逻辑
   * @param loopId 要删除的循环ID
   * @param steps 当前步骤列表
   * @returns 更新后的步骤列表
   */
  static deleteLoop(
    loopId: string,
    steps: ExtendedSmartScriptStep[]
  ): ExtendedSmartScriptStep[] {
    const updatedSteps = steps
      .filter((step) => {
        // 删除循环开始和结束步骤
        if (
          (step.step_type === SmartActionType.LOOP_START ||
            step.step_type === SmartActionType.LOOP_END) &&
          step.parameters?.loop_id === loopId
        ) {
          return false;
        }
        return true;
      })
      .map((step) => {
        // 重置循环体内步骤的父级关系
        if (step.parent_loop_id === loopId) {
          return { ...step, parent_loop_id: undefined };
        }
        return step;
      });

    // 重新计算步骤顺序
    return updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
  }

  /**
   * 更新循环配置
   * @param loopId 循环ID
   * @param updates 要更新的配置项
   * @param loopConfigs 当前循环配置列表
   * @param steps 当前步骤列表
   * @returns 更新后的配置和步骤
   */
  static updateLoopConfig(
    loopId: string,
    updates: Partial<LoopConfig>,
    loopConfigs: LoopConfig[],
    steps: ExtendedSmartScriptStep[]
  ): {
    updatedConfigs: LoopConfig[];
    updatedSteps: ExtendedSmartScriptStep[];
  } {
    // 更新循环配置
    const updatedConfigs = loopConfigs.map((config) =>
      config.loopId === loopId ? { ...config, ...updates } : config
    );

    // 同步更新相关步骤的参数
    const updatedSteps = steps.map((step) => {
      if (
        (step.step_type === SmartActionType.LOOP_START ||
          step.step_type === SmartActionType.LOOP_END) &&
        step.parameters?.loop_id === loopId
      ) {
        return {
          ...step,
          name:
            step.step_type === SmartActionType.LOOP_START
              ? `循环开始 - ${updates.name || step.name}`
              : step.name,
          description:
            step.step_type === SmartActionType.LOOP_START
              ? `开始执行 ${updates.name || "循环"}`
              : step.description,
          parameters: {
            ...step.parameters,
            loop_name: updates.name || step.parameters?.loop_name,
            loop_count: updates.iterations || step.parameters?.loop_count,
          },
        };
      }
      return step;
    });

    return {
      updatedConfigs,
      updatedSteps,
    };
  }

  /**
   * 显示删除循环确认对话框
   * @param loopId 要删除的循环ID
   * @param onConfirm 确认删除后的回调函数
   */
  static showDeleteConfirm(loopId: string, onConfirm: () => void): void {
    Modal.confirm({
      title: "确认删除循环",
      content:
        "确定要删除整个循环吗？这将删除循环开始和结束标记，循环内的步骤会保留。",
      onOk: () => {
        onConfirm();
        message.success("循环删除成功");
      },
    });
  }
}