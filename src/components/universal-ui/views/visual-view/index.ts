// Barrel export for visual-view module
export { VisualElementView } from "./VisualElementView";
export { LeftControlPanel } from "./components/LeftControlPanel";
export { PagePreview } from "./components/PagePreview";
export { ElementList } from "./components/ElementList";
export * from "./utils/elementTransform";
export * from "./utils/categorization";
export * from "./utils/appAnalysis";
// 注意：直接从 canonical 实现导出，避免 .ts/.tsx 同名解析歧义
export { useParsedVisualElements } from "./hooks/canonical/useParsedVisualElementsCanonical";
export * from "./hooks/useFilteredVisualElements";
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
  calculateElementStatistics,
} from "./utils";
export type {} from "./VisualElementView";
