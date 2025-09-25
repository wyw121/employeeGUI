import { useCallback } from "react";
import { message } from "antd";
import { invoke } from "@tauri-apps/api/core";
import { ScriptSerializer } from "../../../modules/smart-script-management/utils/serializer";
import type { ExtendedSmartScriptStep as LoopScriptStep } from "../../../types/loopScript";
import type { ExecutorConfig } from "../../../types/execution";

interface UseScriptPersistenceDeps {
  steps: LoopScriptStep[];
  setSteps: React.Dispatch<React.SetStateAction<LoopScriptStep[]>>;
  executorConfig: ExecutorConfig;
  setExecutorConfig: React.Dispatch<React.SetStateAction<ExecutorConfig>>;
  defaultAuthor?: string;
  defaultCategory?: string;
}

export function useScriptPersistence({
  steps,
  setSteps,
  executorConfig,
  setExecutorConfig,
  defaultAuthor = "用户",
  defaultCategory = "通用",
}: UseScriptPersistenceDeps) {
  const handleSaveScript = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const scriptData = {
        name: `智能脚本_${now}`,
  description: `包含 ${steps.length} 个步骤的自动化脚本`,
  version: "2.0.0",
        created_at: now,
        updated_at: now,
        author: defaultAuthor,
        category: defaultCategory,
        tags: ["智能脚本", "自动化"],
        steps: steps.map((step, index) => ({
          id: step.id || `step_${index + 1}`,
          step_type: step.step_type,
          name: step.name || step.description,
          description: step.description,
          parameters: step.parameters || {},
          enabled: step.enabled !== false,
          order: index,
        })),
        config: {
          continue_on_error: executorConfig.smart_recovery_enabled,
          auto_verification_enabled: executorConfig.auto_verification_enabled,
          smart_recovery_enabled: executorConfig.smart_recovery_enabled,
          detailed_logging: executorConfig.detailed_logging,
        },
        metadata: {},
      } as const;

      const savedScriptId = await invoke("save_smart_script", {
        script: scriptData,
      });

      message.success(`脚本保存成功！ID: ${savedScriptId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      message.error(`保存脚本失败: ${errMsg}`);
    }
  }, [steps, executorConfig, defaultAuthor, defaultCategory]);

  const handleExportScript = useCallback(() => {
    try {
      const payload = ScriptSerializer.serializeScript(
        `智能脚本_${new Date().toLocaleString()}`,
        `包含 ${steps.length} 个步骤的自动化脚本`,
        steps,
        executorConfig,
        {}
      );
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smart-script-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success("脚本导出成功（已下载 JSON 文件）。");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      message.error(`脚本导出失败: ${errMsg}`);
    }
  }, [steps, executorConfig]);

  const handleLoadScript = useCallback((loadedScript: any) => {
    try {
      const { steps: deserializedSteps, config } =
        ScriptSerializer.deserializeScript(loadedScript);

      // 一次性迁移：将旧版步骤参数映射为 parameters.matching 标准结构
      const migratedSteps = (deserializedSteps || []).map((s) => {
        const p = s.parameters || {};
        const hasMatching = !!p.matching && Array.isArray(p.matching.fields);
        if (hasMatching) return s; // 已是新结构

        // 收集可能的旧字段
        const candidateFields = [
          'resource-id','text','content-desc','class','package','bounds','index'
        ].filter((k) => p[k] != null && String(p[k]).trim() !== '');

        if (candidateFields.length === 0) return s; // 无可迁移信息

        const values: Record<string,string> = {};
        for (const f of candidateFields) values[f] = String(p[f]);

        // 推断策略：存在有效位置约束→absolute，否则 standard
        const hasBounds = candidateFields.includes('bounds') && String(p.bounds || '').trim() !== '';
        const hasIndex = candidateFields.includes('index') && String(p.index || '').trim() !== '';
        const strategy = (hasBounds || hasIndex) ? 'absolute' : 'standard';

        const next = {
          ...s,
          parameters: {
            ...p,
            matching: {
              strategy,
              fields: candidateFields,
              values,
            },
          }
        };
        return next;
      });

      setSteps(migratedSteps);
      setExecutorConfig((prev) => ({ ...prev, ...config }));
      message.success(`已成功加载脚本: ${loadedScript.name || "未命名脚本"}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      message.error(`脚本加载失败: ${errMsg}`);
    }
  }, [setSteps, setExecutorConfig]);

  const handleLoadScriptFromFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        handleLoadScript(parsed);
        message.success(`已从文件加载脚本：${file.name}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        message.error(`加载脚本失败: ${errMsg}`);
      } finally {
        input.value = "";
      }
    };
    input.click();
  }, [handleLoadScript]);

  return {
    handleSaveScript,
    handleExportScript,
    handleLoadScript,
    handleLoadScriptFromFile,
  };
}

export default useScriptPersistence;
