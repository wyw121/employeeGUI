# 通讯录自动化模块设计指南

## 📁 完整模块化文件夹结构

```
src/modules/contact-automation/
├── index.ts                              # 模块统一导出
├── types/
│   ├── index.ts                          # 类型定义导出
│   ├── ContactTypes.ts                   # 联系人数据类型
│   ├── WorkflowTypes.ts                  # 工作流类型定义
│   └── BackendTypes.ts                   # 后端接口类型
├── components/
│   ├── index.ts                          # 组件导出
│   ├── ContactWorkflowSelector.tsx       # 工作流选择器 ✅
│   ├── ContactFileUploader.tsx           # 文件上传组件
│   ├── ContactPreview.tsx                # 联系人预览
│   └── ContactStepCard.tsx               # 步骤卡片组件
├── templates/
│   ├── index.ts                          # 模板导出
│   ├── contactWorkflowTemplates.ts       # 工作流模板 ✅
│   ├── vcfTemplates.ts                   # VCF文件模板
│   └── deviceTemplates.ts                # 设备操作模板
├── utils/
│   ├── index.ts                          # 工具函数导出
│   ├── contactImporter.ts                # 联系人导入工具 ✅
│   ├── vcfGenerator.ts                   # VCF文件生成 ✅
│   ├── deviceManager.ts                  # 设备管理工具
│   └── fileValidation.ts                 # 文件验证工具
├── services/
│   ├── index.ts                          # 服务导出
│   ├── ContactAutomationService.ts       # 主业务服务
│   ├── VCFService.ts                     # VCF文件服务
│   └── DeviceContactService.ts           # 设备联系人服务
├── hooks/
│   ├── index.ts                          # Hook导出
│   ├── useContactAutomation.ts           # 主业务Hook
│   ├── useVCFProcessor.ts                # VCF处理Hook
│   └── useDeviceContacts.ts              # 设备联系人Hook
├── constants/
│   ├── index.ts                          # 常量导出
│   ├── contactFormats.ts                 # 联系人格式常量
│   ├── errorMessages.ts                  # 错误信息常量
│   └── defaultConfigs.ts                 # 默认配置常量
└── __tests__/
    ├── components/                       # 组件测试
    ├── utils/                           # 工具函数测试
    ├── services/                        # 服务测试
    └── integration/                     # 集成测试
```

## 🎯 核心功能模块

### 1. **主入口 (index.ts)**
```typescript
// 统一导出所有功能
export * from './components';
export * from './templates';
export * from './utils';
export * from './services';
export * from './hooks';
export * from './types';
export * from './constants';

// 主要功能快捷导出
export { ContactWorkflowSelector } from './components/ContactWorkflowSelector';
export { generateContactImportWorkflowSteps } from './templates/contactWorkflowTemplates';
export { useContactAutomation } from './hooks/useContactAutomation';
```

### 2. **类型定义模块 (types/)**

#### ContactTypes.ts
```typescript
export interface Contact {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  notes?: string;
}

export interface VCFContact extends Contact {
  vcfData: string;
  importStatus: 'pending' | 'imported' | 'failed';
}

export interface ContactBatch {
  id: string;
  contacts: Contact[];
  batchSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

#### WorkflowTypes.ts
```typescript
export interface ContactWorkflowConfig {
  sourceFilePath?: string;
  deviceId?: string;
  templateType: 'BASIC_IMPORT' | 'BATCH_IMPORT' | 'SAFE_IMPORT';
  batchSize: number;
  enableBackup: boolean;
  enableCleanup: boolean;
}

export interface WorkflowStepResult {
  stepId: string;
  success: boolean;
  message: string;
  data?: any;
  duration: number;
}
```

### 3. **组件模块 (components/)**

#### ContactFileUploader.tsx
```typescript
interface ContactFileUploaderProps {
  onFileSelected: (filePath: string, contacts: Contact[]) => void;
  acceptedFormats: string[];
  maxFileSize: number;
}

export const ContactFileUploader: React.FC<ContactFileUploaderProps> = ({
  onFileSelected,
  acceptedFormats = ['.vcf', '.csv', '.xlsx'],
  maxFileSize = 10 * 1024 * 1024 // 10MB
}) => {
  // 文件上传和解析逻辑
};
```

#### ContactPreview.tsx
```typescript
interface ContactPreviewProps {
  contacts: Contact[];
  showLimit: number;
  onContactEdit: (contact: Contact) => void;
  onContactDelete: (contactId: string) => void;
}

export const ContactPreview: React.FC<ContactPreviewProps> = ({
  contacts,
  showLimit = 50,
  onContactEdit,
  onContactDelete
}) => {
  // 联系人预览和编辑逻辑
};
```

### 4. **服务模块 (services/)**

#### ContactAutomationService.ts
```typescript
export class ContactAutomationService {
  async executeWorkflow(config: ContactWorkflowConfig): Promise<WorkflowStepResult[]> {
    const results: WorkflowStepResult[] = [];
    
    // 1. 生成VCF文件
    const vcfResult = await this.generateVCFFile(config);
    results.push(vcfResult);
    
    // 2. 导入到设备
    if (vcfResult.success) {
      const importResult = await this.importToDevice(config);
      results.push(importResult);
    }
    
    // 3. 清理（如果启用）
    if (config.enableCleanup) {
      const cleanupResult = await this.cleanup(config);
      results.push(cleanupResult);
    }
    
    return results;
  }

  private async generateVCFFile(config: ContactWorkflowConfig): Promise<WorkflowStepResult> {
    // 调用后端 generate_vcf_file 命令
    return invoke('generate_vcf_file', {
      sourceFile: config.sourceFilePath,
      outputPath: './vcf_output'
    });
  }

  private async importToDevice(config: ContactWorkflowConfig): Promise<WorkflowStepResult> {
    // 调用后端 import_vcf_contacts_async_safe 命令
    return invoke('import_vcf_contacts_async_safe', {
      deviceId: config.deviceId,
      contactsFilePath: './vcf_output/generated.vcf'
    });
  }

  private async cleanup(config: ContactWorkflowConfig): Promise<WorkflowStepResult> {
    // 调用后端清理命令
    return invoke('contact_delete_imported', {
      deviceId: config.deviceId,
      sessionId: 'current_session'
    });
  }
}
```

### 5. **Hook模块 (hooks/)**

#### useContactAutomation.ts
```typescript
export const useContactAutomation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<WorkflowStepResult[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  const executeWorkflow = async (config: ContactWorkflowConfig) => {
    setIsProcessing(true);
    setCurrentStep('开始执行工作流...');
    
    try {
      const service = new ContactAutomationService();
      const results = await service.executeWorkflow(config);
      setWorkflowResults(results);
      
      return {
        success: results.every(r => r.success),
        results
      };
    } catch (error) {
      console.error('工作流执行失败:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return {
    isProcessing,
    currentStep,
    workflowResults,
    executeWorkflow
  };
};
```

## 🔗 与现有系统集成

### 1. **智能脚本构建器集成**
```typescript
// 在 SmartScriptBuilderPage.tsx 中
import { ContactWorkflowSelector, generateContactImportWorkflowSteps } from '../modules/contact-automation';

// 处理通讯录导入选择
if (step_type === SmartActionType.CONTACT_IMPORT_WORKFLOW) {
  setShowContactWorkflowSelector(true);
}

// 处理工作流步骤生成
const handleContactWorkflowSteps = (steps: ExtendedSmartScriptStep[]) => {
  setSteps([...steps, ...steps]); // 添加生成的步骤到脚本中
  setShowContactWorkflowSelector(false);
};
```

### 2. **ADB设备管理集成**
```typescript
// 使用统一的ADB接口
import { useAdb } from '../application/hooks/useAdb';

const ContactDeviceSelector = () => {
  const { devices, selectedDevice, selectDevice } = useAdb();
  
  // 设备选择逻辑
};
```

### 3. **后端命令集成**
```typescript
// 确保这些后端命令可用:
// - generate_vcf_file
// - import_vcf_contacts_async_safe  
// - contact_delete_imported
// - contact_backup_existing (可选)

// 在service中直接调用
const result = await invoke('generate_vcf_file', {
  contacts: contactList,
  outputPath: vcfFilePath
});
```

## 🎯 使用示例

### 基本使用
```typescript
import { useContactAutomation } from '../modules/contact-automation';

const MyComponent = () => {
  const { executeWorkflow, isProcessing, workflowResults } = useContactAutomation();

  const handleImport = async () => {
    const config = {
      sourceFilePath: '/path/to/contacts.csv',
      deviceId: 'emulator-5554',
      templateType: 'BASIC_IMPORT',
      batchSize: 50,
      enableBackup: true,
      enableCleanup: false
    };

    const result = await executeWorkflow(config);
    if (result.success) {
      console.log('导入成功!', result.results);
    }
  };

  return (
    <div>
      <Button onClick={handleImport} loading={isProcessing}>
        开始导入
      </Button>
      {workflowResults.map(result => (
        <div key={result.stepId}>{result.message}</div>
      ))}
    </div>
  );
};
```

### 在智能脚本构建器中使用
```typescript
// 用户选择"通讯录导入"操作类型
// -> 弹出 ContactWorkflowSelector
// -> 生成3个步骤卡片
// -> 通过"执行智能脚本"发送给后端
// -> 后端执行: VCF生成 -> 设备导入 -> 清理删除
```

## 📋 开发检查清单

- [x] ✅ 创建模块化目录结构  
- [x] ✅ 实现ContactWorkflowSelector组件
- [x] ✅ 创建工作流步骤模板
- [x] ✅ 集成到智能脚本构建器
- [x] ✅ 移除必填字段限制
- [x] ✅ 通讯录导入成为第一个选项
- [ ] 🔄 完善文件上传组件
- [ ] 🔄 实现联系人预览组件  
- [ ] 🔄 创建完整的服务类
- [ ] 🔄 实现自定义Hook
- [ ] 🔄 添加错误处理和验证
- [ ] 🔄 编写单元测试

## 🚀 后续扩展计划

1. **增强文件格式支持**: 支持更多联系人文件格式
2. **智能联系人匹配**: 避免重复导入
3. **批量设备操作**: 同时向多个设备导入
4. **联系人同步**: 双向同步功能
5. **导入历史记录**: 操作历史和回滚功能
6. **高级过滤**: 按条件筛选导入联系人

这个模块化设计确保了代码的可维护性、可扩展性和重用性！