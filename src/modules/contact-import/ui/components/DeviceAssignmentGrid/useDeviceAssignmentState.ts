import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAdb } from '../../../../../application/hooks/useAdb';

export interface DeviceAssignmentRow {
  deviceId: string;
  deviceName?: string;
  industry?: string;
  idStart?: number;
  idEnd?: number;
  contactCount?: number;
}

export function useDeviceAssignmentState(value?: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>, onChange?: (v: Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => void) {
  const { devices, getDeviceContactCount, getDeviceInfo } = useAdb();
  const [rowState, setRowState] = useState<Record<string, Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>>(value || {});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, { manufacturer?: string; model?: string }>>({});
  const [assignCount, setAssignCount] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => { if (value) setRowState(value); }, [value]);

  const data = useMemo<DeviceAssignmentRow[]>(() => {
    return (devices || []).map(d => ({
      deviceId: d.id,
      deviceName: d.name || d.id,
      industry: rowState[d.id]?.industry,
      idStart: rowState[d.id]?.idStart,
      idEnd: rowState[d.id]?.idEnd,
      contactCount: counts[d.id],
    }));
  }, [devices, rowState, counts]);

  const updateRow = (deviceId: string, patch: Partial<Omit<DeviceAssignmentRow, 'deviceId' | 'deviceName'>>) => {
    setRowState(prev => { const next = { ...prev, [deviceId]: { ...prev[deviceId], ...patch } }; onChange?.(next); return next; });
  };

  const refreshCount = async (deviceId: string) => {
    setLoadingIds(prev => ({ ...prev, [deviceId]: true }));
    try { const c = await getDeviceContactCount(deviceId); setCounts(prev => ({ ...prev, [deviceId]: c })); }
    finally { setLoadingIds(prev => ({ ...prev, [deviceId]: false })); }
  };

  const refreshAllCounts = async () => {
    const list = devices || [];
    const queue = [...list.map(d => d.id)];
    while (queue.length) { const id = queue.shift(); if (!id) break; await refreshCount(id); }
  };

  useEffect(() => {
    let canceled = false;
    (async () => {
      const list = devices || [];
      const results: Record<string, { manufacturer?: string; model?: string }> = {};
      for (const d of list) {
        try { const info = await getDeviceInfo(d.id).catch(() => null); if (info && !canceled) { results[d.id] = { manufacturer: (info as any)?.manufacturer, model: (info as any)?.model }; } }
        catch {}
      }
      if (!canceled) setMeta(results);
    })();
    return () => { canceled = true; };
  }, [devices, getDeviceInfo]);

  useEffect(() => {
    if ((devices || []).length === 0) return;
    const timer = setTimeout(() => { refreshAllCounts(); }, 200);
    return () => clearTimeout(timer);
  }, [devices]);

  const autoAssignRange = useCallback((deviceId: string, count: number) => {
    const n = Math.max(1, Math.floor(count || 0));
    const all = Object.values(rowState);
    const maxEnd = all.reduce((m, r) => (typeof r.idEnd === 'number' ? Math.max(m, r.idEnd!) : m), -1);
    const start = Math.max(0, maxEnd + 1);
    const end = start + (n - 1);
    updateRow(deviceId, { idStart: start, idEnd: end });
  }, [rowState]);

  // selection helpers
  const allIds = useMemo(() => (devices || []).map(d => d.id), [devices]);
  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => !!v).map(([id]) => id), [selected]);
  const allSelected = allIds.length > 0 && allIds.every(id => !!selected[id]);
  const toggleSelectAll = (checked: boolean) => { const next: Record<string, boolean> = {}; for (const id of allIds) next[id] = checked; setSelected(next); };
  const clearSelection = () => setSelected({});

  useEffect(() => {
    const next: Record<string, number> = { ...assignCount };
    for (const [did, r] of Object.entries(rowState)) {
      if (typeof r?.idStart === 'number' && typeof r?.idEnd === 'number' && r.idEnd >= r.idStart) next[did] = r.idEnd - r.idStart + 1;
      else if (next[did] == null) next[did] = 100;
    }
    setAssignCount(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowState]);

  return {
    devices,
    rowState, setRowState, updateRow,
    counts, loadingIds, refreshCount, refreshAllCounts,
    meta,
    assignCount, setAssignCount,
    selected, setSelected, selectedIds, allSelected, toggleSelectAll, clearSelection,
    autoAssignRange,
    data,
  };
}
