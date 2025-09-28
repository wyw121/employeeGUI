import { useEffect, useState, useCallback } from 'react';
import { getDistinctIndustries } from '../../services/contactNumberService';

export function useIndustryOptions() {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([
    { value: '', label: '不限' },
  ]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getDistinctIndustries();
      const mapped = [{ value: '', label: '不限' }, ...list.map(x => ({ value: x, label: x }))];
      setOptions(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { options, loading, reload };
}
