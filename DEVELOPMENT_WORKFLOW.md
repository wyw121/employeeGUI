# 🔄 新架构开发工作流指南

## 📋 日常开发流程

### 🚀 开始新功能开发

```bash
# 1. 切换到主分支并拉取最新代码
git checkout main
git pull origin main

# 2. 基于最新main创建功能分支
git checkout -b feature/your-feature-name

# 3. 确认新架构文件存在
ls src/application/hooks/useAdb.ts  # 应该存在
ls src/domain/adb/                  # 应该存在
```

### 💻 开发ADB相关功能

```typescript
// ✅ 正确的开发方式
import { useAdb } from '../application/hooks/useAdb';
import { Device, DeviceStatus } from '../domain/adb';

const MyComponent = () => {
  const { 
    devices, 
    isLoading, 
    lastError, 
    refreshDevices 
  } = useAdb();

  // 你的组件逻辑...
};
```

### 🔍 代码审查清单

提交PR前请确认:
- [ ] ✅ 使用`useAdb()`而不是旧的hooks
- [ ] ✅ 导入正确的类型定义
- [ ] ✅ 没有导入已删除的文件
- [ ] ✅ 错误处理使用`lastError`
- [ ] ✅ 测试功能正常工作

### 📝 提交规范

```bash
# 功能提交
git commit -m "feat: 新增ADB设备连接功能

- 使用新的useAdb()接口
- 支持自动重连机制
- 添加错误处理和状态反馈"

# 修复提交  
git commit -m "fix: 修复设备列表刷新问题

- 修正useAdb()中的refreshDevices调用
- 添加加载状态处理"
```

### 🔄 合并流程

```bash
# 1. 推送分支
git push origin feature/your-feature-name

# 2. 创建Pull Request
# 在GitHub创建PR，标题格式:
# feat: 简洁描述功能 (基于新ADB架构)

# 3. 等待代码审查
# 确保使用了新的架构模式

# 4. 合并到main
# 合并后删除功能分支
git branch -d feature/your-feature-name
```

## ⚠️ 常见问题和解决方案

### Q: 找不到useAdbDevices
```bash
Error: Module not found: Can't resolve '../hooks/useAdbDevices'
```

**解决**: 替换为新的import
```typescript
// ❌ 旧的
import { useAdbDevices } from '../hooks/useAdbDevices';

// ✅ 新的
import { useAdb } from '../application/hooks/useAdb';
```

### Q: deviceStore不存在
```bash
Error: Module not found: Can't resolve '../store/deviceStore'
```

**解决**: 使用统一的useAdb接口
```typescript
// ❌ 旧的
import { useDeviceStore } from '../store/deviceStore';

// ✅ 新的
import { useAdb } from '../application/hooks/useAdb';
```

### Q: 类型定义找不到
```bash
Error: Cannot find name 'DeviceInfo'
```

**解决**: 使用新的类型定义
```typescript
// ✅ 新的类型
import { Device, DeviceStatus, DeviceType } from '../domain/adb';
```

## 🛠️ 开发工具配置

### VSCode设置建议

```json
// .vscode/settings.json
{
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### 快速代码片段

```json
// .vscode/snippets/typescript.json
{
  "useAdb Hook": {
    "prefix": "useadb",
    "body": [
      "const { devices, isLoading, lastError, refreshDevices } = useAdb();"
    ]
  }
}
```

## 📊 分支策略

### 主要分支
- `main` - 生产就绪代码，包含新ADB架构
- `develop` - 开发分支 (如果使用)

### 功能分支命名
- `feature/adb-new-diagnostic` - ADB相关新功能
- `fix/adb-connection-issue` - ADB相关修复
- `refactor/component-migration` - 组件迁移相关

### 热修复分支
- `hotfix/adb-critical-fix` - 紧急修复

## 📚 参考资源

### 开发参考
- `src/components/NewAdbManagementExample.tsx` - 使用示例
- `src/application/hooks/useAdb.ts` - API参考
- `ARCHITECTURE_MIGRATION_GUIDE.md` - 迁移指南

### 架构文档
- `src/domain/adb/` - 领域模型
- `src/infrastructure/` - 基础设施层
- `src/application/` - 应用层

---

**记住**: 新架构让开发更简单，一个`useAdb()`搞定所有ADB需求！🚀