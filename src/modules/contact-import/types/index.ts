/**
 * 联系人导入模块 - 核心类型定义
 * 高内聚、低耦合的类型系统
 */

// ===== 基础类型 =====

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  address?: string;
  note?: string;
  photoUrl?: string;
  socialProfiles?: SocialProfile[];
  customFields?: Record<string, any>;
  metadata?: ContactMetadata;
}

export interface SocialProfile {
  platform: "xiaohongshu" | "weibo" | "wechat" | "qq" | "other";
  username: string;
  url?: string;
  verified?: boolean;
}

export interface ContactMetadata {
  source: string;
  importedAt: Date;
  originalFormat: string;
  hash?: string;
}

// ===== 设备类型 =====

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: DeviceCapabilities;
  connection: DeviceConnection;
  metadata?: DeviceMetadata;
}

export enum DeviceType {
  ANDROID_EMULATOR = "android_emulator",
  ANDROID_PHYSICAL = "android_physical",
  IOS_SIMULATOR = "ios_simulator",
  IOS_PHYSICAL = "ios_physical",
}

export enum DeviceStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  UNAUTHORIZED = "unauthorized",
  OFFLINE = "offline",
  UNKNOWN = "unknown",
}

export interface DeviceCapabilities {
  supportedFormats: string[];
  maxContactsPerImport: number;
  supportsVcf: boolean;
  supportsBatchImport: boolean;
  supportsContactPhotos: boolean;
  supportsCustomFields: boolean;
}

export interface DeviceConnection {
  protocol: "adb" | "ios-deploy" | "wireless";
  address: string;
  port?: number;
  authToken?: string;
}

export interface DeviceMetadata {
  manufacturer: string;
  model: string;
  osVersion: string;
  apiLevel?: number;
  screenSize?: string;
}

// ===== 导入相关类型 =====

export interface ImportConfiguration {
  strategy: ImportStrategyType;
  batchSize: number;
  allowDuplicates: boolean;
  skipInvalidContacts: boolean;
  format: ImportFormat;
  options: ImportOptions;
}

export enum ImportStrategyType {
  BALANCED = "balanced", // 平衡分配
  SEQUENTIAL = "sequential", // 顺序分配
  RANDOM = "random", // 随机分配
  CUSTOM = "custom", // 自定义分配
}

export enum ImportFormat {
  VCF = "vcf",
  CSV = "csv",
  JSON = "json",
  ANDROID_CONTACTS = "android_contacts",
}

export interface ImportOptions {
  preserveGroups?: boolean;
  mergeStrategy?: "skip" | "overwrite" | "merge";
  photoHandling?: "skip" | "embed" | "reference";
  customFieldMapping?: Record<string, string>;
}

export interface ContactDeviceGroup {
  deviceId: string;
  deviceName: string;
  contacts: Contact[];
  status: ImportStatus;
  result?: ImportResult;
  metadata?: GroupMetadata;
}

export enum ImportStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface GroupMetadata {
  estimatedDuration: number;
  priority: number;
  retryCount: number;
  lastAttempt?: Date;
}

// ===== 导入结果类型 =====

export interface ImportResult {
  success: boolean;
  totalContacts: number;
  importedContacts: number;
  failedContacts: number;
  skippedContacts: number;
  duplicateContacts: number;
  duration: number;
  message?: string;
  details?: ImportDetails;
  errors?: ImportError[];
}

export interface ImportDetails {
  deviceId: string;
  deviceName: string;
  startTime: Date;
  endTime: Date;
  processedBatches: number;
  contactResults: ContactImportResult[];
}

export interface ContactImportResult {
  contactId: string;
  contactName: string;
  status: "success" | "failed" | "skipped" | "duplicate";
  message?: string;
  deviceContactId?: string;
}

export interface ImportError {
  code: string;
  message: string;
  contactId?: string;
  deviceId?: string;
  context?: any;
  timestamp: Date;
}

// ===== 进度类型 =====

export interface ImportProgress {
  totalContacts: number;
  processedContacts: number;
  currentDevice?: string;
  currentContact?: string;
  percentage: number;
  estimatedTimeRemaining: number;
  speed: number; // contacts per second
  status: ImportStatus;
  phase: ImportPhase;
}

export enum ImportPhase {
  INITIALIZING = "initializing",
  PARSING = "parsing",
  VALIDATING = "validating",
  DISTRIBUTING = "distributing",
  CONVERTING = "converting",
  IMPORTING = "importing",
  VERIFYING = "verifying",
  COMPLETED = "completed",
}

// ===== 事件类型 =====

export interface ImportEvent {
  type: ImportEventType;
  timestamp: Date;
  data: any;
}

export enum ImportEventType {
  IMPORT_STARTED = "import_started",
  IMPORT_PROGRESS = "import_progress",
  IMPORT_COMPLETED = "import_completed",
  IMPORT_FAILED = "import_failed",
  IMPORT_CANCELLED = "import_cancelled",
  DEVICE_CONNECTED = "device_connected",
  DEVICE_DISCONNECTED = "device_disconnected",
  CONTACT_PROCESSED = "contact_processed",
  BATCH_COMPLETED = "batch_completed",
  ERROR_OCCURRED = "error_occurred",
}

// ===== 验证类型 =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
  severity: "error" | "warning";
}

export interface ValidationWarning extends ValidationError {
  suggestion?: string;
}

// ===== 文件处理类型 =====

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  encoding?: string;
  lastModified: Date;
}

export interface ParseOptions {
  encoding?: string;
  delimiter?: string;
  skipEmptyLines?: boolean;
  maxRecords?: number;
  strict?: boolean;
}
