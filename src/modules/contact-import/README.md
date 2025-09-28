# 联系人导入模块（Contact Import）

本模块是“联系人导入向导”的完整实现，基于 DDD 分层与统一 ADB 接口（useAdb）构建，目标是高内聚、易扩展、可阅读。

## 模块目标
- 解析并校验联系人（目前支持 VCF）
- 统一设备抽象（通过 useAdb → 应用服务 → 仓储 → Tauri 命令）
- 多策略分配与导入（顺序/随机/均衡）
- UI 向导与工作台（导入号码池、生成 VCF、分配设备、执行导入、查看会话）

## 目录结构与职责
```
src/modules/contact-import/
├─ adapters/                 # 适配层（将统一 ADB 架构适配为本模块 IDeviceManager）
│  └─ UnifiedAdbDeviceManager.ts
├─ core/                     # 核心编排（导入流程门面）
│  └─ ContactImporter.ts
├─ devices/                  # 设备接口与默认实现（纯前端抽象）
│  └─ IDeviceManager.ts
├─ hooks/                    # React Hooks（统一导入 Hook）
│  └─ useUnifiedContactImport.ts
├─ parsers/                  # 解析器（VCF 等）
│  ├─ IContactParser.ts
│  └─ VcfParser.ts
├─ strategies/               # 分配/导入策略
│  └─ ImportStrategies.ts
├─ types/                    # 类型定义（领域/DTO/配置/枚举）
├─ ui/                       # UI（向导 + 工作台 + 组件）
│  ├─ ContactImportWizard.tsx
│  ├─ ContactImportWorkbench.tsx
│  ├─ components/*
│  ├─ sessions/*
│  └─ batch-manager/*
├─ utils/                    # 工具函数（VCF 生成、命名等）
└─ index.ts                  # Barrel：统一导出公共 API
```

## 与 DDD 架构的映射
- 表现层：`ui/*`（React 组件与交互）
- 应用层：`hooks/useUnifiedContactImport` + `adapters/UnifiedAdbDeviceManager`（通过 `ServiceFactory.getAdbApplicationService()` 与 `useAdbStore` 间接访问设备与命令）
- 领域层：`core/*` + `strategies/*` + `parsers/*`（无 Tauri 依赖，纯 TypeScript 规则与编排）
- 基础设施层：在 `src/infrastructure/*` 与 Tauri Rust 中；本模块不直接依赖，遵循“不得在 UI/领域中直接调用 invoke/仓储”的约束。

## 公共 API（从 `index.ts` 导出）
- Hooks：`useContactImport`, `useImportStats`
- Facade：`ContactImporter`
- Types：`Device/Contact/ImportResult/...`
- 工具：`createContactImporter`, `quickImportContacts`, `validateVcfFormat`, `previewVcfFile`

推荐用法：
```tsx
import { ContactImportWizard } from "@/modules/contact-import";
// 或在页面中：
// <ContactImportWizard />
```

## 文件大小与可读性建议
- `ContactImportWorkbench.tsx` 当前约 570 行，接近页面级上限（600）。建议后续拆分：
  - 将“批次预览/结果/冲突导航”等对话框抽至 `ui/components/export/` 与 `ui/components/result/`（已部分存在），进一步下沉状态与副作用到 hooks。
  - 抽取步骤区块为 `ui/steps/*`（若已有，聚合至 barrel 并解耦 props）。
- `core/ContactImporter.ts` 当前约 565 行，超过“领域/应用服务 400 行”的绝对上限。建议拆分：
  - `ParsingService`（解析校验）
  - `DistributionService`（分配/分组）
  - `ImportExecutor`（执行与重试/节流/速率统计）
  - `VerificationService`（导入后校验）
  - `ContactImporter` 作为门面协调上述服务，保持 < 250 行。

以上拆分保持对外 API 不变，利用 `index.ts` 聚合导出。

## 旧代码与迁移
- 旧路径：`src/modules/contact-automation/utils/contactImporter.ts` 仍直接调用 `tauri invoke`。按项目规范，ADB 相关应通过 `useAdb()`/应用服务访问。
- 建议：逐步迁移调用至本模块的 Hook 或 `ServiceFactory.getAdbApplicationService()` 包装的应用服务，避免在 UI/模块内部直接 `invoke`。
- 工具脚本：
  - 检查遗留：`npm run check:legacy-contacts`
  - 清理遗留：`npm run clean:legacy-contacts`

## 贡献指南（Do/Don’t）
- Do：
  - 通过 `useAdb()` 获取设备/信息
  - 新增策略放到 `strategies/`；解析器放到 `parsers/`
  - UI 只做编排与展示；副作用放到 hooks/services
  - 超 80% 文件大小阈值时先提拆分方案
- Don’t：
  - 在 UI/hooks 中直接调用 `invoke`
  - 新建平行的状态管理或设备管理器
  - 复制粘贴已有逻辑形成重复实现

## 常见问题
- “为什么检测设备不是响应式？”
  - 设备状态由全局 `useAdbStore` 统一管理；本模块通过 `UnifiedAdbDeviceManager` 按需读取，避免多源真相。
- “能否支持 CSV？”
  - 可在 `parsers/` 新增 `CsvParser` 并在 `index.ts` 暴露，保持门面不变。

---
如需进一步重构/拆分，请在 PR 描述中附上拆分计划与对外 API 兼容性说明。

## 会话“分类（行业）”渲染与筛选规则

优先级：
1) 服务端会话字段 `ImportSessionDto.industry` 若有值，UI 直接显示；
2) 若会话无行业，前端按批次 `batch_id` 抽样号码的 `industry` 字段推断：
  - 全为空 → “未分类”；
  - 仅一种非空 → 该行业名；
  - 混合/含空 → “多类”；
3) 上述推断带内存缓存，可点击“刷新分类”手动清空并重算。

筛选：
- `FiltersBar` 支持“行业”下拉（不限/电商/医疗/...），会话列表在前端按 `industry` 精确过滤；
- 如需后端筛选，可在接口层增加 `industry` 参数后，把值透传到 `listImportSessionRecords`。
