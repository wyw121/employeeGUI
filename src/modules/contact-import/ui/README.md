# 联系人导入 UI 说明

本模块新增“文件夹路径列表”能力，支持用户添加多个目录作为号码源，持久化保存，便于后续快速导入。

- 持久化键：`contactImport.sourceFolders`（localStorage）
- Hook：`useSourceFolders()` 提供 folders、addFolder、removeFolder、clearAll
- 组件：
  - `SourceFolderAddButton`：打开系统目录选择器并回调新增
  - `SourceFoldersList`：展示已保存目录、支持删除/清空
- 聚合导入：`importNumbersFromFolders(folders: string[])` 顺序执行并聚合结果，避免数据库锁竞争

集成点：
- `ui/steps/StepSourceSelect.tsx` 接入上述能力：
  - 继续支持单个 TXT 文件导入
  - 支持从多个保存的文件夹中批量导入
  - UI 下方展示“已添加文件夹路径”列表，可删除与清空

注意：
- 为避免重复，目录路径会被去重并做简单归一化（去除尾部分隔符）
- 本地化持久化采用 localStorage，符合项目内其它设置的做法。如需跨进程更强持久化，可后续切换至 tauri-plugin-store