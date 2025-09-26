## GridElementView 重构拆分设计（阶段 1 草案）

目标：将当前 700+ 行的 `GridElementView.tsx` 控制组件拆分为若干聚焦逻辑的自定义 Hook，主组件只做编排与布局。保持对外 API 不变（导出的 `GridElementView` Props 与行为完全兼容）。

### 当前职责分组
1. 解析与树构建：xmlText, onParse, parseUiAutomatorXml, attachParents
2. 匹配与筛选：filter, advFilter, searchOptions, matches, matchIndex, locateFirstMatch, goToMatch, matchedSet, selectedAncestors
3. XPath 导航与测试：xPathInput, locateXPath, xpathTestNodes
4. 右侧面板联动：panelActivateKey, panelHighlightNode, panelActivateTab
5. 选中节点与回填：selected, onApplyCriteria, currentStrategy/currentFields + 缓存(loadLatestMatching/saveLatestMatching)
6. 首选项与持久化：autoSelectOnParse, showMatchedOnly, expandDepth, searchFields 等（loadPrefs/savePrefs）
7. 可拖拽分栏：leftWidth + mousemove/up 事件
8. I/O：文件导入、示例填充、导出、剪贴板解析

### 拆分 Hook 规划
| Hook | 主要输出 | 说明 |
|------|----------|------|
| `useResizableSplit` | { leftWidth, startDrag } | 抽离分栏宽度与拖拽事件，localStorage key 保持 `grid.leftWidth` |
| `useXmlParsing` | { xmlText, setXmlText, root, parse } | 负责 XML -> UiNode 树，包含 attachParents，支持 autoSelectOnParse 触发回调（可通过参数注入 locateFirstMatch） |
| `useSearchAndMatch` | { filter, setFilter, advFilter, setAdvFilter, searchOptions, setSearchOptions, matches, matchIndex, setMatchIndex, locateFirstMatch, goToMatch, matchedSet, selectedAncestors } | 聚焦关键字+高级筛选逻辑与结果集计算 |
| `useXPathNavigator` | { xPathInput, setXPathInput, locateXPath, xpathTestNodes } | 独立 XPath 解析 / 批量匹配 / 面板切换触发（需要依赖 root, setSelected, setPanelActivateTab, setPanelActivateKey）|
| `useMatchingSelection` | { currentStrategy, currentFields, setStrategy, setFields } | 读取与写入 latestMatching 缓存 + 上抛 onLatestMatchingChange |
| `usePanelSync` | { panelActivateKey, panelHighlightNode, panelActivateTab, hover handlers } | 抽离跨面板高亮与 tab 激活控制（可视为 UI glue）|
| `usePrefs`（可选） | consolidate 首选项读写，目前保持内联，后续阶段再抽离 |

### 渐进式实施顺序
1. useResizableSplit（低风险，无外部依赖）
2. useMatchingSelection（独立缓存逻辑）
3. useSearchAndMatch（核心依赖 root/selected，需要谨慎）
4. useXPathNavigator（依赖 root + 面板状态回调）
5. useXmlParsing（与 search/matching 有相互调用，通过回调 decouple）
6. usePanelSync（收尾减少主组件噪音）

### 不改变的内容
* `GridElementView` Props、导出路径、外部调用方式
* 子面板组件与样式文件
* 本地存储 key 命名
* 匹配算法与 util 行为（所有逻辑仍在 `utils/` 内引用）

### 验证策略
1. 每抽离一个 Hook，运行 `npm run type-check`（CI 同步可加 lint）
2. 对比重构前后：搜索关键字输入、匹配数量、XPath 定位、策略回填日志输出是否一致
3. 观察本地存储：拆分后仍写入相同 key

### 后续优化（暂不实施）
* 将首选项统一用一个 useReducer + context（避免多处 useEffect 持久化）
* 为匹配/解析添加基本缓存策略（hash xmlText）
* 引入单元测试（对 makeCombinedMatcher / locateXPath 等）

---
本文件阶段性更新：当前为阶段 1 草案，后续提交实现时同步勾选完成项。
