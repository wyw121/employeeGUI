import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useAdb } from '../../../application/hooks/useAdb';
import { AuthAction, AuthState, AuthStep, initialAuthState } from './types';

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, step: nextStep(state.step) };
    case 'PREV':
      return { ...state, step: prevStep(state.step) };
    case 'GOTO':
      return { ...state, step: action.step };
    case 'RESET':
      return { ...initialAuthState };
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'LOG':
      return { ...state, logs: [...state.logs, action.msg] };
    case 'CLEAR_LOG':
      return { ...state, logs: [] };
    case 'SET_USB_CONFIRMED':
      return { ...state, userConfirmedUsbAllow: action.value };
    default:
      return state;
  }
}

const steps: AuthStep[] = [
  AuthStep.PREREQUISITES,
  AuthStep.USB_TRUST,
  AuthStep.WIRELESS,
  AuthStep.VERIFY,
  AuthStep.DONE,
];

const nextStep = (s: AuthStep) => steps[Math.min(steps.indexOf(s) + 1, steps.length - 1)];
const prevStep = (s: AuthStep) => steps[Math.max(steps.indexOf(s) - 1, 0)];

export const useAuthWizard = () => {
  const adb = useAdb();
  // 从本地存储恢复
  const hydrated = useMemo(() => {
    try {
      const raw = localStorage.getItem('adb.auth.wizard');
      if (!raw) return initialAuthState;
      const parsed = JSON.parse(raw);
      return {
        ...initialAuthState,
        step: parsed.step ?? initialAuthState.step,
        userConfirmedUsbAllow: parsed.userConfirmedUsbAllow ?? false,
      } as AuthState;
    } catch {
      return initialAuthState;
    }
  }, []);
  const [state, dispatch] = useReducer(reducer, hydrated);

  const log = useCallback((msg: string) => dispatch({ type: 'LOG', msg }), []);

  const oneClickRecover = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log('🧹 清理本机 ADB 密钥...');
      await adb.clearAdbKeys();
      log('🔁 重启 ADB 服务...');
      await adb.restartAdbServer();
      log('🔄 刷新设备列表...');
      await adb.refreshDevices();
      log('✅ 一键修复完成');
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log]);

  const restartAdbServer = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log('🔁 重启 ADB 服务...');
      await adb.restartAdbServer();
      log('✅ ADB 已重启');
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log]);

  const refreshDevices = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log('🔄 刷新设备列表...');
      await adb.refreshDevices();
      log('✅ 设备列表已刷新');
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log]);

  const pairWireless = useCallback(async (hostPort: string, code: string) => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log(`📡 配对 ${hostPort} ...`);
      const out = await adb.pairWireless(hostPort, code);
      log(out.trim());
      return out;
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log]);

  const connectWireless = useCallback(async (ip: string, port: number) => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log(`🔗 连接 ${ip}:${port} ...`);
      await adb.wirelessConnect(ip, port);
      await adb.refreshDevices();
      log('✅ 无线连接完成');
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log]);

  const api = useMemo(() => ({
    ...adb,
    oneClickRecover,
    pairWireless,
    connectWireless,
    restartAdbServer,
    refreshDevices,
  }), [adb, oneClickRecover, pairWireless, connectWireless, restartAdbServer, refreshDevices]);

  // 持久化关键UI状态
  useEffect(() => {
    try {
      localStorage.setItem('adb.auth.wizard', JSON.stringify({
        step: state.step,
        userConfirmedUsbAllow: state.userConfirmedUsbAllow,
      }));
    } catch {}
  }, [state.step, state.userConfirmedUsbAllow]);

  return { state, dispatch, api };
};

export type UseAuthWizard = ReturnType<typeof useAuthWizard>;
