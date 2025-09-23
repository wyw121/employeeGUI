# Deprecated: AdbAuthorizationWizard (legacy)

本文件夹内的旧版授权向导组件已被 DDD 重构后的模块替代：

- 新入口：`src/pages/adb/auth/ADBAuthWizard.tsx`
- 统一接口：`useAdb()`（严禁使用旧 hooks 或直接调用底层服务）

说明：
- 该目录仅作为过渡标识，实际页面与导航均已脱钩；
- 如仍有引用，请尽快迁移并删除旧文件；
- 架构检查：本目录中的旧文件不应在任何模块中被导入。

后续处理：
- CI 或人工代码清理时将物理删除本目录内残留文件。
