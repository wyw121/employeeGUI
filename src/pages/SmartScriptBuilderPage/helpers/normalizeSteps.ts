import type { ExtendedSmartScriptStep } from "../../../types/loopScript";

// 统一：将 smart_scroll 标准化为 swipe；为 tap 缺省坐标/按压时长兜底
export function normalizeStepForBackend(step: ExtendedSmartScriptStep): ExtendedSmartScriptStep {
  try {
    if (String(step.step_type) === "smart_scroll") {
      const p: any = step.parameters || {};
      const direction = p.direction || "down";
      const distance = Number(p.distance ?? 600);
      const speed = Number(p.speed_ms ?? 300);
      const screen = { width: 1080, height: 1920 };
      const cx = Math.floor(screen.width / 2);
      const cy = Math.floor(screen.height / 2);
      const delta = Math.max(100, Math.min(distance, Math.floor(screen.height * 0.8)));
      let start_x = cx, start_y = cy, end_x = cx, end_y = cy;
      switch (direction) {
        case "up":
          start_y = cy - Math.floor(delta / 2);
          end_y = cy + Math.floor(delta / 2);
          break;
        case "down":
          start_y = cy + Math.floor(delta / 2);
          end_y = cy - Math.floor(delta / 2);
          break;
        case "left":
          start_x = cx - Math.floor(delta / 2);
          end_x = cx + Math.floor(delta / 2);
          break;
        case "right":
          start_x = cx + Math.floor(delta / 2);
          end_x = cx - Math.floor(delta / 2);
          break;
        default:
          start_y = cy + Math.floor(delta / 2);
          end_y = cy - Math.floor(delta / 2);
      }
      return {
        ...step,
        step_type: "swipe" as any,
        name: step.name || "滑动",
        description: step.description || `标准化滚动映射为滑动(${direction})`,
        parameters: {
          ...p,
          start_x, start_y, end_x, end_y,
          duration: speed > 0 ? speed : 300,
        },
      } as ExtendedSmartScriptStep;
    }

    if (String(step.step_type) === "tap") {
      const p: any = step.parameters || {};
      if (p.x === undefined || p.y === undefined) {
        const screen = { width: 1080, height: 1920 };
        return {
          ...step,
          parameters: {
            ...p,
            x: p.x ?? Math.floor(screen.width / 2),
            y: p.y ?? Math.floor(screen.height / 2),
            hold_duration_ms: p.duration_ms ?? p.hold_duration_ms ?? 100,
          },
        } as ExtendedSmartScriptStep;
      }
    }
  } catch (e) {
    console.warn("标准化步骤失败：", e);
  }
  return step;
}

// 展开 inline 循环（parameters.inline_loop_count）
export function expandInlineLoops(steps: ExtendedSmartScriptStep[]): ExtendedSmartScriptStep[] {
  const expanded: ExtendedSmartScriptStep[] = [];
  for (const s of steps) {
    const countRaw = (s.parameters as any)?.inline_loop_count;
    const count = Math.max(1, Math.min(50, Number(countRaw ?? 1)));
    if (count <= 1) {
      expanded.push(s);
    } else {
      for (let i = 0; i < count; i++) {
        expanded.push({ ...s }); // 浅拷贝，避免共享引用
      }
    }
  }
  return expanded;
}

// 一站式：过滤启用步骤 → 标准化 → 展开循环
export function normalizeScriptStepsForBackend(allSteps: ExtendedSmartScriptStep[]): ExtendedSmartScriptStep[] {
  const enabled = (allSteps || []).filter((s) => s.enabled);
  const normalized = enabled.map(normalizeStepForBackend);
  return expandInlineLoops(normalized);
}
