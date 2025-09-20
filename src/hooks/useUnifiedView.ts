/**
 * 统一视图联动Hook
 * 管理三个视图的数据联动和状态同步
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UnifiedViewData, EnhancedUIElement } from '../services/UnifiedViewDataManager';
import { EnhancedXmlCacheService, CachedViewData } from '../services/EnhancedXmlCacheService';
import { CachedXmlPage } from '../services/XmlPageCacheService';
import { message } from 'antd';

export interface ViewState {
  // 当前活跃的视图
  activeView: 'tree' | 'visual' | 'list';
  // 选中的元素
  selectedElement: EnhancedUIElement | null;
  // 搜索状态
  searchTerm: string;
  // 过滤状态
  filters: ViewFilters;
  // 加载状态
  loading: boolean;
}

export interface ViewFilters {
  // 元素类型过滤
  elementTypes: string[];
  // 交互类型过滤
  interactionTypes: ('clickable' | 'scrollable' | 'input' | 'display')[];
  // 重要性过滤
  importance: ('high' | 'medium' | 'low')[];
  // 只显示可点击元素
  onlyClickable: boolean;
  // 只显示有文本的元素
  onlyWithText: boolean;
}

export interface UnifiedViewActions {
  // 切换视图
  switchView: (view: 'tree' | 'visual' | 'list') => void;
  // 选择元素
  selectElement: (element: EnhancedUIElement | null) => void;
  // 搜索
  search: (term: string) => void;
  // 更新过滤器
  updateFilters: (filters: Partial<ViewFilters>) => void;
  // 加载页面数据
  loadPage: (cachedPage: CachedXmlPage, forceReanalyze?: boolean) => Promise<void>;
  // 刷新当前页面
  refresh: () => Promise<void>;
  // 强制重新分析当前页面
  forceReanalyze: () => Promise<void>;
  // 清除所有缓存
  clearAllCache: () => Promise<void>;
  // 清除数据
  clear: () => void;
}

export interface UseUnifiedViewResult {
  // 统一数据
  unifiedData: UnifiedViewData | null;
  // 过滤后的元素
  filteredElements: EnhancedUIElement[];
  // 视图状态
  viewState: ViewState;
  // 操作方法
  actions: UnifiedViewActions;
  // 统计信息
  stats: {
    total: number;
    filtered: number;
    selected: number;
    clickable: number;
    byType: Record<string, number>;
  };
}

const defaultFilters: ViewFilters = {
  elementTypes: [],
  interactionTypes: [],
  importance: [],
  onlyClickable: false,
  onlyWithText: false
};

const defaultViewState: ViewState = {
  activeView: 'visual',
  selectedElement: null,
  searchTerm: '',
  filters: defaultFilters,
  loading: false
};

/**
 * 统一视图联动Hook
 */
export const useUnifiedView = (): UseUnifiedViewResult => {
  const [unifiedData, setUnifiedData] = useState<UnifiedViewData | null>(null);
  const [viewState, setViewState] = useState<ViewState>(defaultViewState);
  const [currentPage, setCurrentPage] = useState<CachedXmlPage | null>(null);

  // 过滤元素
  const filteredElements = useMemo(() => {
    if (!unifiedData) return [];

    let elements = unifiedData.enhancedElements;

    // 搜索过滤
    if (viewState.searchTerm) {
      const searchLower = viewState.searchTerm.toLowerCase();
      elements = elements.filter(element =>
        element.searchKeywords.some(keyword => keyword.includes(searchLower)) ||
        element.displayName.toLowerCase().includes(searchLower)
      );
    }

    // 过滤器应用
    const { filters } = viewState;

    if (filters.elementTypes.length > 0) {
      elements = elements.filter(element =>
        filters.elementTypes.includes(element.element_type)
      );
    }

    if (filters.interactionTypes.length > 0) {
      elements = elements.filter(element =>
        filters.interactionTypes.includes(element.interactionType)
      );
    }

    if (filters.importance.length > 0) {
      elements = elements.filter(element =>
        filters.importance.includes(element.importance)
      );
    }

    if (filters.onlyClickable) {
      elements = elements.filter(element => element.is_clickable);
    }

    if (filters.onlyWithText) {
      elements = elements.filter(element => element.text && element.text.trim().length > 0);
    }

    return elements;
  }, [unifiedData, viewState.searchTerm, viewState.filters]);

  // 统计信息
  const stats = useMemo(() => {
    const total = unifiedData?.enhancedElements.length || 0;
    const filtered = filteredElements.length;
    const selected = viewState.selectedElement ? 1 : 0;
    const clickable = unifiedData?.enhancedElements.filter(e => e.is_clickable).length || 0;

    const byType: Record<string, number> = {};
    if (unifiedData) {
      unifiedData.enhancedElements.forEach(element => {
        const type = element.element_type;
        byType[type] = (byType[type] || 0) + 1;
      });
    }

    return {
      total,
      filtered,
      selected,
      clickable,
      byType
    };
  }, [unifiedData, filteredElements, viewState.selectedElement]);

  // 切换视图
  const switchView = useCallback((view: 'tree' | 'visual' | 'list') => {
    setViewState(prev => {
      // 记录视图切换事件（用于分析用户行为）
      console.log(`📊 视图切换: ${prev.activeView} → ${view}`);
      return { ...prev, activeView: view };
    });
  }, []);

  // 选择元素
  const selectElement = useCallback((element: EnhancedUIElement | null) => {
    setViewState(prev => ({ ...prev, selectedElement: element }));
    
    if (element) {
      console.log(`🎯 元素选中: ${element.displayName} (${element.id})`);
      
      // 触发选择事件（可以用于其他组件监听）
      window.dispatchEvent(new CustomEvent('elementSelected', {
        detail: { element, viewType: viewState.activeView }
      }));
    }
  }, [viewState.activeView]);

  // 搜索
  const search = useCallback((term: string) => {
    setViewState(prev => ({ ...prev, searchTerm: term }));
    
    // 清除选中状态（搜索时）
    if (term && viewState.selectedElement) {
      setViewState(prev => ({ ...prev, selectedElement: null }));
    }
  }, [viewState.selectedElement]);

  // 更新过滤器
  const updateFilters = useCallback((newFilters: Partial<ViewFilters>) => {
    setViewState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
    
    // 清除选中状态（过滤时）
    if (viewState.selectedElement) {
      setViewState(prev => ({ ...prev, selectedElement: null }));
    }
  }, [viewState.selectedElement]);

  // 加载页面数据
  const loadPage = useCallback(async (cachedPage: CachedXmlPage, forceReanalyze: boolean = false) => {
    setViewState(prev => ({ ...prev, loading: true }));
    
    try {
      if (forceReanalyze) {
        console.log('🔄 强制重新分析页面数据:', cachedPage.pageTitle);
      } else {
        console.log('🔄 加载统一视图数据:', cachedPage.pageTitle);
      }
      
      // 使用增强缓存服务加载数据
      const cachedViewData: CachedViewData = await EnhancedXmlCacheService.loadEnhancedPageData(
        cachedPage, 
        forceReanalyze
      );
      
      // 设置数据
      setUnifiedData(cachedViewData.unifiedData);
      setCurrentPage(cachedPage);
      
      // 重置视图状态
      setViewState(prev => ({
        ...prev,
        selectedElement: null,
        searchTerm: '',
        filters: defaultFilters,
        loading: false
      }));
      
      const actionText = forceReanalyze ? '重新分析完成' : '页面数据加载成功';
      message.success(`🎉 ${actionText}: ${cachedPage.pageTitle} (${cachedViewData.unifiedData.enhancedElements.length} 个增强元素)`);
      
    } catch (error) {
      console.error('❌ 加载页面数据失败:', error);
      setViewState(prev => ({ ...prev, loading: false }));
      message.error(forceReanalyze ? '重新分析失败，请重试' : '加载页面数据失败，请重试');
      throw error;
    }
  }, []);

  // 刷新当前页面
  const refresh = useCallback(async () => {
    if (!currentPage) {
      message.warning('没有当前页面可以刷新');
      return;
    }

    try {
      console.log('🔄 刷新当前页面数据');
      await loadPage(currentPage);
    } catch (error) {
      console.error('❌ 刷新页面失败:', error);
    }
  }, [currentPage, loadPage]);

  // 强制重新分析当前页面
  const forceReanalyze = useCallback(async () => {
    if (!currentPage) {
      message.warning('没有当前页面可以重新分析');
      return;
    }

    try {
      console.log('🔄 强制重新分析当前页面');
      await loadPage(currentPage, true);
    } catch (error) {
      console.error('❌ 重新分析失败:', error);
    }
  }, [currentPage, loadPage]);

  // 清除所有缓存
  const clearAllCache = useCallback(async () => {
    try {
      await EnhancedXmlCacheService.clearAllCache();
      message.success('🗑️ 所有缓存已清除');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
      message.error('清除缓存失败');
    }
  }, []);

  // 清除数据
  const clear = useCallback(() => {
    setUnifiedData(null);
    setCurrentPage(null);
    setViewState(defaultViewState);
    console.log('🗑️ 统一视图数据已清除');
  }, []);

  // 操作方法集合
  const actions: UnifiedViewActions = {
    switchView,
    selectElement,
    search,
    updateFilters,
    loadPage,
    refresh,
    forceReanalyze,
    clearAllCache,
    clear
  };

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 1/2/3 切换视图
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            switchView('tree');
            break;
          case '2':
            e.preventDefault();
            switchView('visual');
            break;
          case '3':
            e.preventDefault();
            switchView('list');
            break;
          case 'r':
            e.preventDefault();
            refresh();
            break;
        }
      }
      
      // ESC 清除选择
      if (e.key === 'Escape') {
        selectElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchView, selectElement, refresh]);

  // 监听元素选择事件（来自其他组件）
  useEffect(() => {
    const handleExternalElementSelect = (e: CustomEvent) => {
      const { element, source } = e.detail;
      if (source !== 'unifiedView' && element) {
        selectElement(element);
      }
    };

    window.addEventListener('externalElementSelect', handleExternalElementSelect as EventListener);
    return () => window.removeEventListener('externalElementSelect', handleExternalElementSelect as EventListener);
  }, [selectElement]);

  return {
    unifiedData,
    filteredElements,
    viewState,
    actions,
    stats
  };
};

/**
 * 轻量级的视图状态Hook（仅用于状态同步，不包含数据加载）
 */
export const useViewState = () => {
  const [activeView, setActiveView] = useState<'tree' | 'visual' | 'list'>('visual');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const switchView = useCallback((view: 'tree' | 'visual' | 'list') => {
    setActiveView(view);
  }, []);

  const selectElementById = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
  }, []);

  return {
    activeView,
    selectedElementId,
    switchView,
    selectElementById
  };
};

/**
 * 视图数据提供者Hook（用于跨组件共享数据）
 */
export const useViewDataProvider = () => {
  const unifiedView = useUnifiedView();
  
  // 提供给子组件的数据接口
  const provideTreeData = useCallback(() => {
    return unifiedView.unifiedData?.treeViewData || null;
  }, [unifiedView.unifiedData]);

  const provideVisualData = useCallback(() => {
    return unifiedView.unifiedData?.visualViewData || null;
  }, [unifiedView.unifiedData]);

  const provideListData = useCallback(() => {
    return unifiedView.unifiedData?.listViewData || null;
  }, [unifiedView.unifiedData]);

  return {
    ...unifiedView,
    provideTreeData,
    provideVisualData,
    provideListData
  };
};