export interface NodeLocatorAttributes {
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  className?: string;
  packageName?: string;
}

export interface NodeLocator {
  absoluteXPath?: string;
  predicateXPath?: string;
  attributes?: NodeLocatorAttributes;
  bounds?: string;
}
