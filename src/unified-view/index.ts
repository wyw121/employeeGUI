/**
 * 统一视图系统 - 主要导出
 * 提供完整的统一视图解决方案
 */

// 核心服务
export { UnifiedViewDataManager } from '../services/UnifiedViewDataManager';
export { EnhancedXmlCacheService } from '../services/EnhancedXmlCacheService';

// Hooks
export { useUnifiedView, useViewState, useViewDataProvider } from '../hooks/useUnifiedView';

// 组件
export { default as UnifiedViewContainer } from '../components/UnifiedViewContainer';
export { default as UnifiedViewDemo } from '../pages/UnifiedViewDemo';

// 类型定义
export type {
  UnifiedViewData,
  EnhancedUIElement,
  TreeViewData,
  VisualViewData,
  ListViewData
} from '../services/UnifiedViewDataManager';

export type {
  CachedViewData,
  EnhancedCachedPage
} from '../services/EnhancedXmlCacheService';

export type {
  ViewState,
  ViewFilters,
  UnifiedViewActions,
  UseUnifiedViewResult
} from '../hooks/useUnifiedView';

/**
 * 快速开始指南
 * 
 * 1. 基础使用：
 * ```tsx
 * import { useUnifiedView, UnifiedViewContainer } from './unified-view';
 * 
 * const MyComponent = () => {
 *   return (
 *     <UnifiedViewContainer
 *       height="600px"
 *       showSidebar={true}
 *       showToolbar={true}
 *     />
 *   );
 * };
 * ```
 * 
 * 2. 高级使用：
 * ```tsx
 * import { useUnifiedView } from './unified-view';
 * 
 * const MyAdvancedComponent = () => {
 *   const { unifiedData, actions, viewState } = useUnifiedView();
 *   
 *   // 加载页面数据
 *   const loadPage = async (page: CachedXmlPage) => {
 *     await actions.loadPage(page);
 *   };
 *   
 *   // 自定义过滤
 *   const filterClickableOnly = () => {
 *     actions.updateFilters({ onlyClickable: true });
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={filterClickableOnly}>
 *         只显示可点击元素
 *       </button>
 *       {unifiedData && (
 *         <div>已加载 {unifiedData.enhancedElements.length} 个元素</div>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 * 
 * 3. 性能优化特性：
 * - ✅ 单一数据源，避免重复计算
 * - ✅ 增强缓存，持久化处理结果  
 * - ✅ 智能过滤，实时响应用户操作
 * - ✅ 类型安全，完整的TypeScript支持
 * - ✅ 视图联动，三个视图状态同步
 * 
 * 4. 架构特点：
 * - UnifiedViewDataManager: 中央化数据处理
 * - EnhancedXmlCacheService: 增强缓存管理
 * - useUnifiedView: 统一状态管理Hook
 * - UnifiedViewContainer: 完整UI容器组件
 */