/**
 * 对话框自动化处理模块导出
 * 统一导出联系人导入对话框自动化处理相关的所有模块
 */

export * from './types';
export { DialogDetector } from './DialogDetector';
export { ParallelClickProcessor } from './ParallelClickProcessor';

// 便捷导出
export { DialogType, TargetButton } from './types';

// 默认导出主要处理器
export { ParallelClickProcessor as default } from './ParallelClickProcessor';