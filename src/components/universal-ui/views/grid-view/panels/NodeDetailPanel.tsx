import React, { useMemo, useState } from 'react';
import { UiNode } from "../types";
import { NodeDetail } from "../NodeDetail";
import styles from "../GridElementView.module.css";
import { MatchPresetsRow } from './node-detail/MatchPresetsRow';
import type { MatchCriteria, MatchResultSummary } from './node-detail/types';
import { useAdb } from '../../../../../application/hooks/useAdb';
import { MatchingStrategySelector } from './node-detail/MatchingStrategySelector';
import { SelectedFieldsChips, SelectedFieldsTable } from './node-detail/';
import { PRESET_FIELDS, inferStrategyFromFields, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, normalizeExcludes } from './node-detail';

interface NodeDetailPanelProps {
  node: UiNode | null;
  // 仅用于真机匹配结果的上行回调，不涉及步骤卡片
  onMatched?: (result: MatchResultSummary) => void;
  // 新增：将当前选择的匹配策略应用到步骤参数（由上层实现写入 steps）
  onApplyToStep?: (criteria: MatchCriteria) => void;
  // 新增：当策略改变时上抛，便于右侧“匹配结果”跟随
  onStrategyChanged?: (s: MatchCriteria['strategy']) => void;
  // 新增：当字段勾选集合变化时上抛，便于“匹配结果”复用相同字段
  onFieldsChanged?: (fields: string[]) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onMatched, onApplyToStep, onStrategyChanged, onFieldsChanged }) => {
  const { selectedDevice, matchElementByCriteria } = useAdb();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [lastCriteria, setLastCriteria] = useState<MatchCriteria | null>(null);
  const [strategy, setStrategy] = useState<MatchCriteria['strategy']>('standard');
  const [values, setValues] = useState<Record<string, string>>({});
  const [excludes, setExcludes] = useState<Record<string, string[]>>({});

  const toggleField = (f: string) => {
    setSelectedFields((prev) => {
      const next = prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f];
      // 字段改变后自动推断策略（预设一致→回退预设；否则→custom）
      const inferred = inferStrategyFromFields(next);
      setStrategy(inferred);
      onStrategyChanged?.(inferred);
      onFieldsChanged?.(next);
      // 同步 values：新增字段用节点默认值初始化；移除字段删除其值
      setValues((prevVals) => {
        const draft = { ...prevVals } as Record<string, string>;
        if (prev.includes(f)) {
          // 移除
          delete draft[f];
        } else {
          // 新增
          const v = node?.attrs?.[f];
          if (v != null) draft[f] = String(v);
        }
        return draft;
      });
      setExcludes((prevEx) => {
        if (!prev.includes(f)) return prevEx; // 新增字段时不改 excludes
        const nextEx = { ...prevEx };
        delete nextEx[f];
        return nextEx;
      });
      return next;
    });
  };

  const handleApply = (criteria: MatchCriteria) => {
    setSelectedFields(criteria.fields);
    setLastCriteria(criteria);
    setStrategy(criteria.strategy);
    setValues(criteria.values || {});
    if (criteria.excludes) setExcludes(criteria.excludes);
    onFieldsChanged?.(criteria.fields);
  };

  const canSend = useMemo(() => !!(node && selectedDevice && selectedFields.length > 0), [node, selectedDevice, selectedFields]);
  const canApply = useMemo(() => !!(node && lastCriteria && selectedFields.length > 0 && onApplyToStep), [node, lastCriteria, selectedFields, onApplyToStep]);

  // 将当前策略同步给上层（例如 ResultsAndXPathPanel → MatchResultsPanel 使用）
  React.useEffect(() => {
    onStrategyChanged?.(strategy);
  }, [strategy, onStrategyChanged]);

  React.useEffect(() => {
    // 当字段集合变化时，同步上抛；并在未手动选择策略的情况下推断策略
    onFieldsChanged?.(selectedFields);
    // 仅在 selectedFields 改变时通知
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFields]);

  // 补全缺失的字段值：当选择了某个字段但 values 中没有对应值时，用节点原始值自动填充（不覆盖用户已编辑的内容）
  React.useEffect(() => {
    if (!node || selectedFields.length === 0) return;
    setValues((prev) => {
      let changed = false;
      const next = { ...prev } as Record<string, string>;
      for (const f of selectedFields) {
        const current = next[f];
        if (current == null || current === '') {
          const raw = node?.attrs?.[f];
          if (raw != null) {
            next[f] = String(raw);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [node, selectedFields]);

  const sendToBackend = async () => {
    if (!node || !selectedDevice) return;
    try {
      // 规范化：移除值为空的字段，表示“任意/忽略该维度”
      const normalized = normalizeFieldsAndValues(selectedFields, values);
      // 后端不识别 'custom'，在发送时转换为等效策略（考虑是否存在有效位置约束）
      const effectiveStrategy = toBackendStrategy(strategy, normalized.fields, normalized.values);
      const res = await matchElementByCriteria(selectedDevice.id, {
        strategy: effectiveStrategy as any,
        fields: normalized.fields,
        values: normalized.values,
      });
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
          <MatchingStrategySelector
            value={strategy}
            onChange={(next) => {
              // 切换策略：非 custom → 覆盖字段为预设；custom → 保留当前字段
              setStrategy(next);
              if (next !== 'custom') {
                const nextFields = PRESET_FIELDS[next as any] || [];
                setSelectedFields(nextFields);
                // 用节点默认值初始化当前 values
                setValues(buildDefaultValues(node, nextFields));
                onFieldsChanged?.(nextFields);
              }
              onStrategyChanged?.(next);
            }}
          />
        </div>
        {/* 字段快速勾选 Chips（与下方表格共用同一状态） */}
        <SelectedFieldsChips selected={selectedFields} onToggle={toggleField} />
        {/* 字段勾选 + 值编辑（带复选框） */}
        <SelectedFieldsTable
          node={node}
          selected={selectedFields}
          values={values}
          onToggle={toggleField}
          onChangeValue={(field, value) => setValues((prev) => ({ ...prev, [field]: value }))}
          excludes={excludes}
          onChangeExcludes={(field, next) => setExcludes((prev) => ({ ...prev, [field]: next }))}
        />
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
              onClick={() => {
                if (!lastCriteria) return;
                const normalized = normalizeFieldsAndValues(selectedFields, values);
                onApplyToStep({
                  strategy,
                  fields: normalized.fields,
                  values: normalized.values,
                  excludes: normalizeExcludes(excludes, normalized.fields),
                });
              }}
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
