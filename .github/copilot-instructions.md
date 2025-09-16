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

### 导入规范：
```typescript
// 正确的导入方式
import { useAdb } from '@/application/hooks/useAdb';

// 错误的导入方式（已废弃）
import { useAdbDevices } from '@/hooks/useAdbDevices';
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

3. **状态管理混乱**
   - 禁止在多个地方管理相同的状态
   - 禁止创建新的状态管理解决方案
   - 必须使用项目统一的状态管理模式

## 📋 代码审查检查点

开发完成后必须检查：

1. ✅ 是否使用了正确的 `useAdb()` 接口
2. ✅ 是否遵循了 DDD 分层架构
3. ✅ 是否存在重复代码需要合并
4. ✅ TypeScript 类型是否完整
5. ✅ 是否有未使用的导入或变量
6. ✅ 组件是否可以正常构建和运行

## 🎯 AI 代理特别指令

**作为 AI 代理，你必须：**

1. **架构检查优先**：开发任何功能前，先检查现有架构和接口
2. **重复代码零容忍**：发现类似功能立即重构合并，绝不允许重复实现
3. **接口统一强制**：所有 ADB 功能必须通过 `useAdb()` 实现
4. **代码质量保证**：确保类型安全、无警告、可维护性高
5. **文档同步更新**：修改功能时同步更新相关文档

**禁止行为：**
- 创建与现有功能重复的代码
- 使用已废弃的接口或服务
- 忽略现有的架构约束
- 保留多个版本的相同功能

## 📚 相关文档

- [项目README](../README.md)
- [ADB架构统一报告](../ADB_ARCHITECTURE_UNIFICATION_REPORT.md)
- [架构检查脚本](../scripts/check-adb-architecture.js)

---

**重要提醒**：本项目已完成 DDD 重构，任何开发都必须基于新架构。违反架构约束的代码将被拒绝合并。