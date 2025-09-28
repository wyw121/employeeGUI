# Employee Management System

一个使用 Tauri + React + Rust 构建的桌面员工管理系统。

## 项目架构

本项目采用 **DDD（领域驱动设计）** 架构，确保代码的可维护性和可扩展性。

### 🏗️ 架构原则

- **统一的 ADB 接口**: 所有 ADB 相关功能都通过 `useAdb()` Hook 统一管理
- *### 镜像视图（Scrcpy）使用说明
- **自包含依赖**：scrcpy 已打包在应用中，用户无需额外安装
- 打开"镜像视图"，选择设备并配置参数（分辨率上限、码率/预设、最大FPS、窗口标题、保持常亮、息屏继续、置顶、无边框）
- 点击"启动镜像"将启动内置的 scrcpy 进程，实现设备屏幕镜像
- 会话管理：支持多设备、多会话并发；应用关闭时自动清理子进程
- 渲染模式：
	- 外部窗口：标准 scrcpy 窗口（当前默认）
	- 嵌入式：内置播放器（未来接入 WebCodecs/Canvas）

📋 **完整文档**: 详见 [scrcpy 集成说明](docs/SCRCPY_INTEGRATION.md)*: 设备状态通过 `useAdbStore` 集中管理
- **分层设计**: 严格遵循 DDD 分层架构约束

📖 **重要**: 请阅读 [ADB 架构统一性规范](./ADB_ARCHITECTURE_STANDARDS.md) 了解开发约束和最佳实践。

### 目录结构

```
employeeGUI/
├── src-tauri/          # Rust后端代码
│   ├── src/
│   │   ├── services/   # 业务逻辑模块
│   │   └── main.rs     # Tauri命令和主程序
│   ├── Cargo.toml      # Rust依赖配置
│   └── tauri.conf.json # Tauri配置
├── src/                # 前端代码
│   ├── api/            # 接口层，封装Tauri命令调用
│   ├── components/     # 可复用UI组件
│   ├── pages/          # 页面组件
│   ├── types/          # TypeScript类型定义
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   └── style.css       # 全局样式
├── public/             # 静态资源
└── 配置文件...
```

### 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Rust + Tauri
- **数据库**: SQLite (使用 rusqlite)
- **构建工具**: Vite

## 快速开始

### 环境要求

1. Node.js (v16+)
2. Rust (latest stable)
3. Tauri CLI

### 安装依赖

```bash
# 安装前端依赖
npm install

# 设置 scrcpy 镜像功能（必须）
npm run setup:scrcpy

# 安装Tauri CLI (如果还没有安装)
npm install -g @tauri-apps/cli
```

### 开发模式

```bash
# 启动开发服务器
npm run tauri dev
```

### 构建生产版本

```bash
# 构建应用
npm run tauri build
## 旧“通讯录管理”清理与防回归

本项目已统一至“联系人导入向导（新）”路径。若需要物理清理历史残留或做回归检查：

- 物理清理（硬删除旧文件与空目录，安全容错）：
	- Windows PowerShell
	- npm run clean:legacy-contacts

- 检查是否存在旧引用（CI/本地均可）：
	- npm run check:legacy-contacts

注意：清理脚本具备权限容错（忽略 EPERM/EACCES/ENOENT），可重复执行，幂等。

```

## 新后端灰度开关（后端替换不改前端）

为平滑替换旧脚本执行器，已提供环境变量灰度开关，默认关闭：

- 开关名：`USE_NEW_BACKEND`
- 取值：`1` 表示启用新后端管线（仅批量执行入口），其他或未设置走旧路径

在 Windows PowerShell 中启用并运行开发模式：

```pwsh
$env:USE_NEW_BACKEND = "1"
npm run tauri dev
```

验证方法：
- 通过 UI 触发“智能脚本批量执行”；
- 在后端日志中应看到如下字样：
	- `🧪 开启新后端灰度 (USE_NEW_BACKEND=1)，进入 v2 管线...`
	- `📐 real-metrics(v2): width=... height=... density=...`
- 若发生错误会自动回退到旧执行器（日志会包含回退信息）。

回退方法：
```pwsh
Remove-Item Env:\USE_NEW_BACKEND
npm run tauri dev
```

注意：前端无需任何改动。本开关仅影响 Tauri 后端批量执行路径；单步测试与其它功能保持不变。

补充说明（输入注入与设备指标）：
- 自 v2 管线灰度同时，旧执行器（传统与智能两条路径）已将 `swipe/tap/text` 优先走统一的 AdbShell 注入器（injector-first），失败再自动回退到原始 `adb shell input` 命令；行为保持兼容，仅增强稳定性与未来可扩展性（重试/超时/IME 策略）。
- 现已扩展：清空输入时涉及的按键事件也走注入器优先（`keyevent KEYCODE_CTRL_A` 与 `KEYCODE_DEL`），注入器失败时同样自动回退到原始命令，确保兼容性与稳定性。
- 设备分辨率/密度获取使用了进程级内存缓存，减少重复 `adb shell wm` 查询；首次获取失败时自动回退到默认值（1080x1920）。
 - 新增安全注入器包装（SafeInputInjector）：为注入器操作提供轻量重试（默认重试 2 次，间隔 120ms）。可通过环境变量调节：
	 - `INJECTOR_RETRIES`：整数，重试次数（默认 2）
	 - `INJECTOR_DELAY_MS`：整数，重试间隔毫秒（默认 120）
	 - 应用位置：v2 管线和所有旧执行器均已统一启用。

## 功能特性

- ✅ 员工列表展示
- ✅ 添加新员工
- ✅ 编辑员工信息
- ✅ 删除员工
- ✅ 数据持久化 (SQLite)
- ✅ 响应式UI设计
- ✅ 类型安全 (TypeScript)
- ✅ ADB 页面元素查找支持“标准匹配”策略（跨设备、分辨率无关）
- ✅ 新增“镜像视图（scrcpy）”：支持参数化启动、会话管理，渲染模式可在“外部窗口/嵌入式占位”切换，支持窗口标志（置顶/无边框）

### 联系人导入（新）
- 新入口：主界面左侧菜单 → “联系人导入向导”。
- 说明：全新模块化实现，统一通过 `useAdb()` 架构访问设备；旧入口“VCF 导入（旧版）”将逐步下线。
 - 架构统一：旧“通讯录管理”页面与配套组件已下线，统一使用 `src/pages/contact-import/ContactImportPage.tsx` 与 `src/modules/contact-import/*` 模块。
 - 防回归检查：可运行 `npm run check:legacy-contacts` 检查是否存在对旧页面/组件的引用。

#### 号码池批次/会话筛选（新）
- 入口按钮：联系人导入工作台 → “导入 TXT 到号码池”卡片右上角 → “按批次/设备筛选”。
- 视图：抽屉式 Batch Manager，支持：
	- 筛选模式：全部号码、按批次、未生成VCF。
	- 批次选择：展示最近批次并可搜索。
	- 会话列表：按设备ID/批次过滤查看导入成功/失败记录。
	- 号码列表：
		- 按批次（可切换仅显示该批次使用过的号码）
		- 未生成VCF（used_batch 为空）
		- 全部（支持关键词搜索）
- 模块路径：`src/modules/contact-import/ui/batch-manager/*`（纯展示与筛选逻辑，后续“再生成/再导入”在此接入）。

#### 会话管理增强（新）
- 会话分类：在“会话列表”中支持内联编辑“分类”（行业标签）。点击“编辑”可从历史分类下拉选择或直接输入新分类，保存后实时持久化到数据库。
- 成功回滚为失败：对状态为“成功”的会话，提供“标记失败并回滚”操作。确认后：
	- 会话状态被设置为“失败”，错误信息附加“用户手动回滚”原因；
	- 与该会话关联的号码将被事务性恢复为“未导入/可用”（used=0，status='not_imported'，imported_device_id 置空），支持后续重新分配/导入；
	- 操作完成后会提示恢复的号码数量并刷新列表。
- 端到端路径：前端 `SessionsTable` → 服务 `contactNumberService` → Tauri 命令 `update_import_session_industry_cmd` / `revert_import_session_to_failed_cmd` → SQLite 事务。
- 文件位置：
	- 前端：`src/modules/contact-import/ui/batch-manager/components/SessionsTable.tsx`
	- 服务：`src/modules/contact-import/ui/services/contactNumberService.ts`
	- 后端：`src-tauri/src/services/contact_storage/{repo.rs,commands.rs}` 与命令注册 `src-tauri/src/main.rs`

## 项目特点

### 分层架构
- **UI层**: React组件，只负责界面展示和用户交互
- **API层**: 封装Tauri命令调用，隔离前后端通信
- **服务层**: Rust业务逻辑，处理数据操作
- **数据层**: SQLite数据库

### ADB 标准匹配（Standard Matching）
- 目标：在不同品牌/分辨率/布局微调下稳定定位 UI 元素
- 行为：仅使用语义字段（`resource-id/text/content-desc/class/package`），自动忽略位置相关字段（如 `bounds/index`）
- 入口：
	1) 页面分析器（网格视图 → 右侧节点详情 → 预设）点击“标准匹配”
	2) 通过 `useAdb().matchElementByCriteria(deviceId, { strategy: 'standard', fields, values })` 调用
	3) 步骤卡片上会显示匹配策略标签（`匹配: 标准`）

后端实现：Tauri 命令 `match_element_by_criteria` 在 `standard` 策略下会忽略位置/分辨率差异，仅按语义字段匹配。

### 自定义策略与包含/不包含
- 自定义（`custom`）策略：前端用于表达“字段自定义”的 UI 状态，发送请求时会根据是否存在有效位置约束自动映射为：
	- 含有效 `bounds/index` 值 → `absolute`
	- 否则 → `standard`
- 条件扩展：支持 per-field 的“包含（includes）/不包含（excludes）”
	- 仅对已勾选的字段生效
	- “包含”：列表中每个词都必须出现（属性等值或子串均可）
	- “不包含”：列表中任一词出现即排除
	- 位置策略为 `positionless/relaxed/strict/standard` 时自动忽略 `bounds`
- 入口：
	1) 页面分析器 → 右侧节点详情 → 每个字段下方“包含/不包含”编辑器
	2) 通过 `useAdb().matchElementByCriteria(deviceId, { strategy, fields, values, includes, excludes })`

### 可维护性
- 组件化设计，便于复用和维护
- TypeScript类型安全
- 清晰的目录结构和文件组织
- 错误处理和用户反馈

### 性能优化
- Vite快速构建
- Tauri轻量级桌面应用
- SQLite本地数据库，无需网络依赖

### 镜像视图（Scrcpy）使用说明
- 打开“镜像视图”，选择设备并配置参数（分辨率上限、码率/预设、最大FPS、窗口标题、保持常亮、息屏继续、置顶、无边框）。
- 点击“启动镜像”将在系统中拉起 scrcpy 进程（需要本机已安装并在 PATH 中，或在项目 platform-tools 下提供 scrcpy）。
- 会话管理：支持列出/停止设备的某个会话或全部会话；应用关闭时自动清理子进程。
- 渲染模式：
	- 外部窗口：标准 scrcpy 窗口（当前默认）。
	- 嵌入式：内置一个占位播放器（未来接入 ya-webadb/ws-scrcpy + WebCodecs/Canvas）。
