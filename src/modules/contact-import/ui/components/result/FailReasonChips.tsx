import React, { useMemo, useState } from 'react';
import { Button, Input, Space, Tag, Tooltip } from 'antd';
import type { ReasonGroup } from '../../hooks/useReasonGroups';

interface Props {
  groups: ReasonGroup[];
  reasonFilter: string | null;
  onToggle: (reason: string) => void;
  onClear?: () => void;
  maxVisible?: number;
}

const FailReasonChips: React.FC<Props> = ({ groups, reasonFilter, onToggle, onClear, maxVisible = 6 }) => {
  if (!groups.length) return null;

  // 内置轻量搜索：当原因较多时自动显示，不改变组件对外 API
  const SEARCH_THRESHOLD = 10;
  const [q, setQ] = useState<string>('');
  const showSearch = groups.length > SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter(g => g.reason.toLowerCase().includes(kw));
  }, [q, groups]);

  const visible = filtered.slice(0, maxVisible);
  const moreCount = Math.max(0, filtered.length - maxVisible);
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {showSearch && (
        <Input
          size="small"
          placeholder="搜索原因…"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 220 }}
        />
      )}
      <Space wrap size={4}>
        {visible.map(g => (
          <Tooltip key={g.reason} title={g.reason} placement="top">
            <Tag
              color={reasonFilter === g.reason ? 'volcano' : 'red'}
              style={{ cursor: 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
              onClick={() => onToggle(g.reason)}
            >
              {g.reason} ×{g.count}
            </Tag>
          </Tooltip>
        ))}
        {filtered.length === 0 && (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>没有匹配的原因</span>
        )}
        {filtered.length > maxVisible && (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>… 还有 {moreCount} 种失败</span>
        )}
      </Space>
      {reasonFilter && (
        <Button size="small" onClick={onClear}>清除原因筛选</Button>
      )}
    </div>
  );
};

export default FailReasonChips;
