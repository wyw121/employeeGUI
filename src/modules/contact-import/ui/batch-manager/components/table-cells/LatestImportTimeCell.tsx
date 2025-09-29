import React, { useEffect, useMemo, useState } from 'react';
import { Select, Spin, Space, Typography } from 'antd';
import { listImportSessionEvents, type ImportSessionEventDto } from '../../../services/contactNumberService';
import TimeFormatterCell from './TimeFormatterCell';

interface LatestImportTimeCellProps {
  sessionId: number;
  finishedAt?: string | null;
  onSelectEvent?: (ev: ImportSessionEventDto | null) => void;
  /** 仅渲染下拉框（紧凑模式），不显示上方时间与“历史”字样 */
  onlySelect?: boolean;
}

/**
 * 导入最新时间单元格：
 * - 显示当前会话的最新时间（finishedAt 或最后事件时间）
 * - 下拉可选择历史事件时间，选择后通过 onSelectEvent 通知上层刷新同一行的设备/状态/计数展示
 */
const LatestImportTimeCell: React.FC<LatestImportTimeCellProps> = ({ sessionId, finishedAt, onSelectEvent, onlySelect = false }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<ImportSessionEventDto[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await listImportSessionEvents(sessionId, { limit: 50, offset: 0 });
      setEvents(res.items || []);
    } catch (e) {
      // 忽略错误，展示空列表
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && events == null && !loading) {
      void loadEvents();
    }
  }, [open]);

  const options = useMemo(() => {
    if (!events) return [] as { label: React.ReactNode; value: number }[];
    return events.map(ev => ({
      label: (
        <div style={{ lineHeight: 1.1 }}>
          <TimeFormatterCell datetime={ev.occurred_at} compact />
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {ev.status || '—'} | {ev.imported_count ?? 0}/{ev.failed_count ?? 0}
          </div>
        </div>
      ),
      value: ev.id,
    }));
  }, [events]);

  const handleChange = (value: number) => {
    setSelectedId(value);
    const ev = (events || []).find(e => e.id === value) || null;
    onSelectEvent?.(ev);
  };

  // 计算展示值：优先使用选择的事件，其次使用 finishedAt
  const selectedEvent = (events || []).find(e => e.id === selectedId) || null;
  const displayTime = selectedEvent?.occurred_at || finishedAt || null;

  const select = (
    <Select<number>
      size="small"
      style={{ minWidth: 160 }}
      placeholder={loading ? '加载中…' : (events && events.length ? '选择导入时间' : '暂无')}
      options={options}
      value={selectedId ?? undefined}
      onChange={handleChange}
      onDropdownVisibleChange={(v) => setOpen(v)}
      notFoundContent={loading ? <Spin size="small" /> : '暂无数据'}
      dropdownMatchSelectWidth={false}
    />
  );

  if (onlySelect) {
    return select;
  }

  return (
    <Space size={4} direction="vertical">
      <div>
        <TimeFormatterCell datetime={displayTime || undefined} />
      </div>
      {select}
    </Space>
  );
};

export default React.memo(LatestImportTimeCell);

export type { LatestImportTimeCellProps };
