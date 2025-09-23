export type MatchStrategy = 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard';

export interface MatchCriteria {
  strategy: MatchStrategy;
  fields: string[]; // e.g. ['resource-id','text','content-desc','class','package','bounds','index']
  values: Record<string, string>; // values extracted from UiNode.attrs
}

export interface MatchResultSummary {
  ok: boolean;
  message: string;
  matchedIndex?: number;
  total?: number;
  preview?: { text?: string; resource_id?: string; class_name?: string; xpath?: string; bounds?: string; package?: string };
}
