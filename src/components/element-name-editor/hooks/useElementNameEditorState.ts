import { useCallback, useEffect, useMemo, useState } from 'react';
import ElementNameMapper, { UIElement, MatchingConstraints, DEFAULT_MATCHING_CONSTRAINTS, ElementNameMapping } from '../../../modules/ElementNameMapper';
import { calculateDisplayMatchScore } from '../logic/score';

export interface UseElementNameEditorStateOptions {
  element: UIElement | null;
  visible: boolean;
}

export interface ElementNameEditorState {
  displayName: string;
  setDisplayName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  constraints: MatchingConstraints;
  setConstraints: (c: MatchingConstraints) => void;
  toggleConstraint: (key: keyof MatchingConstraints, value: boolean) => void;
  existingMapping: ElementNameMapping | null;
  loading: boolean;
  save: () => Promise<{ success: boolean; error?: unknown; displayName?: string }>; 
  initDone: boolean;
  previewName: string;
}

// 负责集中管理原组件中分散的多个 useState / useEffect
export const useElementNameEditorState = (options: UseElementNameEditorStateOptions): ElementNameEditorState => {
  const { element, visible } = options;

  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [constraints, setConstraints] = useState<MatchingConstraints>(DEFAULT_MATCHING_CONSTRAINTS);
  const [existingMapping, setExistingMapping] = useState<ElementNameMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // 预览名称：不依赖 refreshKey，直接派生
  const previewName = useMemo(() => displayName || '未命名元素', [displayName]);

  // 初始化逻辑
  useEffect(() => {
    if (!visible || !element) return;

    // 查找可能的现有映射
    const mappings = ElementNameMapper.getAllMappings();
    const candidate = mappings.find(m => calculateDisplayMatchScore(element, m) >= 0.8) || null;
    setExistingMapping(candidate || null);

    if (candidate) {
      setDisplayName(candidate.displayName);
      setNotes(candidate.notes || '');
      setConstraints(candidate.fingerprint.constraints);
    } else {
      const currentDisplayName = ElementNameMapper.getDisplayName(element);
      setDisplayName(currentDisplayName);
      setNotes('');
      setConstraints(DEFAULT_MATCHING_CONSTRAINTS);
    }
    setInitDone(true);
  }, [visible, element]);

  const toggleConstraint = useCallback((key: keyof MatchingConstraints, value: boolean) => {
    setConstraints(prev => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    if (!element) return { success: false, error: new Error('元素缺失') };
    try {
      setLoading(true);
      if (existingMapping) {
        ElementNameMapper.updateMapping(existingMapping.id, {
          displayName,
          notes,
          constraints
        });
      } else {
        ElementNameMapper.createMapping(element, displayName, constraints, notes);
      }
      return { success: true, displayName };
    } catch (error) {
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [element, existingMapping, displayName, notes, constraints]);

  return {
    displayName,
    setDisplayName,
    notes,
    setNotes,
    constraints,
    setConstraints,
    toggleConstraint,
    existingMapping,
    loading,
    save,
    initDone,
    previewName
  };
};

export default useElementNameEditorState;
