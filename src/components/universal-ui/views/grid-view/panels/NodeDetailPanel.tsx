import React, { useMemo, useState } from 'react';
import { UiNode } from "../types";
import { NodeDetail } from "../NodeDetail";
import styles from "../GridElementView.module.css";
import { MatchPresetsRow } from './node-detail/MatchPresetsRow';
import { SelectedFieldsChips } from './node-detail/SelectedFieldsChips';
import type { MatchCriteria, MatchResultSummary } from './node-detail/types';
import { useAdb } from '../../../../../application/hooks/useAdb';
import { MatchingStrategySelector } from './node-detail/MatchingStrategySelector';
import { SelectedFieldsPreview } from './node-detail/SelectedFieldsPreview';

interface NodeDetailPanelProps {
  node: UiNode | null;
  // 仅用于真机匹配结果的上行回调，不涉及步骤卡片
  onMatched?: (result: MatchResultSummary) => void;
  // 新增：将当前选择的匹配策略应用到步骤参数（由上层实现写入 steps）
  onApplyToStep?: (criteria: MatchCriteria) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onMatched, onApplyToStep }) => {
  const { selectedDevice, matchElementByCriteria } = useAdb();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [lastCriteria, setLastCriteria] = useState<MatchCriteria | null>(null);
  const [strategy, setStrategy] = useState<MatchCriteria['strategy']>('standard');

  const toggleField = (f: string) => {
    setSelectedFields((prev) => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleApply = (criteria: MatchCriteria) => {
    setSelectedFields(criteria.fields);
    setLastCriteria(criteria);
    setStrategy(criteria.strategy);
  };

  const canSend = useMemo(() => !!(node && selectedDevice && selectedFields.length > 0), [node, selectedDevice, selectedFields]);
  const canApply = useMemo(() => !!(node && lastCriteria && selectedFields.length > 0 && onApplyToStep), [node, lastCriteria, selectedFields, onApplyToStep]);

  const sendToBackend = async () => {
    if (!node || !selectedDevice || !lastCriteria) return;
    try {
      const res = await matchElementByCriteria(selectedDevice.id, lastCriteria);
      if (res.ok) {
        // 简单提示；后续可联动预览高亮（需要回传 bounds/xpath 并在上层转换为 UiNode）
        alert(`匹配成功：在 ${res.total ?? 0} 个中命中第 ${res.matchedIndex != null ? res.matchedIndex + 1 : 1} 个\n提示：${res.message}`);
        // 通知上层：传递用于定位的关键信息（xpath/bounds）
        if (onMatched) {
          onMatched({
            ok: res.ok,
            message: res.message,
            total: res.total,
            matchedIndex: res.matchedIndex,
            preview: res.preview
          });
        }
      } else {
        alert(`未匹配：${res.message}`);
      }
    } catch (e) {
      alert(`匹配失败：${String(e)}`);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>节点详情</div>
      <div className={styles.cardBody}>
        {/* 预设按钮行 */}
        <MatchPresetsRow node={node} onApply={handleApply} onPreviewFields={setSelectedFields} />
        {/* 策略选择器（模块化） */}
        <div className="mb-2">
          <MatchingStrategySelector value={strategy} onChange={setStrategy} />
        </div>
        {/* 已选择字段显示/可切换 */}
        <SelectedFieldsChips selected={selectedFields} onToggle={toggleField} />
        {/* 字段预览（模块化） */}
        <SelectedFieldsPreview node={node} fields={selectedFields} />
        {/* 真机匹配按钮 */}
        <div className="mb-2 flex items-center gap-2">
          <button className={styles.btn} disabled={!canSend} onClick={sendToBackend} title={canSend ? '' : '请选择设备与匹配字段'}>
            发送匹配请求（真机查找）
          </button>
          {/* 应用到步骤（仅在提供回调时显示） */}
          {onApplyToStep && (
            <button
              className={styles.btn}
              disabled={!canApply}
              onClick={() => lastCriteria && onApplyToStep({ ...lastCriteria, strategy, fields: selectedFields })}
              title={canApply ? '' : '请选择匹配预设或至少一个字段'}
            >
              应用到步骤
            </button>
          )}
          <span className="text-xs text-neutral-500">当前策略：{strategy} · 字段 {selectedFields.length} 个</span>
        </div>
        <NodeDetail node={node} />
      </div>
    </div>
  );
};

export default NodeDetailPanel;
