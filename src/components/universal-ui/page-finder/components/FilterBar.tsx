import React from 'react';
import { Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface FilterBarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;
  showOnlyClickable: boolean;
  onShowOnlyClickableChange: (v: boolean) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchText,
  onSearchTextChange,
  showOnlyClickable,
  onShowOnlyClickableChange,
}) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        placeholder="搜索元素..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => onSearchTextChange(e.target.value)}
      />
      <Space>
        <label>
          <input
            type="checkbox"
            checked={showOnlyClickable}
            onChange={(e) => onShowOnlyClickableChange(e.target.checked)}
          />
          <span style={{ marginLeft: 8 }}>只显示可点击元素</span>
        </label>
      </Space>
    </Space>
  );
};

export default FilterBar;
