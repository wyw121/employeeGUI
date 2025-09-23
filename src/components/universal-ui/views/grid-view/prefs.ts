export interface GridViewPrefs {
  autoSelectOnParse: boolean;
  showMatchedOnly: boolean;
  expandDepth: number;
  caseSensitive: boolean;
  useRegex: boolean;
  searchFields?: {
    id?: boolean;
    text?: boolean;
    desc?: boolean;
    className?: boolean;
    tag?: boolean;
    pkg?: boolean;
  };
}

const KEY = 'gridViewPrefs.v1';

const defaultPrefs: GridViewPrefs = {
  autoSelectOnParse: false,
  showMatchedOnly: false,
  expandDepth: 2,
  caseSensitive: false,
  useRegex: false,
  searchFields: { id: true, text: true, desc: true, className: true, tag: true, pkg: false },
};

export function loadPrefs(): GridViewPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultPrefs };
    const parsed = JSON.parse(raw);
    return {
      autoSelectOnParse: Boolean(parsed.autoSelectOnParse),
      showMatchedOnly: Boolean(parsed.showMatchedOnly),
      expandDepth: Number.isFinite(parsed.expandDepth) ? Number(parsed.expandDepth) : defaultPrefs.expandDepth,
      caseSensitive: typeof parsed.caseSensitive === 'boolean' ? parsed.caseSensitive : defaultPrefs.caseSensitive,
      useRegex: typeof parsed.useRegex === 'boolean' ? parsed.useRegex : defaultPrefs.useRegex,
      searchFields: {
        id: parsed.searchFields?.id ?? defaultPrefs.searchFields!.id,
        text: parsed.searchFields?.text ?? defaultPrefs.searchFields!.text,
        desc: parsed.searchFields?.desc ?? defaultPrefs.searchFields!.desc,
        className: parsed.searchFields?.className ?? defaultPrefs.searchFields!.className,
        tag: parsed.searchFields?.tag ?? defaultPrefs.searchFields!.tag,
        pkg: parsed.searchFields?.pkg ?? defaultPrefs.searchFields!.pkg,
      },
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrefs(p: GridViewPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
