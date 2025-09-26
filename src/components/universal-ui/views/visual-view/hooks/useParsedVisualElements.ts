import { useState, useEffect, useCallback } from 'react';
import type { VisualUIElement, VisualElementCategory } from '../../../types';
import { parseBounds } from '../utils/elementTransform';
import { categorizeElement, getUserFriendlyName } from '../utils/categorization';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';

// 与旧逻辑一致的元素重要性判定
const getElementImportance = (node: any): 'high' | 'medium' | 'low' => {
  const contentDesc = node['content-desc'] || '';
  if (contentDesc.match(/首页|搜索|笔记|视频|发布/)) return 'high';
  if (contentDesc.match(/关注|发现|消息/) || node.clickable === 'true') return 'medium';
  return 'low';
};

export interface UseParsedVisualElementsResult {
  parsedElements: VisualUIElement[];
  categories: VisualElementCategory[];
  parseXML: (xml: string) => void;
}

export function useParsedVisualElements(xmlContent: string | undefined, fallbackElements: VisualUIElement[]): UseParsedVisualElementsResult {
  const [parsedElements, setParsedElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  const parseXML = useCallback((xmlString: string) => {
    if (!xmlString) return;
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const allNodes = xmlDoc.querySelectorAll('node');
      const extracted: VisualUIElement[] = [];
      const catMap: Record<string, VisualElementCategory> = {
        navigation: { name: '底部导航', icon: <AppstoreOutlined/>, color: '#1890ff', description: '应用主要导航按钮', elements: [] },
        tabs: { name: '顶部标签', icon: <AppstoreOutlined/>, color: '#722ed1', description: '页面切换标签', elements: [] },
        search: { name: '搜索功能', icon: <SearchOutlined/>, color: '#13c2c2', description: '搜索相关功能', elements: [] },
        content: { name: '内容卡片', icon: <AppstoreOutlined/>, color: '#52c41a', description: '主要内容区域', elements: [] },
        buttons: { name: '按钮控件', icon: <AppstoreOutlined/>, color: '#fa8c16', description: '可点击的按钮', elements: [] },
        text: { name: '文本内容', icon: <AppstoreOutlined/>, color: '#eb2f96', description: '文本信息显示', elements: [] },
        images: { name: '图片内容', icon: <AppstoreOutlined/>, color: '#f5222d', description: '图片和图标', elements: [] },
        others: { name: '其他元素', icon: <AppstoreOutlined/>, color: '#8c8c8c', description: '其他UI元素', elements: [] },
      };
      allNodes.forEach((node, index) => {
        const bounds = node.getAttribute('bounds') || '';
        const text = node.getAttribute('text') || '';
        const contentDesc = node.getAttribute('content-desc') || '';
        const className = node.getAttribute('class') || '';
        const clickable = node.getAttribute('clickable') === 'true';
        if (!bounds || bounds === '[0,0][0,0]') return;
        if (!text && !contentDesc && !clickable) return;
        const position = parseBounds(bounds);
        if (position.width <= 0 || position.height <= 0) return;
        const category = categorizeElement(node);
        const userFriendlyName = getUserFriendlyName(node);
        const importance = getElementImportance(node);
        const element: VisualUIElement = {
          id: `element-${index}`,
            text,
            description: contentDesc || `${userFriendlyName}${clickable ? '（可点击）' : ''}`,
            type: className.split('.').pop() || 'Unknown',
            category,
            position,
            clickable,
            importance,
            userFriendlyName,
        };
        extracted.push(element);
        catMap[category].elements.push(element);
      });
      setParsedElements(extracted);
      setCategories(Object.values(catMap).filter(c => c.elements.length > 0));
    } catch (e) {
      console.error('XML解析失败:', e);
    }
  }, []);

  useEffect(() => { if (xmlContent) parseXML(xmlContent); }, [xmlContent, parseXML]);

  return { parsedElements, categories, parseXML };
}
