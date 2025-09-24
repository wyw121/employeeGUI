import { ExtendedSmartScriptStep } from '../../../types/loopScript';

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export function createScrollStepTemplate(direction: ScrollDirection, overrides?: Record<string, any>): ExtendedSmartScriptStep {
  const dirNameMap: Record<ScrollDirection, string> = {
    up: '向上',
    down: '向下',
    left: '向左',
    right: '向右',
  };

  const params = {
    direction,
    distance: 600,
    speed_ms: 300,
    ...(overrides || {}),
  } as Record<string, any>;

  return {
    id: genId('step_scroll'),
    step_type: 'smart_scroll',
    name: `屏幕交互 - 智能滚动`,
    description: `${dirNameMap[direction]}滚动屏幕（可在卡片中调整方向/距离/速度）`,
    parameters: params,
    enabled: true,
    order: 0, // 由上层页面统一赋值
    find_condition: null,
    verification: null,
    retry_config: null,
    fallback_actions: [],
    pre_conditions: [],
    post_conditions: [],
    // 循环相关字段默认空
    parent_loop_id: undefined,
    is_in_loop: false,
  };
}

export const ScreenActionTemplates = {
  scrollUp: () => createScrollStepTemplate('up'),
  scrollDown: () => createScrollStepTemplate('down'),
  scrollLeft: () => createScrollStepTemplate('left'),
  scrollRight: () => createScrollStepTemplate('right'),
};

export default ScreenActionTemplates;

// 批量滚动模板（例如连续滚动3次向下）
export function createScrollStepsBatch(direction: ScrollDirection, times = 3, overrides?: Record<string, any>): ExtendedSmartScriptStep[] {
  const n = Math.max(1, Math.floor(times));
  const list: ExtendedSmartScriptStep[] = [];
  for (let i = 0; i < n; i++) {
    list.push(createScrollStepTemplate(direction, overrides));
  }
  return list;
}
