/**
 * 元素搜索过滤组件
 * 提供搜索和过滤功能
 */

import React from 'react';
import { Input, Switch, Select, Space, Typography, Divider } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { usePageAnalysisConfig } from '../../application/page-analysis';

const { Text } = Typography;
const { Option } = Select;

export const ElementSearchFilter: React.FC = () => {
  const {
    filterConfig,
    toggleClickableFilter,
    toggleVisibilityFilter,
    setElementTypeFilter,
    setRegionFilter,
    resetFilters,
  } = usePageAnalysisConfig();

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 可见性过滤 */}
      <div>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>只显示可点击元素</Text>
            <Switch 
              checked={filterConfig.showOnlyClickable}
              onChange={toggleClickableFilter}
              size="small"
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>只显示可见元素</Text>
            <Switch 
              checked={filterConfig.showOnlyVisible}
              onChange={toggleVisibilityFilter}
              size="small"
            />
          </div>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 区域过滤 */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>显示区域</Text>
        <Select
          mode="multiple"
          placeholder="选择显示区域"
          value={filterConfig.regions}
          onChange={setRegionFilter}
          size="small"
          style={{ width: '100%' }}
          maxTagCount={2}
        >
          <Option value="top">顶部区域</Option>
          <Option value="middle">中部区域</Option>
          <Option value="bottom">底部区域</Option>
        </Select>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 重置按钮 */}
      <div style={{ textAlign: 'center' }}>
        <Text 
          type="secondary" 
          style={{ cursor: 'pointer', fontSize: '12px' }}
          onClick={resetFilters}
        >
          重置所有过滤器
        </Text>
      </div>
    </Space>
  );
};