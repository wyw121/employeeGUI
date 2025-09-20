/**
 * 元素选择上下文状态管理
 * 用于在"可视化视图"和"批量匹配"之间传递完整的元素信息
 */

import { create } from 'zustand';
import { UIElement } from '../api/universalUIAPI';

// 完整的元素选择上下文
export interface ElementSelectionContext {
  // 基础信息
  selectedElement: UIElement | null;
  rawXmlContent: string | null;
  xmlTimestamp: string | null;
  
  // 层级关系信息
  elementHierarchy: ElementHierarchyNode | null;
  parentCandidates: UIElement[];
  siblingCandidates: UIElement[];
  childCandidates: UIElement[];
  
  // 匹配规则配置
  matchingRules: ElementMatchingRules;
  
  // 自定义字段
  customFields: Record<string, any>;
  
  // 预览状态
  previewResults: ElementMatchPreview | null;
}

// XML层级节点
export interface ElementHierarchyNode {
  element: UIElement;
  parent: ElementHierarchyNode | null;
  children: ElementHierarchyNode[];
  level: number;
  path: string;
}

// 匹配规则配置
export interface ElementMatchingRules {
  // 基础匹配字段
  enabled: boolean;
  basicFields: {
    text: boolean;
    resourceId: boolean;
    className: boolean;
    bounds: boolean;
    clickable: boolean;
  };
  
  // 上下文匹配配置
  contextMatching: {
    enabled: boolean;
    parentMatching: {
      enabled: boolean;
      parentElement: UIElement | null;
      matchFields: string[];
    };
    siblingMatching: {
      enabled: boolean;
      anchorElements: UIElement[];
      relativePosition: 'left' | 'right' | 'above' | 'below' | 'any';
    };
    containerMatching: {
      enabled: boolean;
      containerClass: string;
      containerResourceId: string;
    };
  };
  
  // 高级配置
  advanced: {
    matchingWeights: {
      basicWeight: number;
      contextWeight: number;
      positionWeight: number;
    };
    fallbackStrategy: 'none' | 'basic' | 'fuzzy';
    confidenceThreshold: number;
  };
}

// 匹配预览结果
export interface ElementMatchPreview {
  matchedElements: Array<{
    element: UIElement;
    confidence: number;
    matchReason: string;
  }>;
  totalMatches: number;
  bestMatch: UIElement | null;
  warnings: string[];
}

interface ElementSelectionStore {
  context: ElementSelectionContext;
  
  // 基础操作
  setSelectedElement: (element: UIElement, xmlContent: string) => void;
  clearSelection: () => void;
  
  // 层级关系操作
  setElementHierarchy: (hierarchy: ElementHierarchyNode) => void;
  updateParentCandidates: (parents: UIElement[]) => void;
  updateSiblingCandidates: (siblings: UIElement[]) => void;
  
  // 匹配规则操作
  updateMatchingRules: (rules: Partial<ElementMatchingRules>) => void;
  toggleBasicField: (field: keyof ElementMatchingRules['basicFields']) => void;
  enableParentMatching: (parentElement: UIElement) => void;
  disableParentMatching: () => void;
  addSiblingAnchor: (siblingElement: UIElement) => void;
  removeSiblingAnchor: (elementId: string) => void;
  
  // 自定义字段操作
  addCustomField: (fieldName: string, value: any) => void;
  removeCustomField: (fieldName: string) => void;
  updateCustomField: (fieldName: string, value: any) => void;
  
  // 预览操作
  updatePreview: (preview: ElementMatchPreview) => void;
  clearPreview: () => void;
}

const defaultMatchingRules: ElementMatchingRules = {
  enabled: true,
  basicFields: {
    text: true,
    resourceId: false,
    className: true,
    bounds: false,
    clickable: true,
  },
  contextMatching: {
    enabled: false,
    parentMatching: {
      enabled: false,
      parentElement: null,
      matchFields: ['class', 'resource-id'],
    },
    siblingMatching: {
      enabled: false,
      anchorElements: [],
      relativePosition: 'any',
    },
    containerMatching: {
      enabled: false,
      containerClass: '',
      containerResourceId: '',
    },
  },
  advanced: {
    matchingWeights: {
      basicWeight: 0.6,
      contextWeight: 0.3,
      positionWeight: 0.1,
    },
    fallbackStrategy: 'basic',
    confidenceThreshold: 0.7,
  },
};

const defaultContext: ElementSelectionContext = {
  selectedElement: null,
  rawXmlContent: null,
  xmlTimestamp: null,
  elementHierarchy: null,
  parentCandidates: [],
  siblingCandidates: [],
  childCandidates: [],
  matchingRules: defaultMatchingRules,
  customFields: {},
  previewResults: null,
};

export const useElementSelectionStore = create<ElementSelectionStore>((set, get) => ({
  context: defaultContext,

  setSelectedElement: (element: UIElement, xmlContent: string) => {
    set((state) => ({
      context: {
        ...state.context,
        selectedElement: element,
        rawXmlContent: xmlContent,
        xmlTimestamp: new Date().toISOString(),
        // 重置其他状态
        previewResults: null,
        customFields: {},
        matchingRules: {
          ...defaultMatchingRules,
          // 根据元素特征智能设置默认规则
          basicFields: {
            ...defaultMatchingRules.basicFields,
            text: !!element.text,
            resourceId: !!element.resource_id && element.resource_id !== 'com.xingin.xhs:id/0_resource_name_obfuscated',
          },
        },
      },
    }));
  },

  clearSelection: () => {
    set({ context: defaultContext });
  },

  setElementHierarchy: (hierarchy: ElementHierarchyNode) => {
    set((state) => ({
      context: {
        ...state.context,
        elementHierarchy: hierarchy,
      },
    }));
  },

  updateParentCandidates: (parents: UIElement[]) => {
    set((state) => ({
      context: {
        ...state.context,
        parentCandidates: parents,
      },
    }));
  },

  updateSiblingCandidates: (siblings: UIElement[]) => {
    set((state) => ({
      context: {
        ...state.context,
        siblingCandidates: siblings,
      },
    }));
  },

  updateMatchingRules: (rules: Partial<ElementMatchingRules>) => {
    set((state) => ({
      context: {
        ...state.context,
        matchingRules: {
          ...state.context.matchingRules,
          ...rules,
        },
      },
    }));
  },

  toggleBasicField: (field: keyof ElementMatchingRules['basicFields']) => {
    set((state) => ({
      context: {
        ...state.context,
        matchingRules: {
          ...state.context.matchingRules,
          basicFields: {
            ...state.context.matchingRules.basicFields,
            [field]: !state.context.matchingRules.basicFields[field],
          },
        },
      },
    }));
  },

  enableParentMatching: (parentElement: UIElement) => {
    set((state) => ({
      context: {
        ...state.context,
        matchingRules: {
          ...state.context.matchingRules,
          contextMatching: {
            ...state.context.matchingRules.contextMatching,
            enabled: true,
            parentMatching: {
              ...state.context.matchingRules.contextMatching.parentMatching,
              enabled: true,
              parentElement,
            },
          },
        },
      },
    }));
  },

  disableParentMatching: () => {
    set((state) => ({
      context: {
        ...state.context,
        matchingRules: {
          ...state.context.matchingRules,
          contextMatching: {
            ...state.context.matchingRules.contextMatching,
            parentMatching: {
              ...state.context.matchingRules.contextMatching.parentMatching,
              enabled: false,
              parentElement: null,
            },
          },
        },
      },
    }));
  },

  addSiblingAnchor: (siblingElement: UIElement) => {
    set((state) => {
      const currentAnchors = state.context.matchingRules.contextMatching.siblingMatching.anchorElements;
      const newAnchors = [...currentAnchors, siblingElement];
      
      return {
        context: {
          ...state.context,
          matchingRules: {
            ...state.context.matchingRules,
            contextMatching: {
              ...state.context.matchingRules.contextMatching,
              enabled: true,
              siblingMatching: {
                ...state.context.matchingRules.contextMatching.siblingMatching,
                enabled: true,
                anchorElements: newAnchors,
              },
            },
          },
        },
      };
    });
  },

  removeSiblingAnchor: (elementId: string) => {
    set((state) => {
      const currentAnchors = state.context.matchingRules.contextMatching.siblingMatching.anchorElements;
      const newAnchors = currentAnchors.filter(anchor => anchor.id !== elementId);
      
      return {
        context: {
          ...state.context,
          matchingRules: {
            ...state.context.matchingRules,
            contextMatching: {
              ...state.context.matchingRules.contextMatching,
              siblingMatching: {
                ...state.context.matchingRules.contextMatching.siblingMatching,
                anchorElements: newAnchors,
                enabled: newAnchors.length > 0,
              },
            },
          },
        },
      };
    });
  },

  addCustomField: (fieldName: string, value: any) => {
    set((state) => ({
      context: {
        ...state.context,
        customFields: {
          ...state.context.customFields,
          [fieldName]: value,
        },
      },
    }));
  },

  removeCustomField: (fieldName: string) => {
    set((state) => {
      const { [fieldName]: removed, ...remainingFields } = state.context.customFields;
      return {
        context: {
          ...state.context,
          customFields: remainingFields,
        },
      };
    });
  },

  updateCustomField: (fieldName: string, value: any) => {
    set((state) => ({
      context: {
        ...state.context,
        customFields: {
          ...state.context.customFields,
          [fieldName]: value,
        },
      },
    }));
  },

  updatePreview: (preview: ElementMatchPreview) => {
    set((state) => ({
      context: {
        ...state.context,
        previewResults: preview,
      },
    }));
  },

  clearPreview: () => {
    set((state) => ({
      context: {
        ...state.context,
        previewResults: null,
      },
    }));
  },
}));