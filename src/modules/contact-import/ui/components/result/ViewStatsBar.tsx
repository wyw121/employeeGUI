import React from 'react';
import { Space, Tag } from 'antd';

interface Stats {
  total: number;
  success: number;
  fail: number;
  pctSuccess: string;
  pctFail: string;
}

interface Props {
  view: 'all' | 'success' | 'fail';
  reasonFilter: string | null;
  successCountAll: number;
  totalAll: number;
  statsForView: Stats;
}

const ViewStatsBar: React.FC<Props> = ({ view, reasonFilter, successCountAll, totalAll, statsForView }) => {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
      <Space size={8} wrap>
        <Tag color="blue">视图：{view === 'all' ? '全部' : view === 'success' ? '成功' : '失败'}</Tag>
        {reasonFilter && <Tag color="geekblue">失败原因：{reasonFilter}</Tag>}
        <Tag>总览：成功 {successCountAll}/{totalAll}</Tag>
      </Space>
      <Space size={8} wrap>
        <Tag color="green">当前视图成功：{statsForView.success}（{statsForView.pctSuccess}）</Tag>
        <Tag color="red">当前视图失败：{statsForView.fail}（{statsForView.pctFail}）</Tag>
        <Tag>当前视图总数：{statsForView.total}</Tag>
      </Space>
    </div>
  );
};

export default ViewStatsBar;
