import { Device } from "../../types";

export class ValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export function ensureFileContent(content: string): void {
  if (!content || !content.trim()) {
    throw new ValidationError("EMPTY_FILE", "请选择有效的 VCF 文件");
  }
}

export function ensureDevicesSelected(devices: Device[]): void {
  if (!devices || devices.length === 0) {
    throw new ValidationError("NO_DEVICE", "请至少选择一个要导入的设备");
  }
}

export function dedupeDevices(devices: Device[]): Device[] {
  const seen = new Set<string>();
  return devices.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}
