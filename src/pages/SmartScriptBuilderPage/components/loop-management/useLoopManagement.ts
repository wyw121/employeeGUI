import { useState, useCallback } from "react";
import type { ExtendedSmartScriptStep, LoopConfig } from "../../../../types/loopScript";
import { LoopManager } from "./LoopManager";
import { message } from "antd";

/**
 * 循环状态管理Hook
 * 封装循环配置的状态管理和相关操作
 */
export const useLoopManagement = (
  steps: ExtendedSmartScriptStep[],
  setSteps: React.Dispatch<React.SetStateAction<ExtendedSmartScriptStep[]>>
) => {
  const [loopConfigs, setLoopConfigs] = useState<LoopConfig[]>([]);

  /**
   * 创建新循环
   */
  const handleCreateLoop = useCallback(() => {
    const { loopConfig, loopStartStep, loopEndStep } = LoopManager.createLoop(
      steps.length
    );

    // 更新状态
    setLoopConfigs((prev) => [...prev, loopConfig]);
    setSteps((prev) => [...prev, loopStartStep, loopEndStep]);

    message.success("创建循环成功！可以拖拽其他步骤到循环体内");
  }, [steps.length, setSteps]);

  /**
   * 删除循环
   */
  const handleDeleteLoop = useCallback(
    (loopId: string) => {
      LoopManager.showDeleteConfirm(loopId, () => {
        // 删除循环配置
        setLoopConfigs((prev) =>
          prev.filter((config) => config.loopId !== loopId)
        );

        // 删除循环相关步骤，重置循环体内步骤的父级关系
        const updatedSteps = LoopManager.deleteLoop(loopId, steps);
        setSteps(updatedSteps);
      });
    },
    [steps, setSteps]
  );

  /**
   * 更新循环配置
   */
  const handleUpdateLoopConfig = useCallback(
    (loopId: string, updates: Partial<LoopConfig>) => {
      const { updatedConfigs, updatedSteps } = LoopManager.updateLoopConfig(
        loopId,
        updates,
        loopConfigs,
        steps
      );

      setLoopConfigs(updatedConfigs);
      setSteps(updatedSteps);
    },
    [loopConfigs, steps, setSteps]
  );

  return {
    loopConfigs,
    setLoopConfigs,
    handleCreateLoop,
    handleDeleteLoop,
    handleUpdateLoopConfig,
  };
};