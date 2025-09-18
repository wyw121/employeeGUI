/**
 * 分析统计组件
 * 显示页面分析的统计信息和性能数据
 */

import React from 'react';
import { 
  Card, 
  Statistic, 
  Row, 
  Col,
  Typography,
  Divider,
  Tag,
  Progress,
  Space,
  Timeline
} from 'antd';
import { 
  DashboardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BugOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { PageAnalysisEntity } from '../../domain/page-analysis';
import { formatDuration, formatTime, calculateDeduplicationRate } from '../../domain/page-analysis/utils';

const { Text, Title } = Typography;

export interface AnalysisStatisticsProps {
  analysis: PageAnalysisEntity | null;
  isAnalyzing: boolean;
  totalAnalysisTime?: number;
}

export const AnalysisStatistics: React.FC<AnalysisStatisticsProps> = ({
  analysis,
  isAnalyzing,
  totalAnalysisTime = 0,
}) => {
  if (!analysis) {
    return (
      <Card 
        title={
          <Space>
            <DashboardOutlined />
            分析统计
          </Space>
        }
        size="small"
        style={{ height: '400px' }}
      >
        <div style={{ 
          height: '300px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Text type="secondary">
            {isAnalyzing ? '正在分析页面...' : '暂无分析数据'}
          </Text>
        </div>
      </Card>
    );
  }

  const { elements, statistics, pageInfo } = analysis;
  const rawElementsCount = statistics.totalElements;
  const processedElementsCount = statistics.uniqueElements;
  const duplicatesRemoved = rawElementsCount - processedElementsCount;
  const deduplicationRate = calculateDeduplicationRate(rawElementsCount, processedElementsCount);

  const getElementTypeStats = () => {
    const typeDistribution = statistics.typeDistribution;
    return Object.entries(typeDistribution).map(([type, count]) => ({ type, count }));
  };

  const getInteractableElementsCount = () => {
    return statistics.actionableElements;
  };

  const elementTypeStats = getElementTypeStats();
  const interactableCount = getInteractableElementsCount();

  return (
    <Card 
      title={
        <Space>
          <DashboardOutlined />
          分析统计
        </Space>
      }
      size="small"
      style={{ height: '400px', overflow: 'auto' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 基础统计 */}
        <Row gutter={8}>
          <Col span={8}>
            <Statistic
              title="原始元素"
              value={rawElementsCount}
              prefix={<EyeOutlined />}
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="处理后"
              value={processedElementsCount}
              prefix={<FilterOutlined />}
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="可操作"
              value={interactableCount}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0' }} />

        {/* 去重统计 */}
        <div>
          <Text strong style={{ fontSize: '12px' }}>去重效果</Text>
          <div style={{ marginTop: 4 }}>
            <Progress
              percent={deduplicationRate}
              size="small"
              format={() => `${duplicatesRemoved} 个重复`}
              strokeColor={{
                '0%': '#87d068',
                '100%': '#108ee9',
              }}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              去重率: {deduplicationRate.toFixed(1)}%
            </Text>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 页面信息 */}
        <div>
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
            页面信息
          </Text>
          <Space wrap size={[4, 4]}>
            <Tag style={{ fontSize: '10px', padding: '2px 6px' }}>
              {pageInfo.appPackage || '未知包名'}
            </Tag>
            <Tag style={{ fontSize: '10px', padding: '2px 6px' }}>
              {pageInfo.activityName || '未知Activity'}
            </Tag>
            {pageInfo.pageType && (
              <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px' }}>
                {pageInfo.pageType}
              </Tag>
            )}
          </Space>
        </div>

        {/* 元素类型分布 */}
        <div>
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
            元素类型分布
          </Text>
          <Space wrap size={[4, 4]}>
            {elementTypeStats.slice(0, 6).map(({ type, count }) => (
              <Tag 
                key={type} 
                style={{ fontSize: '10px', padding: '2px 6px' }}
              >
                {type}: {count}
              </Tag>
            ))}
            {elementTypeStats.length > 6 && (
              <Tag style={{ fontSize: '10px', padding: '2px 6px' }}>
                +{elementTypeStats.length - 6} 更多
              </Tag>
            )}
          </Space>
        </div>

        {/* 分析时间轴 */}
        {totalAnalysisTime > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
                分析时间轴
              </Text>
              <Timeline>
                <Timeline.Item 
                  dot={<CheckCircleOutlined style={{ fontSize: '12px' }} />}
                  color="green"
                >
                  <Text style={{ fontSize: '11px' }}>
                    页面截取完成 
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      {formatTime(analysis.analysisTime)}
                    </Text>
                  </Text>
                </Timeline.Item>
                
                <Timeline.Item 
                  dot={<FilterOutlined style={{ fontSize: '12px' }} />}
                  color="blue"
                >
                  <Text style={{ fontSize: '11px' }}>
                    元素解析完成
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      耗时 {formatDuration(totalAnalysisTime)}
                    </Text>
                  </Text>
                </Timeline.Item>
                
                <Timeline.Item 
                  dot={<ThunderboltOutlined style={{ fontSize: '12px' }} />}
                  color="purple"
                >
                  <Text style={{ fontSize: '11px' }}>
                    去重优化完成
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      移除 {duplicatesRemoved} 个重复项
                    </Text>
                  </Text>
                </Timeline.Item>
              </Timeline>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};