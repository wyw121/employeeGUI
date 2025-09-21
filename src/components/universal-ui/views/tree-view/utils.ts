import React from 'react';
import { UIElement } from '../../../../api/universalUIAPI';
import { TreeDataNode } from "antd";
export interface TreeNodeData extends TreeDataNode {
  key: string;
  title: string | React.ReactNode;
  children?: TreeNodeData[];
  element: UIElement;
  depth: number;
  isClickable: boolean;
}

export function calculateDepth(element: UIElement, allElements: UIElement[]): number {
  let depth = 0;
  let currentElement = element;

  while (currentElement) {
    const parent = findParentElement(currentElement, allElements);
    if (parent) {
      depth++;
      currentElement = parent;
    } else {
      break;
    }
  }

  return depth;
}

export function findParentElement(
  element: UIElement,
  allElements: UIElement[]
): UIElement | null {
  const elementBounds = element.bounds;
  if (!elementBounds) return null;

  const { left, top, right, bottom } = elementBounds;
  
  let bestParent: UIElement | null = null;
  let smallestArea = Infinity;

  for (const candidate of allElements) {
    if (candidate === element || !candidate.bounds) continue;

    const cb = candidate.bounds;
    const { left: cLeft, top: cTop, right: cRight, bottom: cBottom } = cb;

    if (cLeft <= left && cTop <= top && cRight >= right && cBottom >= bottom) {
      const area = (cRight - cLeft) * (cBottom - cTop);
      if (area < smallestArea) {
        smallestArea = area;
        bestParent = candidate;
      }
    }
  }

  return bestParent;
}

export function buildTreeData(
  elements: UIElement[],
  showOnlyClickable: boolean = false
): TreeNodeData[] {
  if (!elements || elements.length === 0) {
    return [];
  }

  const filteredElements = showOnlyClickable 
    ? elements.filter(el => el.is_clickable)
    : elements;

  if (filteredElements.length === 0) {
    return [];
  }

  const elementsWithDepth = filteredElements.map(element => ({
    ...element,
    depth: calculateDepth(element, filteredElements)
  }));

  const nodeMap = new Map<string, TreeNodeData>();
  
  elementsWithDepth.forEach((element, index) => {
    const key = `element-${index}`;
    const displayName = element.resource_id || element.text || element.content_desc || element.class_name || 'Unknown';
    
    nodeMap.set(key, {
      key,
      title: `${displayName} (${element.class_name})`,
      children: [],
      element,
      depth: element.depth,
      isClickable: element.is_clickable
    });
  });

  const rootNodes: TreeNodeData[] = [];

  elementsWithDepth.forEach((element, index) => {
    const key = `element-${index}`;
    const node = nodeMap.get(key);
    if (!node) return;

    const parent = findParentElement(element, elementsWithDepth);
    if (parent) {
      const parentIndex = elementsWithDepth.findIndex(el => el === parent);
      if (parentIndex !== -1) {
        const parentKey = `element-${parentIndex}`;
        const parentNode = nodeMap.get(parentKey);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(node);
        }
      }
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}
