import React from 'react';
import { UiNode } from './types';
import { buildXPath } from './utils';
import { CopyChip } from './CopyChip';
import { nodeToJson, nodeToXml, downloadText } from './exporters';

export const NodeDetail: React.FC<{ node: UiNode | null }> = ({ node }) => {
  if (!node) return <div className="text-sm text-neutral-500">选择一个节点查看详情…</div>;
  const xPath = buildXPath(node);
  const mainFields = [
    'resource-id', 'text', 'content-desc', 'class', 'package', 'bounds', 'clickable', 'enabled', 'visible-to-user', 'index',
  ];

  // 字段中文说明（title 提示 + 中文名展示）
  const FIELD_META: Record<string, { label: string; desc?: string }> = {
    'resource-id': { label: '资源ID', desc: '控件的资源标识，常见形如 包名:id/控件ID；最稳定的定位依据' },
    'text': { label: '文本', desc: '控件显示的文字，可能随语言/内容变化而变化' },
    'content-desc': { label: '无障碍描述', desc: '用于辅助功能的描述（content-desc），可作为定位补充' },
    'class': { label: '类名', desc: 'Android 控件类名，例如 android.widget.Button' },
    'package': { label: '包名', desc: '应用包名，例如 com.xingin.xhs' },
    'bounds': { label: '边界矩形', desc: '屏幕中的位置与大小 [left,top][right,bottom]' },
    'clickable': { label: '可点击', desc: '是否声明为可点击' },
    'enabled': { label: '可用', desc: '是否处于可交互状态' },
    'visible-to-user': { label: '对用户可见', desc: '是否对用户可见（可能受遮挡/滚动影响）' },
    'index': { label: '兄弟序号', desc: '同层级下的索引位置' },
  };
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
          const v = node.attrs[k] ?? '';
          const showCopy = ['resource-id', 'text', 'content-desc', 'bounds'].includes(k);
          return (
            <div key={k} className="flex flex-col gap-1">
              <span className="text-neutral-500 flex items-center gap-2" title={FIELD_META[k]?.desc || k}>
                <span>
                  {FIELD_META[k]?.label || k}
                  <span className="ml-1 text-[10px] text-neutral-400">({k})</span>
                </span>
                {showCopy && v && <CopyChip text={String(v)} label="复制" />}
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
                <span className="text-neutral-500" title={k}>{k}</span>
                <span className="break-all">{node.attrs[k]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
