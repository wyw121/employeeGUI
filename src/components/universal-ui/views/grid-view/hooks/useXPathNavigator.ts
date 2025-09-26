import { useCallback, useState } from 'react';
import { UiNode } from '../types';
import { findAllByPredicateXPath, findByPredicateXPath, findByXPathRoot } from '../utils';
import { loadPrefs } from '../prefs';

interface UseXPathNavigatorParams {
  root: UiNode | null;
  onSelect: (n: UiNode) => void;
  onPanelSwitch?: (tab: 'results' | 'xpath') => void;
  onHighlight?: (n: UiNode | null) => void;
  triggerPanelRefresh?: () => void; // 原 panelActivateKey++ 行为
}

export function useXPathNavigator({ root, onSelect, onPanelSwitch, onHighlight, triggerPanelRefresh }: UseXPathNavigatorParams) {
  const [xPathInput, setXPathInput] = useState('');
  const [xpathTestNodes, setXpathTestNodes] = useState<UiNode[]>([]);

  const locateXPath = useCallback(() => {
    const xp = xPathInput.trim();
    if (!xp || !root) return;
    const n = findByXPathRoot(root, xp) || findByPredicateXPath(root, xp);
    if (n) onSelect(n); else alert('未找到匹配的 XPath 节点');
    if (n && findByXPathRoot(root, xp)) {
      setXpathTestNodes([n]);
      onHighlight?.(n);
    } else {
      const all = findAllByPredicateXPath(root, xp);
      setXpathTestNodes(all);
      onHighlight?.(all && all.length > 0 ? all[0] : null);
    }
    const prefs = loadPrefs();
    if (prefs.autoSwitchTab !== false) onPanelSwitch?.('xpath');
    triggerPanelRefresh?.();
  }, [xPathInput, root, onSelect, onHighlight, onPanelSwitch, triggerPanelRefresh]);

  return { xPathInput, setXPathInput, xpathTestNodes, locateXPath } as const;
}
