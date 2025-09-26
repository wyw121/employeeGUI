import { FlowBuilderStep, FlowTemplate } from '../../universal-ui/script-builder/services/flowTemplates';

export interface SavedFlowRecord {
  id: string;
  name: string;
  template: string | undefined;
  steps: FlowBuilderStep[];
  createdAt: string;
}

const STORAGE_KEY = 'savedFlows';

export function loadSavedFlows(): SavedFlowRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function persistFlow(name: string, template: FlowTemplate | null, steps: FlowBuilderStep[]): SavedFlowRecord {
  const saved = loadSavedFlows();
  const record: SavedFlowRecord = {
    id: `flow_${Date.now()}`,
    name,
    template: template?.name,
    steps,
    createdAt: new Date().toISOString()
  };
  saved.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return record;
}
