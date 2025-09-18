/**
 * 页面分析 React Hook
 * 提供统一的页面分析功能接口
 */

import { useContext, useCallback } from 'react';
import { PageAnalysisStoreContext } from './PageAnalysisProvider';
import { 
  UIElementEntity, 
  ElementAction, 
  PageAnalysisConfig,
} from '../../domain/page-analysis';
import { ElementFilterConfig } from './PageAnalysisStore';

/**
 * 页面分析主 Hook
 */
export const usePageAnalysis = () => {
  const store = useContext(PageAnalysisStoreContext);
  
  if (!store) {
    throw new Error('usePageAnalysis must be used within PageAnalysisProvider');
  }

  // 使用 zustand hook 方式订阅状态
  const {
    // 状态
    isAnalyzing,
    currentAnalysis,
    analysisHistory,
    error,
    selectedElements,
    searchQuery,
    filterConfig,
    isModalVisible,
    modalDeviceId,
    hierarchyData,
    isHierarchyLoading,
    
    // 操作
    analyzeCurrentPage,
    refreshAnalysis,
    loadAnalysisHistory,
    selectElement,
    deselectElement,
    clearSelectedElements,
    executeElementAction,
    setSearchQuery,
    updateFilterConfig,
    searchElements,
    filterElements,
    loadHierarchy,
    toggleGroupExpansion,
    openModal,
    closeModal,
    setError,
    clearError,
    reset,
  } = store();

  // 便利方法
  const getRepresentativeElements = useCallback(() => {
    if (!currentAnalysis) return [];
    return currentAnalysis.getRepresentativeElements();
  }, [currentAnalysis]);

  const getFilteredElements = useCallback(() => {
    if (!currentAnalysis) return [];
    const elements = currentAnalysis.getRepresentativeElements();
    return filterElements(elements);
  }, [currentAnalysis, filterElements]);

  const getSearchResults = useCallback(() => {
    if (!searchQuery || !currentAnalysis) return [];
    const results = searchElements(searchQuery);
    return filterElements(results);
  }, [searchQuery, currentAnalysis, searchElements, filterElements]);

  const isElementSelected = useCallback((elementId: string) => {
    return selectedElements.some(e => e.id === elementId);
  }, [selectedElements]);

  const getElementsByType = useCallback((elementType: string) => {
    if (!currentAnalysis) return [];
    return currentAnalysis.getElementsByType(elementType);
  }, [currentAnalysis]);

  const getClickableElements = useCallback(() => {
    if (!currentAnalysis) return [];
    return currentAnalysis.getClickableElements();
  }, [currentAnalysis]);

  const getNavigationButtons = useCallback(() => {
    if (!currentAnalysis) return [];
    return currentAnalysis.getNavigationButtons();
  }, [currentAnalysis]);

  const getCurrentPageInfo = useCallback(() => {
    return currentAnalysis?.pageInfo || null;
  }, [currentAnalysis]);

  const getAnalysisStatistics = useCallback(() => {
    return currentAnalysis?.statistics || null;
  }, [currentAnalysis]);

  const hasError = useCallback(() => {
    return error !== null;
  }, [error]);

  const isReady = useCallback(() => {
    return currentAnalysis !== null && !isAnalyzing;
  }, [currentAnalysis, isAnalyzing]);

  return {
    // 状态
    isAnalyzing,
    currentAnalysis,
    analysisHistory,
    error,
    selectedElements,
    searchQuery,
    filterConfig,
    isModalVisible,
    modalDeviceId,
    hierarchyData,
    isHierarchyLoading,
    
    // 基础操作
    analyzeCurrentPage,
    refreshAnalysis,
    loadAnalysisHistory,
    
    // 元素操作
    selectElement,
    deselectElement,
    clearSelectedElements,
    executeElementAction,
    
    // 搜索过滤
    setSearchQuery,
    updateFilterConfig,
    
    // 层次结构
    loadHierarchy,
    toggleGroupExpansion,
    
    // 模态框
    openModal,
    closeModal,
    
    // 错误处理
    setError,
    clearError,
    
    // 重置
    reset,
    
    // 便利方法
    getRepresentativeElements,
    getFilteredElements,
    getSearchResults,
    isElementSelected,
    getElementsByType,
    getClickableElements,
    getNavigationButtons,
    getCurrentPageInfo,
    getAnalysisStatistics,
    hasError,
    isReady,
  };
};

/**
 * 页面分析配置 Hook
 */
export const usePageAnalysisConfig = () => {
  const { updateFilterConfig, filterConfig } = usePageAnalysis();

  const toggleClickableFilter = useCallback(() => {
    updateFilterConfig({ showOnlyClickable: !filterConfig.showOnlyClickable });
  }, [updateFilterConfig, filterConfig.showOnlyClickable]);

  const toggleVisibilityFilter = useCallback(() => {
    updateFilterConfig({ showOnlyVisible: !filterConfig.showOnlyVisible });
  }, [updateFilterConfig, filterConfig.showOnlyVisible]);

  const setElementTypeFilter = useCallback((elementTypes: string[]) => {
    updateFilterConfig({ elementTypes });
  }, [updateFilterConfig]);

  const setRegionFilter = useCallback((regions: string[]) => {
    updateFilterConfig({ regions });
  }, [updateFilterConfig]);

  const resetFilters = useCallback(() => {
    updateFilterConfig({
      showOnlyClickable: false,
      showOnlyVisible: true,
      elementTypes: [],
      regions: ['top', 'middle', 'bottom'],
    });
  }, [updateFilterConfig]);

  return {
    filterConfig,
    updateFilterConfig,
    toggleClickableFilter,
    toggleVisibilityFilter,
    setElementTypeFilter,
    setRegionFilter,
    resetFilters,
  };
};

/**
 * 元素操作 Hook
 */
export const useElementActions = () => {
  const { executeElementAction, modalDeviceId, setError } = usePageAnalysis();

  const clickElement = useCallback(async (element: UIElementEntity) => {
    if (!modalDeviceId) {
      setError('没有选择的设备');
      return false;
    }
    return executeElementAction(modalDeviceId, element, ElementAction.CLICK);
  }, [executeElementAction, modalDeviceId, setError]);

  const longClickElement = useCallback(async (element: UIElementEntity, duration?: number) => {
    if (!modalDeviceId) {
      setError('没有选择的设备');
      return false;
    }
    return executeElementAction(modalDeviceId, element, ElementAction.LONG_CLICK, { duration });
  }, [executeElementAction, modalDeviceId, setError]);

  const inputTextToElement = useCallback(async (element: UIElementEntity, text: string) => {
    if (!modalDeviceId) {
      setError('没有选择的设备');
      return false;
    }
    return executeElementAction(modalDeviceId, element, ElementAction.INPUT_TEXT, { text });
  }, [executeElementAction, modalDeviceId, setError]);

  const swipeElement = useCallback(async (
    element: UIElementEntity, 
    direction: 'up' | 'down' | 'left' | 'right'
  ) => {
    if (!modalDeviceId) {
      setError('没有选择的设备');
      return false;
    }
    const action = ElementAction[`SWIPE_${direction.toUpperCase()}` as keyof typeof ElementAction] as ElementAction;
    return executeElementAction(modalDeviceId, element, action);
  }, [executeElementAction, modalDeviceId, setError]);

  return {
    clickElement,
    longClickElement,
    inputTextToElement,
    swipeElement,
  };
};

/**
 * 页面分析统计 Hook
 */
export const usePageAnalysisStatistics = () => {
  const { getAnalysisStatistics, currentAnalysis } = usePageAnalysis();

  const statistics = getAnalysisStatistics();

  const getTypeDistributionData = useCallback(() => {
    if (!statistics) return [];
    
    return Object.entries(statistics.typeDistribution).map(([type, count]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: count,
    }));
  }, [statistics]);

  const getRegionDistributionData = useCallback(() => {
    if (!statistics) return [];
    
    const { regionDistribution } = statistics;
    return [
      { name: '顶部区域', value: regionDistribution.top },
      { name: '中部区域', value: regionDistribution.middle },
      { name: '底部区域', value: regionDistribution.bottom },
    ];
  }, [statistics]);

  const getAnalysisMetrics = useCallback(() => {
    if (!statistics || !currentAnalysis) return null;
    
    return {
      totalElements: statistics.totalElements,
      uniqueElements: statistics.uniqueElements,
      duplicateGroups: statistics.duplicateGroups,
      actionableElements: statistics.actionableElements,
      analysisTime: currentAnalysis.analysisTime,
      deduplicationRatio: statistics.totalElements > 0 
        ? (1 - statistics.uniqueElements / statistics.totalElements) * 100 
        : 0,
    };
  }, [statistics, currentAnalysis]);

  return {
    statistics,
    getTypeDistributionData,
    getRegionDistributionData,
    getAnalysisMetrics,
  };
};