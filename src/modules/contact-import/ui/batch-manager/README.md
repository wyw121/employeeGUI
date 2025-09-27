# 批次管理（Batch Manager）

职责边界：
- 仅负责展示与筛选视图（按批次/设备/状态），不持久化业务逻辑。
- 通过 contactNumberService 的 Tauri 命令封装获取数据。
- 与导入执行逻辑解耦；再生成/再导入入口可在后续接入。

导出：
- BatchManagerDrawer：抽屉式筛选视图。
- types：BatchFilterState 类型。

使用示例：

```tsx
import { useState } from 'react';
import { Button } from 'antd';
import { BatchManagerDrawer } from '@/modules/contact-import/ui/batch-manager';

export function EntryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>按批次/设备筛选</Button>
      <BatchManagerDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

注意：
- ADB 相关操作仍需通过 useAdb() 与应用服务进行，不在本模块中直接调用。
- 若数据量较大，建议为 numbers/sessions 加入分页参数（后续扩展）。