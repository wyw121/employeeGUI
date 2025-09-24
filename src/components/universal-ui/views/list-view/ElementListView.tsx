/**
 * 列表视图组件
 * 以现代化卡片列表形式展示页面元素
 */

import React, { useState, useMemo } from 'react';
import { Input, Button, Space, Typography, Card, Tag, Pagination } from 'antd';
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { VisualUIElement } from '../../types';
import { UIElement } from '../../../../api/universalUIAPI';
import UniversalUIAPI from '../../../../api/universalUIAPI';
import './ElementListView.css';

const { Title, Text } = Typography;

// 元素品质类型
type ElementQuality = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * 转换视觉元素到UI元素
 */
const convertVisualToUIElement = (element: VisualUIElement): UIElement => {
  return {
    id: element.id,
    text: element.text,
    // 保持 content_desc 仅承载真实 XML 的 content-desc；此处来自可视化友好描述，禁止回填
    content_desc: '',
    element_type: element.type,
    bounds: {
      left: element.position.x,
      top: element.position.y,
      right: element.position.x + element.position.width,
      bottom: element.position.y + element.position.height
    },
    is_clickable: element.clickable,
    is_scrollable: element.scrollable || false,
    is_enabled: element.enabled !== false,
    is_focused: element.focused || false,
    resource_id: '',
    class_name: element.type || '',
    xpath: '',
    parentId: null,
    checkable: false,
    checked: false,
    focusable: false,
    selected: element.selected || false,
    password: false
  } as UIElement;
};

/**
 * 获取元素品质等级
 */
const getElementQuality = (element: VisualUIElement): ElementQuality => {
  const hasText = element.text && element.text.trim();
  const isClickable = element.clickable;
  
  if (hasText && isClickable) return 'legendary'; // 传奇 - 有文本且可点击
  if (isClickable) return 'epic'; // 史诗 - 可点击
  if (hasText) return 'rare'; // 稀有 - 有文本
  if (element.importance === 'high') return 'uncommon'; // 非凡 - 高重要性
  return 'common'; // 普通
};

/**
 * 获取元素图标
 */
const getElementIcon = (element: VisualUIElement): string => {
  if (element.clickable) return '🔘';
  if (element.text && element.text.trim()) return '�';
  if (element.type.toLowerCase().includes('image')) return '�️';
  if (element.type.toLowerCase().includes('button')) return '�';
  return '📦';
};

/**
 * 格式化位置信息
 */
const formatPosition = (position: { x: number; y: number; width: number; height: number }): string => {
  return `(${position.x}, ${position.y}) ${position.width}×${position.height}`;
};

export const ElementListView: React.FC<{
  elements?: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
}> = ({
  elements = [],
  onElementSelect
}) => {
  // 直接使用VisualUIElement数组
  const visualElements = elements;
  
  // 本地状态管理
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理标签页切换
  const handleTabChange = (tabKey: string) => {
    setSelectedTab(tabKey);
    setCurrentPage(1); // 重置到第一页
  };

  // 过滤和排序元素
  const { filteredElements, totalCount } = useMemo(() => {
    let filtered = visualElements.filter(element => {
      // 分类过滤
      if (selectedCategory !== 'all' && element.category !== selectedCategory) {
        return false;
      }
      
      // 可点击过滤
      if (showOnlyClickable && !element.clickable) {
        return false;
      }
      
      // 搜索过滤
      if (searchText) {
        const text = searchText.toLowerCase();
        if (!(
          element.text.toLowerCase().includes(text) ||
          element.description.toLowerCase().includes(text) ||
          element.userFriendlyName.toLowerCase().includes(text) ||
          element.type.toLowerCase().includes(text)
        )) {
          return false;
        }
      }

      // 标签页过滤
      if (selectedTab === 'interactive' && !element.clickable) {
        return false;
      }
      if (selectedTab !== 'all' && selectedTab !== 'interactive' && element.category !== selectedTab) {
        return false;
      }
      
      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.userFriendlyName.localeCompare(b.userFriendlyName);
          break;
        case 'type':
          compareValue = a.type.localeCompare(b.type);
          break;
        case 'importance':
          const importanceOrder = { high: 3, medium: 2, low: 1 };
          compareValue = importanceOrder[a.importance] - importanceOrder[b.importance];
          break;
        case 'position':
          compareValue = a.position.y - b.position.y || a.position.x - b.position.x;
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedElements = filtered.slice(startIndex, startIndex + pageSize);

    return {
      filteredElements: paginatedElements,
      totalCount
    };
  }, [visualElements, selectedCategory, showOnlyClickable, searchText, selectedTab, currentPage, pageSize, sortBy, sortOrder]);

  // 处理元素选择
  const handleElementSelect = (element: VisualUIElement) => {
    if (onElementSelect) {
      // 找到原始的UIElement
      const originalIndex = visualElements.indexOf(element);
      const uiElement = elements[originalIndex];
      onElementSelect(uiElement);
    }
  };

  // 渲染现代化元素卡片
  const renderModernElementCard = (element: VisualUIElement, index: number) => {
    const description = element.description || '无描述';
    const position = formatPosition(element.position);
    const quality = getElementQuality(element);
    const icon = getElementIcon(element);
    
    const qualityColors = {
      legendary: { bg: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', border: '#ff4757', glow: '#ff6b6b' },
      epic: { bg: 'linear-gradient(135deg, #a55eea, #26de81)', border: '#8854d0', glow: '#a55eea' },
      rare: { bg: 'linear-gradient(135deg, #3742fa, #2f3542)', border: '#2f3093', glow: '#3742fa' },
      uncommon: { bg: 'linear-gradient(135deg, #2ed573, #1e90ff)', border: '#20bf6b', glow: '#2ed573' },
      common: { bg: 'linear-gradient(135deg, #747d8c, #57606f)', border: '#5f6368', glow: '#747d8c' }
    };

    const qualityStyle = qualityColors[quality];
    const globalIndex = (currentPage - 1) * pageSize + index;

    return (
      <div
        key={element.id}
        className={`element-card quality-${quality}`}
        style={{
          background: qualityStyle.bg,
          border: `2px solid ${qualityStyle.border}`,
          boxShadow: `0 4px 15px ${qualityStyle.glow}30, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
        }}
        onClick={() => handleElementSelect(element)}
      >
        {/* 品质光效 */}
        <div 
          className="quality-glow"
          style={{
            background: `linear-gradient(90deg, transparent, ${qualityStyle.glow}, transparent)`,
            animation: quality === 'legendary' ? 'shimmer 2s infinite' : 'none',
          }}
        />
        
        {/* 主要内容 */}
        <div className="card-content">
          {/* 图标和索引 */}
          <div className="icon-section">
            <div className="element-icon">{icon}</div>
            <div className="element-index">
              #{globalIndex + 1}
            </div>
          </div>
          
          {/* 文本信息 */}
          <div className="text-section">
            <div className="element-title">
              {element.text || element.type || '未命名元素'}
            </div>
            
            <div className="element-description">
              {description}
            </div>
            
            <div className="element-position">
              坐标: {position}
            </div>
          </div>
          
          {/* 状态标签 */}
          <div className="status-tags">
            {element.clickable && (
              <div className="status-tag clickable">
                可点击
              </div>
            )}
            
            {element.scrollable && (
              <div className="status-tag scrollable">
                可滚动
              </div>
            )}
            
            {element.text && element.text.trim() && (
              <div className="status-tag has-text">
                有文本
              </div>
            )}
          </div>
        </div>
        
        {/* 选择按钮 */}
        <div className="select-button">
          →
        </div>
      </div>
    );
  };

  return (
    <div className="element-list-view">
      {/* 现代化搜索栏 */}
      <div className="search-section">
        <div className="search-header">
          <div className="search-icon">🔍</div>
          <div className="search-text">
            <div className="search-title">智能搜索</div>
            <div className="search-subtitle">
              搜索元素文本、类型或描述
            </div>
          </div>
        </div>
        
        <Input.Search
          placeholder="输入关键词快速定位元素..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          size="large"
          className="search-input"
        />
      </div>

      {/* 现代化分类标签 */}
      <div className="tabs-section">
        <div className="tabs-container">
          {[
            { key: 'all', label: '全部', count: elements.length, color: '#667eea', icon: '📱' },
            { key: 'interactive', label: '可交互', count: visualElements.filter(e => e.clickable).length, color: '#26de81', icon: '🎯' },
            // 基于实际数据动态生成分类标签
            ...Array.from(new Set(visualElements.map(e => e.category))).map(category => ({
              key: category,
              label: category,
              count: visualElements.filter(e => e.category === category).length,
              color: '#a55eea',
              icon: '📦'
            }))
          ].map(tab => (
            <div
              key={tab.key}
              className={`tab-item ${selectedTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
              style={{
                background: selectedTab === tab.key 
                  ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)`
                  : 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                color: selectedTab === tab.key ? 'white' : '#495057',
                borderColor: selectedTab === tab.key ? tab.color : '#dee2e6',
                boxShadow: selectedTab === tab.key 
                  ? `0 4px 15px ${tab.color}30`
                  : '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <div 
                className="tab-count"
                style={{
                  background: selectedTab === tab.key 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : tab.color,
                  color: 'white',
                }}
              >
                {tab.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 元素网格 */}
      <div className="elements-grid">
        {filteredElements.length > 0 ? (
          <div className="grid-container">
            {filteredElements.map((element, index) => renderModernElementCard(element, index))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <div className="empty-title">没有找到匹配的元素</div>
            <div className="empty-description">
              尝试调整搜索关键词或选择其他分类<br/>
              或者重新分析当前页面
            </div>
          </div>
        )}
      </div>

      {/* 分页组件 */}
      {totalCount > pageSize && (
        <div className="pagination-section">
          <Pagination
            current={currentPage}
            total={totalCount}
            pageSize={pageSize}
            onChange={setCurrentPage}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条元素`}
            size="small"
          />
        </div>
      )}
    </div>
  );
};