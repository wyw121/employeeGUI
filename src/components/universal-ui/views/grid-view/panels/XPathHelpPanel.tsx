import React, { useState } from 'react';
import styles from "../GridElementView.module.css";

export const XPathHelpPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>XPath 帮助</span>
        <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p>XPath 用于在 XML 中定位节点。常用语法：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="font-mono">//tag</code>：匹配任意位置的 <code>tag</code> 节点</li>
              <li><code className="font-mono">//*[@attr='val']</code>：按属性等值匹配</li>
              <li><code className="font-mono">//*[contains(@attr,'val')]</code>：按属性包含匹配</li>
              <li><code className="font-mono">//tag[text()='确定']</code>：按文本等值匹配</li>
              <li><code className="font-mono">//*[starts-with(@resource-id,'com.xhs:id/')]</code>：前缀匹配</li>
            </ul>
            <p className="mt-2">建议优先使用 <code className="font-mono">resource-id</code> 等稳定属性；文本/位置可能随界面变化而不稳定。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default XPathHelpPanel;
