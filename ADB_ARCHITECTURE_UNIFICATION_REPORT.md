# ADB 架构统一报告

## 📋 架构现状总览

**日期**: 2025年9月21日  
**状态**: ✅ DDD 架构已完整实现  
**版本**: v2.0

---

## 🏗️ 当前架构状态

### 📊 统计数据

基于最新代码扫描结果：

| 指标 | 当前状态 |
|------|----------|
| `useAdb()` 使用次数 | 20+ 处 |
| `useAdbStore` 集成度 | 完整覆盖 |
| DDD 分层架构 | ✅ 已实现 |
| 统一接口采用率 | 高度统一 |

### 🎯 核心架构组件

#### 1. **领域层 (Domain Layer)**
```
src/domain/adb/
├── entities/
│   ├── Device.ts              # 设备实体
│   ├── AdbConnection.ts       # ADB连接实体
│   └── DiagnosticResult.ts    # 诊断结果实体
├── repositories/
│   ├── IDeviceRepository.ts   # 设备仓储接口
│   ├── IAdbRepository.ts      # ADB仓储接口
│   └── IDiagnosticRepository.ts # 诊断仓储接口
└── services/
    ├── DeviceManagerService.ts  # 设备管理服务
    ├── ConnectionService.ts     # 连接服务
    └── DiagnosticService.ts     # 诊断服务
```

#### 2. **应用层 (Application Layer)**
```
src/application/
├── store/
│   └── adbStore.ts           # Zustand 统一状态管理
├── services/
│   ├── AdbApplicationService.ts # 应用服务门面
│   └── ServiceFactory.ts    # 依赖注入容器
└── hooks/
    ├── useAdb.ts             # 统一 React Hook
    └── useRealTimeDevices.ts # 实时设备监控
```

#### 3. **基础设施层 (Infrastructure Layer)**
```
src/infrastructure/
└── repositories/
    ├── TauriAdbRepository.ts    # Tauri ADB实现
    ├── TauriDeviceRepository.ts # Tauri 设备实现
    └── TauriDiagnosticRepository.ts # Tauri 诊断实现
```

## ✅ 核心架构特性

### 1. **统一接口模式**

#### `useAdb()` Hook
作为所有 ADB 功能的**唯一入口**，在以下组件中广泛使用：

```typescript
// 设备管理页面
const { devices, refreshDevices } = useAdb();

// 智能脚本构建器
const { devices, selectedDevice } = useAdb();

// 小红书关注功能
const { 
  devices, 
  selectedDevice, 
  selectDevice,
  refreshDevices 
} = useAdb();
```

**使用范围**：

### 4. 匹配策略（Matching Strategy）

为适配不同设备、屏幕与分辨率，统一引入“策略化匹配”模型，并通过端到端路径打通：UI 预设 → `useAdb()` → 应用服务 → Tauri 仓储 → Rust 命令。

- 支持的策略：
  - `absolute`：绝对定位，包含 `bounds/index` 等位置字段，最精确但跨设备脆弱
  - `strict`：严格匹配，常用语义字段组合（`resource-id/text/content-desc/class/package`）
  - `relaxed`：宽松匹配，少数字段或模糊匹配
  - `positionless`：无位置匹配，忽略位置相关字段
  - `standard`：标准匹配（新增）—面向跨设备的稳定匹配，仅使用语义字段，忽略位置/分辨率差异

- 端到端调用路径：
  1) 前端 Inspector 网格视图 → 右侧节点详情 → 预设行（`MatchPresetsRow.tsx`）选择 `标准匹配`
  2) 将 `criteria = { strategy: 'standard', fields, values }` 通过上层回调或“修改参数”写回步骤参数
  3) 通过统一接口 `useAdb().matchElementByCriteria(deviceId, criteria)` 下发
  4) 应用服务 `AdbApplicationService.matchElementByCriteria`
  5) Tauri 仓储 `TauriUiMatcherRepository.matchByCriteria` → `invoke('match_element_by_criteria')`
  6) Rust `xml_judgment_service::match_element_by_criteria` 中对 `standard` 策略自动忽略位置字段，仅按语义字段匹配

- 步骤卡 UI：在 `DraggableStepCard` 中通过 `MatchingStrategyTag` 渲染当前步骤 `parameters.matching.strategy`，确保策略可见性与可维护性。

### 2. **状态管理统一**

#### `useAdbStore` - Zustand 全局状态
```typescript
// 单一数据源
interface AdbState {
  connection: AdbConnection | null;
  config: AdbConfig;
  devices: Device[];
  selectedDeviceId: string | null;
  diagnosticResults: DiagnosticResult[];
  isLoading: boolean;
  lastError: Error | null;
}
```

#### 状态选择器
```typescript
export const useSelectedDevice = () => useAdbStore(state => state.getSelectedDevice());
export const useOnlineDevices = () => useAdbStore(state => state.getOnlineDevices());
export const useIsConnected = () => useAdbStore(state => state.isConnected());
export const useDiagnosticResults = () => useAdbStore(state => state.diagnosticResults);
```

### 3. **适配器模式集成**

#### UnifiedAdbDeviceManager
为 contact-import 模块提供统一接口适配：

```typescript
export class UnifiedAdbDeviceManager implements IDeviceManager {
  async getDevices(): Promise<Device[]> {
    const store = useAdbStore.getState();
    return store.devices.map(this.adaptAdbDeviceToContactDevice);
  }
  
  async validateDevice(deviceId: string): Promise<ValidationResult> {
    const store = useAdbStore.getState();
    // 通过统一的设备状态进行验证
  }
}
```

---

## 🎯 架构优势

### 1. **单一数据源**
- 所有设备状态集中在 `useAdbStore`
- 消除状态不一致和竞态条件
- 简化调试和状态追踪

### 2. **类型安全**
- 完整的 TypeScript 领域实体
- 编译时错误检测
- 更好的开发体验和IDE支持

### 3. **可维护性**
- 清晰的DDD分层架构
- 明确的依赖关系
- 易于扩展和测试

### 4. **性能优化**
- 细粒度状态选择器避免不必要的重渲染
- 记忆化的actions防止无限循环
- 高效的状态订阅机制

---

## � 开发规范

### ✅ 推荐模式

```typescript
// 1. 使用统一Hook
const { devices, selectedDevice, refreshDevices } = useAdb();

// 2. 细粒度状态订阅
const devices = useAdbStore(state => state.devices);
const isLoading = useAdbStore(state => state.isLoading);

// 3. 应用服务调用
const appService = ServiceFactory.getAdbApplicationService();
await appService.refreshDevices();
```

### ❌ 已废弃模式

```typescript
// 已移除的废弃导出
// export const useDevices = () => useAdbStore(state => state.devices); // ✅ 废弃
```

### 🎯 合理的UI状态

以下状态被确认为**合理的UI状态**，不违反架构原则：

#### ContactImportWizard.tsx
```typescript
// ✅ 合理：用户设备选择的临时UI状态
const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
```

#### useRealTimeDevices.ts
```typescript
// ✅ 合理：实时设备追踪的扩展状态
const [trackedDevices, setTrackedDevices] = useState<TrackedDevice[]>([]);
```

**理由**: 这些是纯UI交互状态或扩展业务状态，不冲突核心设备数据管理。

---

## � 质量保证

### 当前架构健康度

| 维度 | 状态 | 评价 |
|------|------|------|
| 接口统一性 | ✅ 高度统一 | `useAdb()` 广泛采用 |
| 状态管理 | ✅ 集中化 | Zustand 单一Store |
| 类型安全 | ✅ 完整覆盖 | TypeScript 领域实体 |
| 架构分层 | ✅ 清晰明确 | DDD 标准实现 |
| 代码质量 | ✅ 高标准 | 无重复逻辑 |

### 维护建议

1. **持续监控**: 定期检查新代码是否遵循统一接口
2. **文档更新**: 及时更新架构文档和开发指南
3. **团队培训**: 确保团队成员理解DDD架构原则
4. **自动化检查**: 考虑在CI/CD中加入架构合规性检查

---

## 🚀 未来发展方向

### 短期目标
- [ ] 完善单元测试覆盖率
- [ ] 添加集成测试用例
- [ ] 优化错误处理机制

### 长期规划
- [ ] 探索微前端架构适配
- [ ] 引入领域事件系统
- [ ] 增强实时通信能力

---

## 📝 总结

本项目已成功实现了**高度统一的ADB架构**，通过DDD设计原则和现代React模式，建立了：

✅ **统一的数据流**: `useAdbStore` → `useAdb()` → Components  
✅ **清晰的分层架构**: Domain → Application → Infrastructure → Presentation  
✅ **高质量的代码**: TypeScript + 类型安全 + 无重复逻辑  
✅ **优秀的开发体验**: 统一接口 + 细粒度状态管理  

这为项目的长期维护和扩展奠定了坚实的基础。

---

*最后更新: 2025年9月21日*  
*架构版本: DDD v2.0*  
*状态: 生产就绪*