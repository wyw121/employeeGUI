# 小红书好友关注功能测试模块

## 📋 模块简介

本模块专门用于开发和测试小红书通讯录好友关注功能，完成测试后将集成到主要的通讯录管理模块 (`ContactImportManager.tsx`) 中。

## 🚀 功能特性

### 核心功能
- **小红书应用检测**: 自动检测目标设备上的小红书应用状态
- **测试数据生成**: 快速生成测试用的联系人数据
- **批量关注**: 自动批量关注小红书好友
- **进度监控**: 实时显示关注进度和状态
- **结果统计**: 详细的成功/失败/跳过统计

### 技术特性
- **设备选择**: 支持多个模拟器设备
- **错误处理**: 完善的错误捕获和处理机制
- **日志记录**: 详细的操作日志记录
- **状态管理**: 完整的关注状态跟踪

## 📁 文件结构

```
src/components/xiaohongshu-test/
├── XiaohongshuFollowTest.tsx    # 主测试组件
├── README.md                    # 说明文档
└── index.ts                     # 导出文件
```

## 🔧 使用方法

### 1. 基本使用
```tsx
import XiaohongshuFollowTest from './xiaohongshu-test/XiaohongshuFollowTest';

// 在组件中使用
<XiaohongshuFollowTest 
  deviceId="emulator-5556"
  onComplete={(result) => {
    console.log('关注完成:', result);
  }}
/>
```

### 2. 测试流程
1. **设备配置**: 选择目标设备 (emulator-5554 或 emulator-5556)
2. **状态检测**: 点击"检测"按钮确认小红书应用状态
3. **数据准备**: 点击"生成测试联系人"创建测试数据
4. **开始关注**: 点击"开始关注"执行自动关注流程
5. **监控进度**: 实时查看关注进度和日志
6. **查看结果**: 关注完成后查看详细统计结果

## 🎯 API接口

### 后端API调用
本模块依赖以下Tauri后端API：

```rust
// 检测小红书应用状态
check_xiaohongshu_app_status(deviceId: String) -> String

// 执行小红书自动关注
xiaohongshu_auto_follow(
  deviceId: String, 
  contacts: Vec<Contact>, 
  options: FollowOptions
) -> XiaohongshuFollowResult
```

### 数据类型定义

```typescript
interface XiaohongshuContact {
  id: string;
  name: string;
  phone: string;
  followStatus: 'pending' | 'following' | 'success' | 'failed' | 'skipped';
  followTime?: string;
  errorMessage?: string;
}

interface XiaohongshuFollowResult {
  success: boolean;
  totalContacts: number;
  followedCount: number;
  failedCount: number;
  skippedCount: number;
  message: string;
  details?: string;
}
```

## 🔄 集成计划

### 阶段1: 独立测试 ✅
- [x] 创建独立测试组件
- [x] 实现基本UI界面
- [x] 添加测试数据生成
- [x] 集成后端API调用

### 阶段2: 功能完善 (进行中)
- [ ] 完善错误处理逻辑
- [ ] 优化用户体验
- [ ] 添加更多配置选项
- [ ] 性能优化

### 阶段3: 集成到主模块 (计划中)
- [ ] 将功能集成到 `ContactImportManager.tsx`
- [ ] 添加小红书关注选项卡
- [ ] 实现联系人数据共享
- [ ] 统一UI风格和交互

## 🛠️ 开发说明

### 环境要求
- React 18+
- Ant Design 5+
- Tauri 2.0+
- TypeScript 4.9+

### 调试建议
1. 确保模拟器设备正常连接
2. 检查小红书应用是否已安装
3. 查看控制台日志获取详细错误信息
4. 使用内置日志功能监控执行过程

### 注意事项
- 关注操作有频率限制，建议设置适当的延时
- 某些设备可能需要手动权限授权
- 测试时请使用虚拟数据，避免影响真实联系人

## 📝 更新日志

### v1.0.0 (2025-09-13)
- ✅ 初始版本创建
- ✅ 基本UI界面实现
- ✅ 测试数据生成功能
- ✅ 设备选择和状态检测
- ✅ 日志记录和进度监控

## 📞 技术支持

如有问题或建议，请联系开发团队或在项目中提交Issue。

---

**注意**: 此模块仅用于测试和开发，完成后将删除并集成到主模块中。