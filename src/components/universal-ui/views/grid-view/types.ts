export interface UiNode {
  tag: string;
  attrs: Record<string, string>;
  children: UiNode[];
  parent?: UiNode | null;
}

export interface AdvancedFilter {
  enabled: boolean;
  mode: 'AND' | 'OR';
  resourceId: string;
  text: string;
  className: string;
  packageName: string;
  clickable: boolean | null;      // tri-state: null=any, true, false
  nodeEnabled: boolean | null;    // avoid name clash with filter.enabled flag
}

export interface SearchOptions {
  caseSensitive: boolean;
  useRegex: boolean;
  fields?: {
    id?: boolean;        // resource-id
    text?: boolean;      // text
    desc?: boolean;      // content-desc
    className?: boolean; // class
    tag?: boolean;       // tag name
    pkg?: boolean;       // package
  };
}
