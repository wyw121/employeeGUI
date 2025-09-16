/**
 * 联系人导入策略接口和实现
 * 负责将联系人合理分配到不同设备
 */

import { Contact, ContactDeviceGroup, Device, ImportStatus } from "../types";

export interface IImportStrategy {
  /**
   * 策略名称
   */
  getName(): string;

  /**
   * 策略描述
   */
  getDescription(): string;

  /**
   * 将联系人分配到设备
   * @param contacts 联系人列表
   * @param devices 设备列表
   * @returns 联系人设备分组
   */
  distributeContacts(
    contacts: Contact[],
    devices: Device[]
  ): ContactDeviceGroup[];

  /**
   * 验证分配结果
   * @param groups 联系人设备分组
   * @returns 验证结果
   */
  validateDistribution(groups: ContactDeviceGroup[]): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  };

  /**
   * 获取分配统计信息
   * @param groups 联系人设备分组
   * @returns 统计信息
   */
  getDistributionStats(groups: ContactDeviceGroup[]): {
    totalContacts: number;
    deviceCount: number;
    averageContactsPerDevice: number;
    minContactsPerDevice: number;
    maxContactsPerDevice: number;
    balance: number; // 0-1, 1表示完全平衡
  };
}

/**
 * 平衡导入策略
 * 尽可能平均地将联系人分配到各个设备
 */
export class BalancedImportStrategy implements IImportStrategy {
  getName(): string {
    return "Balanced Import";
  }

  getDescription(): string {
    return "平衡导入策略：将联系人尽可能平均地分配到所有设备，确保每个设备的联系人数量相对均匀。";
  }

  distributeContacts(
    contacts: Contact[],
    devices: Device[]
  ): ContactDeviceGroup[] {
    if (contacts.length === 0 || devices.length === 0) {
      return [];
    }

    const groups: ContactDeviceGroup[] = [];
    const contactsPerDevice = Math.ceil(contacts.length / devices.length);

    // 按设备能力排序，优先给能力强的设备分配更多联系人
    const sortedDevices = [...devices].sort(
      (a, b) =>
        b.capabilities.maxContactsPerImport -
        a.capabilities.maxContactsPerImport
    );

    let contactIndex = 0;

    for (const device of sortedDevices) {
      const deviceContacts: Contact[] = [];
      const maxForThisDevice = Math.min(
        contactsPerDevice,
        device.capabilities.maxContactsPerImport,
        contacts.length - contactIndex
      );

      for (
        let i = 0;
        i < maxForThisDevice && contactIndex < contacts.length;
        i++
      ) {
        deviceContacts.push(contacts[contactIndex++]);
      }

      if (deviceContacts.length > 0) {
        groups.push({
          deviceId: device.id,
          deviceName: device.name,
          contacts: deviceContacts,
          status: ImportStatus.PENDING,
          metadata: {
            estimatedDuration: this.estimateImportDuration(
              deviceContacts.length
            ),
            priority: 1,
            retryCount: 0,
          },
        });
      }
    }

    // 如果还有剩余联系人，采用循环分配
    let deviceIndex = 0;
    while (contactIndex < contacts.length && groups.length > 0) {
      const group = groups[deviceIndex % groups.length];
      const device = devices.find(d => d.id === group.deviceId);
      const maxContacts = device?.capabilities?.maxContactsPerImport || 100; // 默认限制
      
      if (group.contacts.length < maxContacts) {
        group.contacts.push(contacts[contactIndex++]);
      }
      deviceIndex++;
    }

    return groups;
  }

  validateDistribution(groups: ContactDeviceGroup[]): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (groups.length === 0) {
      errors.push("没有生成任何设备分组");
      return { valid: false, warnings, errors };
    }

    // 检查每个分组
    for (const group of groups) {
      if (group.contacts.length === 0) {
        warnings.push(`设备 ${group.deviceName} 没有分配到联系人`);
      }

      // 检查是否超过设备限制（需要访问设备能力信息）
      // 这里简化处理，假设每个设备最多支持1000个联系人
      if (group.contacts.length > 1000) {
        errors.push(
          `设备 ${group.deviceName} 分配的联系人数量 (${group.contacts.length}) 超过限制`
        );
      }
    }

    // 检查分配平衡性
    const stats = this.getDistributionStats(groups);
    if (stats.balance < 0.7) {
      warnings.push(
        `联系人分配不够平衡 (平衡度: ${(stats.balance * 100).toFixed(1)}%)`
      );
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  getDistributionStats(groups: ContactDeviceGroup[]): {
    totalContacts: number;
    deviceCount: number;
    averageContactsPerDevice: number;
    minContactsPerDevice: number;
    maxContactsPerDevice: number;
    balance: number;
  } {
    if (groups.length === 0) {
      return {
        totalContacts: 0,
        deviceCount: 0,
        averageContactsPerDevice: 0,
        minContactsPerDevice: 0,
        maxContactsPerDevice: 0,
        balance: 0,
      };
    }

    const contactCounts = groups.map((g) => g.contacts.length);
    const totalContacts = contactCounts.reduce((sum, count) => sum + count, 0);
    const averageContactsPerDevice = totalContacts / groups.length;
    const minContactsPerDevice = Math.min(...contactCounts);
    const maxContactsPerDevice = Math.max(...contactCounts);

    // 计算平衡度 (1 - 标准差/平均值)
    const variance =
      contactCounts.reduce((sum, count) => {
        return sum + Math.pow(count - averageContactsPerDevice, 2);
      }, 0) / groups.length;
    const standardDeviation = Math.sqrt(variance);
    const balance =
      averageContactsPerDevice > 0
        ? Math.max(0, 1 - standardDeviation / averageContactsPerDevice)
        : 0;

    return {
      totalContacts,
      deviceCount: groups.length,
      averageContactsPerDevice,
      minContactsPerDevice,
      maxContactsPerDevice,
      balance,
    };
  }

  private estimateImportDuration(contactCount: number): number {
    // 估算每个联系人导入需要2秒
    return contactCount * 2;
  }
}

/**
 * 顺序导入策略
 * 按照设备顺序依次填充联系人
 */
export class SequentialImportStrategy implements IImportStrategy {
  getName(): string {
    return "Sequential Import";
  }

  getDescription(): string {
    return "顺序导入策略：按设备顺序依次填充联系人，优先使用第一个设备，满了再使用下一个设备。";
  }

  distributeContacts(
    contacts: Contact[],
    devices: Device[]
  ): ContactDeviceGroup[] {
    if (contacts.length === 0 || devices.length === 0) {
      return [];
    }

    const groups: ContactDeviceGroup[] = [];
    let contactIndex = 0;

    for (const device of devices) {
      if (contactIndex >= contacts.length) break;

      const deviceContacts: Contact[] = [];
      const maxForThisDevice = Math.min(
        device.capabilities.maxContactsPerImport,
        contacts.length - contactIndex
      );

      for (let i = 0; i < maxForThisDevice; i++) {
        deviceContacts.push(contacts[contactIndex++]);
      }

      groups.push({
        deviceId: device.id,
        deviceName: device.name,
        contacts: deviceContacts,
        status: ImportStatus.PENDING,
        metadata: {
          estimatedDuration: this.estimateImportDuration(deviceContacts.length),
          priority: groups.length + 1,
          retryCount: 0,
        },
      });
    }

    return groups;
  }

  validateDistribution(groups: ContactDeviceGroup[]): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (groups.length === 0) {
      errors.push("没有生成任何设备分组");
    }

    // 顺序策略的特点是可能分配不均匀，这是正常的
    const stats = this.getDistributionStats(groups);
    if (stats.balance < 0.3) {
      warnings.push("顺序导入策略可能导致设备间联系人数量差异较大");
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  getDistributionStats(groups: ContactDeviceGroup[]): {
    totalContacts: number;
    deviceCount: number;
    averageContactsPerDevice: number;
    minContactsPerDevice: number;
    maxContactsPerDevice: number;
    balance: number;
  } {
    // 使用与BalancedImportStrategy相同的统计计算
    const strategy = new BalancedImportStrategy();
    return strategy.getDistributionStats(groups);
  }

  private estimateImportDuration(contactCount: number): number {
    return contactCount * 2;
  }
}

/**
 * 随机导入策略
 * 随机将联系人分配到设备
 */
export class RandomImportStrategy implements IImportStrategy {
  getName(): string {
    return "Random Import";
  }

  getDescription(): string {
    return "随机导入策略：随机将联系人分配到设备，可以避免某些特定的分配模式。";
  }

  distributeContacts(
    contacts: Contact[],
    devices: Device[]
  ): ContactDeviceGroup[] {
    if (contacts.length === 0 || devices.length === 0) {
      return [];
    }

    // 初始化分组
    const groups: ContactDeviceGroup[] = devices.map((device) => ({
      deviceId: device.id,
      deviceName: device.name,
      contacts: [],
      status: ImportStatus.PENDING,
      metadata: {
        estimatedDuration: 0,
        priority: Math.random(),
        retryCount: 0,
      },
    }));

    // 随机打乱联系人顺序
    const shuffledContacts = [...contacts].sort(() => Math.random() - 0.5);

    // 随机分配联系人
    for (const contact of shuffledContacts) {
      // 找到可以接收联系人的设备（未达到最大容量）
      const availableGroups = groups.filter((group) => {
        const device = devices.find((d) => d.id === group.deviceId);
        return (
          device &&
          group.contacts.length < device.capabilities.maxContactsPerImport
        );
      });

      if (availableGroups.length > 0) {
        // 随机选择一个可用的设备
        const randomIndex = Math.floor(Math.random() * availableGroups.length);
        availableGroups[randomIndex].contacts.push(contact);
      }
    }

    // 更新预估时间
    groups.forEach((group) => {
      if (group.metadata) {
        group.metadata.estimatedDuration = this.estimateImportDuration(
          group.contacts.length
        );
      }
    });

    // 过滤掉没有联系人的分组
    return groups.filter((group) => group.contacts.length > 0);
  }

  validateDistribution(groups: ContactDeviceGroup[]): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (groups.length === 0) {
      errors.push("没有生成任何设备分组");
    }

    warnings.push("随机分配策略的结果可能不可预测，请确认分配结果符合预期");

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  getDistributionStats(groups: ContactDeviceGroup[]): {
    totalContacts: number;
    deviceCount: number;
    averageContactsPerDevice: number;
    minContactsPerDevice: number;
    maxContactsPerDevice: number;
    balance: number;
  } {
    const strategy = new BalancedImportStrategy();
    return strategy.getDistributionStats(groups);
  }

  private estimateImportDuration(contactCount: number): number {
    return contactCount * 2;
  }
}

/**
 * 策略工厂
 */
export class ImportStrategyFactory {
  private static readonly strategies = new Map<string, () => IImportStrategy>([
    ["balanced", () => new BalancedImportStrategy()],
    ["sequential", () => new SequentialImportStrategy()],
    ["random", () => new RandomImportStrategy()],
  ]);

  static create(strategyType: string): IImportStrategy {
    const factory = this.strategies.get(strategyType.toLowerCase());
    if (!factory) {
      throw new Error(`未知的导入策略: ${strategyType}`);
    }
    return factory();
  }

  static getAvailableStrategies(): {
    type: string;
    name: string;
    description: string;
  }[] {
    return Array.from(this.strategies.keys()).map((type) => {
      const strategy = this.create(type);
      return {
        type,
        name: strategy.getName(),
        description: strategy.getDescription(),
      };
    });
  }

  static registerStrategy(type: string, factory: () => IImportStrategy): void {
    this.strategies.set(type.toLowerCase(), factory);
  }
}
