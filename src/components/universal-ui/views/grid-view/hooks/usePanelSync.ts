import { useCallback, useState } from 'react';
import type { UiNode } from '../types';

export interface UsePanelSyncOptions {
  /** 是否允许自动切换到结果标签（来自用户首选项） */
  autoSwitchTab?: boolean;
}

export interface PanelSyncApi {
  /** 结果/ XPath 面板当前激活的 Tab */
  panelActivateTab: 'results' | 'xpath';
  /** 结果/ XPath 面板重新渲染/闪烁高亮的 key */
  panelActivateKey: number;
  /** 当前需要在多面板（结果列表、预览等）高亮的节点 */
  panelHighlightNode: UiNode | null;
  /** 切换 Tab（外部也可强制） */
  setPanelActivateTab: (tab: 'results' | 'xpath') => void;
  /** 主动刷新（递增 key） */
  triggerPanelRefresh: () => void;
  /** 设置高亮节点，并触发刷新 */
  setHighlightNode: (node: UiNode | null, opts?: { refresh?: boolean; switchToResults?: boolean }) => void;
  /** 供结果列表/树结构 hover 调用 */
  handleHoverNode: (node: UiNode | null) => void;
}

/**
 * 抽离右侧复合面板同步逻辑（Tab 激活 / 高亮节点 / 强制刷新）
 * 统一提供最小 API，避免在视图组件中分散维护多个 useState。
 */
export function usePanelSync(options: UsePanelSyncOptions = {}): PanelSyncApi {
  const { autoSwitchTab = true } = options;

  const [panelActivateTab, setPanelActivateTab] = useState<'results' | 'xpath'>('results');
  const [panelActivateKey, setPanelActivateKey] = useState(0);
  const [panelHighlightNode, setPanelHighlightNode] = useState<UiNode | null>(null);

  const triggerPanelRefresh = useCallback(() => {
    setPanelActivateKey(k => k + 1);
  }, []);

  const setHighlightNode = useCallback((node: UiNode | null, opts?: { refresh?: boolean; switchToResults?: boolean }) => {
    setPanelHighlightNode(node);
    if (opts?.refresh !== false) {
      triggerPanelRefresh();
    }
    if (opts?.switchToResults && autoSwitchTab) {
      setPanelActivateTab('results');
    }
  }, [autoSwitchTab, triggerPanelRefresh]);

  const handleHoverNode = useCallback((node: UiNode | null) => {
    // Hover 仅预览，不强制切换 Tab，但刷新以触发闪烁高亮
    setHighlightNode(node, { refresh: true, switchToResults: false });
  }, [setHighlightNode]);

  return {
    panelActivateTab,
    panelActivateKey,
    panelHighlightNode,
    setPanelActivateTab,
    triggerPanelRefresh,
    setHighlightNode,
    handleHoverNode
  };
}
