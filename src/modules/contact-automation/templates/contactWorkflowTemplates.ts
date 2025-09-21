/**
 * 通讯录导入智能脚本步骤模板
 */

import { SmartActionType } from '../../../types/smartComponents';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';
import type { ContactImportStep } from '../types';

/**
 * 生成通讯录导入工作流的三个步骤
 */
export function generateContactImportWorkflowSteps(
  sourceFilePath?: string,  // 改为可选参数
  deviceId?: string
): ExtendedSmartScriptStep[] {
  
  const baseTimestamp = Date.now();
  
  return [
    // 步骤1：生成VCF文件
    {
      id: `contact_vcf_gen_${baseTimestamp}`,
      step_type: 'contact_generate_vcf' as SmartActionType,
      name: '生成VCF文件',
      description: '从通讯录文件生成标准VCF格式文件',
      enabled: true,
      order: 1,
      parameters: {
        source_file_path: sourceFilePath || '', // 允许空值，后续在步骤中配置
        output_dir: './vcf_output',
        encoding: 'utf-8',
        include_phone: true,
        include_email: true,
        include_name: true,
        batch_size: 100,
        wait_after: 1000
      },
      post_conditions: [],
      retry_config: {
        max_retries: 2,
        retry_delay: 1000
      }
    },

    // 步骤2：导入联系人到设备
    {
      id: `contact_import_${baseTimestamp}`,
      step_type: 'contact_import_to_device' as SmartActionType,
      name: '导入联系人到设备',
      description: '将生成的VCF文件导入到指定Android设备',
      enabled: true,
      order: 2,
      parameters: {
        vcf_file_path: '${contact_vcf_gen_' + baseTimestamp + '.output_file}', // 引用上一步的输出
        device_id: deviceId || '', // 允许空值，后续在步骤中配置
        import_method: 'adb_push_and_import',
        batch_size: 50,
        delay_between_batches: 1000,
        verify_import: true,
        backup_before_import: true,
        wait_after: 2000
      },
      pre_conditions: [`contact_vcf_gen_${baseTimestamp}_success`],
      retry_config: {
        max_retries: 3,
        retry_delay: 2000
      }
    },

    // 步骤3：删除导入的联系人
    {
      id: `contact_cleanup_${baseTimestamp}`,
      step_type: 'contact_delete_imported' as SmartActionType,
      name: '清理导入的联系人',
      description: '删除本次脚本导入的联系人（可选）',
      enabled: false, // 默认禁用，用户可选择启用
      order: 3,
      parameters: {
        device_id: deviceId || '', // 允许空值，后续在步骤中配置
        delete_method: 'by_import_session',
        import_session_id: '${contact_import_' + baseTimestamp + '.session_id}',
        confirm_before_delete: true,
        create_backup: true,
        delete_timeout: 30000,
        wait_after: 1000
      },
      pre_conditions: [`contact_import_${baseTimestamp}_success`],
      retry_config: {
        max_retries: 1,
        retry_delay: 1000
      }
    }
  ];
}

/**
 * 预定义的通讯录操作模板
 */
export const CONTACT_AUTOMATION_TEMPLATES = {
  // 基础导入模板
  BASIC_IMPORT: {
    name: '基础通讯录导入',
    description: '简单的通讯录文件导入流程',
    icon: '📱',
    category: 'contact',
    generateSteps: (params: { sourceFile?: string; deviceId?: string }) => 
      generateContactImportWorkflowSteps(params.sourceFile, params.deviceId)
  },

  // 批量导入模板
  BATCH_IMPORT: {
    name: '批量通讯录导入',
    description: '大量联系人分批导入，避免设备卡顿',
    icon: '📦',
    category: 'contact',
    generateSteps: (params: { sourceFile?: string; deviceId?: string; batchSize?: number }) => {
      const steps = generateContactImportWorkflowSteps(params.sourceFile, params.deviceId);
      // 修改批量大小
      steps[1].parameters.batch_size = params.batchSize || 20;
      steps[1].parameters.delay_between_batches = 2000;
      return steps;
    }
  },

  // 安全导入模板（带备份）
  SAFE_IMPORT: {
    name: '安全通讯录导入',
    description: '导入前创建备份，支持一键恢复',
    icon: '🛡️',
    category: 'contact',
    generateSteps: (params: { sourceFile?: string; deviceId?: string }) => {
      const steps = generateContactImportWorkflowSteps(params.sourceFile, params.deviceId);
      
      // 添加备份步骤
      const backupStep: ExtendedSmartScriptStep = {
        id: `contact_backup_${Date.now()}`,
        step_type: 'contact_backup_existing' as SmartActionType,
        name: '备份现有联系人',
        description: '在导入前备份设备中现有的联系人',
        enabled: true,
        order: 0,
        parameters: {
          device_id: params.deviceId || '', // 允许空值
          backup_path: './contact_backups',
          backup_format: 'vcf',
          include_metadata: true,
          wait_after: 2000
        },
        pre_conditions: [],
        retry_config: {
          max_retries: 2,
          retry_delay: 1000
        }
      };
      
      // 插入到第一步之前
      steps.unshift(backupStep);
      
      // 启用清理步骤
      steps[steps.length - 1].enabled = true;
      
      return steps;
    }
  }
};

/**
 * 获取通讯录操作的参数配置
 */
export function getContactStepParameterConfig(stepType: string) {
  const configs: Record<string, any[]> = {
    contact_generate_vcf: [
      { key: 'source_file_path', label: '源文件路径', type: 'file', required: true, 
        accept: '.vcf,.csv,.xlsx', description: '支持VCF、CSV、Excel格式' },
      { key: 'output_dir', label: '输出目录', type: 'text', default: './vcf_output' },
      { key: 'encoding', label: '文件编码', type: 'select', options: ['utf-8', 'gbk'], default: 'utf-8' },
      { key: 'batch_size', label: '批处理大小', type: 'number', default: 100, min: 1, max: 1000 }
    ],
    
    contact_import_to_device: [
      { key: 'device_id', label: '目标设备', type: 'device_selector', required: true },
      { key: 'batch_size', label: '导入批大小', type: 'number', default: 50, min: 1, max: 100 },
      { key: 'delay_between_batches', label: '批次间延迟(ms)', type: 'number', default: 1000, min: 0 },
      { key: 'verify_import', label: '验证导入结果', type: 'boolean', default: true },
      { key: 'backup_before_import', label: '导入前备份', type: 'boolean', default: true }
    ],
    
    contact_delete_imported: [
      { key: 'device_id', label: '目标设备', type: 'device_selector', required: true },
      { key: 'delete_method', label: '删除方式', type: 'select', 
        options: ['by_import_session', 'by_name_pattern', 'by_phone_pattern'], default: 'by_import_session' },
      { key: 'confirm_before_delete', label: '删除前确认', type: 'boolean', default: true },
      { key: 'create_backup', label: '删除前备份', type: 'boolean', default: true }
    ],
    
    contact_backup_existing: [
      { key: 'device_id', label: '源设备', type: 'device_selector', required: true },
      { key: 'backup_path', label: '备份路径', type: 'text', default: './contact_backups' },
      { key: 'backup_format', label: '备份格式', type: 'select', options: ['vcf', 'json'], default: 'vcf' },
      { key: 'include_metadata', label: '包含元数据', type: 'boolean', default: true }
    ]
  };
  
  return configs[stepType] || [];
}