import { useCallback, useMemo, useReducer } from 'react';
import { useAdb } from '../../../application/hooks/useAdb';
import { AuthAction, AuthState, AuthStatus, AuthStep, initialAuthState } from './types';

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'NEXT': {
      const order = [AuthStep.PREREQUISITES, AuthStep.USB_TRUST, AuthStep.WIRELESS, AuthStep.VERIFY, AuthStep.DONE] as const;
      const idx = Math.min(order.indexOf(state.step) + 1, order.length - 1);
      return { ...state, step: order[idx] };
    }
    case 'PREV': {
      const order = [AuthStep.PREREQUISITES, AuthStep.USB_TRUST, AuthStep.WIRELESS, AuthStep.VERIFY, AuthStep.DONE] as const;
      const idx = Math.max(order.indexOf(state.step) - 1, 0);
      return { ...state, step: order[idx] };
    }
    case 'GOTO':
      return { ...state, step: action.step };
    case 'RESET':
      return { ...initialAuthState };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'LOG':
      return { ...state, logs: [`${new Date().toLocaleTimeString('zh-CN')} [${action.level ?? 'info'}] ${action.msg}`, ...state.logs].slice(0, 200) };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'ADD_ERROR':
      return { ...state, errors: [{ ...action.error, timestamp: Date.now() }, ...state.errors] };
    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'SET_USB_CONFIRMED':
      return { ...state, userConfirmedUsbAllow: action.value };
    case 'SET_USB_DIALOG_SHOWN':
      return { ...state, hasShownUsbDialog: action.value };
    case 'SET_WIRELESS_CONFIG':
      return { ...state, wirelessConfig: action.config };
    case 'SET_WIRELESS_ENABLED':
      return { ...state, wirelessEnabled: action.enabled };
    case 'UPDATE_DEVICES':
      return { ...state, connectedDevices: action.devices };
    case 'SELECT_DEVICE':
      return { ...state, selectedDeviceId: action.deviceId };
    case 'SET_REMEMBER_SETTINGS':
      return { ...state, rememberSettings: action.value };
    case 'SET_AUTO_SKIP':
      return { ...state, autoSkipCompleted: action.value };
    default:
      return state;
  }
}

export interface UseAuthWizard {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  api: {
    refreshDevices: () => Promise<void>;
    restartAdbServer: () => Promise<void>;
    oneClickRecover: () => Promise<void>;
    pairWireless: (hostPort: string, code: string) => Promise<void>;
    connectWireless: (ip: string, port: number) => Promise<void>;
  };
}

export function useAuthWizard(): UseAuthWizard {
  const [state, dispatch] = useReducer(reducer, initialAuthState);
  const adb = useAdb();

  const refreshDevices = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      await adb.refreshDevices();
      dispatch({ type: 'LOG', msg: '已刷新设备列表', level: 'success' });
    } catch (e) {
      dispatch({ type: 'ADD_ERROR', error: { code: 'REFRESH_FAILED', message: String(e) } });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb.refreshDevices]);

  const restartAdbServer = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      await adb.restartAdbServer();
      dispatch({ type: 'LOG', msg: 'ADB 重启完成', level: 'success' });
      await adb.refreshDevices();
    } catch (e) {
      dispatch({ type: 'ADD_ERROR', error: { code: 'RESTART_FAILED', message: String(e) } });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb.restartAdbServer, adb.refreshDevices]);

  const oneClickRecover = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      // 轻量恢复流程：重启ADB + 刷新设备
      await adb.restartAdbServer();
      await adb.refreshDevices();
      dispatch({ type: 'LOG', msg: '一键修复完成', level: 'success' });
    } catch (e) {
      dispatch({ type: 'ADD_ERROR', error: { code: 'RECOVER_FAILED', message: String(e) } });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb.restartAdbServer, adb.refreshDevices]);

  const pairWireless = useCallback(async (hostPort: string, code: string) => {
    // 这里保留接口，具体实现可以在应用服务侧扩展
    dispatch({ type: 'LOG', msg: `尝试无线配对 ${hostPort}` });
    // TODO: 集成 adb pair 命令
  }, []);

  const connectWireless = useCallback(async (ip: string, port: number) => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      await adb.connectToDevice(`${ip}:${port}`);
      dispatch({ type: 'LOG', msg: `已连接 ${ip}:${port}`, level: 'success' });
      await adb.refreshDevices();
    } catch (e) {
      dispatch({ type: 'ADD_ERROR', error: { code: 'WIRELESS_CONNECT_FAILED', message: String(e) } });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb.connectToDevice, adb.refreshDevices]);

  const api = useMemo(() => ({
    refreshDevices,
    restartAdbServer,
    oneClickRecover,
    pairWireless,
    connectWireless,
  }), [refreshDevices, restartAdbServer, oneClickRecover, pairWireless, connectWireless]);

  return { state, dispatch, api };
}

// Note: interface UseAuthWizard 已作为具名导出，无需重复导出类型别名
