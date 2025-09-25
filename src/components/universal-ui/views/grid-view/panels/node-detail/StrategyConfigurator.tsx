import React from 'react';
import { MatchingStrategySelector } from './MatchingStrategySelector';
import { ElementPresetsRow } from './element-presets/ElementPresetsRow';
import { SelectedFieldsTable } from './SelectedFieldsTable';
import { SelectedFieldsPreview } from './SelectedFieldsPreview';
import type { MatchCriteria, MatchStrategy } from './types';
import type { UiNode } from '../../types';
import { PRESET_FIELDS, normalizeExcludes, normalizeIncludes, inferStrategyFromFields } from './helpers';

export interface StrategyConfiguratorProps {
  node: UiNode | null;
  criteria: MatchCriteria | null;
  onChange: (next: MatchCriteria) => void;
}

export const StrategyConfigurator: React.FC<StrategyConfiguratorProps> = ({ node, criteria, onChange }) => {
  const current = criteria || { strategy: 'standard', fields: [], values: {}, includes: {}, excludes: {} } as MatchCriteria;

  return (
    <div>
      <MatchingStrategySelector
        value={(current.strategy as MatchStrategy) || 'standard'}
        onChange={(next: MatchStrategy) => {
          const preset = PRESET_FIELDS[next as any] || [];
          const values: Record<string, any> = current.values || {};
          let nextFields = Array.isArray(preset) ? preset.filter((f) => values[f] != null) : [];
          if (!nextFields || nextFields.length === 0) {
            nextFields = next === 'custom' ? (current.fields || []) : preset;
          }
          const normalizedExcludes = normalizeExcludes(current.excludes || {}, nextFields);
          const normalizedIncludes = normalizeIncludes(current.includes || {}, nextFields);
          onChange({
            ...current,
            strategy: next,
            fields: nextFields,
            excludes: normalizedExcludes,
            includes: normalizedIncludes,
          });
        }}
      />

      <div className="mt-2">
        <ElementPresetsRow
          node={node}
          onPreviewFields={(fs) => {
            const next = {
              ...current,
              fields: fs,
              strategy: 'custom' as MatchStrategy,
            };
            onChange(next);
          }}
          onApply={(built) => {
            onChange({
              ...current,
              strategy: built.strategy,
              fields: built.fields,
              values: built.values,
              includes: built.includes,
              excludes: built.excludes,
            });
          }}
        />
      </div>

      <div className="mt-2">
        <SelectedFieldsTable
          node={node || ({ id: 'preview', attrs: current.values || {} } as any)}
          selected={current.fields || []}
          values={current.values || {}}
          onToggle={(field) => {
            const set = new Set<string>(current.fields || []);
            if (set.has(field)) set.delete(field); else set.add(field);
            const nextFields = Array.from(set);
            const normalizedExcludes = normalizeExcludes(current.excludes || {}, nextFields);
            const normalizedIncludes = normalizeIncludes(current.includes || {}, nextFields);
            const nextStrategy = inferStrategyFromFields(nextFields);
            onChange({
              ...current,
              strategy: nextStrategy,
              fields: nextFields,
              values: Object.fromEntries(Object.entries(current.values || {}).filter(([k]) => nextFields.includes(k))),
              excludes: normalizedExcludes,
              includes: normalizedIncludes,
            });
          }}
          onChangeValue={(field, v) => {
            onChange({
              ...current,
              values: { ...(current.values || {}), [field]: v },
            });
          }}
          includes={current.includes || {}}
          onChangeIncludes={(field, next) => {
            const combined = { ...(current.includes || {}), [field]: next } as Record<string,string[]>;
            const normalized = normalizeIncludes(combined, current.fields || []);
            onChange({ ...current, includes: normalized });
          }}
          excludes={current.excludes || {}}
          onChangeExcludes={(field, next) => {
            const combined = { ...(current.excludes || {}), [field]: next } as Record<string,string[]>;
            const normalized = normalizeExcludes(combined, current.fields || []);
            onChange({ ...current, excludes: normalized });
          }}
        />
      </div>

      {Array.isArray(current.fields) && current.fields.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <SelectedFieldsPreview node={node || ({ id: 'preview', attrs: current.values || {} } as any)} fields={current.fields} />
        </div>
      )}
    </div>
  );
};

export default StrategyConfigurator;
