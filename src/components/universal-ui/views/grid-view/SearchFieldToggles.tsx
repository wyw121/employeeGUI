import React from 'react';
import { SearchOptions } from './types';

export interface SearchFieldTogglesProps {
  value: SearchOptions;
  onChange: (v: SearchOptions) => void;
}

export const SearchFieldToggles: React.FC<SearchFieldTogglesProps> = ({ value, onChange }) => {
  const f = value.fields || {};
  const set = (patch: Partial<SearchOptions['fields']>) => onChange({ ...value, fields: { id: true, text: true, desc: true, className: true, tag: true, pkg: false, ...(value.fields || {}), ...patch } });
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
      <span>匹配字段:</span>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.id ?? true} onChange={e => set({ id: e.target.checked })} /> id</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.text ?? true} onChange={e => set({ text: e.target.checked })} /> text</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.desc ?? true} onChange={e => set({ desc: e.target.checked })} /> desc</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.className ?? true} onChange={e => set({ className: e.target.checked })} /> class</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.tag ?? true} onChange={e => set({ tag: e.target.checked })} /> tag</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={f.pkg ?? false} onChange={e => set({ pkg: e.target.checked })} /> package</label>
    </div>
  );
};
