import { useEffect } from 'react';

interface HotkeysOptions {
  focusSearch: () => void;
  nextMatch: () => void;
  prevMatch: () => void;
  focusXPath: () => void;
}

export function useGridHotkeys(opts: HotkeysOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = (e.target instanceof HTMLElement) && ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      // Ctrl+F: focus search input
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        opts.focusSearch();
        return;
      }
      // F3 / Shift+F3: next/prev match
      if (!e.ctrlKey && !e.metaKey && e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) opts.prevMatch(); else opts.nextMatch();
        return;
      }
      // Ctrl+L: focus XPath input
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        opts.focusXPath();
        return;
      }
      // Avoid hijacking normal typing inside inputs for other keys
      if (isInput) return;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
