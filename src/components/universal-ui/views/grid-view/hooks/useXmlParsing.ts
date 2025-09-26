import { useCallback, useEffect, useState } from 'react';
import { UiNode } from '../types';
import { attachParents, parseUiAutomatorXml } from '../utils';
import { loadPrefs } from '../prefs';

interface UseXmlParsingOptions {
  initialXml?: string;
  autoSelectEnabled?: boolean; // 初始是否允许自动选择首匹配
  onAfterParse?: (root: UiNode | null) => void; // 解析成功后回调（完成 attachParents）
}

export function useXmlParsing(opts: UseXmlParsingOptions) {
  const { initialXml = '', autoSelectEnabled = false, onAfterParse } = opts;
  const [xmlText, setXmlText] = useState<string>('');
  const [root, setRoot] = useState<UiNode | null>(null);

  // 首次载入 initialXml
  useEffect(() => {
    if (initialXml) {
      setXmlText(initialXml);
      parse(initialXml);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialXml]);

  const parse = useCallback((xmlToUse?: string) => {
    const target = xmlToUse ?? xmlText;
    const tree = parseUiAutomatorXml(target);
    if (tree) {
      attachParents(tree);
      setRoot(tree);
      onAfterParse?.(tree);
    } else {
      alert('XML 解析失败，请检查格式');
    }
  }, [xmlText, onAfterParse]);

  return { xmlText, setXmlText, root, parse } as const;
}
