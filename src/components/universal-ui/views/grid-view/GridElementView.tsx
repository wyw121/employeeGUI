/**
 * ADB XML 可视化检查器 - 网格视图版本
 * 用于在 GUI 中展示 ADB/UiAutomator 导出的 XML（page source）树结构与节点详情。
 * 
 * 设计目标（样式 & 交互）：
 * 1) 顶部工具栏：导入 XML / 一键填充示例 / 关键词搜索。
 * 2) 左侧：可折叠的节点树（TreeView），展示 label（text/resource-id/class）与最关键属性。
 * 3) 右侧：分为「节点详情」与「屏幕预览」两个卡片；详情展示常见字段（resource-id、text、content-desc、class、package...），
 *    并提供「复制 XPath」；屏幕预览根据 bounds 在一个虚拟屏幕中画出矩形，并高亮选中元素。
 * 4) 整体采用 TailwindCSS 风格（柔和阴影、卡片、圆角、分割线），默认暗色/亮色均适配。
 * 
 * 注意：
 * - 该组件不依赖后端，前端内存解析 XML；
 * - 集成到四视图系统中作为网格检查器使用。
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { VisualUIElement } from "../../types";
import styles from './GridElementView.module.css';
import { UiNode, AdvancedFilter, SearchOptions } from './types';
import type { NodeLocator } from '../../../../domain/inspector/entities/NodeLocator';
import { attachParents, parseUiAutomatorXml, matchNode, matchNodeAdvanced, makeCombinedMatcher, findByXPathRoot, findByPredicateXPath, findNearestClickableAncestor, findAllByPredicateXPath } from './utils';
import { TreeRow } from './TreeRow';
import { NodeDetail } from './NodeDetail';
import { ScreenPreview } from './ScreenPreview';
import { MatchResultsPanel } from './MatchResultsPanel';
import { FilterBar } from './FilterBar';
import { AdvancedFilterSummary } from './AdvancedFilterSummary';
import { Breadcrumbs } from './Breadcrumbs';
import { XPathBuilder } from './XPathBuilder';
import { XPathTestResultsPanel } from './XPathTestResultsPanel';
import { MatchCountSummary } from './MatchCountSummary';
import { loadPrefs, savePrefs } from './prefs';
import { SearchFieldToggles } from './SearchFieldToggles';
import { getSearchHistory, addSearchHistory, clearSearchHistory, getFavoriteSearches, toggleFavoriteSearch, getXPathHistory, addXPathHistory, clearXPathHistory, getFavoriteXPaths, toggleFavoriteXPath } from './history';
import { useGridHotkeys } from './useGridHotkeys';
import { downloadText } from './exporters';
import { XmlSourcePanel } from './panels/XmlSourcePanel';
import { BreadcrumbPanel } from './panels/BreadcrumbPanel';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { ScreenPreviewPanel } from './panels/ScreenPreviewPanel';
import { ResultsAndXPathPanel } from './panels/ResultsAndXPathPanel';
import { XPathHelpPanel } from './panels/XPathHelpPanel';
import { FieldDocPanel } from './panels/FieldDocPanel';
import { XPathTemplatesPanel } from './panels/XPathTemplatesPanel';
import { LocatorAdvisorPanel } from './panels/LocatorAdvisorPanel';

// =============== 类型定义（见 ./types） ===============

// 视图组件属性接口
interface GridElementViewProps {
  xmlContent?: string;
  elements?: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
  // Inspector 集成：提供会话与步骤创建，以及外部定位能力
  sessionId?: string;
  onCreateStep?: (sessionId: string, node: UiNode) => void;
  locator?: NodeLocator;
  locatorResolve?: (root: UiNode | null, locator: NodeLocator) => UiNode | null;
}

// =============== 工具函数（见 ./utils） ===============

// =============== UI 子组件 ===============

// TreeRow 已抽出为独立组件

// NodeDetail 已抽出为独立组件

// ScreenPreview 已抽出为独立组件

// =============== 主组件 ===============
export const GridElementView: React.FC<GridElementViewProps> = ({
  xmlContent = "",
  elements = [],
  onElementSelect,
  selectedElementId = "",
  sessionId,
  onCreateStep,
  locator,
  locatorResolve,
}) => {
  // XML 文本与解析树
  const [xmlText, setXmlText] = useState<string>("");
  const [root, setRoot] = useState<UiNode | null>(null);
  const [selected, setSelected] = useState<UiNode | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [collapseVersion, setCollapseVersion] = useState<number>(0);
  const [expandDepth, setExpandDepth] = useState<number>(0);
  const [matches, setMatches] = useState<UiNode[]>([]);
  const [matchIndex, setMatchIndex] = useState<number>(-1);
  const [xPathInput, setXPathInput] = useState<string>("");
  const [showMatchedOnly, setShowMatchedOnly] = useState<boolean>(false);
  const [advFilter, setAdvFilter] = useState<AdvancedFilter>({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '', packageName: '', clickable: null, nodeEnabled: null });
  const [autoSelectOnParse, setAutoSelectOnParse] = useState<boolean>(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({ caseSensitive: false, useRegex: false });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favSearch, setFavSearch] = useState<string[]>([]);
  const [xpathHistory, setXpathHistory] = useState<string[]>([]);
  const [favXPath, setFavXPath] = useState<string[]>([]);
  const [xpathTestNodes, setXpathTestNodes] = useState<UiNode[]>([]);
  // 右侧面板联动控制
  const [panelActivateKey, setPanelActivateKey] = useState<number>(0);
  const [panelHighlightNode, setPanelHighlightNode] = useState<UiNode | null>(null);
  const [panelActivateTab, setPanelActivateTab] = useState<'results' | 'xpath'>('results');

  // 初始化首选项
  useEffect(() => {
    const p = loadPrefs();
    setAutoSelectOnParse(p.autoSelectOnParse);
    setShowMatchedOnly(p.showMatchedOnly);
    setExpandDepth(p.expandDepth);
  // 兼容旧版本偏好，并带出字段选择
  setSearchOptions({ caseSensitive: (p as any).caseSensitive ?? false, useRegex: (p as any).useRegex ?? false, fields: p.searchFields });
  // 初始化历史与收藏
  setSearchHistory(getSearchHistory());
  setFavSearch(getFavoriteSearches());
  setXpathHistory(getXPathHistory());
  setFavXPath(getFavoriteXPaths());
  }, []);

  // 持久化首选项
  useEffect(() => {
    savePrefs({
      autoSelectOnParse,
      showMatchedOnly,
      expandDepth,
      caseSensitive: searchOptions.caseSensitive,
      useRegex: searchOptions.useRegex,
      searchFields: {
        id: searchOptions.fields?.id ?? true,
        text: searchOptions.fields?.text ?? true,
        desc: searchOptions.fields?.desc ?? true,
        className: searchOptions.fields?.className ?? true,
        tag: searchOptions.fields?.tag ?? true,
        pkg: searchOptions.fields?.pkg ?? false,
      },
    });
  }, [autoSelectOnParse, showMatchedOnly, expandDepth, searchOptions]);

  // 参考输入框引用
  const fileRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const xpathRef = useRef<HTMLInputElement | null>(null);

  // 全局快捷键：Ctrl+F 聚焦搜索，F3/Shift+F3 导航匹配，Ctrl+L 聚焦 XPath 输入
  useGridHotkeys({
    focusSearch: () => searchRef.current?.focus(),
    nextMatch: () => goToMatch(1),
    prevMatch: () => goToMatch(-1),
    focusXPath: () => xpathRef.current?.focus(),
  });

  // 上传文件（可选）

  // 初始化时如果有 xmlContent 则自动解析
  useEffect(() => {
    if (xmlContent && xmlContent !== xmlText) {
      setXmlText(xmlContent);
      onParse(xmlContent);
    }
  }, [xmlContent]);

  const onParse = (xmlToUse?: string) => {
    const targetXml = xmlToUse || xmlText;
    const tree = parseUiAutomatorXml(targetXml);
    if (tree) {
      attachParents(tree);
      setRoot(tree);
      // 重置展开与匹配状态
      setExpandAll(false);
      setCollapseVersion(v => v + 1);
      setExpandDepth(2);
      setMatches([]);
      setMatchIndex(-1);
      // 解析完成后，如启用“自动定位”，则尝试定位首个匹配
      if (autoSelectOnParse) {
        setTimeout(() => locateFirstMatch(), 0);
      }
      // 外部提供 locator 时，优先执行精确定位
      if (locator && locatorResolve) {
        setTimeout(() => {
          try {
            const n = locatorResolve(tree, locator);
            if (n) setSelected(n);
          } catch {
            // ignore
          }
        }, 0);
      }
    } else {
      alert("XML 解析失败，请检查格式");
    }
  };

  // 按关键字定位首个匹配
  const locateFirstMatch = () => {
    const kw = filter.trim();
    const anyAdv = advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className);
  const combined = makeCombinedMatcher(kw, advFilter, searchOptions);
    if (!kw && !anyAdv) return; // 无任何条件则不定位
    const dfs = (n?: UiNode | null): UiNode | null => {
      if (!n) return null;
      if (combined(n)) return n;
      for (const c of n.children) {
        const r = dfs(c);
        if (r) return r;
      }
      return null;
    };
    const found = dfs(root);
    if (found) {
      setSelected(found);
      // 在“匹配结果”中高亮并滚动
      setPanelHighlightNode(found);
      setPanelActivateTab('results');
      setPanelActivateKey(k => k + 1);
    }
  };

  // 计算当前匹配列表（不自动选中，供用户导航）
  useEffect(() => {
    if (!root) {
      setMatches([]);
      setMatchIndex(-1);
      return;
    }
    const kw = filter.trim();
    const anyAdv = advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className);
    if (!kw && !anyAdv) {
      // 无筛选条件则清空匹配集合
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

  // 当选中节点改变时，同步匹配索引
  useEffect(() => {
    if (!selected || matches.length === 0) return;
    const idx = matches.indexOf(selected);
    if (idx !== -1) setMatchIndex(idx);
  }, [selected, matches]);

  const goToMatch = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    let idx = matchIndex;
    if (idx < 0) idx = 0;
    idx = (idx + dir + matches.length) % matches.length;
    setSelected(matches[idx]);
    setMatchIndex(idx);
  };

  // 匹配集合与选中祖先集合
  const matchedSet = useMemo(() => new Set(matches), [matches]);
  const selectedAncestors = useMemo(() => {
    const s = new Set<UiNode>();
    let cur = selected || null;
    while (cur && cur.parent) {
      s.add(cur.parent);
      cur = cur.parent;
    }
    return s;
  }, [selected]);

  const locateXPath = () => {
    const xp = xPathInput.trim();
    if (!xp) return;
    const n = findByXPathRoot(root, xp) || findByPredicateXPath(root, xp);
    if (n) setSelected(n);
    else alert('未找到匹配的 XPath 节点');
    // 额外：计算全部命中用于测试面板（绝对路径命中则仅显示该节点，否则尝试谓词查找全部）
    if (n && findByXPathRoot(root, xp)) {
      setXpathTestNodes([n]);
      setPanelHighlightNode(n);
    } else {
      const all = findAllByPredicateXPath(root, xp);
      setXpathTestNodes(all);
      setPanelHighlightNode(all && all.length > 0 ? all[0] : null);
    }
    // 切换到 XPath 工具页签并触发一次联动
    setPanelActivateTab('xpath');
    setPanelActivateKey((k) => k + 1);
  };

  const loadDemo = () => {
    const demo = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.ss.android.ugc.aweme" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" visible-to-user="true" bounds="[0,0][1080,2400]">
    <node class="android.view.ViewGroup" bounds="[0,220][1080,2400]">
      <node class="android.widget.TextView" text="推荐" bounds="[80,240][200,300]"/>
      <node class="android.widget.TextView" text="关注" bounds="[220,240][340,300]"/>
      <node class="androidx.recyclerview.widget.RecyclerView" bounds="[0,320][1080,2400]">
        <node class="android.view.ViewGroup" bounds="[0,320][1080,800]">
          <node class="android.widget.TextView" text="用户A" bounds="[24,340][180,390]"/>
          <node class="android.widget.Button" text="关注" resource-id="com.ss.android.ugc.aweme:id/btn_follow" clickable="true" enabled="true" bounds="[900,600][1040,680]"/>
        </node>
        <node class="android.view.ViewGroup" bounds="[0,820][1080,1300]">
          <node class="android.widget.TextView" text="用户B" bounds="[24,840][180,890]"/>
          <node class="android.widget.Button" text="关注" resource-id="com.ss.android.ugc.aweme:id/btn_follow" clickable="true" enabled="true" bounds="[900,1100][1040,1180]"/>
        </node>
      </node>
    </node>
  </node>
</hierarchy>`;
    setXmlText(demo);
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setXmlText(String(reader.result));
    reader.readAsText(file);
  };

  // 分栏宽度（可拖拽）
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('grid.leftWidth'));
    return Number.isFinite(v) && v >= 20 && v <= 80 ? v : 36; // 百分比
  });
  const draggingRef = useRef<boolean>(false);
  useEffect(() => {
    localStorage.setItem('grid.leftWidth', String(leftWidth));
  }, [leftWidth]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const container = document.getElementById('grid-split');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const pct = Math.max(20, Math.min(80, (px / rect.width) * 100));
      setLeftWidth(pct);
      e.preventDefault();
    };
    const onUp = () => { draggingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);
  const startDrag = (e: React.MouseEvent) => { draggingRef.current = true; document.body.style.cursor = 'col-resize'; e.preventDefault(); };

  return (
    <div className={`${styles.root} w-full h-full p-4 md:p-6`}>
      {/* 顶部工具栏 */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-bold">ADB XML 可视化检查器</div>
        <div className={`${styles.toolbar}`}>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
              }}
            />
            <button className={styles.btn} onClick={() => fileRef.current?.click()}>导入 XML 文件</button>
            <button className={styles.btn} onClick={loadDemo}>填充示例</button>
            <button className={styles.btn} onClick={() => downloadText(xmlText, 'current.xml', 'application/xml')}>导出当前 XML</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                list="grid-search-history"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="搜索：resource-id/text/content-desc/class"
                className={styles.input}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    locateFirstMatch();
                    addSearchHistory(filter);
                    setSearchHistory(getSearchHistory());
                  }
                }}
                ref={searchRef}
              />
              <datalist id="grid-search-history">
                {favSearch.map((s, i) => (<option key={`fav-${i}`} value={s} />))}
                {searchHistory.filter(s => !favSearch.includes(s)).map((s, i) => (<option key={`h-${i}`} value={s} />))}
              </datalist>
            </div>
            <button className={styles.btn} title="收藏/取消收藏当前搜索" onClick={() => { const ok = toggleFavoriteSearch(filter); setFavSearch(getFavoriteSearches()); }}>{favSearch.includes(filter.trim()) ? '★' : '☆'}</button>
            <button className={styles.btn} title="清空搜索历史" onClick={() => { clearSearchHistory(); setSearchHistory([]); }}>清空历史</button>
            <button
              className={styles.btn}
              onClick={async () => {
                try {
                  const txt = await navigator.clipboard.readText();
                  if (txt && txt.trim()) {
                    setXmlText(txt);
                  } else {
                    alert('剪贴板为空');
                  }
                } catch (err) {
                  alert('无法读取剪贴板，请检查浏览器/应用权限');
                }
              }}
            >粘贴 XML</button>
            <button className={styles.btn} onClick={() => onParse()}>解析 XML</button>
            <button className={styles.btn} onClick={() => setExpandAll(true)}>展开全部</button>
            <button className={styles.btn} onClick={() => { setExpandAll(false); setCollapseVersion(v => v + 1); }}>折叠全部</button>
            <button className={styles.btn} onClick={locateFirstMatch}>定位匹配</button>
            <button className={styles.btn} onClick={() => goToMatch(-1)}>上一个</button>
            <button className={styles.btn} onClick={() => goToMatch(1)}>下一个</button>
            <MatchCountSummary total={matches.length} index={matchIndex} autoSelectOnParse={autoSelectOnParse} onToggleAutoSelect={setAutoSelectOnParse} />
          </div>
        </div>
  {/* 第二排：按层级展开与 XPath 精准定位 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs text-neutral-500 flex items-center gap-1">
            <input type="checkbox" checked={searchOptions.caseSensitive} onChange={(e) => setSearchOptions(s => ({ ...s, caseSensitive: e.target.checked }))} /> 区分大小写
          </label>
          <label className="text-xs text-neutral-500 flex items-center gap-1">
            <input type="checkbox" checked={searchOptions.useRegex} onChange={(e) => setSearchOptions(s => ({ ...s, useRegex: e.target.checked }))} /> 使用正则
          </label>
          <SearchFieldToggles value={searchOptions} onChange={setSearchOptions} />
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <label className="text-xs text-neutral-500">展开到层级</label>
          <select
            className={styles.input}
            value={expandDepth}
            onChange={(e) => { setExpandDepth(parseInt(e.target.value, 10) || 0); setExpandAll(false); }}
            style={{ width: 96 }}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div className="relative">
            <input
              list="grid-xpath-history"
              value={xPathInput}
              onChange={(e) => setXPathInput(e.target.value)}
              placeholder="/hierarchy/node[1]/node[2]"
              className={styles.input}
              style={{ width: 260 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { locateXPath(); addXPathHistory(xPathInput); setXpathHistory(getXPathHistory()); } }}
              ref={xpathRef}
            />
            <datalist id="grid-xpath-history">
              {favXPath.map((s, i) => (<option key={`favx-${i}`} value={s} />))}
              {xpathHistory.filter(s => !favXPath.includes(s)).map((s, i) => (<option key={`xh-${i}`} value={s} />))}
            </datalist>
          </div>
          <button className={styles.btn} title="收藏/取消收藏当前 XPath" onClick={() => { const ok = toggleFavoriteXPath(xPathInput); setFavXPath(getFavoriteXPaths()); }}>{favXPath.includes(xPathInput.trim()) ? '★' : '☆'}</button>
          <button className={styles.btn} title="清空 XPath 历史" onClick={() => { clearXPathHistory(); setXpathHistory([]); }}>清空历史</button>
          <button className={styles.btn} onClick={locateXPath}>定位 XPath</button>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <button className={styles.btn} onClick={() => { const t = findNearestClickableAncestor(selected); if (t) setSelected(t); }}>选中可点击父级</button>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <label className="text-xs text-neutral-500 flex items-center gap-1">
            <input type="checkbox" checked={showMatchedOnly} onChange={(e) => setShowMatchedOnly(e.target.checked)} /> 仅显示匹配路径
          </label>
          <span className="text-[10px] text-neutral-400">支持 //*[@resource-id='xxx']</span>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <button className={styles.btn} onClick={() => { setFilter(''); setAdvFilter({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '', packageName: '', clickable: null, nodeEnabled: null }); }}>清空筛选</button>
          <button className={styles.btn} onClick={() => { setShowMatchedOnly(true); locateFirstMatch(); }}>展开匹配路径</button>
        </div>
        {/* 第三排：高级过滤器 */}
        <div className="mt-2">
          <FilterBar value={advFilter} onChange={setAdvFilter} />
          <AdvancedFilterSummary
            value={advFilter}
            onClear={() => {
              setAdvFilter({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '', packageName: '', clickable: null, nodeEnabled: null });
              setFilter('');
            }}
          />
        </div>
      </div>

      {/* 主体双栏布局（左：树；右：详情） with resizable split */}
      <div id="grid-split" className="w-full" style={{ display: 'grid', gridTemplateColumns: `${leftWidth}% 8px ${100 - leftWidth}%`, gap: '16px' }}>
        {/* 左侧 */}
        <div className="space-y-4">
          <XmlSourcePanel xmlText={xmlText} setXmlText={setXmlText} onParse={() => onParse()} />
          <BreadcrumbPanel selected={selected} onSelect={(n) => setSelected(n)} />
          <div className={styles.card}>
            <div className={styles.cardHeader}>节点树</div>
            <div className={`${styles.cardBody} ${styles.tree}`}>
              {root ? (
                <TreeRow node={root} depth={0} selected={selected} onSelect={setSelected} filter={filter} searchOptions={searchOptions} expandAll={expandAll} collapseVersion={collapseVersion} expandDepth={expandDepth} matchedSet={matchedSet} selectedAncestors={selectedAncestors} showMatchedOnly={showMatchedOnly} hasActiveFilter={Boolean(filter.trim()) || Boolean(advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className || advFilter.packageName || advFilter.clickable !== null || advFilter.nodeEnabled !== null))} />
              ) : (
                <div className="p-3 text-sm text-neutral-500">解析 XML 后在此展示树结构…</div>
              )}
            </div>
          </div>
        </div>
        {/* 分隔线 */}
        <div onMouseDown={startDrag} style={{ cursor: 'col-resize', background: 'var(--g-border)', width: '8px', borderRadius: 4 }} />
        {/* 右侧 */}
        <div className="space-y-4">
          <NodeDetailPanel node={selected} sessionId={sessionId} onCreateStep={onCreateStep} />
          <LocatorAdvisorPanel
            node={selected}
            onApply={(xp) => { setXPathInput(xp); setTimeout(() => locateXPath(), 0); }}
            onInsert={(xp) => setXPathInput(xp)}
          />
          <ScreenPreviewPanel root={root} selected={selected} onSelect={(n) => setSelected(n)} matchedSet={matchedSet} />
          <ResultsAndXPathPanel
            matches={matches}
            matchIndex={matchIndex}
            keyword={filter}
            advFilter={advFilter}
            searchOptions={searchOptions}
            onJump={(idx, node) => { setMatchIndex(idx); setSelected(node); }}
            onInsertXPath={(xp) => setXPathInput(xp)}
            selected={selected}
            onApplyXPath={(xp) => { setXPathInput(xp); setTimeout(() => locateXPath(), 0); }}
            onInsertOnly={(xp) => setXPathInput(xp)}
            xpathTestNodes={xpathTestNodes}
            onJumpToNode={(n) => setSelected(n)}
            activateTab={panelActivateTab}
            activateKey={panelActivateKey}
            highlightNode={panelHighlightNode}
          />
          <XPathTemplatesPanel node={selected} onApply={(xp) => { setXPathInput(xp); setTimeout(() => locateXPath(), 0); }} onInsert={(xp) => setXPathInput(xp)} />
          <FieldDocPanel />
          <XPathHelpPanel />
        </div>
      </div>

      <div className={styles.hint}>
        提示：
        1) 搜索框会对 resource-id / text / content-desc / class 做包含匹配；
        2) 选中节点后可复制 XPath；
        3) 屏幕预览按 bounds 画出全部元素矩形，蓝色高亮为当前选中元素。
      </div>
    </div>
  );
}