import React, { useMemo } from 'react';
import { AdvancedFilter, UiNode } from './types';
import styles from './GridElementView.module.css';

export interface MatchBadgesProps {
  node: UiNode;
  keyword: string;
  advFilter?: AdvancedFilter;
}

export const MatchBadges: React.FC<MatchBadgesProps> = ({ node, keyword, advFilter }) => {
  const hints = useMemo(() => getMatchHints(node, keyword, advFilter), [node, keyword, advFilter]);
  if (hints.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {hints.map((h, i) => (
        <span key={i} className={styles.badge}>{h}</span>
      ))}
    </div>
  );
};

function getMatchHints(n: UiNode, keyword: string, adv?: AdvancedFilter): string[] {
  const res: string[] = [];
  const kw = (keyword || '').trim().toLowerCase();
  const classStr = (n.attrs['class'] || n.tag).toLowerCase();
  const idStr = (n.attrs['resource-id'] || '').toLowerCase();
  const textStr = (n.attrs['text'] || '').toLowerCase();
  const descStr = (n.attrs['content-desc'] || '').toLowerCase();

  if (kw) {
    if (idStr.includes(kw)) res.push('id');
    if (textStr.includes(kw)) res.push('text');
    if (descStr.includes(kw)) res.push('desc');
    if (classStr.includes(kw)) res.push('class');
  }
  if (adv && adv.enabled) {
    if (adv.resourceId && idStr.includes(adv.resourceId.toLowerCase())) res.push('id');
    if (adv.text && (textStr.includes(adv.text.toLowerCase()) || descStr.includes(adv.text.toLowerCase()))) res.push('text/desc');
    if (adv.className && classStr.includes(adv.className.toLowerCase())) res.push('class');
    if (adv.packageName && (n.attrs['package'] || '').toLowerCase().includes(adv.packageName.toLowerCase())) res.push('pkg');
    if (adv.clickable !== null && ((n.attrs['clickable'] || '').toLowerCase() === 'true') === adv.clickable) res.push('clickable');
    if (adv.nodeEnabled !== null && ((n.attrs['enabled'] || '').toLowerCase() === 'true') === adv.nodeEnabled) res.push('enabled');
  }
  // 去重
  return Array.from(new Set(res));
}
