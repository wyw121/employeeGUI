import { ExtendedSmartScriptStep } from '../../../types/loopScript';

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export interface TapOverrides {
  x?: number;
  y?: number;
  duration_ms?: number; // 用于长按
}

export function createTapStepTemplate(overrides?: TapOverrides): ExtendedSmartScriptStep {
  const params: Record<string, any> = {
    position: 'center',
    ...(overrides?.x !== undefined && overrides?.y !== undefined ? { x: overrides.x, y: overrides.y, position: 'absolute' } : {}),
    ...(overrides?.duration_ms ? { duration_ms: overrides.duration_ms } : {}),
  };

  return {
    id: genId('step_tap'),
    step_type: 'tap',
    name: '屏幕交互 - 轻点',
    description: overrides?.duration_ms ? '长按屏幕' : (overrides?.x !== undefined ? `轻点坐标 (${overrides.x}, ${overrides.y})` : '轻点屏幕中心'),
    parameters: params,
    enabled: true,
    order: 0,
    find_condition: null,
    verification: null,
    retry_config: null,
    fallback_actions: [],
    pre_conditions: [],
    post_conditions: [],
    parent_loop_id: undefined,
    is_in_loop: false,
  };
}

export function createTapStepsBatch(times = 3, overrides?: TapOverrides): ExtendedSmartScriptStep[] {
  const n = Math.max(1, Math.floor(times));
  const list: ExtendedSmartScriptStep[] = [];
  for (let i = 0; i < n; i++) {
    list.push(createTapStepTemplate(overrides));
  }
  return list;
}

export const TapActionTemplates = {
  tapCenter: () => createTapStepTemplate(),
  tapAt: (x: number, y: number) => createTapStepTemplate({ x, y }),
  longPressCenter: (duration_ms = 800) => createTapStepTemplate({ duration_ms }),
};
