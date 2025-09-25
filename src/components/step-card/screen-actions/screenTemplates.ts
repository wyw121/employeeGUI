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
  /**
   * 全面屏返回手势（左边缘 → 右滑）
   * 说明：采用“swipe + smart_scroll-like 参数（direction）”的方式，由后端标准化为基于真实分辨率的坐标；
   * - direction: 'right' 表示整体朝右滑动
   * - from_edge: true & edge: 'left' 提示后端按边缘起点生成坐标（3% → 45%）
   */
  backGestureFromLeft: (): ExtendedSmartScriptStep => ({
    id: genId('step_swipe_edge_left'),
    step_type: 'swipe' as any,
    name: '全面屏返回（左边缘）',
    description: '从左边缘向右滑（系统返回手势）',
    parameters: {
      direction: 'right',
      from_edge: true,
      edge: 'left',
      y_percent: 50,
      // 可选：distance_percent 决定终点占比（默认 45）
      // distance_percent: 42,
      duration: 260,
    },
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
  }),
  /**
   * 全面屏返回手势（右边缘 → 左滑）
   */
  backGestureFromRight: (): ExtendedSmartScriptStep => ({
    id: genId('step_swipe_edge_right'),
    step_type: 'swipe' as any,
    name: '全面屏返回（右边缘）',
    description: '从右边缘向左滑（系统返回手势）',
    parameters: {
      direction: 'left',
      from_edge: true,
      edge: 'right',
      y_percent: 50,
      // distance_percent: 40,
      duration: 260,
    },
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
  }),
  // 根据弹窗配置生成边缘返回手势
  createEdgeBackFromConfig: (cfg: { edge: 'left' | 'right'; y_percent?: number; distance_percent?: number; duration?: number }): ExtendedSmartScriptStep => {
    const isLeft = cfg.edge === 'left';
    const direction = isLeft ? 'right' : 'left';
    const y_percent = Math.max(0, Math.min(100, Math.round(cfg.y_percent ?? 50)));
    const distance_percent = Math.max(5, Math.min(95, Math.round(cfg.distance_percent ?? 45)));
    const duration = Math.max(120, Math.min(1200, Math.round(cfg.duration ?? 260)));
    return {
      id: genId('step_swipe_edge_cfg'),
      step_type: 'swipe' as any,
      name: `全面屏返回（${isLeft ? '左' : '右'}边缘）`,
      description: `${isLeft ? '左' : '右'}边缘→${isLeft ? '右' : '左'}滑（自定义）`,
      parameters: {
        direction,
        from_edge: true,
        edge: cfg.edge,
        y_percent,
        distance_percent,
        duration,
      },
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
  },
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
