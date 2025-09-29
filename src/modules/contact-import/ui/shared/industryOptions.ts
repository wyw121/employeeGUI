import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDistinctIndustries } from '../services/contactNumberService';

export const DEFAULT_INDUSTRY_OPTIONS: string[] = [
  '不限',
  '电商',
  '教育',
  '医疗',
  '金融',
  '本地生活',
  '其他',
];

const sanitize = (value?: string | null): string | undefined => {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const mergeIndustryOptions = (
  ...lists: Array<Iterable<string | null | undefined> | undefined>
): string[] => {
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const value = sanitize(raw);
      if (value && !seen.has(value)) {
        seen.add(value);
      }
    }
  }
  return Array.from(seen);
};

export interface UseIndustryOptionsResult {
  options: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  include: (value?: string | null) => void;
}

export const useIndustryOptions = (external?: string[]): UseIndustryOptionsResult => {
  const externalKey = useMemo(() => JSON.stringify(external ?? []), [external]);
  const baseOptions = useMemo(
    () => mergeIndustryOptions(DEFAULT_INDUSTRY_OPTIONS, external ?? []),
    [externalKey]
  );

  const [options, setOptions] = useState<string[]>(baseOptions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOptions((prev) => mergeIndustryOptions(baseOptions, prev));
  }, [baseOptions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await getDistinctIndustries();
      setOptions(mergeIndustryOptions(baseOptions, remote));
    } catch (error) {
      setOptions(baseOptions);
    } finally {
      setLoading(false);
    }
  }, [baseOptions]);

  const include = useCallback((value?: string | null) => {
    const sanitized = sanitize(value);
    if (!sanitized) return;
    setOptions((prev) => (prev.includes(sanitized) ? prev : [...prev, sanitized]));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, loading, refresh, include };
};

export const normalizeIndustry = (value?: string | null): string | undefined => sanitize(value);
