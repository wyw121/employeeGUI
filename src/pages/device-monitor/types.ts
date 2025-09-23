import type { DeviceChangeEvent, TrackedDevice } from '../../infrastructure/RealTimeDeviceTracker';

export interface DeviceToolbarProps {
  isTracking: boolean;
  onStart: () => Promise<void> | void;
  onStop: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onRestartAdb: () => Promise<void> | void;
}

export type DeviceStatus = TrackedDevice['status'];
export type ConnectionType = TrackedDevice['connection_type'];

export interface DeviceFiltersState {
  statuses: DeviceStatus[];
  connections: ConnectionType[];
  keyword: string;
}

export interface DeviceFiltersProps {
  value: DeviceFiltersState;
  onChange: (value: DeviceFiltersState) => void;
}

export interface DeviceListProps {
  devices: TrackedDevice[];
  onSelectDevice?: (id: string) => void;
  selectedId?: string | null;
}

export interface DeviceCardProps {
  device: TrackedDevice;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

export interface StatusIndicatorsProps {
  total: number;
  online: number;
  usb: number;
  emulator: number;
}

export interface EventLogProps {
  lastEvent: DeviceChangeEvent | null;
}
