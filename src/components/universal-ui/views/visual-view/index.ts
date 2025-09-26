// Barrel export for visual-view module
export { VisualElementView } from './VisualElementView';
export { LeftControlPanel } from './components/LeftControlPanel';
export { PagePreview } from './components/PagePreview';
export { ElementList } from './components/ElementList';
export * from './utils/elementTransform';
export * from './utils/categorization';
export * from './utils/appAnalysis';
export * from './hooks/useParsedVisualElements';
export * from './hooks/useFilteredVisualElements';
/**
 * 可视化视图模块入口
 */

export { 
  convertUIElementToVisual, 
  convertVisualToUIElement,
  getUserFriendlyName,
  categorizeElement,
  getElementImportance,
  createDefaultCategories,
  calculateElementStatistics
} from './utils';
export type { } from './VisualElementView';