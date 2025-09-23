import { NodeLocator } from '../entities/NodeLocator';

export interface ILocatorService<UiNode> {
  resolve(root: UiNode | null, locator: NodeLocator): UiNode | null;
}
