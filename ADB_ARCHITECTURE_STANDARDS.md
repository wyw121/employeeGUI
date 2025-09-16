# ADB 架构统一性规范

## 📋 概述

本文档定义了项目中 ADB 相关功能的架构规范，确保所有 ADB 操作都通过统一接口实现，避免分散的状态管理和功能重复。

## 🎯 核心原则

### 1. 单一数据源 (Single Source of Truth)
- 所有 ADB 设备状态必须通过 `useAdbStore` 管理
- 禁止在组件中使用 `useState` 管理设备列表或设备状态
- 所有设备信息都必须来自统一的 Store

### 2. 统一接口访问
- **必须使用**: `useAdb()` Hook 作为唯一的 ADB 功能入口
- **禁止直接调用**: 
  - `adbService` 
  - `AdbDiagnosticService`
  - `DeviceManagerService` 
  - 其他底层服务

### 3. DDD 架构分层
```
src/
├── domain/adb/           # 域层 - 实体、仓储接口、域服务
├── application/          # 应用层 - useAdb() Hook、状态管理
├── infrastructure/       # 基础设施层 - Tauri 实现
└── components/           # 表现层 - React 组件
```

## ✅ 正确用法

### 在 React 组件中使用 ADB 功能

```typescript
import { useAdb } from '@/application/hooks/useAdb';

export const MyComponent: React.FC = () => {
  const { 
    devices,           // 设备列表
    selectedDevice,    // 当前选中设备
    onlineDevices,     // 在线设备
    isConnected,       // 连接状态
    refreshDevices,    // 刷新设备
    connectToDevice,   // 连接设备
    selectDevice,      // 选择设备
    runFullDiagnostic  // 运行诊断
  } = useAdb();

  // 使用设备信息
  return (
    <div>
      {onlineDevices.map(device => (
        <div key={device.id}>
          {device.getDisplayName()}
        </div>
      ))}
    </div>
  );
};
```

### 扩展现有功能
如果需要 ADB 相关的新功能，应该：
1. 在 `domain/adb` 中添加新的领域逻辑
2. 在 `useAdb()` Hook 中暴露新接口
3. 通过 `AdbApplicationService` 协调各服务

## ❌ 禁止的反模式

### 1. 组件中直接管理设备状态
```typescript
// ❌ 错误 - 分散的设备状态管理
const [devices, setDevices] = useState<Device[]>([]);
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

// ✅ 正确 - 使用统一接口
const { devices, selectedDevice, selectDevice } = useAdb();
```

### 2. 直接调用底层服务
```typescript
// ❌ 错误 - 绕过统一接口
import { adbService } from '@/services/adbService';
const devices = await adbService.getDevices();

// ✅ 正确 - 使用统一接口
const { refreshDevices } = useAdb();
await refreshDevices();
```

### 3. 创建新的设备管理状态
```typescript
// ❌ 错误 - 重复的状态管理
const [deviceMap, setDeviceMap] = useState<Map<string, Device>>(new Map());

// ✅ 正确 - 使用统一状态
const { getDeviceById } = useAdb();
const device = getDeviceById(deviceId);
```

## 🔧 适配器模式支持

对于需要特定接口的模块（如 contact-import），应该创建适配器：

```typescript
// 适配器示例
import { UnifiedAdbDeviceManager } from '@/modules/contact-import/adapters/UnifiedAdbDeviceManager';

// 这个适配器将 useAdb() 接口适配为模块特定的接口
const deviceManager = new UnifiedAdbDeviceManager();
```

## 📝 代码审查检查清单

在代码审查时，请检查以下项目：

### ✅ 通过条件
- [ ] 所有 ADB 设备操作都通过 `useAdb()` Hook
- [ ] 没有在组件中使用 `useState` 管理设备状态
- [ ] 没有直接调用底层 ADB 服务
- [ ] 遵循 DDD 分层架构约束
- [ ] 新的 ADB 功能通过 `useAdb()` 暴露

### ❌ 拒绝条件
- [ ] 发现 `useState<Device[]>` 或类似的设备状态管理
- [ ] 直接导入和使用 `adbService`、`AdbDiagnosticService` 等
- [ ] 创建新的设备相关状态管理逻辑
- [ ] 绕过 `useAdb()` Hook 的 ADB 操作

## 🚀 最佳实践

### 1. 初始化模式
```typescript
export const MyComponent: React.FC = () => {
  const { initialize, refreshDevices } = useAdb();

  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
      } catch (error) {
        console.error('ADB 初始化失败:', error);
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices]);

  // ... 组件逻辑
};
```

### 2. 错误处理模式
```typescript
const { lastError, clearError } = useAdb();

useEffect(() => {
  if (lastError) {
    message.error(`ADB 错误: ${lastError.message}`);
    clearError();
  }
}, [lastError, clearError]);
```

### 3. 设备选择模式
```typescript
const { onlineDevices, selectedDevice, selectDevice } = useAdb();

// 自动选择第一个在线设备
useEffect(() => {
  if (!selectedDevice && onlineDevices.length > 0) {
    selectDevice(onlineDevices[0].id);
  }
}, [selectedDevice, onlineDevices, selectDevice]);
```

## 📊 架构健康度指标

### 目标指标
- **统一接口覆盖率**: 95%+ 的 ADB 操作通过 `useAdb()`
- **分散状态数量**: 0 个 `useState<Device>` 模式
- **直接服务调用**: 0 个绕过 `useAdb()` 的调用

### 监控方法
可以使用以下 ESLint 规则来自动检测违规：

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["**/services/adbService", "**/services/AdbDiagnosticService"],
          "message": "请使用 useAdb() Hook 替代直接调用 ADB 服务"
        }
      ]
    }]
  }
}
```

## 🔮 未来扩展计划

### 短期目标
1. 完成所有现有组件向 `useAdb()` 的迁移
2. 创建 ESLint 规则自动检测违规
3. 添加单元测试确保架构一致性

### 长期目标
1. 扩展 `useAdb()` 支持更多 ADB 功能
2. 实现设备状态的实时同步
3. 添加设备性能监控和诊断能力

## 📚 相关文档

- [useAdb() API 文档](./API.md)
- [DDD 架构指南](./ARCHITECTURE.md)
- [设备实体设计](./ENTITIES.md)
- [状态管理模式](./STATE_MANAGEMENT.md)

## 🤝 团队协作

### 新功能开发流程
1. 确认是否需要新的 ADB 功能
2. 在 `domain/adb` 中设计领域逻辑
3. 在 `useAdb()` 中暴露新接口
4. 更新此规范文档
5. 通过代码审查确保合规

### 问题报告
如发现违反架构规范的代码，请：
1. 创建 Issue 并标记 `architecture-violation`
2. 提供违规代码的具体位置
3. 建议正确的重构方案

---

**重要提醒**: 本项目已完成 DDD 重构，任何新的 ADB 功能开发都必须基于统一架构。违反架构约束的代码将被拒绝合并。