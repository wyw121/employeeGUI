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
import { UiNode, AdvancedFilter } from './types';
import { attachParents, parseUiAutomatorXml, matchNode, matchNodeAdvanced, makeCombinedMatcher, findByXPathRoot, findByPredicateXPath } from './utils';
import { TreeRow } from './TreeRow';
import { NodeDetail } from './NodeDetail';
import { ScreenPreview } from './ScreenPreview';
import { MatchResultsPanel } from './MatchResultsPanel';
import { FilterBar } from './FilterBar';
import { AdvancedFilterSummary } from './AdvancedFilterSummary';
import { Breadcrumbs } from './Breadcrumbs';

// =============== 类型定义（见 ./types） ===============

// 视图组件属性接口
interface GridElementViewProps {
  xmlContent?: string;
  elements?: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
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
  const [advFilter, setAdvFilter] = useState<AdvancedFilter>({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '' });

  // 上传文件（可选）
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      setSelected(tree);
      // 重置展开与匹配状态
      setExpandAll(false);
      setCollapseVersion(v => v + 1);
      setExpandDepth(2);
      setMatches([]);
      setMatchIndex(-1);
    } else {
      alert("XML 解析失败，请检查格式");
    }
  };

  // 按关键字定位首个匹配
  const locateFirstMatch = () => {
    const kw = filter.trim();
    const anyAdv = advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className);
    const combined = makeCombinedMatcher(kw, advFilter);
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
    if (found) setSelected(found);
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
    const combined = makeCombinedMatcher(kw, advFilter);
    while (stk.length) {
      const n = stk.pop()!;
      if (combined(n)) result.push(n);
      for (let i = n.children.length - 1; i >= 0; i--) stk.push(n.children[i]);
    }
    setMatches(result);
    setMatchIndex(result.length > 0 ? 0 : -1);
  }, [root, filter, advFilter]);

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
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索：resource-id/text/content-desc/class"
              className={styles.input}
              onKeyDown={(e) => { if (e.key === 'Enter') locateFirstMatch(); }}
            />
            <button className={styles.btn} onClick={() => onParse()}>解析 XML</button>
            <button className={styles.btn} onClick={() => setExpandAll(true)}>展开全部</button>
            <button className={styles.btn} onClick={() => { setExpandAll(false); setCollapseVersion(v => v + 1); }}>折叠全部</button>
            <button className={styles.btn} onClick={locateFirstMatch}>定位匹配</button>
            <button className={styles.btn} onClick={() => goToMatch(-1)}>上一个</button>
            <button className={styles.btn} onClick={() => goToMatch(1)}>下一个</button>
            <span className="text-xs text-neutral-500">{matches.length > 0 ? `${(matchIndex>=0?matchIndex+1:0)}/${matches.length}` : '0/0'}</span>
          </div>
        </div>
  {/* 第二排：按层级展开与 XPath 精准定位 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <input
            value={xPathInput}
            onChange={(e) => setXPathInput(e.target.value)}
            placeholder="/hierarchy/node[1]/node[2]"
            className={styles.input}
            style={{ width: 260 }}
            onKeyDown={(e) => { if (e.key === 'Enter') locateXPath(); }}
          />
          <button className={styles.btn} onClick={locateXPath}>定位 XPath</button>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <label className="text-xs text-neutral-500 flex items-center gap-1">
            <input type="checkbox" checked={showMatchedOnly} onChange={(e) => setShowMatchedOnly(e.target.checked)} /> 仅显示匹配路径
          </label>
          <span className="text-[10px] text-neutral-400">支持 //*[@resource-id='xxx']</span>
          <span className="mx-2 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <button className={styles.btn} onClick={() => { setFilter(''); setAdvFilter({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '' }); }}>清空筛选</button>
          <button className={styles.btn} onClick={() => { setShowMatchedOnly(true); locateFirstMatch(); }}>展开匹配路径</button>
        </div>
        {/* 第三排：高级过滤器 */}
        <div className="mt-2">
          <FilterBar value={advFilter} onChange={setAdvFilter} />
          <AdvancedFilterSummary
            value={advFilter}
            onClear={() => {
              setAdvFilter({ enabled: false, mode: 'AND', resourceId: '', text: '', className: '' });
              setFilter('');
            }}
          />
        </div>
      </div>

      {/* 主体双栏布局 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 左列：源码编辑 + 树视图 */}
        <div className="md:col-span-2 space-y-4">
          <div className={styles.card}>
            <div className={styles.cardHeader}>XML 源码</div>
            <div className={styles.cardBody}>
              <textarea
                value={xmlText}
                onChange={(e) => setXmlText(e.target.value)}
                placeholder="粘贴 uiautomator dump 的 XML 内容…"
                className={styles.inputArea}
              />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>节点树</div>
            <div className={`${styles.cardBody} ${styles.tree}`}>
              <div className="mb-2"><Breadcrumbs selected={selected} onSelect={(n) => setSelected(n)} /></div>
              {root ? (
                <TreeRow node={root} depth={0} selected={selected} onSelect={setSelected} filter={filter} expandAll={expandAll} collapseVersion={collapseVersion} expandDepth={expandDepth} matchedSet={matchedSet} selectedAncestors={selectedAncestors} showMatchedOnly={showMatchedOnly} hasActiveFilter={Boolean(filter.trim()) || Boolean(advFilter.enabled && (advFilter.resourceId || advFilter.text || advFilter.className))} />
              ) : (
                <div className="p-3 text-sm text-neutral-500">解析 XML 后在此展示树结构…</div>
              )}
            </div>
          </div>
        </div>

        {/* 右列：匹配结果侧栏 + 详情 + 预览 */}
        <div className="space-y-4">
          <MatchResultsPanel
            matches={matches}
            matchIndex={matchIndex}
            keyword={filter}
            advFilter={advFilter}
            onJump={(idx, node) => { setMatchIndex(idx); setSelected(node); }}
          />
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <NodeDetail node={selected} />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <ScreenPreview root={root} selected={selected} onSelect={(n) => setSelected(n)} />
            </div>
          </div>
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