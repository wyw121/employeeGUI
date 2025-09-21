/**
 * 通讯录自动化模块类型定义
 */

export interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: 'vcf' | 'csv' | 'xlsx';
  size: number;
  contactCount?: number;
}

export interface ContactImportStep {
  id: string;
  type: 'generate_vcf' | 'import_contacts' | 'delete_contacts';
  name: string;
  description: string;
  params: ContactStepParams;
  dependsOn?: string[]; // 依赖的前置步骤ID
}

export interface ContactStepParams {
  // 生成VCF文件参数
  sourceFile?: ContactFile;
  outputPath?: string;
  encoding?: 'utf-8' | 'gbk';
  
  // 导入联系人参数
  vcfFilePath?: string;
  deviceId?: string;
  batchSize?: number;
  importDelay?: number;
  
  // 删除联系人参数
  contactIds?: string[];
  deleteMethod?: 'by_name' | 'by_phone' | 'by_id';
  confirmDelete?: boolean;
}

export interface ContactAutomationResult {
  success: boolean;
  message: string;
  stepResults: ContactStepResult[];
  totalTime: number;
  statistics: ContactImportStatistics;
}

export interface ContactStepResult {
  stepId: string;
  stepType: string;
  success: boolean;
  message: string;
  data?: any;
  duration: number;
}

export interface ContactImportStatistics {
  totalContacts: number;
  importedContacts: number;
  failedContacts: number;
  deletedContacts: number;
  generatedFiles: number;
}

// 脚本步骤扩展类型
export interface ContactAutomationScriptStep {
  step_type: 'contact_import_workflow';
  name: string;
  description: string;
  contact_steps: ContactImportStep[];
  device_id?: string;
  params: {
    source_file_path: string;
    import_options: {
      batch_size: number;
      delay_between_batches: number;
      verify_import: boolean;
    };
    cleanup_options: {
      delete_after_import: boolean;
      keep_backup: boolean;
    };
  };
}