import React, { useMemo, useState, useEffect } from 'react';
import styles from "../GridElementView.module.css";
import { UiNode } from "../types";
import { NodeDetail } from "../NodeDetail";
import { MatchPresetsRow } from './node-detail/MatchPresetsRow';
import { SelectedFieldsChips, SelectedFieldsTable, NodeDetailSetElementButton, type CompleteStepCriteria } from './node-detail';
import type { MatchCriteria, MatchResultSummary } from './node-detail/types';
import { inferStrategyFromFields, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, normalizeExcludes, normalizeIncludes, PRESET_FIELDS } from './node-detail';
import { loadLatestMatching } from '../../grid-view/matchingCache';
import { useAdb } from '../../../../../application/hooks/useAdb';

interface NodeDetailPanelProps {
  node: UiNode | null;
  onMatched?: (result: MatchResultSummary) => void;
  onApplyToStep?: (criteria: MatchCriteria) => void;
  onApplyToStepComplete?: (criteria: CompleteStepCriteria) => void;
  onStrategyChanged?: (s: MatchCriteria['strategy']) => void;
  onFieldsChanged?: (fields: string[]) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  onMatched,
  onApplyToStep,
  onApplyToStepComplete,
  onStrategyChanged,
  onFieldsChanged,
}) => {
  const { selectedDevice, matchElementByCriteria } = useAdb();

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<MatchCriteria['strategy']>('standard');
  const [values, setValues] = useState<Record<string, string>>({});
  const [includes, setIncludes] = useState<Record<string, string[]>>({});
  const [excludes, setExcludes] = useState<Record<string, string[]>>({});

  useEffect(() => { onStrategyChanged?.(strategy); }, [strategy]);
  useEffect(() => { onFieldsChanged?.(selectedFields); }, [selectedFields]);

  // 当节点（来自节点树或屏幕预览）变化时，自动将“已选字段”的值回填为该节点的默认值
  useEffect(() => {
    if (!node) return;
    if (selectedFields.length === 0) {
      // 首次选择（或无字段已选）时：优先恢复缓存的策略/字段；否则默认使用 standard 预设
      const cached = loadLatestMatching();
      if (cached && Array.isArray(cached.fields) && cached.fields.length > 0) {
        setStrategy(cached.strategy as any);
        setSelectedFields(cached.fields);
        setValues(buildDefaultValues(node, cached.fields));
        onStrategyChanged?.(cached.strategy as any);
        onFieldsChanged?.(cached.fields);
      } else {
        const fields = PRESET_FIELDS.standard;
        setStrategy('standard');
        setSelectedFields(fields);
        setValues(buildDefaultValues(node, fields));
        onStrategyChanged?.('standard');
        onFieldsChanged?.(fields);
      }
      return;
    }
    setValues(buildDefaultValues(node, selectedFields));
  }, [node]);

  const canSend = useMemo(() => !!(node && selectedDevice && selectedFields.length > 0), [node, selectedDevice, selectedFields]);

  const toggleField = (f: string) => {
    const removing = selectedFields.includes(f);
    setSelectedFields(prev => {
      const next = removing ? prev.filter(x => x !== f) : [...prev, f];
      const inferred = inferStrategyFromFields(next);
      // 当存在包含/排除条件时，无论字段集合是否与预设一致，都应视为自定义
      const hasTweaks = Object.keys(includes).some(k => (includes[k] || []).length > 0) ||
                        Object.keys(excludes).some(k => (excludes[k] || []).length > 0);
      setStrategy(hasTweaks ? 'custom' : inferred);
      return next;
    });
    setValues(prevVals => {
      const draft = { ...prevVals } as Record<string, string>;
      if (removing) {
        delete draft[f];
      } else if (node) {
        Object.assign(draft, buildDefaultValues(node, [f]));
      }
      return draft;
    });
  };

  const applyPreset = (presetCriteria: MatchCriteria) => {
    if (!node) return;
    setSelectedFields(presetCriteria.fields);
    setStrategy(presetCriteria.strategy);
    setIncludes(presetCriteria.includes || {});
    setExcludes(presetCriteria.excludes || {});
    setValues(buildDefaultValues(node, presetCriteria.fields));
    onStrategyChanged?.(presetCriteria.strategy);
    onFieldsChanged?.(presetCriteria.fields);
  };

  const sendToBackend = async () => {
  if (!node || !selectedDevice || selectedFields.length === 0) return;
    const normalized = normalizeFieldsAndValues(selectedFields, values);
    const backendStrategy = toBackendStrategy(strategy, normalized.fields, normalized.values);
    const criteria: MatchCriteria = {
      strategy: backendStrategy,
      fields: normalized.fields,
      values: normalized.values,
      includes: normalizeIncludes(includes, normalized.fields),
      excludes: normalizeExcludes(excludes, normalized.fields),
    };
    try {
  const result = await matchElementByCriteria(selectedDevice.id, criteria as any);
      onMatched?.(result);
    } catch (err) {
      console.error('匹配失败:', err);
      onMatched?.({ ok: false, message: '匹配失败' });
    }
  };

  if (!node) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-500">请在节点树或屏幕预览中选择一个元素</div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>节点详情</div>
      <div className={styles.panelContent}>
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button className={styles.btn} disabled={!canSend} onClick={sendToBackend} title={canSend ? '' : '请选择设备与匹配字段'}>
              发送匹配请求（真机查找）
            </button>
            {(onApplyToStepComplete || onApplyToStep) && (
              <NodeDetailSetElementButton
                node={node}
                onApply={(completeCriteria) => {
                  if (onApplyToStepComplete) {
                    onApplyToStepComplete(completeCriteria);
                  } else if (onApplyToStep) {
                    const legacy: MatchCriteria & { preview?: CompleteStepCriteria['preview'] } = {
                      strategy: completeCriteria.strategy,
                      fields: completeCriteria.fields,
                      values: completeCriteria.values,
                      includes: completeCriteria.includes,
                      excludes: completeCriteria.excludes,
                      preview: completeCriteria.preview,
                    };
                    onApplyToStep(legacy);
                  }
                }}
                strategy={strategy}
                fields={selectedFields}
                values={values}
                includes={includes}
                excludes={excludes}
              />
            )}
          </div>
          <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
            <div>当前策略：{strategy} · 字段 {selectedFields.length} 个</div>
            {node && (
              <div className="text-neutral-400">
                {node.attrs?.['resource-id'] ? `ID: ${node.attrs['resource-id'].split('/').pop()}` :
                 node.attrs?.['text'] ? `文本: ${node.attrs['text'].slice(0, 10)}${node.attrs['text'].length > 10 ? '...' : ''}` :
                 `类名: ${(node.attrs?.['class'] || '').split('.').pop() || '未知'}`}
              </div>
            )}
          </div>
        </div>

  <MatchPresetsRow node={node} onApply={applyPreset} activeStrategy={strategy} />

        <div className={styles.section}>
          <SelectedFieldsChips
            selected={selectedFields}
            onToggle={toggleField}
          />
          <SelectedFieldsTable
            node={node}
            selected={selectedFields}
            values={values}
            onToggle={toggleField}
            onChangeValue={(field, v) => {
              setValues(prev => ({ ...prev, [field]: v }));
              // 任意值编辑都视为自定义
              setStrategy('custom');
            }}
            includes={includes}
            onChangeIncludes={(field, next) => {
              setIncludes(prev => ({ ...prev, [field]: next }));
              // 任意包含条件变化都意味着偏离预设，切换为自定义
              setStrategy('custom');
            }}
            excludes={excludes}
            onChangeExcludes={(field, next) => {
              setExcludes(prev => ({ ...prev, [field]: next }));
              // 任意排除条件变化都意味着偏离预设，切换为自定义
              setStrategy('custom');
            }}
          />
        </div>

        <div className={styles.section}>
          <section className={styles.sectionHeader}>节点信息</section>
          <NodeDetail node={node} />
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
