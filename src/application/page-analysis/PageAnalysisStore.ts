/**
 * 页面分析状态管理 Store
 * 基于 Zustand 的状态管理，遵循 DDD 架构原则
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  PageAnalysisEntity,
  UIElementEntity,
  ElementAction,
  PageAnalysisConfig,
  ElementHierarchyNode,
} from '../../domain/page-analysis';
import { PageAnalysisApplicationService } from './PageAnalysisApplicationService';

export interface PageAnalysisState {
  // 分析状态
  isAnalyzing: boolean;
  currentAnalysis: PageAnalysisEntity | null;
  analysisHistory: PageAnalysisEntity[];
  error: string | null;

  // UI状态
  selectedElements: UIElementEntity[];
  expandedGroups: Set<string>;
  searchQuery: string;
  filterConfig: ElementFilterConfig;
  
  // 模态框状态
  isModalVisible: boolean;
  modalDeviceId: string | null;
  
  // 层次结构状态
  hierarchyData: ElementHierarchyNode[] | null;
  isHierarchyLoading: boolean;
}

export interface ElementFilterConfig {
  showOnlyClickable: boolean;
  showOnlyVisible: boolean;
  elementTypes: string[];
  regions: string[];
}

export interface PageAnalysisActions {
  // 分析操作
  analyzeCurrentPage: (deviceId: string, config?: PageAnalysisConfig) => Promise<void>;
  refreshAnalysis: () => Promise<void>;
  loadAnalysisHistory: (deviceId: string, limit?: number) => Promise<void>;
  
  // 元素操作
  selectElement: (element: UIElementEntity) => void;
  deselectElement: (elementId: string) => void;
  clearSelectedElements: () => void;
  executeElementAction: (deviceId: string, element: UIElementEntity, action: ElementAction, params?: any) => Promise<boolean>;
  
  // 搜索和过滤
  setSearchQuery: (query: string) => void;
  updateFilterConfig: (config: Partial<ElementFilterConfig>) => void;
  searchElements: (query: string) => UIElementEntity[];
  filterElements: (elements: UIElementEntity[]) => UIElementEntity[];
  
  // 层次结构操作
  loadHierarchy: () => Promise<void>;
  toggleGroupExpansion: (groupKey: string) => void;
  
  // 模态框操作
  openModal: (deviceId: string) => void;
  closeModal: () => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 重置状态
  reset: () => void;
}

export type PageAnalysisStore = PageAnalysisState & PageAnalysisActions;

// 默认状态
const initialState: PageAnalysisState = {
  isAnalyzing: false,
  currentAnalysis: null,
  analysisHistory: [],
  error: null,
  selectedElements: [],
  expandedGroups: new Set(),
  searchQuery: '',
  filterConfig: {
    showOnlyClickable: false,
    showOnlyVisible: true,
    elementTypes: [],
    regions: ['top', 'middle', 'bottom'],
  },
  isModalVisible: false,
  modalDeviceId: null,
  hierarchyData: null,
  isHierarchyLoading: false,
};

/**
 * 创建页面分析 Store
 */
export const createPageAnalysisStore = (applicationService: PageAnalysisApplicationService) => 
  create<PageAnalysisStore>()(
    devtools(
      persist(
        immer((set, get) => ({
          ...initialState,

          // 分析操作
          analyzeCurrentPage: async (deviceId: string, config?: PageAnalysisConfig) => {
            set((state) => {
              state.isAnalyzing = true;
              state.error = null;
            });

            try {
              const analysis = await applicationService.analyzeCurrentPage(deviceId, config);
              
              set((state) => {
                state.currentAnalysis = analysis;
                state.isAnalyzing = false;
                // 将新分析添加到历史记录前面
                state.analysisHistory = [analysis, ...state.analysisHistory.slice(0, 9)]; // 保留最近10条
              });
            } catch (error) {
              set((state) => {
                state.isAnalyzing = false;
                state.error = error instanceof Error ? error.message : '分析失败';
              });
              throw error;
            }
          },

          refreshAnalysis: async () => {
            const { modalDeviceId } = get();
            if (!modalDeviceId) {
              throw new Error('没有选择的设备');
            }
            await get().analyzeCurrentPage(modalDeviceId);
          },

          loadAnalysisHistory: async (deviceId: string, limit = 10) => {
            try {
              const history = await applicationService.getAnalysisHistory(deviceId, limit);
              set((state) => {
                state.analysisHistory = history;
              });
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : '加载历史失败';
              });
            }
          },

          // 元素操作
          selectElement: (element: UIElementEntity) => {
            set((state) => {
              const exists = state.selectedElements.find(e => e.id === element.id);
              if (!exists) {
                state.selectedElements.push(element);
              }
            });
          },

          deselectElement: (elementId: string) => {
            set((state) => {
              state.selectedElements = state.selectedElements.filter(e => e.id !== elementId);
            });
          },

          clearSelectedElements: () => {
            set((state) => {
              state.selectedElements = [];
            });
          },

          executeElementAction: async (
            deviceId: string, 
            element: UIElementEntity, 
            action: ElementAction, 
            params?: any
          ) => {
            try {
              const result = await applicationService.executeElementAction(deviceId, element, action, params);
              
              if (!result.success) {
                set((state) => {
                  state.error = result.message;
                });
                return false;
              }
              
              return true;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : '操作执行失败';
              });
              return false;
            }
          },

          // 搜索和过滤
          setSearchQuery: (query: string) => {
            set((state) => {
              state.searchQuery = query;
            });
          },

          updateFilterConfig: (config: Partial<ElementFilterConfig>) => {
            set((state) => {
              Object.assign(state.filterConfig, config);
            });
          },

          searchElements: (query: string) => {
            const { currentAnalysis } = get();
            if (!currentAnalysis) return [];
            
            return currentAnalysis.searchElements(query);
          },

          filterElements: (elements: UIElementEntity[]) => {
            const { filterConfig } = get();
            
            return elements.filter(element => {
              // 只显示可点击元素
              if (filterConfig.showOnlyClickable && !element.isClickable) {
                return false;
              }
              
              // 只显示可见元素
              if (filterConfig.showOnlyVisible && !element.isVisible()) {
                return false;
              }
              
              // 元素类型过滤
              if (filterConfig.elementTypes.length > 0 && 
                  !filterConfig.elementTypes.includes(element.elementType)) {
                return false;
              }
              
              // 区域过滤
              const centerY = element.getCenterPoint().y;
              const region = centerY < 600 ? 'top' : centerY < 1800 ? 'middle' : 'bottom';
              if (!filterConfig.regions.includes(region)) {
                return false;
              }
              
              return true;
            });
          },

          // 层次结构操作
          loadHierarchy: async () => {
            const { currentAnalysis } = get();
            if (!currentAnalysis) return;

            set((state) => {
              state.isHierarchyLoading = true;
            });

            try {
              const hierarchy = await applicationService.getPageHierarchy(currentAnalysis.id);
              set((state) => {
                state.hierarchyData = hierarchy;
                state.isHierarchyLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.isHierarchyLoading = false;
                state.error = error instanceof Error ? error.message : '加载层次结构失败';
              });
            }
          },

          toggleGroupExpansion: (groupKey: string) => {
            set((state) => {
              if (state.expandedGroups.has(groupKey)) {
                state.expandedGroups.delete(groupKey);
              } else {
                state.expandedGroups.add(groupKey);
              }
            });
          },

          // 模态框操作
          openModal: (deviceId: string) => {
            set((state) => {
              state.isModalVisible = true;
              state.modalDeviceId = deviceId;
            });
          },

          closeModal: () => {
            set((state) => {
              state.isModalVisible = false;
              state.modalDeviceId = null;
            });
          },

          // 错误处理
          setError: (error: string | null) => {
            set((state) => {
              state.error = error;
            });
          },

          clearError: () => {
            set((state) => {
              state.error = null;
            });
          },

          // 重置状态
          reset: () => {
            set((state) => {
              Object.assign(state, initialState);
              state.expandedGroups = new Set();
            });
          },
        })),
        {
          name: 'page-analysis-store',
          partialize: (state) => ({
            // 只持久化部分状态，不包括瞬时状态
            analysisHistory: state.analysisHistory.slice(0, 5), // 只保存最近5条
            filterConfig: state.filterConfig,
            expandedGroups: Array.from(state.expandedGroups), // Set 需要转换为数组
          }),
          onRehydrateStorage: () => (state) => {
            // 恢复时重新创建 Set
            if (state && Array.isArray(state.expandedGroups)) {
              state.expandedGroups = new Set(state.expandedGroups as string[]);
            }
          },
        }
      ),
      { name: 'PageAnalysisStore' }
    )
  );

// 类型导出
export type PageAnalysisStoreInstance = ReturnType<typeof createPageAnalysisStore>;