/**
 * 领域事件基类
 */
export abstract class DomainEvent {
  public readonly timestamp: Date;
  public readonly eventId: string;

  constructor() {
    this.timestamp = new Date();
    this.eventId = crypto.randomUUID();
  }

  abstract getEventName(): string;
}

/**
 * 设备连接事件
 */
export class DeviceConnectedEvent extends DomainEvent {
  constructor(public readonly deviceId: string, public readonly deviceName: string) {
    super();
  }

  getEventName(): string {
    return 'DeviceConnected';
  }
}

/**
 * 设备断开事件
 */
export class DeviceDisconnectedEvent extends DomainEvent {
  constructor(public readonly deviceId: string, public readonly reason?: string) {
    super();
  }

  getEventName(): string {
    return 'DeviceDisconnected';
  }
}

/**
 * 设备状态变更事件
 */
export class DeviceStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly deviceId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    super();
  }

  getEventName(): string {
    return 'DeviceStatusChanged';
  }
}

/**
 * ADB连接状态变更事件
 */
export class AdbConnectionStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly adbPath: string
  ) {
    super();
  }

  getEventName(): string {
    return 'AdbConnectionStatusChanged';
  }
}

/**
 * 诊断完成事件
 */
export class DiagnosticCompletedEvent extends DomainEvent {
  constructor(
    public readonly totalChecks: number,
    public readonly errorCount: number,
    public readonly warningCount: number
  ) {
    super();
  }

  getEventName(): string {
    return 'DiagnosticCompleted';
  }
}

/**
 * 事件处理器接口
 */
export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: DomainEventHandler<T>
  ): void;
}

