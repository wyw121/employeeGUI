import type { MatchCriteriaDTO } from '../../domain/page-analysis/repositories/IUiMatcherRepository';
import type { SmartScriptStep, SingleStepTestResult } from '../../types/smartScript';

export const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isSmartFindElementType = (stepType?: string): boolean => {
  if (!stepType) return false;
  const norm = String(stepType).replace(/[-\s]/g, '_').toLowerCase();
  return norm === 'smart_find_element' || norm === 'smartfindelement' || norm === 'smart_find';
};

export const sanitizeCriteria = (c: MatchCriteriaDTO): MatchCriteriaDTO => {
  const fields = Array.isArray(c.fields) ? [...c.fields] : [];
  const values = { ...(c.values || {}) } as Record<string, any>;
  const includes = { ...(c.includes || {}) } as Record<string, string[]>;
  const excludes = { ...(c.excludes || {}) } as Record<string, string[]>;
  const matchMode = c.matchMode ? { ...c.matchMode } as Record<string, any> : undefined;
  const regexIncludes = c.regexIncludes ? { ...c.regexIncludes } as Record<string, string[]> : undefined;
  const regexExcludes = c.regexExcludes ? { ...c.regexExcludes } as Record<string, string[]> : undefined;

  const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  const hasArray = (arr?: any[]) => Array.isArray(arr) && arr.length > 0;

  const keep: string[] = [];
  for (const f of fields) {
    const hasValue = !isEmpty(values[f]);
    const hasIncludes = hasArray(includes[f]) || hasArray(regexIncludes?.[f]);
    const hasExcludes = hasArray(excludes[f]) || hasArray(regexExcludes?.[f]);
    if (hasValue || hasIncludes || hasExcludes) {
      keep.push(f);
    } else {
      delete (values as any)[f];
      if (includes[f] !== undefined) delete includes[f];
      if (excludes[f] !== undefined) delete excludes[f];
      if (matchMode && matchMode[f] !== undefined) delete matchMode[f];
      if (regexIncludes && regexIncludes[f] !== undefined) delete regexIncludes[f];
      if (regexExcludes && regexExcludes[f] !== undefined) delete regexExcludes[f];
    }
  }

  const sanitized: MatchCriteriaDTO = {
    strategy: c.strategy,
    fields: keep,
    values,
    includes,
    excludes,
    ...(matchMode && Object.keys(matchMode).length ? { matchMode } : {}),
    ...(regexIncludes && Object.keys(regexIncludes).length ? { regexIncludes } : {}),
    ...(regexExcludes && Object.keys(regexExcludes).length ? { regexExcludes } : {}),
  } as any;
  return sanitized;
};

export const ensureBoundsNormalized = (paramsIn: Record<string, any>) => {
  const params = { ...(paramsIn || {}) } as Record<string, any>;
  const parseBoundsString = (s: string) => {
    const bracket = /\[(\d+)\s*,\s*(\d+)\]\[(\d+)\s*,\s*(\d+)\]/;
    const plain = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/;
    let m = s.match(bracket);
    if (!m) m = s.match(plain);
    if (m) {
      const left = Number(m[1]); const top = Number(m[2]); const right = Number(m[3]); const bottom = Number(m[4]);
      return { left, top, right, bottom };
    }
    return null;
  };
  const fromAnyObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return null;
    const pick = (k: string[]) => k.find((key) => obj[key] !== undefined);
    const lk = pick(['left','l','x1']); const tk = pick(['top','t','y1']); const rk = pick(['right','r','x2']); const bk = pick(['bottom','b','y2']);
    if (lk && tk && rk && bk) {
      const left = Number(obj[lk]); const top = Number(obj[tk]); const right = Number(obj[rk]); const bottom = Number(obj[bk]);
      if ([left, top, right, bottom].every((v) => Number.isFinite(v))) return { left, top, right, bottom };
    }
    return null;
  };
  const fromArray = (arr: any) => {
    if (Array.isArray(arr) && arr.length === 4 && arr.every((v) => Number.isFinite(Number(v)))) {
      const [left, top, right, bottom] = arr.map((v) => Number(v));
      return { left, top, right, bottom };
    }
    return null;
  };
  const candidates = [
    params.bounds, params.boundsRect, params.element_bounds, params.elementBounds,
    params.element_locator?.selectedBounds, params.elementLocator?.selectedBounds,
  ];
  let rect: { left: number; top: number; right: number; bottom: number } | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string') rect = parseBoundsString(c);
    else if (Array.isArray(c)) rect = fromArray(c);
    else if (typeof c === 'object') rect = fromAnyObject(c);
    if (rect) break;
  }
  if (rect) {
    if (!params.bounds || typeof params.bounds !== 'string') {
      params.bounds = `[${rect.left},${rect.top}][${rect.right},${rect.bottom}]`;
    }
    params.boundsRect = rect;
  }
  return params;
};

// 将 smart_scroll 标准化为 swipe，并为 tap 设置默认坐标/时长
export const normalizeStepForExecution = (step: SmartScriptStep): SmartScriptStep => {
  try {
    if (String(step.step_type) === 'smart_scroll') {
      const p: any = step.parameters || {};
      const direction = p.direction || 'down';
      const distance = Number(p.distance ?? 600);
      const speed = Number(p.speed_ms ?? 300);
      const screen = { width: 1080, height: 1920 };

      const cx = Math.floor(screen.width / 2);
      const cy = Math.floor(screen.height / 2);
      const delta = Math.max(100, Math.min(distance, Math.floor(screen.height * 0.8)));
      let start_x = cx, start_y = cy, end_x = cx, end_y = cy;
      switch (direction) {
        case 'up':
          start_y = cy - Math.floor(delta / 2);
          end_y = cy + Math.floor(delta / 2);
          break;
        case 'down':
          start_y = cy + Math.floor(delta / 2);
          end_y = cy - Math.floor(delta / 2);
          break;
        case 'left':
          start_x = cx - Math.floor(delta / 2);
          end_x = cx + Math.floor(delta / 2);
          break;
        case 'right':
          start_x = cx + Math.floor(delta / 2);
          end_x = cx - Math.floor(delta / 2);
          break;
        default:
          start_y = cy + Math.floor(delta / 2);
          end_y = cy - Math.floor(delta / 2);
      }

      return {
        ...step,
        step_type: 'swipe' as any,
        name: step.name || '滑动',
        description: step.description || `标准化滚动映射为滑动(${direction})`,
        parameters: {
          ...p,
          start_x, start_y, end_x, end_y,
          duration: speed > 0 ? speed : 300,
        },
      } as SmartScriptStep;
    }

    if (String(step.step_type) === 'tap') {
      const p: any = step.parameters || {};
      if ((p.x === undefined || p.y === undefined)) {
        const screen = { width: 1080, height: 1920 };
        return {
          ...step,
          parameters: {
            ...p,
            x: p.x ?? Math.floor(screen.width / 2),
            y: p.y ?? Math.floor(screen.height / 2),
            hold_duration_ms: p.duration_ms ?? p.hold_duration_ms ?? 100,
          },
        } as SmartScriptStep;
      }
    }
  } catch (e) {
    console.warn('标准化步骤失败，按原样下发:', e);
  }
  return step;
};

export const buildBackendPayloadStep = (step: SmartScriptStep) => ({
  id: step.id,
  step_type: step.step_type,
  name: step.name,
  description: step.description ?? '',
  parameters: ensureBoundsNormalized(step.parameters ?? {}),
  enabled: true,
  order: typeof (step as any).order === 'number' ? (step as any).order : 0,
  find_condition: (step as any).find_condition,
  verification: (step as any).verification,
  retry_config: (step as any).retry_config,
  fallback_actions: (step as any).fallback_actions,
  pre_conditions: (step as any).pre_conditions,
  post_conditions: (step as any).post_conditions,
});

export const createMockResult = (step: SmartScriptStep): SingleStepTestResult => {
  const baseResult: Omit<SingleStepTestResult, 'message' | 'page_state' | 'error_details'> = {
    success: Math.random() > 0.2,
    step_id: step.id,
    step_name: step.name,
    duration_ms: Math.floor(Math.random() * 2000) + 500,
    timestamp: Date.now(),
    logs: [
      `开始执行步骤: ${step.name}`,
      `参数: ${JSON.stringify(step.parameters)}`,
      `步骤类型: ${step.step_type}`
    ] as string[],
    ui_elements: [] as any[],
    extracted_data: {}
  };

  if (baseResult.success) {
    return {
      ...baseResult,
      message: `步骤执行成功`,
      page_state: 'Ready'
    } as SingleStepTestResult;
  } else {
    return {
      ...baseResult,
      message: '模拟测试失败 - 用于开发调试',
      error_details: '这是一个模拟的测试失败，用于演示错误处理'
    } as SingleStepTestResult;
  }
};
