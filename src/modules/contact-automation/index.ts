/**
 * 通讯录自动化模块导出
 */

// 类型定义
export * from './types';

// 模板和工具
export * from './templates/contactWorkflowTemplates';

// 组件
export { ContactWorkflowSelector } from './components/ContactWorkflowSelector';

// 工具函数
export * from './utils/vcfGenerator';
export * from './utils/contactImporter';