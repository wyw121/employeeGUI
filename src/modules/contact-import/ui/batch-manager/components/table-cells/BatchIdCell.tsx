import React, { useState } from 'react';
import { Tooltip, Typography } from 'antd';
import { ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../../../theme';
import { getBatchIdCellStyles } from '../../themes/styles';

const { Text } = Typography;

interface BatchIdCellProps {
  /** 批次ID */
  batchId?: string | null;
  /** 初始显示模式 */
  initialExpanded?: boolean;
  /** 最大宽度（px） */
  maxWidth?: number;
  /** 缩写显示的最大字符数 */
  abbreviateLength?: number;
  /** 样式类名 */
  className?: string;
}

/**
 * 批次ID显示单元格组件
 * 支持缩写显示和完整展开，用户可以切换显示模式
 */
const BatchIdCell: React.FC<BatchIdCellProps> = ({
  batchId,
  initialExpanded = false,
  maxWidth = 120,
  abbreviateLength = 8,
  className
}) => {
  const { mode } = useTheme();
  const styles = getBatchIdCellStyles(mode);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  if (!batchId) {
    return <span className={className} style={styles.readonly}>—</span>;
  }

  // 判断是否需要缩写
  const needsAbbreviation = batchId.length > abbreviateLength;
  const displayText = isExpanded || !needsAbbreviation 
    ? batchId 
    : `${batchId.substring(0, abbreviateLength)}...`;

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const cellContent = (
    <div 
      className={className}
      style={{ 
        maxWidth: isExpanded ? 'none' : maxWidth,
        minWidth: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}
    >
      <Text
        code
        style={{
          ...(needsAbbreviation ? styles.clickable : styles.readonly),
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'initial' : 'ellipsis',
          whiteSpace: isExpanded ? 'normal' : 'nowrap',
          flex: 1,
          ...(isExpanded ? styles.expanded : styles.collapsed)
        }}
        onClick={needsAbbreviation ? toggleExpanded : undefined}
      >
        {displayText}
      </Text>
      
      {needsAbbreviation && (
        <button
          onClick={toggleExpanded}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            ...styles.clickable,
            fontSize: '12px',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
        </button>
      )}
    </div>
  );

  // 如果需要缩写且当前是缩写状态，显示完整内容的 tooltip
  if (needsAbbreviation && !isExpanded) {
    return (
      <Tooltip title={batchId} placement="topLeft">
        {cellContent}
      </Tooltip>
    );
  }

  return cellContent;
};

export default React.memo(BatchIdCell);

/**
 * 使用示例：
 * 
 * // 基本使用
 * <BatchIdCell batchId="batch_20250929_103045_12345" />
 * 
 * // 初始展开
 * <BatchIdCell 
 *   batchId="batch_20250929_103045_12345" 
 *   initialExpanded 
 * />
 * 
 * // 自定义缩写长度和最大宽度
 * <BatchIdCell 
 *   batchId="batch_20250929_103045_12345" 
 *   maxWidth={150}
 *   abbreviateLength={12}
 * />
 */