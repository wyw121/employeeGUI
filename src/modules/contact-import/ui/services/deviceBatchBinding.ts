// 轻量 UI 层状态（不入库）：跟踪“待导入/已导入”的设备-批次绑定
// 若后续需要持久化，可接到 import_sessions 或新表；目前仅用于前端卡片/抽屉展示

export interface DeviceBatchBindingState {
  pending: Record<string, string[]>; // deviceId -> [batchId]
  imported: Record<string, string[]>; // deviceId -> [batchId]
}

const state: DeviceBatchBindingState = { pending: {}, imported: {} };

// 轻量发布-订阅：用于通知前端 UI 绑定状态已更新
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function bindBatchToDevice(deviceId: string, batchId: string) {
  state.pending[deviceId] = Array.from(new Set([...(state.pending[deviceId] || []), batchId]));
  notify();
}

export function markBatchImportedForDevice(deviceId: string, batchId: string) {
  // 从 pending 移除
  state.pending[deviceId] = (state.pending[deviceId] || []).filter(b => b !== batchId);
  // 放到 imported
  state.imported[deviceId] = Array.from(new Set([...(state.imported[deviceId] || []), batchId]));
  notify();
}

export function getBindings(deviceId: string): { pending: string[]; imported: string[] } {
  return {
    pending: state.pending[deviceId] || [],
    imported: state.imported[deviceId] || [],
  };
}
