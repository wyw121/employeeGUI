import { invoke } from '@tauri-apps/api/core';

export type ScrcpyOptions = {
  resolution?: number | string;
  bitrate?: string;
  maxFps?: number;
  windowTitle?: string;
  stayAwake?: boolean;
  turnScreenOff?: boolean;
  sessionName?: string;
  alwaysOnTop?: boolean;
  borderless?: boolean;
};

export type ScrcpyCapabilities = {
  alwaysOnTop: boolean;
  windowBorderless: boolean;
  maxFps: boolean;
  bitRate: boolean;
  maxSize: boolean;
};

export class ScrcpyApplicationService {
  async checkAvailable(): Promise<string> {
    return invoke<string>('check_scrcpy_available');
  }

  async start(deviceId: string, options?: ScrcpyOptions): Promise<string> {
    // 后端接收 camelCase，serde 已配置 rename_all = "camelCase"
    return invoke<string>('start_device_mirror', { deviceId, options });
  }

  async stopAll(deviceId: string): Promise<void> {
    await invoke('stop_device_mirror', { deviceId });
  }

  async stopSession(deviceId: string, sessionName: string): Promise<void> {
    await invoke('stop_device_mirror_session', { deviceId, sessionName });
  }

  async listSessions(deviceId: string): Promise<string[]> {
    return invoke<string[]>('list_device_mirror_sessions', { deviceId });
  }

  async getCapabilities(): Promise<ScrcpyCapabilities> {
    return invoke<ScrcpyCapabilities>('get_scrcpy_capabilities');
  }
}

export const scrcpyService = new ScrcpyApplicationService();
