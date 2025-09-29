/**
 * 可调整列宽的表格组件
 * 
 * 为Ant Design Table添加列宽拖拽调整功能
 * 使用纯CSS和原生DOM事件实现，无需外部依赖
 * 
 * 功能特性：
 * - ✅ 支持列宽拖拽调整
 * - ✅ 保持列最小宽度限制
 * - ✅ 记忆用户调整的列宽
 * - ✅ 响应式布局适配
 * - ✅ 平滑的拖拽视觉反馈
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Table } from 'antd';
import type { TableProps, ColumnType } from 'antd/es/table';
import './ResizableTable.css'; // 样式文件

/**
 * 可调整大小的表头组件
 */
interface ResizableHeaderProps {
  width: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
  dataIndex: string;
  minWidth?: number;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  width,
  onResize,
  children,
  dataIndex,
  minWidth = 50,
}) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        
        const deltaX = e.clientX - startX.current;
        const newWidth = Math.max(minWidth, startWidth.current + deltaX);
        onResize(newWidth);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, onResize, minWidth]
  );

  return (
    <th 
      style={{ 
        width, 
        position: 'relative',
        minWidth: `${minWidth}px`,
        padding: '8px 16px',
      }}
      className="resizable-th"
    >
      {children}
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          borderRight: '2px solid transparent',
          zIndex: 10,
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderRight = '2px solid #1890ff';
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current) {
            e.currentTarget.style.borderRight = '2px solid transparent';
          }
        }}
      />
    </th>
  );
};

/**
 * 列宽配置类型
 */
export interface ColumnWidthConfig {
  /** 列的key */
  key: string;
  /** 列宽度 */
  width: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 是否可调整大小 */
  resizable?: boolean;
}

/**
 * 可调整列宽的表格组件属性
 */
export interface ResizableTableProps<T = any> extends Omit<TableProps<T>, 'columns'> {
  /** 表格列配置 */
  columns: ColumnType<T>[];
  /** 初始列宽配置 */
  defaultColumnWidths?: Record<string, number>;
  /** 列宽变化回调 */
  onColumnWidthChange?: (widths: Record<string, number>) => void;
  /** 是否启用列宽调整 */
  resizable?: boolean;
  /** 全局最小列宽 */
  minColumnWidth?: number;
}

/**
 * 可调整列宽的表格组件
 * 
 * @example
 * ```tsx
 * <ResizableTable
 *   columns={columns}
 *   dataSource={data}
 *   defaultColumnWidths={{
 *     'started_at': 120,
 *     'batch_id': 150,
 *     'status': 100
 *   }}
 *   onColumnWidthChange={(widths) => {
 *     // 保存用户调整的列宽
 *     localStorage.setItem('tableWidths', JSON.stringify(widths));
 *   }}
 * />
 * ```
 */
const ResizableTable = <T extends Record<string, any>>({
  columns,
  defaultColumnWidths = {},
  onColumnWidthChange,
  resizable = true,
  minColumnWidth = 60,
  ...tableProps
}: ResizableTableProps<T>) => {
  
  // 列宽状态管理
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initialWidths: Record<string, number> = {};
    
    columns.forEach((col) => {
      const key = col.key as string || col.dataIndex as string;
      if (key) {
        initialWidths[key] = defaultColumnWidths[key] || (col.width as number) || 120;
      }
    });
    
    return initialWidths;
  });

  // 更新列宽
  const updateColumnWidth = useCallback((key: string, width: number) => {
    const newWidths = { ...columnWidths, [key]: width };
    setColumnWidths(newWidths);
    onColumnWidthChange?.(newWidths);
  }, [columnWidths, onColumnWidthChange]);

  // 创建可调整大小的列配置
  const resizableColumns = useMemo(() => {
    return columns.map((col) => {
      const key = col.key as string || col.dataIndex as string;
      const width = columnWidths[key] || 120;
      
      if (!resizable || !key) {
        return col;
      }

      return {
        ...col,
        width,
        onHeaderCell: (column: ColumnType<T>) => ({
          width,
          onResize: (newWidth: number) => updateColumnWidth(key, newWidth),
          dataIndex: key,
          minWidth: col.width ? Math.min(col.width as number, minColumnWidth) : minColumnWidth,
        }),
      };
    });
  }, [columns, columnWidths, resizable, minColumnWidth, updateColumnWidth]);

  // 自定义表头组件
  const components = useMemo(() => ({
    header: {
      cell: ResizableHeader,
    },
  }), []);

  return (
    <div className="resizable-table-container">
      <Table<T>
        {...tableProps}
        columns={resizableColumns}
        components={components}
        scroll={{ x: 'max-content' }}
        tableLayout="fixed"
        className={`resizable-table ${tableProps.className || ''}`}
      />
    </div>
  );
};

/**
 * 使用列宽持久化的Hook
 * 
 * @param storageKey - localStorage存储键名
 * @param defaultWidths - 默认列宽配置
 * @returns [columnWidths, setColumnWidths] - 列宽状态和更新函数
 * 
 * @example
 * ```tsx
 * const [columnWidths, setColumnWidths] = useColumnWidthPersistence(
 *   'sessions-table-widths',
 *   { started_at: 120, batch_id: 150 }
 * );
 * 
 * <ResizableTable
 *   columns={columns}
 *   defaultColumnWidths={columnWidths}
 *   onColumnWidthChange={setColumnWidths}
 * />
 * ```
 */
export const useColumnWidthPersistence = (
  storageKey: string,
  defaultWidths: Record<string, number> = {}
): [Record<string, number>, (widths: Record<string, number>) => void] => {
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaultWidths, ...JSON.parse(saved) } : defaultWidths;
    } catch {
      return defaultWidths;
    }
  });

  const updateColumnWidths = useCallback((widths: Record<string, number>) => {
    setColumnWidths(widths);
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch (error) {
      console.warn('Failed to save column widths to localStorage:', error);
    }
  }, [storageKey]);

  return [columnWidths, updateColumnWidths];
};

export default ResizableTable;