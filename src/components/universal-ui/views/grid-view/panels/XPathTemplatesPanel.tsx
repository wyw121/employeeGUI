import React, { useMemo, useState } from 'react';
import styles from "../GridElementView.module.css";
import type { UiNode } from "../types";

interface XPathTemplatesPanelProps {
  node: UiNode | null;
  onApply: (xp: string) => void;
  onInsert?: (xp: string) => void;
}

const BASE_TEMPLATES: Array<{ label: string; build: (n: UiNode) => string | null }> = [
  { label: '按 id 等值', build: n => n.attrs['resource-id'] ? `//*[@resource-id='${n.attrs['resource-id']}']` : null },
  { label: '按 id 包含', build: n => {
    const rid = n.attrs['resource-id'];
    if (!rid) return null; const tail = rid.split('/').pop(); if (!tail) return null; return `//*[contains(@resource-id,'${tail}')]`;
  } },
  { label: '按 text 等值', build: n => n.attrs['text'] ? `//*[text()='${n.attrs['text']}']` : null },
  { label: '按 text 包含', build: n => n.attrs['text'] ? `//*[contains(text(),'${n.attrs['text']}')]` : null },
  { label: '按 desc 等值', build: n => n.attrs['content-desc'] ? `//*[@content-desc='${n.attrs['content-desc']}']` : null },
  { label: '按 desc 包含', build: n => n.attrs['content-desc'] ? `//*[contains(@content-desc,'${n.attrs['content-desc']}')]` : null },
  { label: 'class + text', build: n => (n.attrs['class'] && n.attrs['text']) ? `//${n.attrs['class']}[text()='${n.attrs['text']}']` : null },
  { label: 'class + id 等值', build: n => (n.attrs['class'] && n.attrs['resource-id']) ? `//${n.attrs['class']}[@resource-id='${n.attrs['resource-id']}']` : null },
];

export const XPathTemplatesPanel: React.FC<XPathTemplatesPanelProps> = ({ node, onApply, onInsert }) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const items = useMemo(() => {
    if (!node) return [] as Array<{ label: string; xpath: string }>; 
    return BASE_TEMPLATES.map(t => ({ label: t.label, xpath: t.build(node) || '' })).filter(i => !!i.xpath);
  }, [node]);
  if (!node) return null;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>XPath 模板</span>
        <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-500 mr-2">{it.label}</div>
                  <div className="flex items-center gap-2">
                    {onInsert && <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onInsert(it.xpath)}>仅插入</button>}
                    <button className={styles.btn} style={{ padding: '2px 6px' }} onClick={() => onApply(it.xpath)}>应用</button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-[12px] break-all">{it.xpath}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default XPathTemplatesPanel;
