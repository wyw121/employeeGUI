// 本模块的类型声明，避免使用 any，保持清晰边界
export interface DeviceStatusPanelProps {
  devices: Array<{ id: string }>;
  isLoading: boolean;
}

export interface PhoneGuidanceProps {
  onNext?: () => void;
}

export interface PcFixesProps {
  isBusy: boolean;
  onRestartAdb: () => Promise<void>;
  onClearKeys: () => Promise<void>;
  onRefreshDevices: () => Promise<void>;
  addLog?: (msg: string) => void;
}

export interface WirelessPairingProps {
  onPair: (hostPort: string, code: string) => Promise<string>;
  onConnect: (ip: string, port: number) => Promise<void>;
  addLog?: (msg: string) => void;
}

export interface ActionLogPanelProps {
  logs: string[];
  onClear?: () => void;
}

export interface AdbActionCardProps {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}
