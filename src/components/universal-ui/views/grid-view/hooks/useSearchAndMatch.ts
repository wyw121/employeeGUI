import { useCallback, useEffect, useMemo, useState } from 'react';
import { UiNode, AdvancedFilter, SearchOptions } from '../types';
import { makeCombinedMatcher } from '../utils';

interface UseSearchAndMatchParams {
  root: UiNode | null;
  selected: UiNode | null;
  onSelect: (n: UiNode) => void;
  onAutoLocate?: (n: UiNode) => void; // 定位首个匹配时的副作用（高亮 / 切换 tab）
}

export function useSearchAndMatch({ root, selected, onSelect, onAutoLocate }: UseSearchAndMatchParams) {
  const [filter, setFilter] = useState('');
  const [advFilter, setAdvFilter] = useState<AdvancedFilter>({
    enabled: false,
    mode: 'AND',
    resourceId: '',
    text: '',
    className: '',
    packageName: '',
    clickable: null,
    nodeEnabled: null,
  });
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    caseSensitive: false,
    useRegex: false,
    fields: { id: true, text: true, desc: true, className: true, tag: true, pkg: false },
  });
  const [matches, setMatches] = useState<UiNode[]>([]);
  const [matchIndex, setMatchIndex] = useState(-1);

  // 计算匹配集
  useEffect(() => {
    if (!root) {
      setMatches([]);
      setMatchIndex(-1);
      return;
    }
    const kw = filter.trim();
    const anyAdv = advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className);
    if (!kw && !anyAdv) {
      setMatches([]);
      setMatchIndex(-1);
      return;
    }
    const result: UiNode[] = [];
    const stk: UiNode[] = [root];
    const combined = makeCombinedMatcher(kw, advFilter, searchOptions);
    while (stk.length) {
      const n = stk.pop()!;
      if (combined(n)) result.push(n);
      for (let i = n.children.length - 1; i >= 0; i--) stk.push(n.children[i]);
    }
    setMatches(result);
    setMatchIndex(result.length > 0 ? 0 : -1);
  }, [root, filter, advFilter, searchOptions]);

  // 同步选中 -> 匹配索引
  useEffect(() => {
    if (!selected || matches.length === 0) return;
    const idx = matches.indexOf(selected);
    if (idx !== -1) setMatchIndex(idx);
  }, [selected, matches]);

  const locateFirstMatch = useCallback(() => {
    const kw = filter.trim();
    const anyAdv = advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className);
    const combined = makeCombinedMatcher(kw, advFilter, searchOptions);
    if (!kw && !anyAdv) return;
    const dfs = (n?: UiNode | null): UiNode | null => {
      if (!n) return null;
      if (combined(n)) return n;
      for (const c of n.children) { const r = dfs(c); if (r) return r; }
      return null;
    };
    const found = dfs(root);
    if (found) {
      onSelect(found);
      onAutoLocate?.(found);
    }
  }, [filter, advFilter, searchOptions, root, onSelect, onAutoLocate]);

  const goToMatch = useCallback((dir: 1 | -1) => {
    if (matches.length === 0) return;
    let idx = matchIndex;
    if (idx < 0) idx = 0;
    idx = (idx + dir + matches.length) % matches.length;
    onSelect(matches[idx]);
    setMatchIndex(idx);
  }, [matches, matchIndex, onSelect]);

  const matchedSet = useMemo(() => new Set(matches), [matches]);
  const selectedAncestors = useMemo(() => {
    const s = new Set<UiNode>();
    let cur = selected || null;
    while (cur && cur.parent) { s.add(cur.parent); cur = cur.parent; }
    return s;
  }, [selected]);

  return {
    // state
    filter, setFilter,
    advFilter, setAdvFilter,
    searchOptions, setSearchOptions,
    matches, matchIndex, setMatchIndex,
    matchedSet, selectedAncestors,
    // actions
    locateFirstMatch, goToMatch,
  } as const;
}
