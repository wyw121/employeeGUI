export interface RangeCfg { idStart?: number; idEnd?: number }
export interface RangeConflict {
  deviceA: string; rangeA: { start: number; end: number };
  deviceB: string; rangeB: { start: number; end: number };
}

/** 查找区间冲突：仅比较已配置完整区间（含起止） */
export function findRangeConflicts(assignments: Record<string, RangeCfg>): RangeConflict[] {
  const items = Object.entries(assignments)
    .map(([deviceId, cfg]) => ({ deviceId, start: cfg.idStart, end: cfg.idEnd }))
    .filter(x => typeof x.start === 'number' && typeof x.end === 'number')
    .map(x => ({ deviceId: x.deviceId, start: x.start as number, end: x.end as number }))
    .filter(x => x.start <= x.end);

  // 按起点排序
  items.sort((a, b) => a.start - b.start);

  const conflicts: RangeConflict[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (B.start <= A.end) {
        // overlap
        const start = Math.max(A.start, B.start);
        const end = Math.min(A.end, B.end);
        conflicts.push({
          deviceA: A.deviceId,
          rangeA: { start: A.start, end: A.end },
          deviceB: B.deviceId,
          rangeB: { start: B.start, end: B.end },
        });
      } else {
        break; // 后续更大的起点不可能与当前 i 冲突
      }
    }
  }
  return conflicts;
}
