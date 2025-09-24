/**
 * 统一元素选择模块 - 入口文件
 * 
 * 统一导出所有相关类型、工具和处理器
 */

// 类型定义
export type {
  CompleteElementContext,
  ElementSelectionSource,
  ElementSelectionEvent,
  ElementSelectionListener,
  ElementFingerprintConfig,
  ElementRelocationConfig,
} from './types';

// 核心类
export { ElementFingerprintGenerator, elementFingerprintGenerator } from './ElementFingerprintGenerator';
export { EnhancedElementRelocator, enhancedElementRelocator } from './EnhancedElementRelocator';
export { UnifiedElementSelectionHandler, unifiedElementSelectionHandler } from './UnifiedElementSelectionHandler';

// 重定位结果类型
export type { RelocationResult } from './EnhancedElementRelocator';