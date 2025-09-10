/**
 * 联系人导入模块入口文件
 * 高内聚、低耦合的模块化联系人导入系统
 */

// 内部导入
import { ContactImporter } from "./core/ContactImporter";
import { AndroidDeviceManager } from "./devices/IDeviceManager";
import { VcfParser } from "./parsers/VcfParser";
import { ImportStrategyFactory } from "./strategies/ImportStrategies";
import type { Device, ImportResult } from "./types";

// ===== 核心组件导出 =====
export { ContactImporter } from "./core/ContactImporter";
export type {
  ContactImporterEventListener,
  ContactImporterOptions,
} from "./core/ContactImporter";

// ===== 解析器导出 =====
export {
  AbstractContactParser,
  type IContactParser,
} from "./parsers/IContactParser";
export { VcfParser } from "./parsers/VcfParser";

// ===== 设备管理器导出 =====
export {
  AndroidDeviceManager,
  type IDeviceManager,
} from "./devices/IDeviceManager";

// ===== 导入策略导出 =====
export {
  BalancedImportStrategy,
  ImportStrategyFactory,
  RandomImportStrategy,
  SequentialImportStrategy,
  type IImportStrategy,
} from "./strategies/ImportStrategies";

// ===== React Hooks导出 =====
export {
  useContactImport,
  useDeviceMonitoring,
  useImportStats,
} from "./hooks/useContactImport";
export type {
  UseContactImportOptions,
  UseContactImportReturn,
} from "./hooks/useContactImport";

// ===== UI组件导出 =====
export { ContactImportWizard } from "./ui/ContactImportWizard";

// ===== 类型定义导出 =====
export type {
  // 基础类型
  Contact,
  // 分组和结果
  ContactDeviceGroup,
  ContactImportResult,
  ContactMetadata,
  Device,
  DeviceCapabilities,
  DeviceConnection,
  DeviceMetadata,
  DeviceStatus,
  // 枚举类型
  DeviceType,
  // 文件处理
  FileInfo,
  // 配置和选项
  ImportConfiguration,
  ImportDetails,
  ImportError,
  ImportEvent,
  ImportEventType,
  ImportFormat,
  ImportOptions,
  ImportPhase,
  // 进度和事件
  ImportProgress,
  ImportResult,
  ImportStatus,
  ImportStrategyType,
  ParseOptions,
  SocialProfile,
  ValidationError,
  // 验证相关
  ValidationResult,
  ValidationWarning,
} from "./types";

// ===== 工厂方法和便利函数 =====

/**
 * 创建默认的联系人导入器
 * @param strategyType 导入策略类型
 * @returns ContactImporter实例
 */
export function createContactImporter(
  strategyType: string = "balanced"
): ContactImporter {
  const parser = new VcfParser();
  const deviceManager = new AndroidDeviceManager();
  const strategy = ImportStrategyFactory.create(strategyType);

  return new ContactImporter({
    parser,
    deviceManager,
    strategy,
    configuration: {
      strategy: strategyType as any,
      batchSize: 50,
      allowDuplicates: false,
      skipInvalidContacts: true,
      format: "vcf" as any,
      options: {
        preserveGroups: false,
        mergeStrategy: "skip",
        photoHandling: "skip",
      },
    },
  });
}

/**
 * 快速导入联系人
 * 一个便利函数，用于简单的导入场景
 */
export async function quickImportContacts(
  vcfContent: string,
  targetDevices: Device[],
  strategyType: string = "balanced"
): Promise<ImportResult> {
  const importer = createContactImporter(strategyType);
  return importer.importContacts(vcfContent, targetDevices);
}

/**
 * 获取所有可用的导入策略
 */
export function getAvailableImportStrategies(): Array<{
  type: string;
  name: string;
  description: string;
}> {
  return ImportStrategyFactory.getAvailableStrategies();
}

/**
 * 验证VCF文件格式
 */
export function validateVcfFormat(content: string): boolean {
  const parser = new VcfParser();
  return parser.validateFormat(content);
}

/**
 * 解析VCF文件并返回联系人数量预估
 */
export async function previewVcfFile(content: string): Promise<{
  estimatedCount: number;
  fileSize: number;
  encoding: string;
  format: string;
}> {
  const parser = new VcfParser();
  return parser.getParseStats(content);
}

/**
 * 检测Android设备
 */
export async function detectAndroidDevices(): Promise<Device[]> {
  const deviceManager = new AndroidDeviceManager();
  return deviceManager.detectDevices();
}

// ===== 常量定义 =====

export const SUPPORTED_FILE_FORMATS = [".vcf", ".vcard"] as const;

export const DEFAULT_IMPORT_CONFIGURATION = {
  strategy: "balanced" as const,
  batchSize: 50,
  allowDuplicates: false,
  skipInvalidContacts: true,
  format: "vcf" as const,
  options: {
    preserveGroups: false,
    mergeStrategy: "skip" as const,
    photoHandling: "skip" as const,
  },
};

export const IMPORT_PHASE_DESCRIPTIONS = {
  initializing: "正在初始化导入环境...",
  parsing: "正在解析联系人文件...",
  validating: "正在验证联系人数据...",
  distributing: "正在分配联系人到设备...",
  converting: "正在转换文件格式...",
  importing: "正在导入联系人到设备...",
  verifying: "正在验证导入结果...",
  completed: "导入过程已完成",
} as const;

// ===== 版本信息 =====
export const MODULE_VERSION = "1.0.0";
export const MODULE_NAME = "Contact Import Module";
export const MODULE_DESCRIPTION =
  "高内聚、低耦合的联系人导入系统，支持VCF格式联系人导入到Android设备";

/**
 * 获取模块信息
 */
export function getModuleInfo() {
  return {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    description: MODULE_DESCRIPTION,
    supportedFormats: SUPPORTED_FILE_FORMATS,
    availableStrategies: getAvailableImportStrategies(),
    defaultConfiguration: DEFAULT_IMPORT_CONFIGURATION,
  };
}
