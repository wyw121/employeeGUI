/**
 * 实时日志查看器组件
 * 支持实时日志流、过滤、搜索、导出等功能
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Input,
  Select,
  Space,
  Button,
  Table,
  Tag,
  Tooltip,
  Dropdown,
  Menu,
  DatePicker,
  Switch,
  Row,
  Col,
  Typography,
  Empty,
  Spin,
  message
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  ClearOutlined,
  SettingOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { 
  LogEntry, 
  LogLevel, 
  LogCategory, 
  LogFilter,
  LogExportOptions
} from '../../services/adb-diagnostic/LogManager';
import { useLogManager } from './hooks/useLogManager';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface LogViewerProps {
  className?: string;
  maxHeight?: number;
  showHeader?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 日志级别颜色映射
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '#52c41a',
  [LogLevel.INFO]: '#1890ff',
  [LogLevel.WARN]: '#faad14',
  [LogLevel.ERROR]: '#ff4d4f'
};

/**
 * 日志分类颜色映射
 */
const LOG_CATEGORY_COLORS: Record<LogCategory, string> = {
  [LogCategory.SYSTEM]: '#722ed1',
  [LogCategory.DEVICE]: '#13c2c2',
  [LogCategory.DIAGNOSTIC]: '#eb2f96',
  [LogCategory.USER_ACTION]: '#52c41a'
};

/**
 * 日志查看器主组件
 */
export const LogViewer: React.FC<LogViewerProps> = ({
  className,
  maxHeight = 600,
  showHeader = true,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const {
    filteredLogs,
    filter,
    updateFilter,
    clearFilter,
    clearLogs,
    exportLogs,
    logStats,
    isExporting
  } = useLogManager();

  const [searchText, setSearchText] = useState('');
  const [isRealTime, setIsRealTime] = useState(autoRefresh);
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<LogCategory[]>([]);
  const loading = false; // 简化为常量，如果需要可以后续添加加载逻辑
  const tableRef = useRef<any>(null);

  // 实时刷新定时器
  useEffect(() => {
    if (!isRealTime) return;

    const timer = setInterval(() => {
      // 自动滚动到底部显示最新日志
      if (tableRef.current) {
        const container = tableRef.current.querySelector('.ant-table-body');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isRealTime, refreshInterval]);

  // 过滤处理
  const handleFilterChange = (newFilter: Partial<LogFilter>) => {
    updateFilter({
      ...filter,
      ...newFilter,
      searchText: searchText || undefined
    });
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    handleFilterChange({ searchText: value || undefined });
  };

  // 级别过滤
  const handleLevelFilter = (levels: LogLevel[]) => {
    setSelectedLevels(levels);
    handleFilterChange({ levels: levels.length > 0 ? levels : undefined });
  };

  // 分类过滤
  const handleCategoryFilter = (categories: LogCategory[]) => {
    setSelectedCategories(categories);
    handleFilterChange({ categories: categories.length > 0 ? categories : undefined });
  };

  // 时间范围过滤
  const handleTimeRangeFilter = (dates: any) => {
    if (dates && dates.length === 2) {
      handleFilterChange({
        startTime: dates[0].toDate(),
        endTime: dates[1].toDate()
      });
    } else {
      handleFilterChange({
        startTime: undefined,
        endTime: undefined
      });
    }
  };

  // 清除所有过滤器
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedLevels([]);
    setSelectedCategories([]);
    clearFilter();
  };

  // 导出日志
  const handleExport = async (format: 'json' | 'csv' | 'txt') => {
    try {
      const options: LogExportOptions = {
        format,
        includeDetails: true,
        filter
      };
      
      const exportData = await exportLogs(options);
      
      // 创建下载链接
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adb_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success(`日志已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      message.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 表格列定义
  const columns: ColumnsType<LogEntry> = useMemo(() => [
    {
      title: '时间',
      dataIndex: 'timestamp',
      width: 180,
      render: (timestamp: Date) => (
        <Text style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {timestamp.toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      defaultSortOrder: 'descend'
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 80,
      render: (level: LogLevel) => (
        <Tag color={LOG_LEVEL_COLORS[level]} style={{ minWidth: 50, textAlign: 'center' }}>
          {level}
        </Tag>
      ),
      filters: Object.values(LogLevel).map(level => ({
        text: level,
        value: level
      })),
      onFilter: (value, record) => record.level === value
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (category: LogCategory) => (
        <Tag color={LOG_CATEGORY_COLORS[category]}>
          {category}
        </Tag>
      ),
      filters: Object.values(LogCategory).map(category => ({
        text: category,
        value: category
      })),
      onFilter: (value, record) => record.category === value
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 150,
      render: (source: string) => (
        <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: source }}>
          {source}
        </Text>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      render: (message: string, record: LogEntry) => (
        <div>
          <Text>{message}</Text>
          {record.deviceId && (
            <Tag style={{ marginLeft: 8 }} color="blue">
              设备: {record.deviceId}
            </Tag>
          )}
        </div>
      ),
      ellipsis: true
    },
    {
      title: '详情',
      dataIndex: 'details',
      width: 80,
      render: (details: any) => (
        details ? (
          <Tooltip title={<pre>{JSON.stringify(details, null, 2)}</pre>}>
            <Button size="small" type="link">查看</Button>
          </Tooltip>
        ) : null
      )
    }
  ], []);

  // 导出菜单
  const exportMenu = (
    <Menu onClick={({ key }) => handleExport(key as any)}>
      <Menu.Item key="json" icon={<DownloadOutlined />}>
        导出为 JSON
      </Menu.Item>
      <Menu.Item key="csv" icon={<DownloadOutlined />}>
        导出为 CSV
      </Menu.Item>
      <Menu.Item key="txt" icon={<DownloadOutlined />}>
        导出为 TXT
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={className}>
      {showHeader && (
        <Card style={{ marginBottom: 16 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                日志查看器
              </Title>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">
                  总计: {logStats.total} | 当前会话: {logStats.currentSession}
                </Text>
                <Switch
                  checked={isRealTime}
                  onChange={setIsRealTime}
                  checkedChildren={<PlayCircleOutlined />}
                  unCheckedChildren={<PauseCircleOutlined />}
                />
                <Text type="secondary">实时模式</Text>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 过滤工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Input
              placeholder="搜索日志内容..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="过滤级别"
              value={selectedLevels}
              onChange={handleLevelFilter}
              style={{ width: '100%' }}
              allowClear
            >
              {Object.values(LogLevel).map(level => (
                <Option key={level} value={level}>
                  <Tag color={LOG_LEVEL_COLORS[level]} style={{ margin: 0 }}>
                    {level}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="过滤分类"
              value={selectedCategories}
              onChange={handleCategoryFilter}
              style={{ width: '100%' }}
              allowClear
            >
              {Object.values(LogCategory).map(category => (
                <Option key={category} value={category}>
                  <Tag color={LOG_CATEGORY_COLORS[category]} style={{ margin: 0 }}>
                    {category}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <RangePicker
              showTime
              placeholder={['开始时间', '结束时间']}
              onChange={handleTimeRangeFilter}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                title="清除过滤器"
              />
              <Dropdown overlay={exportMenu} trigger={['click']}>
                <Button
                  icon={<ExportOutlined />}
                  loading={isExporting}
                  title="导出日志"
                />
              </Dropdown>
              <Button
                icon={<SettingOutlined />}
                onClick={() => clearLogs()}
                title="清空日志"
                danger
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 日志表格 */}
      <Card>
        <Spin spinning={loading}>
          <Table
            ref={tableRef}
            dataSource={filteredLogs}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ y: maxHeight, x: 1200 }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条日志`,
              defaultPageSize: 50,
              pageSizeOptions: ['20', '50', '100', '200']
            }}
            locale={{
              emptyText: (
                <Empty 
                  description="暂无日志数据"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
          />
        </Spin>
      </Card>
    </div>
  );
};