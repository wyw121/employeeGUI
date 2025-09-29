import React from 'react';
import { Space } from 'antd';
import { useTheme } from '../../../../../../theme';
import { getTimeFormatterCellStyles } from '../../themes/styles';

interface TimeFormatterCellProps {
  /** 时间字符串，格式：YYYY-MM-DD HH:mm:ss 或 ISO 格式 */
  datetime?: string | null;
  /** 是否显示为紧凑模式（单行显示） */
  compact?: boolean;
  /** 样式类名 */
  className?: string;
}

/**
 * 时间格式化单元格组件
 * 将时间显示为友好的中文格式：
 * - 第一行：月日（如：9月29日）
 * - 第二行：时间段+具体时间（如：上午 10:30）
 */
const TimeFormatterCell: React.FC<TimeFormatterCellProps> = ({
  datetime,
  compact = false,
  className
}) => {
  const { mode } = useTheme();
  const styles = getTimeFormatterCellStyles(mode);

  if (!datetime) {
    return <span className={className} style={styles.compact}>—</span>;
  }

  try {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
      return <span className={className} style={styles.compact}>—</span>;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // 格式化日期：9月29日
    const dateStr = `${month}月${day}日`;

    // 确定时间段
    let period: string;
    if (hours >= 6 && hours < 12) {
      period = '上午';
    } else if (hours >= 12 && hours < 18) {
      period = '下午';
    } else {
      period = '晚上';
    }

    // 格式化时间：上午 10:30
    const timeStr = `${period} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (compact) {
      return (
        <span className={className} style={styles.compact}>
          {dateStr} {timeStr}
        </span>
      );
    }

    return (
      <Space direction="vertical" size={0} className={className} style={styles.container}>
        <div style={styles.dateRow}>
          {dateStr}
        </div>
        <div style={styles.timeRow}>
          {timeStr}
        </div>
      </Space>
    );
  } catch (error) {
    console.warn('TimeFormatterCell: 时间解析失败', datetime, error);
    return <span className={className} style={styles.compact}>—</span>;
  }
};

export default React.memo(TimeFormatterCell);

/**
 * 使用示例：
 * 
 * // 双行显示（默认）
 * <TimeFormatterCell datetime="2025-09-29T10:30:00" />
 * 
 * // 单行紧凑显示
 * <TimeFormatterCell datetime="2025-09-29T10:30:00" compact />
 * 
 * // 自定义样式
 * <TimeFormatterCell 
 *   datetime="2025-09-29T10:30:00" 
 *   className="custom-time-cell" 
 * />
 */