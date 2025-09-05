# Employee Management System

一个使用 Tauri + React + Rust 构建的桌面员工管理系统。

## 项目架构

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
```

## 功能特性

- ✅ 员工列表展示
- ✅ 添加新员工
- ✅ 编辑员工信息
- ✅ 删除员工
- ✅ 数据持久化 (SQLite)
- ✅ 响应式UI设计
- ✅ 类型安全 (TypeScript)

## 项目特点

### 分层架构
- **UI层**: React组件，只负责界面展示和用户交互
- **API层**: 封装Tauri命令调用，隔离前后端通信
- **服务层**: Rust业务逻辑，处理数据操作
- **数据层**: SQLite数据库

### 可维护性
- 组件化设计，便于复用和维护
- TypeScript类型安全
- 清晰的目录结构和文件组织
- 错误处理和用户反馈

### 性能优化
- Vite快速构建
- Tauri轻量级桌面应用
- SQLite本地数据库，无需网络依赖
