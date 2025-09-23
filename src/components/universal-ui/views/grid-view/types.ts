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
}
