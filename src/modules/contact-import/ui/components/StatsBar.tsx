import React from 'react';
import { Space, Tag, Tooltip } from 'antd';
import type { ContactNumberStatsDto } from '../services/stats/contactStatsService';

interface Props {
  stats?: ContactNumberStatsDto | null;
  onRefresh?: () => void;
}

export const StatsBar: React.FC<Props> = ({ stats, onRefresh }) => {
  if (!stats) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <Space size={8} wrap>
        <Tag color="blue">总数：{stats.total}</Tag>
        <Tag color="purple">未导入：{stats.not_imported}</Tag>
        <Tag>未分类：{stats.unclassified}</Tag>
      </Space>
      <Space size={8} wrap>
        {stats.per_industry.slice(0, 6).map((it) => (
          <Tag key={it.industry} color="geekblue">{it.industry}：{it.count}</Tag>
        ))}
        {stats.per_industry.length > 6 && (
          <Tooltip title={stats.per_industry.slice(6).map(i => `${i.industry}：${i.count}`).join('、')}>
            <Tag>更多 {stats.per_industry.length - 6}</Tag>
          </Tooltip>
        )}
        {onRefresh && (
          <a onClick={onRefresh} style={{ marginLeft: 8 }}>刷新</a>
        )}
      </Space>
    </div>
  );
};

export default StatsBar;
