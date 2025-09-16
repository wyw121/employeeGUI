import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";
import { create } from "zustand";

export interface DeviceInfo {
  id: string;
  name: string;
  status: "device" | "offline" | "unauthorized" | "connecting";
  model?: string;
  product?: string;
  platform?: string;
  lastActive?: string;
  isEmulator?: boolean;
  port?: number;
}

interface DeviceStore {
  // 状态
  devices: DeviceInfo[];
  selectedDevice: string | null;
  loading: boolean;
  error: string | null;
  adbPath: string;

  // 操作
  setDevices: (devices: DeviceInfo[]) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAdbPath: (path: string) => void;

  // 异步操作
  initializeAdb: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  connectToDevice: (address: string) => Promise<boolean>;
  disconnectDevice: (deviceId: string) => Promise<boolean>;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  // 初始状态
  devices: [],
  selectedDevice: null,
  loading: false,
  error: null,
  adbPath: "",

  // 基础操作
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAdbPath: (adbPath) => set({ adbPath }),

  // 初始化ADB路径
  initializeAdb: async () => {
    try {
      // 使用智能ADB检测
      const smartPath = await invoke<string>("detect_smart_adb_path");
      set({ adbPath: smartPath });
      message.success(`已自动检测到ADB路径: ${smartPath}`);
    } catch (error) {
      console.error("Smart ADB detection failed:", error);
      
      // 回退到原来的检测逻辑
      try {
        const detectedPath = await invoke<string | null>("detect_ldplayer_adb");
        if (detectedPath) {
          set({ adbPath: detectedPath });
          message.success("已自动检测到雷电模拟器ADB路径");
        } else {
          set({ adbPath: "adb.exe" }); // 最后的回退路径
          message.info("使用默认ADB路径");
        }
      } catch (fallbackError) {
        console.error("Fallback ADB detection failed:", fallbackError);
        set({ adbPath: "adb.exe" });
      }
    }
  },

  // 刷新设备列表
  refreshDevices: async () => {
    const { adbPath } = get();
    if (!adbPath) return;

    set({ loading: true, error: null });

    try {
      const output = await invoke<string>("get_adb_devices", { adbPath: adbPath });
      const parsedDevices = parseDevicesOutput(output);

      set({
        devices: parsedDevices,
        loading: false,
      });

      if (parsedDevices.length > 0) {
        message.success(`检测到 ${parsedDevices.length} 个设备`);

        // 如果没有选中设备且有可用设备，自动选择第一个在线设备
        const { selectedDevice } = get();
        if (!selectedDevice) {
          const onlineDevice = parsedDevices.find((d) => d.status === "device");
          if (onlineDevice) {
            set({ selectedDevice: onlineDevice.id });
          }
        }
      } else {
        message.info("未检测到连接的设备");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.toString() : "获取设备列表失败";
      set({
        error: errorMsg,
        loading: false,
        devices: [],
      });
      message.error(errorMsg);
    }
  },

  // 连接到设备
  connectToDevice: async (address: string) => {
    const { adbPath } = get();
    if (!adbPath) return false;

    set({ loading: true });

    try {
      await invoke("adb_connect", { adbPath: adbPath, address });
      message.success(`已连接到设备: ${address}`);

      // 刷新设备列表
      await get().refreshDevices();
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.toString() : "连接失败";
      message.error(`连接失败: ${errorMsg}`);
      set({ loading: false });
      return false;
    }
  },

  // 断开设备连接
  disconnectDevice: async (deviceId: string) => {
    const { adbPath } = get();
    if (!adbPath) return false;

    set({ loading: true });

    try {
      await invoke("adb_disconnect", { adbPath: adbPath, device_id: deviceId });
      message.success(`已断开设备: ${deviceId}`);

      // 如果断开的是当前选中的设备，清除选择
      const { selectedDevice } = get();
      if (selectedDevice === deviceId) {
        set({ selectedDevice: null });
      }

      // 刷新设备列表
      await get().refreshDevices();
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.toString() : "断开连接失败";
      message.error(`断开连接失败: ${errorMsg}`);
      set({ loading: false });
      return false;
    }
  },
}));

// 解析ADB设备输出的工具函数
function parseDevicesOutput(output: string): DeviceInfo[] {
  const lines = output
    .split("\n")
    .filter((line) => line.trim() && !line.includes("List of devices"));

  return lines.map((line, index) => {
    const parts = line.trim().split(/\s+/);
    const deviceId = parts[0];
    const status = parts[1];

    // 检测是否为模拟器
    const isEmulator =
      deviceId.includes("127.0.0.1") || deviceId.includes("emulator");
    const port = deviceId.includes(":")
      ? parseInt(deviceId.split(":")[1])
      : undefined;

    // 解析设备信息
    let model = "";
    let product = "";

    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("model:")) {
        model = part.split(":")[1];
      } else if (part.startsWith("product:")) {
        product = part.split(":")[1];
      }
    }

    // 生成友好的设备名称
    let deviceName = "";
    if (isEmulator) {
      if (deviceId.includes("127.0.0.1")) {
        deviceName = `雷电模拟器 (${deviceId})`;
      } else {
        deviceName = `模拟器 (${deviceId})`;
      }
    } else {
      deviceName = model || product || `设备 ${index + 1}`;
    }

    return {
      id: deviceId,
      name: deviceName,
      status: status as DeviceInfo["status"],
      model,
      product,
      platform: isEmulator ? "Android (模拟器)" : "Android",
      lastActive: status === "device" ? "刚刚" : "离线",
      isEmulator,
      port,
    };
  });
}

// 导出一些常用的选择器
export const useDevices = () => useDeviceStore((state) => state.devices);
export const useSelectedDevice = () =>
  useDeviceStore((state) => state.selectedDevice);
export const useDeviceLoading = () => useDeviceStore((state) => state.loading);
export const useDeviceError = () => useDeviceStore((state) => state.error);

// 导出设备操作的便捷函数
export const useDeviceActions = () => {
  const store = useDeviceStore();
  return {
    initializeAdb: store.initializeAdb,
    refreshDevices: store.refreshDevices,
    setSelectedDevice: store.setSelectedDevice,
    connectToDevice: store.connectToDevice,
    disconnectDevice: store.disconnectDevice,
  };
};
