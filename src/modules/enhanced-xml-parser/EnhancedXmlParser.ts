/**
 * 增强XML解析器 - 完整节点信息提取
 * 解决原有解析器信息丢失问题
 */

import { UIElement } from '../../api/universalUIAPI';

export interface CompleteXmlNodeInfo {
  // 基础属性
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  packageName: string;
  bounds: { left: number; top: number; right: number; bottom: number };
  
  // 状态属性
  clickable: boolean;
  scrollable: boolean;
  enabled: boolean;
  focused: boolean;
  selected: boolean;
  focusable: boolean;
  checkable: boolean;
  checked: boolean;
  password: boolean;
  
  // 节点关系
  index: number;
  parentIndex?: number;
  childIndices: number[];
  depth: number;
  
  // 路径信息
  xpath: string;
  nodePath: string;
  
  // 元数据
  nodeId: string;
  rawNodeElement: Element;
}

export class EnhancedXmlParser {
  
  /**
   * 完整解析XML，提取所有节点信息
   */
  static parseCompleteXml(xmlContent: string): CompleteXmlNodeInfo[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const allNodes = xmlDoc.querySelectorAll('node');
    
    const nodeInfoList: CompleteXmlNodeInfo[] = [];
    const nodeMap = new Map<Element, number>(); // 节点映射
    
    // 第一遍：收集所有节点基本信息
    allNodes.forEach((node, index) => {
      nodeMap.set(node, index);
      
      const nodeInfo: CompleteXmlNodeInfo = {
        // 基础属性 (完整提取)
        text: node.getAttribute('text') || '',
        contentDesc: node.getAttribute('content-desc') || '',
        resourceId: node.getAttribute('resource-id') || '',
        className: node.getAttribute('class') || '',
        packageName: node.getAttribute('package') || '',
        bounds: this.parseBounds(node.getAttribute('bounds') || ''),
        
        // 状态属性 (完整提取)
        clickable: node.getAttribute('clickable') === 'true',
        scrollable: node.getAttribute('scrollable') === 'true',
        enabled: node.getAttribute('enabled') !== 'false', // 默认为true
        focused: node.getAttribute('focused') === 'true',
        selected: node.getAttribute('selected') === 'true',
        focusable: node.getAttribute('focusable') === 'true',
        checkable: node.getAttribute('checkable') === 'true',
        checked: node.getAttribute('checked') === 'true',
        password: node.getAttribute('password') === 'true',
        
        // 节点关系 (需要第二遍处理)
        index: index,
        parentIndex: undefined,
        childIndices: [],
        depth: 0,
        
        // 路径信息
        xpath: this.generateXPath(node, xmlDoc),
        nodePath: this.generateNodePath(node),
        
        // 元数据
        nodeId: `node-${index}`,
        rawNodeElement: node
      };
      
      nodeInfoList.push(nodeInfo);
    });
    
    // 第二遍：建立父子关系和计算深度
    this.buildNodeRelationships(nodeInfoList, allNodes);
    
    return nodeInfoList;
  }
  
  /**
   * 解析bounds字符串
   */
  private static parseBounds(boundsStr: string): { left: number; top: number; right: number; bottom: number } {
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return { left: 0, top: 0, right: 0, bottom: 0 };
    
    const [, left, top, right, bottom] = match.map(Number);
    return { left, top, right, bottom };
  }
  
  /**
   * 生成精确的XPath
   */
  private static generateXPath(node: Element, xmlDoc: Document): string {
    const paths: string[] = [];
    let currentNode: Element | null = node;
    
    while (currentNode && currentNode !== xmlDoc.documentElement) {
      const tagName = currentNode.tagName;
      const siblings = Array.from(currentNode.parentElement?.children || [])
        .filter(child => child.tagName === tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentNode) + 1;
        paths.unshift(`${tagName}[${index}]`);
      } else {
        paths.unshift(tagName);
      }
      
      currentNode = currentNode.parentElement;
    }
    
    return '/' + paths.join('/');
  }
  
  /**
   * 生成节点路径描述
   */
  private static generateNodePath(node: Element): string {
    const pathParts: string[] = [];
    let currentNode: Element | null = node;
    
    while (currentNode) {
      const text = currentNode.getAttribute('text');
      const contentDesc = currentNode.getAttribute('content-desc');
      const resourceId = currentNode.getAttribute('resource-id');
      const className = currentNode.getAttribute('class');
      
      let pathPart = className?.split('.').pop() || 'node';
      
      if (resourceId) {
        pathPart += `[${resourceId.split('/').pop()}]`;
      } else if (text) {
        pathPart += `["${text.substring(0, 20)}"]`;
      } else if (contentDesc) {
        pathPart += `[desc:"${contentDesc.substring(0, 20)}"]`;
      }
      
      pathParts.unshift(pathPart);
      currentNode = currentNode.parentElement;
    }
    
    return pathParts.join(' > ');
  }
  
  /**
   * 建立节点关系
   */
  private static buildNodeRelationships(nodeInfoList: CompleteXmlNodeInfo[], allNodes: NodeListOf<Element>) {
    allNodes.forEach((node, index) => {
      const nodeInfo = nodeInfoList[index];
      
      // 计算深度
      let depth = 0;
      let parent = node.parentElement;
      while (parent && parent.tagName === 'node') {
        depth++;
        parent = parent.parentElement;
      }
      nodeInfo.depth = depth;
      
      // 查找父节点
      const parentNode = node.parentElement;
      if (parentNode && parentNode.tagName === 'node') {
        const parentIndex = Array.from(allNodes).indexOf(parentNode);
        if (parentIndex !== -1) {
          nodeInfo.parentIndex = parentIndex;
          // 添加到父节点的子节点列表
          nodeInfoList[parentIndex].childIndices.push(index);
        }
      }
    });
  }
  
  /**
   * 转换为UIElement格式（保持完整信息）
   */
  static convertToUIElement(nodeInfo: CompleteXmlNodeInfo): UIElement {
    return {
      id: nodeInfo.nodeId,
      text: nodeInfo.text,
      element_type: nodeInfo.className,
      xpath: nodeInfo.xpath,
      bounds: nodeInfo.bounds,
      is_clickable: nodeInfo.clickable,
      is_scrollable: nodeInfo.scrollable,
      is_enabled: nodeInfo.enabled,
      is_focused: nodeInfo.focused,
      resource_id: nodeInfo.resourceId,
      content_desc: nodeInfo.contentDesc,
      checkable: nodeInfo.checkable,
      checked: nodeInfo.checked,
      selected: nodeInfo.selected,
      password: nodeInfo.password,
      focusable: nodeInfo.focusable,
      parentId: nodeInfo.parentIndex !== undefined ? `node-${nodeInfo.parentIndex}` : null,
      
      // 额外的增强信息
      nodeIndex: nodeInfo.index,
      depth: nodeInfo.depth,
      childIds: nodeInfo.childIndices.map(idx => `node-${idx}`),
      nodePath: nodeInfo.nodePath,
      packageName: nodeInfo.packageName
    } as UIElement & {
      nodeIndex: number;
      depth: number;
      childIds: string[];
      nodePath: string;
      packageName: string;
    };
  }
}