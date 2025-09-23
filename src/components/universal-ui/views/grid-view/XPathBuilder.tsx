import React, { useMemo, useState } from 'react';
import { UiNode } from './types';
import { buildXPath } from './utils';
import styles from './GridElementView.module.css';
import { CopyChip } from './CopyChip';
import { getXPathHistory, addXPathHistory, clearXPathHistory, getFavoriteXPaths, toggleFavoriteXPath } from './history';

export interface XPathBuilderProps {
  node: UiNode | null;
  onApply: (xpath: string) => void;
  onInsert?: (xpath: string) => void;
}

export const XPathBuilder: React.FC<XPathBuilderProps> = ({ node, onApply, onInsert }) => {
  const [xpathInput, setXpathInput] = useState('');
  const [xpathHistory, setXpathHistory] = useState<string[]>(() => getXPathHistory());
  const [favXPath, setFavXPath] = useState<string[]>(() => getFavoriteXPaths());
  const candidates = useMemo(() => {
    if (!node) return [] as { label: string; xpath: string }[];
    const list: { label: string; xpath: string }[] = [];
    // 1) 绝对路径
    const abs = buildXPath(node);
    if (abs) list.push({ label: '绝对路径', xpath: abs });

    // 2) id 精准/包含
    const rid = node.attrs['resource-id'];
    if (rid) {
      list.push({ label: 'id 精准', xpath: `//*[@resource-id='${rid}']` });
      const idTail = rid.split('/').pop();
      if (idTail) list.push({ label: 'id 包含', xpath: `//*[contains(@resource-id,'${idTail}')]` });
      const slashIdx = rid.indexOf('/')
      if (slashIdx > 0) {
        const idPrefix = rid.slice(0, slashIdx + 1); // 保留到 '/'
        list.push({ label: 'id 前缀 starts-with', xpath: `//*[starts-with(@resource-id,'${idPrefix}')]` });
      }
    }

    // 3) text 精准/包含
    const txt = node.attrs['text'];
    if (txt) {
      list.push({ label: 'text 精准', xpath: `//*[text()='${txt}']` });
      list.push({ label: 'text 包含', xpath: `//*[contains(text(),'${txt}')]` });
    }

    // 4) content-desc 包含
    const desc = node.attrs['content-desc'];
    if (desc) {
      list.push({ label: 'content-desc 精准', xpath: `//*[@content-desc='${desc}']` });
      list.push({ label: 'content-desc 包含', xpath: `//*[contains(@content-desc,'${desc}')]` });
    }

    // 5) class + text / id
    const cls = node.attrs['class'];
    if (cls) {
      if (txt) list.push({ label: 'class+text', xpath: `//${cls}[text()='${txt}']` });
      if (rid) list.push({ label: 'class+id', xpath: `//${cls}[@resource-id='${rid}']` });
      if (txt) list.push({ label: 'class+contains(text)', xpath: `//${cls}[contains(text(),'${txt}')]` });
      if (rid) {
        const idTail2 = rid.split('/').pop();
        if (idTail2) list.push({ label: 'class+id 包含', xpath: `//${cls}[contains(@resource-id,'${idTail2}')]` });
      }
    }

    // 6) package 等值匹配
    const pkg = node.attrs['package'];
    if (pkg) {
      list.push({ label: 'package 等值', xpath: `//*[@package='${pkg}']` });
    }

    return list;
  }, [node]);

  if (!node) return null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between gap-2">
          <span>XPath 建议</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                list="builder-xpath-history"
                value={xpathInput}
                onChange={(e) => setXpathInput(e.target.value)}
                placeholder="输入/选择 XPath 并应用"
                className={styles.input}
                style={{ width: 260 }}
                onKeyDown={(e) => { if (e.key === 'Enter' && xpathInput.trim()) { onApply(xpathInput.trim()); addXPathHistory(xpathInput.trim()); setXpathHistory(getXPathHistory()); } }}
              />
              <datalist id="builder-xpath-history">
                {favXPath.map((s, i) => (<option key={`favxb-${i}`} value={s} />))}
                {xpathHistory.filter(s => !favXPath.includes(s)).map((s, i) => (<option key={`xhb-${i}`} value={s} />))}
              </datalist>
            </div>
            <button className={styles.btn} title="收藏/取消收藏当前 XPath" onClick={() => { if (!xpathInput.trim()) return; toggleFavoriteXPath(xpathInput.trim()); setFavXPath(getFavoriteXPaths()); }}>{favXPath.includes(xpathInput.trim()) ? '★' : '☆'}</button>
            <button className={styles.btn} title="清空 XPath 历史" onClick={() => { clearXPathHistory(); setXpathHistory([]); }}>清空历史</button>
            <button className={styles.btn} onClick={() => { if (!xpathInput.trim()) return; onApply(xpathInput.trim()); addXPathHistory(xpathInput.trim()); setXpathHistory(getXPathHistory()); }}>应用</button>
          </div>
        </div>
        <div className="mt-1 text-[12px] text-neutral-500">
          提示：XPath 是在 XML 里查找节点的“路径表达式”。下方为基于当前节点属性自动生成的 XPath 候选，点击即可应用或复制。
        </div>
      </div>
      <div className={styles.cardBody}>
        <ul className="space-y-1">
          {candidates.map((c, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                onClick={() => onApply(c.xpath)}
                title={c.xpath}
              >
                <span className="text-xs text-neutral-500 mr-2">{c.label}</span>
                <span className="font-mono text-[12px] break-all">{c.xpath}</span>
              </button>
              <div className="mt-1 flex items-center gap-2">
                <CopyChip text={c.xpath} label="复制" />
                {onInsert && (
                  <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onInsert(c.xpath)}>仅插入</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
