import React, { useMemo, useState, useEffect, useRef } from 'react';
import styles from "../GridElementView.module.css";
import { UiNode } from "../types";
import { NodeDetail } from "../NodeDetail";
import { MatchPresetsRow } from './node-detail/MatchPresetsRow';
import { SelectedFieldsChips, SelectedFieldsTable, NodeDetailSetElementButton, type CompleteStepCriteria } from './node-detail';
import type { MatchCriteria, MatchResultSummary } from './node-detail/types';
import { inferStrategyFromFields, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, normalizeExcludes, normalizeIncludes, PRESET_FIELDS } from './node-detail';
import { loadLatestMatching } from '../../grid-view/matchingCache';
import { useAdb } from '../../../../../application/hooks/useAdb';
import { buildDefaultMatchingFromElement } from '../../../../../modules/grid-inspector/DefaultMatchingBuilder';

interface NodeDetailPanelProps {
  node: UiNode | null;
  onMatched?: (result: MatchResultSummary) => void;
  onApplyToStep?: (criteria: MatchCriteria) => void;
  onApplyToStepComplete?: (criteria: CompleteStepCriteria) => void;
  onStrategyChanged?: (s: MatchCriteria['strategy']) => void;
  onFieldsChanged?: (fields: string[]) => void;
  // 🆕 初始匹配预设：用于"修改参数"时优先以步骤自身为准
  initialMatching?: MatchCriteria;
  // 🆕 XML上下文：用于智能增强匹配
  xmlContent?: string;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  onMatched,
  onApplyToStep,
  onApplyToStepComplete,
  onStrategyChanged,
  onFieldsChanged,
  initialMatching,
}) => {
  const { selectedDevice, matchElementByCriteria } = useAdb();

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<MatchCriteria['strategy']>('standard');
  const [values, setValues] = useState<Record<string, string>>({});
  const [includes, setIncludes] = useState<Record<string, string[]>>({});
  const [excludes, setExcludes] = useState<Record<string, string[]>>({});

  useEffect(() => { onStrategyChanged?.(strategy); }, [strategy]);
  useEffect(() => { onFieldsChanged?.(selectedFields); }, [selectedFields]);

  // 仅首次应用 initialMatching（若提供），避免用户操作被覆盖
  const appliedInitialRef = useRef<boolean>(false);

  // 当节点（来自节点树或屏幕预览）变化时，自动将“已选字段”的值回填为该节点的默认值
  useEffect(() => {
    if (!node) return;
    if (selectedFields.length === 0) {
      // 首次选择（或无字段已选）时：优先使用步骤传入的 initialMatching；否则恢复最近缓存；再否则使用 standard 预设
      if (!appliedInitialRef.current && initialMatching && Array.isArray(initialMatching.fields) && initialMatching.fields.length > 0) {
        appliedInitialRef.current = true;
        setStrategy(initialMatching.strategy);
        setSelectedFields(initialMatching.fields);
        setIncludes(initialMatching.includes || {});
        setExcludes(initialMatching.excludes || {});
        // 合并初始值与节点默认值：优先保留 initialMatching 中的非空值，
        // 仅当节点提供了非空值时才覆盖，以避免被“空节点属性”清空有效的初始匹配值
        const nodeDefaults = buildDefaultValues(node, initialMatching.fields);
        const merged: Record<string, string> = {};
        for (const f of initialMatching.fields) {
          const initVal = (initialMatching.values || {})[f];
          const nodeVal = nodeDefaults[f];
          const trimmedInit = (initVal ?? '').toString().trim();
          const trimmedNode = (nodeVal ?? '').toString().trim();
          merged[f] = trimmedNode !== '' ? trimmedNode : trimmedInit;
        }
        setValues(merged);
        onStrategyChanged?.(initialMatching.strategy);
        onFieldsChanged?.(initialMatching.fields);
      } else {
        const cached = loadLatestMatching();
        if (cached && Array.isArray(cached.fields) && cached.fields.length > 0) {
          setStrategy(cached.strategy as any);
          setSelectedFields(cached.fields);
          setValues(buildDefaultValues(node, cached.fields));
          onStrategyChanged?.(cached.strategy as any);
          onFieldsChanged?.(cached.fields);
        } else {
          // 使用统一构建器从节点属性推断默认匹配字段与值
          const built = buildDefaultMatchingFromElement({
            resource_id: node.attrs?.['resource-id'],
            text: node.attrs?.['text'],
            content_desc: node.attrs?.['content-desc'],
            class_name: node.attrs?.['class'],
            bounds: node.attrs?.['bounds'],
          });
          const effFields = (built.fields && built.fields.length > 0) ? built.fields : PRESET_FIELDS.standard;
          const effStrategy = (built.fields && built.fields.length > 0) ? (built.strategy as any) : 'standard';
          setStrategy(effStrategy);
          setSelectedFields(effFields);
          // 若构建器给出具体值，优先使用；否则按节点默认值回填
          if (built.fields && built.fields.length > 0) {
            setValues(built.values);
          } else {
            setValues(buildDefaultValues(node, effFields));
          }
          onStrategyChanged?.(effStrategy);
          onFieldsChanged?.(effFields);
        }
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
