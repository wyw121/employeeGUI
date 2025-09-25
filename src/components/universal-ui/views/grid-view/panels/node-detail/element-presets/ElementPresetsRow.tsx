import React from 'react';
import styles from '../../GridElementView.module.css';
import type { UiNode } from '../../../types';
import type { MatchCriteria } from '../types';
import { ELEMENT_PRESETS } from './registry';

export interface ElementPresetsRowProps {
  node: UiNode | null;
  onApply: (criteria: MatchCriteria) => void;
  onPreviewFields?: (fields: string[]) => void;
}

export const ElementPresetsRow: React.FC<ElementPresetsRowProps> = ({ node, onApply, onPreviewFields }) => {
  const apply = (presetId: string) => {
    const preset = ELEMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const built = preset.buildCriteria({ node });
    if (!built) return;
    onPreviewFields?.(built.fields);
    onApply(built);
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">元素预设：</span>
      {ELEMENT_PRESETS.map(preset => (
        <button
          key={preset.id}
          className={`${styles.btn} text-xs`}
          title={preset.description}
          onClick={() => apply(preset.id)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default ElementPresetsRow;
