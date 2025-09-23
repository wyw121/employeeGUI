import React from 'react';
import { UiNode } from './types';
import { buildXPath } from './utils';
import { CopyChip } from './CopyChip';
import { nodeToJson, nodeToXml, downloadText } from './exporters';
import { FIELD_DOC_MAP, formatAttrValue } from './fieldDocs';

export const NodeDetail: React.FC<{ node: UiNode | null }> = ({ node }) => {
  if (!node) return <div className="text-sm text-neutral-500">选择一个节点查看详情…</div>;
  const xPath = buildXPath(node);
  const mainFields = [
    'resource-id', 'text', 'content-desc', 'class', 'package', 'bounds', 'clickable', 'enabled', 'visible-to-user', 'index',
  ];

  // 使用统一字段文档
  const restKeys = Object.keys(node.attrs).filter(k => !mainFields.includes(k));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">节点详情</div>
        <button
          className="text-xs px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          onClick={() => navigator.clipboard.writeText(xPath)}
          title="复制 XPath"
        >复制 XPath</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="text-xs px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          onClick={() => downloadText(nodeToXml(node), 'selected-node.xml', 'application/xml')}
        >导出XML</button>
        <button
          className="text-xs px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          onClick={() => downloadText(JSON.stringify(nodeToJson(node), null, 2), 'selected-node.json', 'application/json')}
        >导出JSON</button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {mainFields.map((k) => {
          const vRaw = node.attrs[k] ?? '';
          const v = formatAttrValue(k, vRaw);
          const showCopy = ['resource-id', 'text', 'content-desc', 'bounds'].includes(k);
          return (
            <div key={k} className="flex flex-col gap-1">
              <span className="text-neutral-500 flex items-center gap-2" title={FIELD_DOC_MAP[k]?.desc || k}>
                <span>
                  {FIELD_DOC_MAP[k]?.label || k}
                  <span className="ml-1 text-[10px] text-neutral-400">({k})</span>
                </span>
                {showCopy && v && <CopyChip text={String(vRaw)} label="复制" />}
              </span>
              <span className="font-medium break-all">{v}</span>
            </div>
          );
        })}
      </div>
      {restKeys.length > 0 && (
        <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
          <div className="text-sm font-semibold mb-2">其他属性</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {restKeys.map(k => (
              <div key={k} className="flex flex-col">
                <span className="text-neutral-500" title={FIELD_DOC_MAP[k]?.desc || k}>
                  {(FIELD_DOC_MAP[k]?.label || k)} <span className="ml-1 text-[10px] text-neutral-400">({k})</span>
                </span>
                <span className="break-all">{formatAttrValue(k, node.attrs[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
