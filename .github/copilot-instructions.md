# GitHub Copilot 开发指导文档

本文档为 AI 代理开发者提供项目特定的指导和约束，确保代码质量和架构一致性。

## 🎯 项目概述

本项目是一个基于 Tauri + React + TypeScript 的桌面应用程序，专门用于小红书自动化营销工具，包含员工管理、联系人导入、设备管理、ADB 自动化等功能。

**核心技术栈：**

- 前端：React 18 + TypeScript + Tailwind CSS + Ant Design
- 后端：Tauri (Rust)
- 状态管理：Zustand（基于 DDD 架构）
- 构建工具：Vite + npm

## 🏗️ 重要架构约束

### ⚠️ DDD 架构强制要求（重构后生效）

**本项目已完成 DDD（领域驱动设计）重构，严格禁止创建新旧两套代码！**

#### ADB 相关功能开发约束：

1. **强制使用统一接口**

   - ✅ 必须使用：`useAdb()` Hook
   - ❌ 禁止使用：`useAdbDevices`、`useDevices`、`useAdbDiagnostic` 等旧接口
   - ❌ 禁止直接调用：`adbService`、`AdbDiagnosticService` 等底层服务

2. **架构分层严格遵守**

   ```
   src/
   ├── domain/adb/           # 域层（实体、仓储接口、域服务）
   ├── infrastructure/       # 基础设施层（Tauri 实现）
   ├── application/          # 应用层（状态管理、应用服务）
   └── components/           # 表现层（React 组件）
   ```

3. **状态管理统一原则**
   - ✅ 统一状态存储：`src/application/adbStore.ts`
   - ❌ 禁止创建新的状态管理文件
   - ❌ 禁止在组件中直接管理设备状态

#### 代码质量控制规则：

**重复代码检测与合并：**

- 开发任何功能前，必须检查是否存在相似逻辑
- 发现重复代码必须立即重构合并，不允许保留多个版本
- 所有 ADB 相关功能必须通过 `useAdb()` 统一接口实现

**版本控制严格要求：**

- 项目中只允许存在一套代码实现
- 禁止保留已废弃的代码文件
- 新功能开发必须基于最新的 DDD 架构

### 📏 大文件 & 模块化强制约束

为防止出现数千行的“巨石”文件，必须保持子目录 / 子文件的可组合、可演进模块化结构。

#### 绝对硬性阈值（超过即需拆分 / 拒绝合并）

| 类型                            | 单文件建议上限 | 绝对上限（需立即拆分） | 说明                                        |
| ------------------------------- | -------------- | ---------------------- | ------------------------------------------- |
| React 页面级组件 (`/pages/`)    | 400 行         | 600 行                 | 页面负责编排，不承载复杂业务逻辑            |
| 通用可复用组件 (`/components/`) | 300 行         | 450 行                 | 拆分子组件 / 提取 hooks / utils             |
| 自定义 Hook                     | 200 行         | 300 行                 | 拆分为多个关注点更单一的 Hook               |
| 领域服务 / 应用服务             | 300 行         | 400 行                 | 拆分为独立 domain service / helper          |
| Zustand Store 文件              | 250 行         | 350 行                 | 超出时拆分 selector、actions、types、slices |
| Rust 单模块业务文件             | 350 行         | 500 行                 | 拆分为 mod + 子模块，或抽公共函数           |

> 说明：统计时不包含纯类型定义、注释与空行，但若类型块 > 200 行也应拆分 `types.ts` / `dto.ts` / `interfaces.ts` 等。

#### 拆分策略指引

1. 单一职责：若文件承担“渲染 + 复杂状态 + 业务流程 + 工具函数”多重角色，必须分解。
2. 垂直切分优先：按照领域用语 / 业务动作划分，而不是纯“技术层”（例如：`useDeviceFilter.ts`、`useMatchCriteria.ts`）。
3. 提取结构惯例（React）：
   ```
   MyFeature/
   ├─ index.ts                # 导出聚合
   ├─ MyFeatureView.tsx       # 纯展示或页面编排
   ├─ hooks/
   │   ├─ useSomething.ts
   │   └─ useAnother.ts
   ├─ components/
   │   ├─ PartA.tsx
   │   └─ PartB.tsx
   ├─ services/ (可选: 前端适配层)
   ├─ types.ts
   ├─ constants.ts
   └─ utils.ts
   ```
4. 领域服务类过大：把算法/规则提取到纯函数 (`/domain/adb/services/strategies/` 等)。
5. 大量条件分支：优先策略模式 / 表驱动 / handler map，而不是长链 if-else / switch。

#### 允许的少量例外（需在 PR 描述注明理由）

- 自动生成文件（须标注“// AUTO-GENERATED”）
- 外部协议 / 第三方类型汇总（如 OpenAPI 生成）
- Barrel 文件（仅 re-export，不含逻辑）

#### 代码评审必查项（新增）

- 是否新增或修改导致文件超过“建议上限”并接近“绝对上限”
- 是否存在可拆分但被“临时留存”的巨型函数（>80 行）
- 是否可以用“子组件 + hooks + 业务适配层”替代超大组件

#### AI 代理执行准则

1. 当检测到编辑目标文件估算行数 > 建议上限 80% 时，必须：
   - 在回复中提出拆分建议结构
   - 避免继续无节制追加逻辑到同一文件
2. 对 > 绝对上限文件：除紧急修复外，不直接继续追加；优先拆分提交。
3. 若用户指令要求继续在巨型文件添加功能：
   - 先给出“模块化 refactor 方案”
   - 再在用户明确确认后执行最小增量修改
4. 拆分时保持对外 API 不变（通过 `index.ts` 桶文件聚合）。

#### 自动检测（建议后续接入 CI）

- 可编写脚本扫描 `src/**/*.{ts,tsx,rs}` 输出行数 > 阈值列表
- PR 模板加入“文件行数检查”勾选项
- 触发警告时，要求提供“拆分计划 / 不拆分原因”

#### 快速自检 Checklist

```
□ 是否新增/修改文件超过类型建议上限？
□ 是否存在 80+ 行函数？可否拆分语义块？
□ 是否把 UI 与数据派发/转换混在同一组件内？
□ 是否存在重复 util/逻辑可抽离？
□ 是否可以通过 hook 抽离副作用？
```

> 目标：保持“高内聚、小颗粒、可组合”的代码结构，避免形成维护黑洞。

## 📁 项目结构详解

### 核心目录说明：

- **`src/domain/adb/`**: ADB 领域核心

  - `entities/`: 设备、连接、诊断结果等实体
  - `repositories/`: 数据访问接口定义
  - `services/`: 领域业务逻辑

- **`src/application/`**: 应用服务层

  - `adbStore.ts`: 统一状态管理
  - `AdbApplicationService.ts`: 应用服务门面
  - `ServiceFactory.ts`: 依赖注入容器

- **`src/infrastructure/`**: 基础设施实现
  - Tauri 后端调用实现
  - 外部服务适配器

### 页面分析器（Grid Inspector）子模块补充：

- 位置：`src/components/universal-ui/views/grid-view/panels/node-detail/`
  - `MatchingStrategySelector.tsx`：策略选择子组件（absolute/strict/relaxed/positionless/standard）
  - `SelectedFieldsPreview.tsx`：选中字段与值的只读预览子组件
  - 以上组件仅负责展示与选择，状态由上层 `NodeDetailPanel.tsx` 承载，符合模块化扩展原则

补充说明（模块导出与用法）：

- 新增 `index.ts` 桶文件：集中导出 `MatchPresetsRow`、`MatchingStrategySelector`、`SelectedFieldsPreview`、`SelectedFieldsChips` 与 `types`，便于上层按需导入。
- 子模块自述文件：`node-detail/README.md` 描述职责边界、属性约束与最佳导入方式，方便团队协作与后续扩展。
- 推荐导入示例：
  ```ts
  import {
    MatchPresetsRow,
    MatchingStrategySelector,
    SelectedFieldsPreview,
    // types
    MatchStrategy,
    MatchCriteria,
  } from "@/components/universal-ui/views/grid-view/panels/node-detail";
  ```

### 关键配置文件：

- `package.json`: 依赖管理和构建脚本
- `src-tauri/tauri.conf.json`: Tauri 应用配置
- `tailwind.config.js`: 样式配置
- `vite.config.ts`: 构建配置

## 🛠️ 构建和开发命令

### 环境要求：

- Node.js >= 16
- Rust (由 Tauri 管理)
- npm

### 开发命令：

```bash
# 安装依赖（必须在所有操作前执行）
npm install

# 启动开发服务器
npm run tauri dev

# 构建生产版本
npm run tauri build

# 仅前端开发（无 Tauri 功能）
npm run dev
```

### 测试和验证：

```bash
# 运行测试
npm test

# 代码格式检查
npm run lint

# 类型检查
npm run type-check
```

## 🎯 开发规范

### TypeScript 严格要求：

- 必须提供完整的类型定义
- 禁止使用 `any` 类型
- 所有函数必须明确返回类型

### React 组件规范：

- 优先使用函数组件和 Hooks
- 组件名称使用 PascalCase
- Props 接口必须明确定义

### Hook 使用最佳实践：

- **`useAdb()` 使用原则**：
  - 同一页面最多只应在父组件或顶级组件中使用一次
  - 通过 props 向子组件传递需要的数据，而非让每个子组件都调用 `useAdb()`
  - 避免在模态框中的多个子组件同时使用
  - 如需在多个组件中使用，考虑使用 Context 或状态提升

- **防重复调用规则**：
  ```typescript
  // ❌ 错误：多个组件都调用 useAdb()
  function ParentModal() {
    return (
      <Modal>
        <ComponentA /> {/* 内部调用 useAdb() */}
        <ComponentB /> {/* 内部调用 useAdb() */}
        <ComponentC /> {/* 内部调用 useAdb() */}
      </Modal>
    );
  }

  // ✅ 正确：在父组件调用，通过 props 传递
  function ParentModal() {
    const { devices, selectedDevice } = useAdb();
    return (
      <Modal>
        <ComponentA devices={devices} />
        <ComponentB selectedDevice={selectedDevice} />
        <ComponentC devices={devices} />
      </Modal>
    );
  }
  ```

### 导入规范：

```typescript
// 正确的导入方式
import { useAdb } from "@/application/hooks/useAdb";

// 错误的导入方式（已废弃）
import { useAdbDevices } from "@/hooks/useAdbDevices";
```

### CSS 样式约定：

- 使用 Tailwind CSS 实用类
- 组件样式使用 CSS Modules 或 styled-components
- 避免内联样式

## 🚫 严格禁止事项

1. **架构违反**

   - 禁止在表现层直接调用基础设施层
   - 禁止绕过应用层直接访问领域层
   - 禁止创建与现有架构冲突的代码

2. **代码重复**

   - 禁止复制粘贴现有功能代码
   - 发现相似逻辑必须抽象为公共函数
   - 禁止保留多个版本的相同功能

3. **巨型文件 / 非模块化结构**

   - 禁止新增或继续膨胀超过绝对上限的文件
   - 拆分缺失将被视为架构债务
   - 大型组件/服务未拆分且继续新增逻辑的 PR 需驳回

4. **状态管理混乱**
   - 禁止在多个地方管理相同的状态
   - 禁止创建新的状态管理解决方案
   - 必须使用项目统一的状态管理模式

5. **重复调用和性能问题**
   - 禁止多个组件同时调用相同的初始化函数
   - 禁止在同一页面多次调用 `useAdb().refreshDevices()`
   - 必须在 Hook 内部实现防重复调用机制
   - 避免在短时间内重复执行昂贵的操作（如设备检测、文件操作）

## 📋 代码审查检查点

开发完成后必须检查：

1. ✅ 是否使用了正确的 `useAdb()` 接口
2. ✅ 是否遵循了 DDD 分层架构
3. ✅ 是否存在重复代码需要合并
4. ✅ TypeScript 类型是否完整
5. ✅ 是否有未使用的导入或变量
6. ✅ 组件是否可以正常构建和运行
7. ✅ 是否存在超过行数阈值但未给出拆分计划的文件
8. ✅ **新增**：是否存在重复调用初始化函数的风险
9. ✅ **新增**：多个组件同时使用 `useAdb()` 时是否会造成性能问题

## 🎯 AI 代理特别指令

**作为 AI 代理，你必须：**

1. **架构检查优先**：开发任何功能前，先检查现有架构和接口
2. **重复代码零容忍**：发现类似功能立即重构合并，绝不允许重复实现
3. **接口统一强制**：所有 ADB 功能必须通过 `useAdb()` 实现
4. **代码质量保证**：确保类型安全、无警告、可维护性高
5. **文档同步更新**：修改功能时同步更新相关文档
6. **业务价值优先**：专注核心业务功能，避免创建演示、示例或展示性代码
7. **生产就绪标准**：所有代码必须达到生产环境标准，不接受简化版本
8. **主动模块化守护**：发现文件超标或结构臃肿时优先建议/实施拆分，而非继续累积
9. **防重复调用检查**：创建新组件时必须检查是否会导致重复初始化或资源浪费

**禁止行为：**

- 创建与现有功能重复的代码
- 使用已废弃的接口或服务
- 忽略现有的架构约束
- 保留多个版本的相同功能
- 创建简单的演示页面或示例代码
- 构建非业务核心的展示组件
- 将新增逻辑持续堆叠到已超标的巨型文件中而不提出拆分方案
- **新增**：在一个页面/模态框中创建多个同时调用 `useAdb()` 的组件

## 📚 相关文档

- [项目 README](../README.md)
- [ADB 架构统一报告](../ADB_ARCHITECTURE_UNIFICATION_REPORT.md)
- [架构检查脚本](../scripts/check-adb-architecture.js)

---

**重要提醒**：本项目已完成 DDD 重构，任何开发都必须基于新架构。违反架构约束的代码将被拒绝合并。
