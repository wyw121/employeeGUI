import { create } from 'zustand';

interface SessionState {
  sessions: Record<string, { xmlText: string; xmlHash: string }>
  activeSessionId: string | null
  activeStepId: string | null
  ensureSession: (id: string, xmlText: string, xmlHash: string) => void
  setActiveSession: (id: string | null) => void
  setActiveStep: (id: string | null) => void
}

export const useInspectorStore = create<SessionState>((set) => ({
  sessions: {},
  activeSessionId: null,
  activeStepId: null,
  ensureSession: (id, xmlText, xmlHash) => set((s) => ({
    sessions: { ...s.sessions, [id]: { xmlText, xmlHash } }
  })),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setActiveStep: (id) => set({ activeStepId: id }),
}));
