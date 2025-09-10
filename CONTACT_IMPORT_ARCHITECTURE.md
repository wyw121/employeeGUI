# 联系人导入模块 - 高内聚低耦合架构设计

## 🎯 设计目标

1. **高内聚**：每个模块专注单一职责，内部功能紧密相关
2. **低耦合**：模块间通过清晰接口交互，减少直接依赖
3. **可扩展**：支持多种联系人格式、多种设备类型、多种导入策略
4. **可测试**：每个模块都可以独立测试
5. **可维护**：代码结构清晰，易于理解和修改

## 📁 模块结构设计

```
src/modules/contact-import/
├── core/                          # 核心业务逻辑
│   ├── ContactImporter.ts         # 导入器核心类
│   ├── ImportStrategy.ts          # 导入策略接口
│   └── ImportContext.ts           # 导入上下文
├── parsers/                       # 联系人解析器
│   ├── IContactParser.ts          # 解析器接口
│   ├── VcfParser.ts              # VCF格式解析器
│   ├── CsvParser.ts              # CSV格式解析器
│   └── JsonParser.ts             # JSON格式解析器
├── formatters/                    # 格式转换器
│   ├── IContactFormatter.ts      # 格式化器接口
│   ├── VcfFormatter.ts           # VCF格式化器
│   └── AndroidFormatter.ts       # Android格式化器
├── devices/                       # 设备管理
│   ├── IDeviceManager.ts         # 设备管理器接口
│   ├── AndroidDeviceManager.ts   # Android设备管理
│   └── DeviceDetector.ts         # 设备检测
├── strategies/                    # 导入策略
│   ├── BasicImportStrategy.ts    # 基础导入策略
│   ├── BalancedImportStrategy.ts # 平衡导入策略
│   └── CustomImportStrategy.ts   # 自定义导入策略
├── storage/                       # 存储管理
│   ├── IFileStorage.ts           # 文件存储接口
│   ├── TempFileManager.ts        # 临时文件管理
│   └── CacheManager.ts           # 缓存管理
├── validation/                    # 验证模块
│   ├── ContactValidator.ts       # 联系人验证
│   └── DeviceValidator.ts        # 设备验证
├── events/                        # 事件系统
│   ├── ImportEventEmitter.ts     # 事件发射器
│   └── ImportEvents.ts           # 事件定义
├── ui/                           # UI组件
│   ├── ContactImportWizard.tsx   # 导入向导
│   ├── ContactSelector.tsx       # 联系人选择器
│   ├── DeviceSelector.tsx        # 设备选择器
│   └── ImportProgress.tsx        # 导入进度
├── hooks/                        # React Hooks
│   ├── useContactImport.ts       # 导入逻辑Hook
│   ├── useDeviceManager.ts       # 设备管理Hook
│   └── useImportProgress.ts      # 进度管理Hook
├── types/                        # 类型定义
│   ├── Contact.ts                # 联系人类型
│   ├── Device.ts                 # 设备类型
│   └── ImportResult.ts           # 导入结果类型
├── utils/                        # 工具函数
│   ├── FileUtils.ts              # 文件工具
│   ├── ValidationUtils.ts        # 验证工具
│   └── FormatUtils.ts            # 格式工具
└── index.ts                      # 模块入口
```

## 🔧 核心设计原则

### 1. 依赖注入模式
```typescript
// 通过接口注入依赖，而不是硬编码实现
class ContactImporter {
  constructor(
    private parser: IContactParser,
    private formatter: IContactFormatter,
    private deviceManager: IDeviceManager,
    private strategy: ImportStrategy
  ) {}
}
```

### 2. 策略模式
```typescript
// 不同的导入策略可以动态切换
interface ImportStrategy {
  execute(contacts: Contact[], devices: Device[]): Promise<ImportResult>;
}
```

### 3. 观察者模式
```typescript
// 事件驱动的进度通知
class ImportEventEmitter {
  emit(event: ImportEvent): void;
  on(eventType: string, callback: (event: ImportEvent) => void): void;
}
```

### 4. 工厂模式
```typescript
// 根据文件类型自动选择合适的解析器
class ParserFactory {
  static create(fileType: string): IContactParser;
}
```

## 📋 接口定义示例

### 联系人解析器接口
```typescript
interface IContactParser {
  parse(fileContent: string): Promise<Contact[]>;
  validateFormat(content: string): boolean;
  getSupportedExtensions(): string[];
}
```

### 设备管理器接口
```typescript
interface IDeviceManager {
  detectDevices(): Promise<Device[]>;
  validateDevice(device: Device): Promise<boolean>;
  getDeviceCapabilities(device: Device): Promise<DeviceCapabilities>;
}
```

### 导入策略接口
```typescript
interface ImportStrategy {
  distribute(contacts: Contact[], devices: Device[]): ContactDeviceGroup[];
  validate(groups: ContactDeviceGroup[]): ValidationResult;
  execute(groups: ContactDeviceGroup[]): Promise<ImportResult>;
}
```

## 🔄 数据流设计

```
文件选择 → 格式检测 → 解析器选择 → 联系人解析 → 验证 → 设备检测 → 策略选择 → 分组分配 → 格式转换 → 设备导入 → 结果反馈
```

## 🎨 UI组件架构

### 导入向导组件
```typescript
const ContactImportWizard = () => {
  const { parser, formatter, deviceManager, strategy } = useContactImport();
  
  return (
    <ImportWizardProvider>
      <FileSelector onFileSelect={handleFileSelect} />
      <ContactPreview contacts={contacts} />
      <DeviceSelector devices={devices} />
      <StrategySelector onStrategyChange={handleStrategyChange} />
      <ImportProgress progress={progress} />
    </ImportWizardProvider>
  );
};
```

## 🧪 测试策略

### 单元测试
- 每个解析器独立测试
- 每个格式化器独立测试
- 每个策略独立测试

### 集成测试
- 完整导入流程测试
- 不同设备类型测试
- 异常情况处理测试

### Mock测试
```typescript
// 使用Mock对象隔离测试
const mockDeviceManager = {
  detectDevices: jest.fn().mockResolvedValue(mockDevices),
  validateDevice: jest.fn().mockResolvedValue(true)
};
```

## 🚀 扩展性设计

### 新增文件格式支持
只需要实现 `IContactParser` 接口，不影响其他模块

### 新增设备类型支持
只需要实现 `IDeviceManager` 接口，不影响其他模块

### 新增导入策略
只需要实现 `ImportStrategy` 接口，可以热插拔

## 🔒 错误处理和日志

### 统一错误处理
```typescript
class ImportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
  }
}
```

### 结构化日志
```typescript
interface ImportLog {
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
  module: string;
  message: string;
  context?: any;
}
```

## 💡 性能优化

1. **懒加载**：只有用到的解析器才会被加载
2. **缓存机制**：解析结果和设备信息缓存
3. **并行处理**：多设备导入并行执行
4. **进度反馈**：实时进度更新，提升用户体验

## 🎯 实现优先级

1. **Phase 1**: 核心接口定义和基础实现
2. **Phase 2**: VCF解析器和Android设备管理
3. **Phase 3**: 平衡导入策略和UI组件
4. **Phase 4**: 错误处理和性能优化
5. **Phase 5**: 扩展功能和高级特性
