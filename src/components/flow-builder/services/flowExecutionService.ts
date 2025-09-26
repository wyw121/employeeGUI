import { invoke } from '@tauri-apps/api/core';
import { convertFlowStepToScriptType, getAppFromStepId } from '../../universal-ui/script-builder/utils/flowHelpers';
import { FlowBuilderStep } from '../../universal-ui/script-builder/services/flowTemplates';

export interface ExecutionResult {
  success: boolean;
  raw: unknown;
  error?: string;
}

export async function executeFlowSteps(deviceId: string, steps: FlowBuilderStep[]): Promise<ExecutionResult> {
  const scriptSteps = steps.map(step => ({
    type: convertFlowStepToScriptType(step.templateId),
    name: `步骤 ${step.id}`,
    parameters: {
      app: getAppFromStepId(step.templateId),
      action: step.templateId,
      ...step.parameters
    }
  }));
  try {
    const result = await invoke('execute_automation_script', { deviceId, steps: scriptSteps });
    return { success: true, raw: result };
  } catch (e: any) {
    return { success: false, raw: null, error: String(e) };
  }
}
