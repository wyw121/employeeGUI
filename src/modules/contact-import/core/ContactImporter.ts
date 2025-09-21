/**
 * 联系人导入器核心类
 * 整合所有模块，提供统一的导入接口
 */

import { IDeviceManager } from "../devices/IDeviceManager";
import { IContactParser } from "../parsers/IContactParser";
import { IImportStrategy } from "../strategies/ImportStrategies";
import {
  Contact,
  ContactDeviceGroup,
  Device,
  ImportConfiguration,
  ImportEvent,
  ImportEventType,
  ImportPhase,
  ImportProgress,
  ImportResult,
  ImportStatus,
  ParseOptions,
} from "../types";

export interface ContactImporterOptions {
  parser: IContactParser;
  deviceManager: IDeviceManager;
  strategy: IImportStrategy;
  configuration: ImportConfiguration;
}

/**
 * 联系人导入器事件监听器
 */
export interface ContactImporterEventListener {
  onProgress?(progress: ImportProgress): void;
  onPhaseChange?(phase: ImportPhase): void;
  onDeviceStatusChange?(device: Device): void;
  onContactProcessed?(
    contactId: string,
    deviceId: string,
    success: boolean
  ): void;
  onError?(error: Error, context?: any): void;
  onComplete?(result: ImportResult): void;
}

/**
 * 联系人导入器核心类
 *
 * 职责：
 * 1. 协调各个模块的工作
 * 2. 管理导入流程
 * 3. 提供进度监控
 * 4. 处理错误和异常
 */
export class ContactImporter {
  private parser: IContactParser;
  private deviceManager: IDeviceManager;
  private strategy: IImportStrategy;
  private configuration: ImportConfiguration;
  private listeners: ContactImporterEventListener[] = [];
  private currentProgress: ImportProgress;
  private isImporting = false;
  private cancelRequested = false;

  constructor(options: ContactImporterOptions) {
    this.parser = options.parser;
    this.deviceManager = options.deviceManager;
    this.strategy = options.strategy;
    this.configuration = options.configuration;

    this.currentProgress = {
      totalContacts: 0,
      processedContacts: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
      speed: 0,
      status: ImportStatus.PENDING,
      phase: ImportPhase.INITIALIZING,
    };
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: ContactImporterEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前进度
   */
  getProgress(): ImportProgress {
    return { ...this.currentProgress };
  }

  /**
   * 检查是否正在导入
   */
  isImportInProgress(): boolean {
    return this.isImporting;
  }

  /**
   * 取消导入
   */
  cancelImport(): void {
    this.cancelRequested = true;
    this.updatePhase(ImportPhase.COMPLETED);
    this.updateProgress({ status: ImportStatus.CANCELLED });
  }

  /**
   * 执行完整的联系人导入流程
   */
  async importContacts(
    fileContent: string,
    targetDevices: Device[],
    parseOptions?: ParseOptions
  ): Promise<ImportResult> {
    if (this.isImporting) {
      throw new Error("已有导入任务在进行中");
    }

    this.isImporting = true;
    this.cancelRequested = false;

    const startTime = Date.now();

    try {
      // Phase 1: 初始化
      this.updatePhase(ImportPhase.INITIALIZING);
      this.updateProgress({ status: ImportStatus.PROCESSING });
      this.emitEvent(ImportEventType.IMPORT_STARTED, { startTime });

      // Phase 2: 解析联系人
      this.updatePhase(ImportPhase.PARSING);
      const contacts = await this.parseContacts(fileContent, parseOptions);

      if (this.cancelRequested) {
        return this.createCancelledResult();
      }

      // Phase 3: 验证联系人
      this.updatePhase(ImportPhase.VALIDATING);
      const validationResult = await this.validateContacts(contacts);

      if (!validationResult.valid) {
        const errorMessage = validationResult.errors.join(", ");
        throw new Error(`联系人验证失败: ${errorMessage}`);
      }

      // Phase 4: 检测和验证设备
      this.updatePhase(ImportPhase.INITIALIZING);
      const validatedDevices = await this.validateDevices(targetDevices);

      // Phase 5: 分配联系人到设备
      this.updatePhase(ImportPhase.DISTRIBUTING);
      const deviceGroups = await this.distributeContacts(
        contacts,
        validatedDevices
      );

      // Phase 6: 转换格式并导入
      this.updatePhase(ImportPhase.CONVERTING);
      const importResult = await this.executeImport(deviceGroups);

      // Phase 7: 验证导入结果
      this.updatePhase(ImportPhase.VERIFYING);
      await this.verifyImportResults(deviceGroups);

      // 完成
      this.updatePhase(ImportPhase.COMPLETED);
      this.updateProgress({
        status: ImportStatus.COMPLETED,
        percentage: 100,
      });

      const result: ImportResult = {
        ...importResult,
        duration: Date.now() - startTime,
      };

      this.emitEvent(ImportEventType.IMPORT_COMPLETED, { result });
      this.notifyListeners("onComplete", result);

      return result;
    } catch (error) {
      const errorResult: ImportResult = {
        success: false,
        totalContacts: this.currentProgress.totalContacts,
        importedContacts: this.currentProgress.processedContacts,
        failedContacts:
          this.currentProgress.totalContacts -
          this.currentProgress.processedContacts,
        skippedContacts: 0,
        duplicateContacts: 0,
        duration: Date.now() - startTime,
        message: error instanceof Error ? error.message : String(error),
      };

      this.updateProgress({ status: ImportStatus.FAILED });
      this.emitEvent(ImportEventType.IMPORT_FAILED, { error: errorResult });
      this.notifyListeners(
        "onError",
        error instanceof Error ? error : new Error(String(error))
      );

      return errorResult;
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * 解析联系人文件
   */
  private async parseContacts(
    fileContent: string,
    options?: ParseOptions
  ): Promise<Contact[]> {
    try {
      const contacts = await this.parser.parse(fileContent, options);
      this.updateProgress({
        totalContacts: contacts.length,
        currentContact: `已解析 ${contacts.length} 个联系人`,
      });
      return contacts;
    } catch (error) {
      throw new Error(
        `联系人解析失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 验证联系人
   */
  private async validateContacts(
    contacts: Contact[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const validationResult = this.parser.validateContacts(contacts);

    if (
      !this.configuration.skipInvalidContacts &&
      validationResult.errors.length > 0
    ) {
      return {
        valid: false,
        errors: validationResult.errors.map((e) => e.message),
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * 验证设备
   */
  private async validateDevices(devices: Device[]): Promise<Device[]> {
    const validDevices: Device[] = [];

    for (const device of devices) {
      try {
        const validation = await this.deviceManager.validateDevice(device);
        if (validation.valid) {
          validDevices.push(device);
        } else {
          console.warn(`设备验证失败: ${device.name}`, validation.errors);
        }
      } catch (error) {
        console.error(`验证设备 ${device.name} 时出错:`, error);
      }
    }

    if (validDevices.length === 0) {
      throw new Error("没有可用的有效设备");
    }

    return validDevices;
  }

  /**
   * 分配联系人到设备
   */
  private async distributeContacts(
    contacts: Contact[],
    devices: Device[]
  ): Promise<ContactDeviceGroup[]> {
    const groups = this.strategy.distributeContacts(contacts, devices);
    const validation = this.strategy.validateDistribution(groups);

    if (!validation.valid) {
      throw new Error(`联系人分配验证失败: ${validation.errors.join(", ")}`);
    }

    // 输出警告
    validation.warnings.forEach((warning) => {
      console.warn("分配警告:", warning);
    });

    return groups;
  }

  /**
   * 执行导入
   */
  private async executeImport(
    deviceGroups: ContactDeviceGroup[]
  ): Promise<ImportResult> {
    let totalImported = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuplicates = 0;

    this.updatePhase(ImportPhase.IMPORTING);

    for (const group of deviceGroups) {
      if (this.cancelRequested) {
        break;
      }

      try {
        this.updateProgress({
          currentDevice: group.deviceName,
          currentContact: `正在导入到 ${group.deviceName}`,
        });

        const result = await this.importToDevice(group);

        totalImported += result.importedContacts;
        totalFailed += result.failedContacts;
        totalSkipped += result.skippedContacts;
        totalDuplicates += result.duplicateContacts;

        // 更新分组状态
        group.status = result.success
          ? ImportStatus.COMPLETED
          : ImportStatus.FAILED;
        group.result = result;

        this.emitEvent(ImportEventType.BATCH_COMPLETED, {
          deviceId: group.deviceId,
          result,
        });
      } catch (error) {
        group.status = ImportStatus.FAILED;
        totalFailed += group.contacts.length;

        console.error(`导入到设备 ${group.deviceName} 失败:`, error);
        this.emitEvent(ImportEventType.ERROR_OCCURRED, {
          deviceId: group.deviceId,
          error,
        });
      }

      // 更新总体进度
      const processed = deviceGroups
        .filter((g) => g.status !== ImportStatus.PENDING)
        .reduce((sum, g) => sum + g.contacts.length, 0);

      this.updateProgress({
        processedContacts: processed,
        percentage: Math.round(
          (processed / this.currentProgress.totalContacts) * 100
        ),
      });
    }

    return {
      success: totalFailed === 0 && !this.cancelRequested,
      totalContacts: this.currentProgress.totalContacts,
      importedContacts: totalImported,
      failedContacts: totalFailed,
      skippedContacts: totalSkipped,
      duplicateContacts: totalDuplicates,
      duration: 0, // 将在调用方设置
    };
  }

  /**
   * 导入联系人到单个设备
   */
  private async importToDevice(
    group: ContactDeviceGroup
  ): Promise<ImportResult> {
    // 这里应该调用具体的导入实现
    // 为了示例，我们使用一个模拟的导入过程

    const { invoke } = await import("@tauri-apps/api/core");

    // 生成VCF内容
    const vcfContent = this.generateVcfContent(group.contacts);

    // 创建临时文件
    const tempFilePath = `temp_contacts_${group.deviceId}_${Date.now()}.vcf`;
    await invoke("write_file", {
      path: tempFilePath,
      content: vcfContent,
    });

    try {
      // 🚀 优先使用多品牌导入（批量尝试不同品牌的导入方式）
      try {
        console.log(`🔄 尝试多品牌VCF导入 - 设备: ${group.deviceId}`);
        const multiBrandResult = await invoke<ImportResult>("import_vcf_contacts_multi_brand", {
          deviceId: group.deviceId,
          contactsFilePath: tempFilePath,
        });

        console.log(`✅ 多品牌导入成功 - 设备: ${group.deviceId}`, multiBrandResult);
        return multiBrandResult;
      } catch (multiBrandError) {
        console.warn(`⚠️ 多品牌导入失败，回退到传统方法 - 设备: ${group.deviceId}`, multiBrandError);
        
        // 回退到传统的Python移植版本
        const result = await invoke<ImportResult>("import_vcf_contacts_python_version", {
          deviceId: group.deviceId,
          contactsFilePath: tempFilePath,
        });

        return result;
      }
    } finally {
      // 清理临时文件
      try {
        await invoke("delete_file", { path: tempFilePath });
      } catch (error) {
        console.warn("清理临时文件失败:", error);
      }
    }
  }

  /**
   * 生成VCF内容
   */
  private generateVcfContent(contacts: Contact[]): string {
    const vcfLines: string[] = [];

    for (const contact of contacts) {
      vcfLines.push("BEGIN:VCARD");
      vcfLines.push("VERSION:3.0");
      vcfLines.push(`FN:${this.escapeVcfValue(contact.name)}`);

      if (contact.phone) {
        vcfLines.push(`TEL:${contact.phone}`);
      }

      if (contact.email) {
        vcfLines.push(`EMAIL:${contact.email}`);
      }

      if (contact.organization) {
        vcfLines.push(`ORG:${this.escapeVcfValue(contact.organization)}`);
      }

      if (contact.title) {
        vcfLines.push(`TITLE:${this.escapeVcfValue(contact.title)}`);
      }

      vcfLines.push("END:VCARD");
    }

    return vcfLines.join("\r\n");
  }

  /**
   * 转义VCF值
   */
  private escapeVcfValue(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  /**
   * 验证导入结果
   */
  private async verifyImportResults(
    deviceGroups: ContactDeviceGroup[]
  ): Promise<void> {
    // 这里可以实现导入结果的验证逻辑
    // 例如检查设备上是否真的存在导入的联系人
    console.log("验证导入结果...");
  }

  /**
   * 创建取消的结果
   */
  private createCancelledResult(): ImportResult {
    return {
      success: false,
      totalContacts: this.currentProgress.totalContacts,
      importedContacts: this.currentProgress.processedContacts,
      failedContacts: 0,
      skippedContacts:
        this.currentProgress.totalContacts -
        this.currentProgress.processedContacts,
      duplicateContacts: 0,
      duration: 0,
      message: "导入已取消",
    };
  }

  /**
   * 更新进度信息
   */
  private updateProgress(updates: Partial<ImportProgress>): void {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.notifyListeners("onProgress", this.currentProgress);
  }

  /**
   * 更新阶段
   */
  private updatePhase(phase: ImportPhase): void {
    this.currentProgress.phase = phase;
    this.notifyListeners("onPhaseChange", phase);
  }

  /**
   * 发射事件
   */
  private emitEvent(type: ImportEventType, data: any): void {
    const event: ImportEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    // 这里可以实现事件存储或日志记录
    console.log("导入事件:", event);
  }

  /**
   * 通知监听器
   */
  private notifyListeners<K extends keyof ContactImporterEventListener>(
    method: K,
    ...args: Parameters<NonNullable<ContactImporterEventListener[K]>>
  ): void {
    this.listeners.forEach((listener) => {
      try {
        const callback = listener[method];
        if (callback) {
          (callback as any)(...args);
        }
      } catch (error) {
        console.error("事件监听器执行失败:", error);
      }
    });
  }
}

