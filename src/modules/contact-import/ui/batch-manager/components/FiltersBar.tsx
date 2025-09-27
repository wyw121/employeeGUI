import React from 'react';
import { Space, Select, Input, Switch } from 'antd';
import type { BatchFilterState } from '../types';
import type { VcfBatchList } from '../../services/contactNumberService';

interface Props {
  value: BatchFilterState;
  onChange: (v: BatchFilterState) => void;
  batches?: VcfBatchList | null;
}

const FiltersBar: React.FC<Props> = ({ value, onChange, batches }) => {
  return (
    <Space wrap>
      <Select
        style={{ width: 160 }}
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: 'all', label: '全部号码' },
          { value: 'by-batch', label: '按批次' },
          { value: 'no-batch', label: '未生成VCF' },
        ]}
      />
      {value.mode === 'by-batch' && (
        <Select
          style={{ width: 220 }}
          placeholder="选择批次"
          value={value.batchId}
          onChange={(batchId) => onChange({ ...value, batchId })}
          options={(batches?.items || []).map(b => ({ value: b.batch_id, label: `${b.batch_id} (${b.created_at})` }))}
          showSearch
        />
      )}
      <Input
        style={{ width: 220 }}
        placeholder="按设备ID筛选会话（可选）"
        value={value.deviceId}
        onChange={(e) => onChange({ ...value, deviceId: e.target.value })}
        allowClear
      />
      {value.mode !== 'by-batch' && (
        <Input
          style={{ width: 220 }}
          placeholder="搜索 号码/姓名"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          allowClear
        />
      )}
      {value.mode === 'by-batch' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Switch checked={!!value.onlyUsed} onChange={(v) => onChange({ ...value, onlyUsed: v })} />
          仅显示该批次
        </span>
      )}
    </Space>
  );
};

export default FiltersBar;
