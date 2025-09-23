# ADB 授权向导（auth/）

模块化、最佳实践实现，严格遵循 DDD 约束：

- UI 仅通过 `useAdb()` 访问应用服务
- 状态机放在 `useAuthWizard.ts`（Reducer + Actions）
- 类型集中在 `types.ts`
- 步骤组件在 `steps/` 文件夹中，每步只负责 UI 与交互
- 公共组件如 `ActionLogPanel` 置于当前目录，避免跨目录依赖

结构：

```
src/pages/adb/auth/
├── ADBAuthWizard.tsx        # 向导容器，组装步骤与日志
├── ActionLogPanel.tsx       # 统一操作日志面板
├── README.md                # 本说明
├── types.ts                 # 步骤/状态/动作类型
├── useAuthWizard.ts         # 状态机 Hook（封装 useAdb 操作）
└── steps/
    ├── Prerequisites.tsx    # 准备（清钥/重启/刷新）
    ├── UsbTrust.tsx         # USB 授权确认
    ├── Wireless.tsx         # 无线配对/连接
    ├── Verify.tsx           # 验证设备状态（统计）
    └── Done.tsx             # 完成页
```

注意：
- 严禁直接调用基础设施层或旧的 ADB 接口，必须走 `useAdb()`
- 日志、忙碌态处理统一在 `useAuthWizard` 内封装，步骤只调用 `ctx.api.*`
- 若需扩展步骤，请新增子文件而非在容器里堆积逻辑
