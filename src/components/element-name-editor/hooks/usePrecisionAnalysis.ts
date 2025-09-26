import { useEffect, useMemo, useState } from 'react';
import { ExtendedUIElement, adaptToAndroidXMLFields } from '../ElementDataAdapter';
import { AdbPrecisionStrategy } from '../../../services/AdbPrecisionStrategy';
import ElementNameMapper, { UIElement } from '../../../modules/ElementNameMapper';

interface UsePrecisionAnalysisResult {
  precisionAnalysis: ReturnType<typeof AdbPrecisionStrategy.evaluateElementPrecision> | null;
  sortedFields: Array<{ key: string; value: any; stability: any }>;
  adbCommands: ReturnType<typeof AdbPrecisionStrategy.generateAdbCommands>;
  cachedMapping: {
    displayName: string;
    lastUpdated: string;
    usageCount: number;
  } | null;
  loading: boolean;
}

export const usePrecisionAnalysis = (element: UIElement | null): UsePrecisionAnalysisResult => {
  const [loading, setLoading] = useState(false);
  const [precisionAnalysis, setPrecisionAnalysis] = useState<UsePrecisionAnalysisResult['precisionAnalysis']>(null);
  const [sortedFields, setSortedFields] = useState<UsePrecisionAnalysisResult['sortedFields']>([]);
  const [adbCommands, setAdbCommands] = useState<UsePrecisionAnalysisResult['adbCommands']>([]);
  const [cachedMapping, setCachedMapping] = useState<UsePrecisionAnalysisResult['cachedMapping']>(null);

  useEffect(() => {
    if (!element) return;
    try {
      setLoading(true);
      const xmlData = adaptToAndroidXMLFields(element as ExtendedUIElement);
      const pa = AdbPrecisionStrategy.evaluateElementPrecision(xmlData);
      setPrecisionAnalysis(pa);

      const cmds = AdbPrecisionStrategy.generateAdbCommands(xmlData);
      setAdbCommands(cmds);

      const existing = (ElementNameMapper as any).findBestMatch?.(element) || null;
      if (existing) {
        setCachedMapping({
          displayName: existing.displayName,
            lastUpdated: new Date(existing.lastUsedAt).toLocaleTimeString(),
            usageCount: existing.usageCount
        });
      } else {
        setCachedMapping(null);
      }

      const sf = Object.entries(xmlData)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .map(([key, value]) => ({
          key,
          value,
          stability: AdbPrecisionStrategy.getFieldStability(key)
        }))
        .sort((a, b) => (b.stability?.score || 0) - (a.stability?.score || 0));
      setSortedFields(sf);
    } finally {
      setLoading(false);
    }
  }, [element]);

  return { precisionAnalysis, sortedFields, adbCommands, cachedMapping, loading };
};

export default usePrecisionAnalysis;
