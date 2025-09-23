import { NodeLocator } from './NodeLocator';

export interface Step {
  id: string;
  sessionId: string;
  name: string;
  actionType: string;
  params: Record<string, any>;
  locator: NodeLocator;
  createdAt: number;
  // Optional redundancy for portability
  xmlHash?: string;
  xmlSnapshot?: string | null;
}
