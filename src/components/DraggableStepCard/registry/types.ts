import type { ReactNode } from 'react';

export interface SmartScriptStepLike {
  id: string;
  step_type: string;
  parameters: any;
  name?: string;
}

export interface StepUIContext {
  devices: any[];
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
}

export interface StepUIExtension {
  renderHeaderExtras?: (step: SmartScriptStepLike, ctx: StepUIContext) => ReactNode;
  renderBodyExtras?: (step: SmartScriptStepLike, ctx: StepUIContext) => ReactNode;
  renderTag?: (step: SmartScriptStepLike) => ReactNode;
  renderSummary?: (step: SmartScriptStepLike) => ReactNode;
}

export interface StepMeta {
  icon: string;
  name: string;
  color: string;
  category: string;
}
