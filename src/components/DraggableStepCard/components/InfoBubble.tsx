import React from 'react';
import { Popover, Button, Descriptions, Tag } from 'antd';
import { InfoCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { MatchingStrategyTag } from '../../step-card';

interface InfoBubbleProps {
  step: any;
  boundNode: any;
  snapshotAvailable: boolean;
  onOpenXmlInspector: () => void;
}

/**
 * 信息气泡（小泡泡）
 * 展示三项核心数据：
 * 1) 绑定元素是谁（从 boundNode 或参数兜底）
 * 2) 匹配规则（strategy、fields、部分值）
 * 3) 原始 XML 快照（是否可用 + 一键打开检查器）
 */
export const InfoBubble: React.FC<InfoBubbleProps> = ({ step, boundNode, snapshotAvailable, onOpenXmlInspector }) => {
  const matching = step?.parameters?.matching || {};

  const attrs = (() => {
    if (boundNode?.attrs) return boundNode.attrs;
    const p = step?.parameters || {};
    const v = matching.values || {};
    return {
      'resource-id': v['resource-id'] || p.resource_id,
      'text': v['text'] || p.text,
      'content-desc': v['content-desc'] || p.content_desc,
      'class': v['class'] || p.class_name,
      'bounds': v['bounds'] || p.bounds,
      'package': v['package'] || p.package,
    } as Record<string, any>;
  })();

  const fields: string[] = Array.isArray(matching.fields) ? matching.fields : [];
  const values = matching.values || {};

  const content = (
    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
      <Descriptions size="small" column={1} bordered labelStyle={{ width: 120 }}>
        <Descriptions.Item label="元素标识">
          <div className="text-xs space-y-1">
            <div>id: <span className="text-neutral-700">{attrs['resource-id'] || '—'}</span></div>
            <div>text: <span className="text-neutral-700">{attrs['text'] || '—'}</span></div>
            <div>desc: <span className="text-neutral-700">{attrs['content-desc'] || '—'}</span></div>
            <div>class: <span className="text-neutral-700">{attrs['class'] || '—'}</span></div>
            <div>bounds: <span className="text-neutral-700 break-all">{attrs['bounds'] || '—'}</span></div>
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="匹配规则">
          <div className="flex items-center gap-2 text-xs">
            <MatchingStrategyTag strategy={matching.strategy} small />
            <span>字段数: {fields.length}</span>
            {fields.length > 0 && (
              <span className="truncate max-w-64" title={fields.join(', ')}>
                [{fields.slice(0, 4).join(', ')}{fields.length > 4 ? '…' : ''}]
              </span>
            )}
          </div>
          {fields.length > 0 && (
            <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
              {fields.slice(0, 4).map((f) => (
                <div key={f} className="flex items-start">
                  <span className="min-w-20 text-neutral-500">{f}：</span>
                  <span className="flex-1 break-all text-neutral-800">{values?.[f] ?? '—'}</span>
                </div>
              ))}
              {fields.length > 4 && <div className="text-neutral-400">… 其余 {fields.length - 4} 项</div>}
            </div>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="上下文">
          <div className="text-xs space-y-1">
            <div>
              父节点类名：
              <span className="text-neutral-700">{boundNode?.parent?.attrs?.['class'] || '—'}</span>
            </div>
            <div>
              子节点数量：
              <span className="text-neutral-700">{Array.isArray(boundNode?.children) ? boundNode.children.length : (typeof boundNode?.childCount === 'number' ? boundNode.childCount : 0)}</span>
            </div>
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="XML 快照">
          <div className="flex items-center gap-2 text-xs">
            <Tag color={snapshotAvailable ? 'green' : 'red'}>{snapshotAvailable ? '可用' : '缺失'}</Tag>
            <Button
              size="small"
              type="default"
              icon={<EyeOutlined />}
              disabled={!snapshotAvailable}
              onClick={(e) => { e.stopPropagation(); onOpenXmlInspector(); }}
            >
              查看XML快照
            </Button>
          </div>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <Popover
      placement="bottomRight"
      trigger={["click"]}
      overlayInnerStyle={{ padding: 8 }}
      content={content}
      overlayClassName="overlay-surface overlay-elevated"
      zIndex={2100}
      destroyTooltipOnHide
      autoAdjustOverflow
    >
      <Button
        className="step-action-btn"
        size="small"
        type="text"
        icon={<InfoCircleOutlined />}
        onClick={(e) => e.stopPropagation()}
        title="查看元素/匹配/快照信息"
        style={{ padding: '0 4px', fontSize: 12 }}
      >
        信息
      </Button>
    </Popover>
  );
};

export default InfoBubble;
