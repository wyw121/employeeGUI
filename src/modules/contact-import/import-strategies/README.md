# vCard 导入策略系统

基于实际测试结果的模块化联系人导入解决方案，支持多厂商设备和多种 vCard 格式。

## 🎯 功能特性

### 多策略支持
- **vCard 版本**: 2.1 (QP编码), 3.0, 4.0
- **触发方式**: VIEW Intent (A/B), 直接 Activity 调用 (C)
- **厂商适配**: Honor/Huawei, Xiaomi, Samsung, 通用设备

### 实测验证
基于 Honor WDY_AN00 设备的真机测试：
- ✅ vCard 2.1 + 直接导入: **成功**
- ✅ vCard 3.0 + 三种方式: **全部成功**
- ❌ vCard 4.0: **已知失败**

### 智能推荐
根据设备信息自动推荐最适合的导入策略，按成功率排序。

## 📁 模块结构

```
src/modules/contact-import/import-strategies/
├── types.ts                    # 类型定义
├── strategies.ts               # 预定义策略配置
├── services/
│   └── ImportStrategyExecutor.ts # 执行引擎
├── ui/
│   ├── ImportStrategySelector.tsx # 策略选择器
│   ├── ImportResultDisplay.tsx   # 结果展示
│   └── ImportStrategyDialog.tsx  # 完整对话框
└── index.ts                    # 统一导出
```

## 🚀 快速使用

### 基础集成

```tsx
import { ImportStrategyDialog } from '@/modules/contact-import/import-strategies';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        导入联系人
      </Button>
      
      <ImportStrategyDialog
        visible={showDialog}
        vcfFilePath="/path/to/contacts.vcf"
        onClose={() => setShowDialog(false)}
        onSuccess={(result) => console.log('导入成功:', result)}
      />
    </>
  );
}
```

### 高级自定义

```tsx
import { 
  ImportStrategySelector,
  ImportStrategyExecutor,
  getRecommendedStrategies,
  type ImportStrategy 
} from '@/modules/contact-import/import-strategies';

function AdvancedImport() {
  const [strategy, setStrategy] = useState<ImportStrategy>();
  const { selectedDevice } = useAdb();
  
  const handleImport = async () => {
    if (!strategy || !selectedDevice) return;
    
    const executor = ImportStrategyExecutor.getInstance();
    const result = await executor.executeImport({
      selectedStrategy: strategy,
      vcfFilePath: '/path/to/file.vcf',
      deviceId: selectedDevice.id,
      enableVerification: true,
      verificationPhones: ['13100000001', '13100000002']
    });
    
    console.log('导入结果:', result);
  };
  
  return (
    <div>
      <ImportStrategySelector
        deviceInfo={{
          manufacturer: selectedDevice?.product,
          model: selectedDevice?.model
        }}
        selectedStrategy={strategy}
        onStrategyChange={setStrategy}
        showAllStrategies={true}
      />
      
      <Button onClick={handleImport}>执行导入</Button>
    </div>
  );
}
```

## 📋 支持的策略

### Honor/Huawei 设备
| 策略ID | vCard版本 | 触发方式 | 成功率 | 说明 |
|--------|-----------|----------|--------|------|
| `honor_v30_direct` | 3.0 | 直接导入 | 高 | 推荐，批量20条全成功 |
| `honor_v21_direct` | 2.1 | 直接导入 | 高 | 支持QP编码 |
| `honor_v30_view_x` | 3.0 | VIEW方式A | 高 | 通用性好 |
| `honor_v30_view_std` | 3.0 | VIEW方式B | 高 | 标准MIME |
| `honor_v40_direct` | 4.0 | 直接导入 | 失败 | 不支持v4.0 |

### 通用策略
| 策略ID | vCard版本 | 触发方式 | 成功率 | 说明 |
|--------|-----------|----------|--------|------|
| `generic_v30_view_x` | 3.0 | VIEW方式A | 中等 | 未知设备首选 |
| `generic_v30_view_std` | 3.0 | VIEW方式B | 中等 | 标准备选 |

## 🔧 实现原理

### 三种触发方式

**方式A (VIEW_X_VCARD)**
```bash
adb shell am start -a android.intent.action.VIEW -d file:///sdcard/file.vcf -t text/x-vcard
```

**方式B (VIEW_VCARD)**  
```bash
adb shell am start -a android.intent.action.VIEW -d file:///sdcard/file.vcf -t text/vcard
```

**方式C (DIRECT_ACTIVITY)**
```bash
adb shell am start -n com.hihonor.contacts/com.android.contacts.vcard.ImportVCardActivity -a android.intent.action.VIEW -d file:///sdcard/file.vcf -t text/x-vcard
```

### 验证机制
导入后通过 Content Provider 查询验证：
```bash
adb shell content query --uri content://com.android.contacts/phone_lookup/13100000001
```

## 🎨 UI 组件说明

### ImportStrategySelector
策略选择器，支持：
- 按设备推荐排序
- 成功率标识
- 策略详情展示
- 折叠式分类

### ImportResultDisplay  
结果展示组件，包含：
- 成功/失败状态
- 导入统计信息
- 验证结果详情
- 重试建议

### ImportStrategyDialog
完整对话框，三步流程：
1. 选择策略
2. 确认配置
3. 查看结果

## 🔄 扩展新厂商

```typescript
// 在 strategies.ts 中添加新策略
{
  id: 'oppo_v30_direct',
  name: 'OPPO vCard 3.0',
  vCardVersion: VCardVersion.V30,
  triggerMethod: ImportTriggerMethod.DIRECT_ACTIVITY,
  manufacturer: DeviceManufacturer.OPPO,
  mimeType: 'text/x-vcard',
  activityComponent: 'com.android.contacts/com.android.contacts.vcard.ImportVCardActivity',
  successRate: 'medium', // 待测试验证
  testedDevices: [],
  notes: '需要实际测试验证'
}
```

## 🧪 测试建议

1. **新设备测试流程**:
   - 准备 vCard 2.1/3.0/4.0 测试文件
   - 依次尝试 A/B/C 三种触发方式  
   - 记录成功率和异常情况
   - 更新策略配置

2. **验证要点**:
   - 导入后联系人数量
   - 中文显示是否正常
   - 号码格式是否完整
   - 重复导入处理

## ⚠️ 注意事项

- 确保设备已授权 USB 调试
- vCard 文件需要 UTF-8 编码
- 某些厂商可能有定制的包名
- 4.0 格式兼容性较差，建议避免使用
- 导入前建议备份设备联系人

## 📝 更新日志

**v1.0.0** (2024-09-28)
- 基于 Honor WDY_AN00 实测数据
- 支持 A/B/C 三种触发方式
- 完整的 UI 组件套件
- 智能策略推荐系统