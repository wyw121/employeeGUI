# ADB设备监听配置说明

## 问题描述

之前的版本中，ADB设备监听默认每3秒轮询一次设备状态，导致日志频繁输出：

```
2025-09-17T11:03:16.134248Z  INFO employee_gui::services::safe_adb_manager: 🚀 开始安全的ADB设备检测...
2025-09-17T11:03:16.134527Z  INFO employee_gui::services::safe_adb_manager: 🔍 检查当前目录ADB路径...
...
```

## 解决方案

### 1. 修改默认轮询间隔

将设备监听的轮询间隔从 **3秒** 改为 **30秒**，减少日志输出频率。

### 2. 新增配置选项

在 `AdbConfig` 中添加了两个新的配置选项：

```typescript
export class AdbConfig {
  constructor(
    // ... 其他配置
    public readonly enableDeviceWatching: boolean = true,    // 是否启用设备监听
    public readonly deviceWatchInterval: number = 30000     // 设备监听间隔(毫秒)
  ) {}
}
```

### 3. 配置方法

#### 方法1：使用静默配置（推荐）

```typescript
import { AdbConfig } from '@/domain/adb/entities/AdbConnection';
import { useAdb } from '@/application/hooks/useAdb';

const { initialize } = useAdb();

// 使用静默配置，完全禁用设备监听
await initialize(AdbConfig.silent());
```

#### 方法2：自定义配置

```typescript
// 禁用设备监听
const configWithoutWatching = AdbConfig.default().withDeviceWatchingDisabled();
await initialize(configWithoutWatching);

// 或者自定义轮询间隔
const customConfig = new AdbConfig(
  'auto',                 // adb路径
  true,                   // 自动检测路径
  undefined,              // ldPlayer路径
  true,                   // 自动检测ldPlayer
  5037,                   // 服务器端口
  30000,                  // 命令超时
  true,                   // 启用设备监听
  60000                   // 60秒轮询间隔
);
await initialize(customConfig);
```

#### 方法3：运行时禁用

```typescript
const { initialize, updateConfig } = useAdb();

// 先正常初始化
await initialize();

// 然后禁用设备监听
await updateConfig(AdbConfig.default().withDeviceWatchingDisabled());
```

## 配置效果

### 默认配置 (30秒轮询)
- 设备监听：**启用**
- 轮询间隔：**30秒**
- 日志频率：中等

### 静默配置 (推荐用于不需要实时设备监听的场景)
- 设备监听：**禁用**
- 轮询间隔：不适用
- 日志频率：最低

### 自定义配置
- 可灵活控制轮询间隔
- 适合不同使用场景

## 使用建议

1. **后台服务**：使用 `AdbConfig.silent()` 禁用设备监听
2. **设备管理页面**：使用默认配置，实时监听设备变化
3. **一次性操作**：使用静默配置，减少不必要的轮询
4. **开发调试**：可以设置更短的轮询间隔（如10秒）

## 实现细节

### 文件修改列表

- `src/domain/adb/entities/AdbConnection.ts` - 添加配置选项
- `src/application/services/AdbApplicationService.ts` - 支持配置检查
- `src/infrastructure/repositories/TauriDeviceRepository.ts` - 可配置轮询间隔
- `src/domain/adb/repositories/IDeviceRepository.ts` - 接口更新
- `src/domain/adb/services/DeviceManagerService.ts` - 传递配置参数

### 兼容性

- 所有现有代码无需修改
- 默认行为向后兼容
- 新配置选项可选

## 验证方法

1. 使用静默配置启动应用
2. 观察日志输出频率
3. 检查设备监听功能是否按预期工作

```typescript
// 测试代码示例
const { initialize, devices } = useAdb();

// 静默模式 - 应该不会有轮询日志
await initialize(AdbConfig.silent());

// 手动刷新设备 - 应该正常工作
await refreshDevices();
console.log('设备列表:', devices);
```